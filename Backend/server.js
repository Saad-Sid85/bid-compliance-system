const express = require("express");
const cors = require("cors");
require("dotenv").config();

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");


const db = require("./DB");

const app = express();

// ======================================================
// LLM / NLP SERVICE (Python Flask, runs separately)
// ======================================================

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || "http://127.0.0.1:5001";

async function callLLMExtract(ocrText) {
    try {
        const response = await fetch(`${LLM_SERVICE_URL}/extract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ocr_text: ocrText })
        });

        if (!response.ok) {
            console.error("LLM service returned error status:", response.status);
            return { gstin: null, legal_name: null, pan: null };
        }

        return await response.json();
    } catch (error) {
        console.error("LLM service unreachable:", error.message);
        return { gstin: null, legal_name: null, pan: null };
    }
}

app.use(cors());
app.use(express.json());

// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowed = [".pdf"];

        const ext = path.extname(file.originalname).toLowerCase();

        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
});


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "GeM Sentinel Backend is running!"
    });
});

// ======================================================
// MYSQL CONNECTION TEST
// ======================================================

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT 1 AS connected"
        );

        res.json({
            success: true,
            message: "MySQL connected successfully",
            result: rows
        });

    } catch (error) {
        console.error("Database Error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message
        });
    }
});

// ======================================================
// GET ALL BIDS
// ======================================================

app.get("/api/bids", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                bid_id,
                tender_id,
                title,
                description,
                issuing_authority,
                estimated_value,
                submission_deadline,
                bid_status,
                created_at
            FROM bids
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            count: rows.length,
            bids: rows
        });

    } catch (error) {
        console.error("Bids Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch bids",
            error: error.message
        });
    }
});

// ======================================================
// GET SINGLE BID
// ======================================================

app.get("/api/bids/:id", async (req, res) => {
    try {
        const bidId = req.params.id;

        const [rows] = await db.query(
            `
            SELECT
                bid_id,
                tender_id,
                title,
                description,
                issuing_authority,
                estimated_value,
                submission_deadline,
                bid_status,
                created_at
            FROM bids
            WHERE bid_id = ?
            `,
            [bidId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Bid not found"
            });
        }

        res.json({
            success: true,
            bid: rows[0]
        });

    } catch (error) {
        console.error("Single Bid Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch bid",
            error: error.message
        });
    }
});

// ======================================================
// UPLOAD DOCUMENT + PDF TEXT EXTRACTION
// ======================================================

app.post(
    "/api/bids/:id/documents",
    upload.single("document"),
    async (req, res) => {

        try {
            const bidId = req.params.id;

            // Check uploaded file
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No document uploaded"
                });
            }

            const documentName = req.file.originalname;

            const documentType = path
                .extname(documentName)
                .replace(".", "")
                .toUpperCase();

            const filePath = req.file.path;

            // --------------------------------------------------
            // STEP 1: Save document in bid_documents
            // --------------------------------------------------

            const [result] = await db.query(
                `
                INSERT INTO bid_documents
                (
                    bid_id,
                    document_name,
                    document_type,
                    file_path,
                    processing_status
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    bidId,
                    documentName,
                    documentType,
                    filePath,
                    "UPLOADED"
                ]
            );

            const documentId = result.insertId;

              // --------------------------------------------------
// STEP 2: Extract text from PDF or OCR image
// --------------------------------------------------

let extractedText = "";

if (documentType === "PDF") {
    console.log("Processing PDF...");

    const pdfBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: pdfBuffer });

    const pdfData = await parser.getText();

    await parser.destroy();

    extractedText = pdfData.text || "";

    console.log("PDF text extracted.");
    console.log("Extracted characters:", extractedText.length);
}

            // --------------------------------------------------
            // STEP 5.5: LLM/NLP extraction (Python Flask service)
            // --------------------------------------------------

            let llmFields = { gstin: null, legal_name: null, pan: null };

            if (extractedText.trim().length > 0) {
                llmFields = await callLLMExtract(extractedText);
                console.log("LLM extracted fields:", llmFields);
            }

            // --------------------------------------------------
            // STEP 6: Basic field extraction
            // --------------------------------------------------

            let companyName = null;
            let gstNumber = null;
            let udyamNumber = null;
            let annualTurnover = null;

            const text = extractedText;

            // GST Number
            const gstMatch = text.match(
                /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]\b/i
            );

            if (gstMatch) {
                gstNumber = gstMatch[0].toUpperCase();
            }

            // Udyam Number
            const udyamMatch = text.match(
                /\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b/i
            );

            if (udyamMatch) {
                udyamNumber = udyamMatch[0].toUpperCase();
            }

            // Annual Turnover
            const turnoverMatch = text.match(
                /(?:annual turnover|turnover)[^\d₹]*₹?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lakhs|crore|crores)?/i
            );

            if (turnoverMatch) {
                annualTurnover = turnoverMatch[0];
            }

            console.log("Extracted GST:", gstNumber);
            console.log("Extracted Udyam:", udyamNumber);
            console.log("Extracted Turnover:", annualTurnover);

            // --------------------------------------------------
            // STEP 3: Save extracted text
            // --------------------------------------------------

            if (extractedText.trim().length > 0) {

                await db.query(
                    `
                    INSERT INTO document_extractions
                    (
                        document_id,
                        field_name,
                        extracted_value,
                        confidence_score,
                        extraction_method
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        documentId,
                        "RAW_TEXT",
                        extractedText.trim(),
                        100.00,
                        documentType === "PDF" ? "PDF_TEXT" : "OCR"
                    ]
                );

                // Save each LLM-extracted field as its own row
                for (const [fieldName, fieldValue] of Object.entries(llmFields)) {
                    if (fieldValue !== null && fieldValue !== undefined) {
                        await db.query(
                            `
                            INSERT INTO document_extractions
                            (
                                document_id,
                                field_name,
                                extracted_value,
                                confidence_score,
                                extraction_method
                            )
                            VALUES (?, ?, ?, ?, ?)
                            `,
                            [
                                documentId,
                                fieldName.toUpperCase(),
                                String(fieldValue),
                                90.00,
                                "LLM"
                            ]
                        );
                    }
                }
            }

            // --------------------------------------------------
            // STEP 4: Update processing status
            // --------------------------------------------------

            const processingStatus =
                extractedText.trim().length > 0
                    ? "PROCESSED"
                    : "UPLOADED";

            await db.query(
                `
                UPDATE bid_documents
                SET processing_status = ?
                WHERE document_id = ?
                `,
                [
                    processingStatus,
                    documentId
                ]
            );

            // --------------------------------------------------
            // STEP 5: Send response
            // --------------------------------------------------

            res.json({
                success: true,
                message: "Document uploaded and processed successfully",

                document_id: documentId,

                document_name: documentName,

                processing_status: processingStatus,

                extracted_text: extractedText,

                llm_extracted_fields: llmFields
            });

        } catch (error) {

            console.error(
                "Document Processing Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Document processing failed",
                error: error.message
            });
        }
    }
);

// ======================================================
// GET DOCUMENTS FOR A BID
// ======================================================

app.get("/api/bids/:id/documents", async (req, res) => {
    try {
        const bidId = req.params.id;

        const [rows] = await db.query(
            `
            SELECT
                document_id,
                bid_id,
                document_name,
                document_type,
                file_path,
                processing_status,
                upload_date
            FROM bid_documents
            WHERE bid_id = ?
            ORDER BY document_id DESC
            `,
            [bidId]
        );

        res.json({
            success: true,
            count: rows.length,
            documents: rows
        });

    } catch (error) {

        console.error(
            "Documents Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
            error: error.message
        });
    }
});

// ======================================================
// GET REQUIREMENTS + COMPLIANCE
// ======================================================

app.get("/api/bids/:id/compliance", async (req, res) => {

    try {

        const bidId = req.params.id;

        const [rows] = await db.query(
            `
            SELECT
                r.requirement_id,
                r.requirement_code,
                r.requirement_text,
                r.requirement_category,
                r.mandatory,
                r.expected_value,
                c.check_id,
                c.status,
                c.score,
                c.remarks,
                c.checked_at
            FROM bid_requirements r
            LEFT JOIN compliance_checks c
                ON r.requirement_id = c.requirement_id
                AND c.bid_id = r.bid_id
            WHERE r.bid_id = ?
            ORDER BY r.requirement_id
            `,
            [bidId]
        );

        res.json({
            success: true,
            count: rows.length,
            compliance: rows
        });

    } catch (error) {

        console.error(
            "Compliance Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch compliance data",
            error: error.message
        });
    }
});

// ======================================================
// GET DOCUMENT EXTRACTIONS
// ======================================================

app.get("/api/bids/:id/extractions", async (req, res) => {

    try {

        const bidId = req.params.id;

        const [rows] = await db.query(
            `
            SELECT
                d.document_id,
                d.document_name,
                d.document_type,
                e.extraction_id,
                e.field_name,
                e.extracted_value,
                e.confidence_score,
                e.extraction_method,
                e.extracted_at
            FROM bid_documents d
            JOIN document_extractions e
                ON d.document_id = e.document_id
            WHERE d.bid_id = ?
            ORDER BY d.document_id, e.extraction_id
            `,
            [bidId]
        );

        res.json({
            success: true,
            count: rows.length,
            extractions: rows
        });

    } catch (error) {

        console.error(
            "Extractions Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch document extractions",
            error: error.message
        });
    }
});

// ======================================================
// GET VERIFICATIONS
// ======================================================

app.get("/api/bids/:id/verifications", async (req, res) => {

    try {

        const bidId = req.params.id;

        const [rows] = await db.query(
            `
            SELECT
                verification_id,
                bidder_id,
                bid_id,
                verification_type,
                reference_number,
                verification_status,
                verification_source,
                response_data,
                verified_at
            FROM verifications
            WHERE bid_id = ?
            ORDER BY verification_id
            `,
            [bidId]
        );

        res.json({
            success: true,
            count: rows.length,
            verifications: rows
        });

    } catch (error) {

        console.error(
            "Verification Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch verification data",
            error: error.message
        });
    }
});

// ======================================================
// START SERVER
// ======================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});