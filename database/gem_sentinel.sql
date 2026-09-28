CREATE DATABASE gem_sentinel;
USE gem_sentinel;
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role ENUM('ADMIN', 'REVIEWER', 'BIDDER') DEFAULT 'BIDDER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE bidders (
    bidder_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    gst_number VARCHAR(20),
    udyam_number VARCHAR(50),
    pan_number VARCHAR(20),
    cin_number VARCHAR(30),
    email VARCHAR(150),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE bids (
    bid_id INT PRIMARY KEY AUTO_INCREMENT,
    bidder_id INT NOT NULL,
    tender_id VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issuing_authority VARCHAR(200),
    estimated_value DECIMAL(15,2),
    submission_deadline DATETIME,
    bid_status ENUM(
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'COMPLIANT',
        'NON_COMPLIANT',
        'REJECTED'
    ) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (bidder_id)
        REFERENCES bidders(bidder_id)
        ON DELETE CASCADE
);
CREATE TABLE bid_documents (
    document_id INT PRIMARY KEY AUTO_INCREMENT,
    bid_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path VARCHAR(500),
    file_hash VARCHAR(128),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status ENUM(
        'UPLOADED',
        'PROCESSING',
        'PROCESSED',
        'FAILED'
    ) DEFAULT 'UPLOADED',

    FOREIGN KEY (bid_id)
        REFERENCES bids(bid_id)
        ON DELETE CASCADE
);
CREATE TABLE bid_requirements (
    requirement_id INT PRIMARY KEY AUTO_INCREMENT,
    bid_id INT NOT NULL,
    requirement_code VARCHAR(50),
    requirement_text TEXT NOT NULL,
    requirement_category ENUM(
        'LEGAL',
        'FINANCIAL',
        'TECHNICAL',
        'ELIGIBILITY',
        'DOCUMENTARY',
        'OTHER'
    ) DEFAULT 'OTHER',
    mandatory BOOLEAN DEFAULT TRUE,
    expected_value VARCHAR(255),

    FOREIGN KEY (bid_id)
        REFERENCES bids(bid_id)
        ON DELETE CASCADE
);
CREATE TABLE document_extractions (
    extraction_id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    extracted_value TEXT,
    confidence_score DECIMAL(5,2),
    extraction_method ENUM(
        'OCR',
        'NLP',
        'LLM',
        'MANUAL'
    ) DEFAULT 'OCR',
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (document_id)
        REFERENCES bid_documents(document_id)
        ON DELETE CASCADE
);
CREATE TABLE compliance_checks (
    check_id INT PRIMARY KEY AUTO_INCREMENT,
    bid_id INT NOT NULL,
    requirement_id INT NOT NULL,
    checked_by INT,
    status ENUM(
        'COMPLIANT',
        'NON_COMPLIANT',
        'PARTIALLY_COMPLIANT',
        'PENDING',
        'REQUIRES_REVIEW'
    ) DEFAULT 'PENDING',
    score DECIMAL(5,2),
    remarks TEXT,
    checked_at TIMESTAMP NULL,

    FOREIGN KEY (bid_id)
        REFERENCES bids(bid_id)
        ON DELETE CASCADE,

    FOREIGN KEY (requirement_id)
        REFERENCES bid_requirements(requirement_id)
        ON DELETE CASCADE,

    FOREIGN KEY (checked_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
CREATE TABLE verifications (
    verification_id INT PRIMARY KEY AUTO_INCREMENT,
    bidder_id INT NOT NULL,
    bid_id INT,
    verification_type ENUM(
        'GST',
        'UDYAM',
        'MCA',
        'PAN',
        'OTHER'
    ) NOT NULL,
    reference_number VARCHAR(100),
    verification_status ENUM(
        'VERIFIED',
        'NOT_VERIFIED',
        'PENDING',
        'ERROR'
    ) DEFAULT 'PENDING',
    verification_source VARCHAR(255),
    response_data JSON,
    verified_at TIMESTAMP NULL,

    FOREIGN KEY (bidder_id)
        REFERENCES bidders(bidder_id)
        ON DELETE CASCADE,

    FOREIGN KEY (bid_id)
        REFERENCES bids(bid_id)
        ON DELETE SET NULL
);
CREATE TABLE compliance_evidence (
    evidence_id INT PRIMARY KEY AUTO_INCREMENT,
    check_id INT NOT NULL,
    document_id INT,
    evidence_text TEXT,
    page_number INT,
    evidence_location VARCHAR(255),

    FOREIGN KEY (check_id)
        REFERENCES compliance_checks(check_id)
        ON DELETE CASCADE,

    FOREIGN KEY (document_id)
        REFERENCES bid_documents(document_id)
        ON DELETE SET NULL
);
CREATE TABLE audit_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    bid_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    FOREIGN KEY (bid_id)
        REFERENCES bids(bid_id)
        ON DELETE SET NULL
);
INSERT INTO users
(full_name, email, password_hash, role)
VALUES
('Jhanvi Dwivedi', 'jhanvi@example.com', 'demo_hash_123', 'ADMIN'),
('Compliance Reviewer', 'reviewer@example.com', 'demo_hash_456', 'REVIEWER');
INSERT INTO bidders
(company_name, gst_number, udyam_number, pan_number,
 cin_number, email, phone, address)
VALUES
(
    'ABC Technologies Pvt Ltd',
    '09ABCDE1234F1Z5',
    'UDYAM-UP-01-1234567',
    'ABCDE1234F',
    'U12345UP2020PTC123456',
    'contact@abctech.com',
    '9876543210',
    'Lucknow, Uttar Pradesh'
);
INSERT INTO bids
(
    bidder_id,
    tender_id,
    title,
    description,
    issuing_authority,
    estimated_value,
    submission_deadline,
    bid_status
)
VALUES
(
    1,
    'GEM/2026/B/123456',
    'Supply of Computer Systems',
    'Supply and installation of computer systems for government department.',
    'Government Department',
    7500000.00,
    '2026-10-15 17:00:00',
    'UNDER_REVIEW'
);
INSERT INTO bid_documents
(bid_id, document_name, document_type, file_path, processing_status)
VALUES
(1, 'GST_Certificate.pdf', 'GST Certificate',
 '/uploads/GST_Certificate.pdf', 'PROCESSED'),

(1, 'Udyam_Certificate.pdf', 'Udyam Certificate',
 '/uploads/Udyam_Certificate.pdf', 'PROCESSED'),

(1, 'Company_Profile.pdf', 'Company Profile',
 '/uploads/Company_Profile.pdf', 'PROCESSED'),

(1, 'Financial_Statement.pdf', 'Financial Statement',
 '/uploads/Financial_Statement.pdf', 'PROCESSED');
INSERT INTO bid_requirements
(
    bid_id,
    requirement_code,
    requirement_text,
    requirement_category,
    mandatory,
    expected_value
)
VALUES
(
    1,
    'REQ-001',
    'Bidder must possess a valid GST registration.',
    'LEGAL',
    TRUE,
    'Valid GST'
),

(
    1,
    'REQ-002',
    'Bidder must have a valid Udyam registration.',
    'ELIGIBILITY',
    TRUE,
    'Valid Udyam'
),

(
    1,
    'REQ-003',
    'Minimum annual turnover must be 50 lakh rupees.',
    'FINANCIAL',
    TRUE,
    '5000000'
),

(
    1,
    'REQ-004',
    'Bidder must provide required technical documentation.',
    'TECHNICAL',
    TRUE,
    'Technical documents'
);
INSERT INTO document_extractions
(
    document_id,
    field_name,
    extracted_value,
    confidence_score,
    extraction_method
)
VALUES
(1, 'company_name', 'ABC Technologies Pvt Ltd', 98.50, 'OCR'),

(1, 'gst_number', '09ABCDE1234F1Z5', 99.20, 'OCR'),

(2, 'udyam_number', 'UDYAM-UP-01-1234567', 97.80, 'OCR'),

(4, 'annual_turnover', '7500000', 96.40, 'OCR');
INSERT INTO verifications
(
    bidder_id,
    bid_id,
    verification_type,
    reference_number,
    verification_status,
    verification_source,
    response_data,
    verified_at
)
VALUES
(
    1,
    1,
    'GST',
    '09ABCDE1234F1Z5',
    'VERIFIED',
    'GST Verification Service',
    '{"business_name":"ABC Technologies Pvt Ltd","status":"Active"}',
    NOW()
),

(
    1,
    1,
    'UDYAM',
    'UDYAM-UP-01-1234567',
    'VERIFIED',
    'Udyam Verification Service',
    '{"enterprise_name":"ABC Technologies Pvt Ltd","status":"Active"}',
    NOW()
);
INSERT INTO compliance_checks
(
    bid_id,
    requirement_id,
    checked_by,
    status,
    score,
    remarks,
    checked_at
)
VALUES
(
    1,
    1,
    2,
    'COMPLIANT',
    100,
    'GST number found in document and verification returned active status.',
    NOW()
),

(
    1,
    2,
    2,
    'COMPLIANT',
    100,
    'Valid Udyam registration found and verified.',
    NOW()
),

(
    1,
    3,
    2,
    'COMPLIANT',
    100,
    'Annual turnover extracted as 75 lakh, exceeding required 50 lakh.',
    NOW()
),

(
    1,
    4,
    2,
    'PENDING',
    NULL,
    'Technical documentation requires manual review.',
    NULL
);
INSERT INTO compliance_evidence
(
    check_id,
    document_id,
    evidence_text,
    page_number,
    evidence_location
)
VALUES
(
    1,
    1,
    'GSTIN: 09ABCDE1234F1Z5',
    1,
    'GST Certificate - Registration Details'
),

(
    2,
    2,
    'Udyam Registration Number: UDYAM-UP-01-1234567',
    1,
    'Udyam Certificate'
),

(
    3,
    4,
    'Annual turnover: INR 75,00,000',
    3,
    'Financial Statement - Revenue Section'
);
INSERT INTO audit_logs
(user_id, bid_id, action, description)
VALUES
(
    2,
    1,
    'DOCUMENT_REVIEW',
    'Bid documents reviewed by compliance reviewer.'
),

(
    2,
    1,
    'COMPLIANCE_CHECK',
    'GST requirement marked as compliant.'
),

(
    2,
    1,
    'VERIFICATION',
    'GST and Udyam details verified successfully.'
);
SELECT
    b.tender_id,
    b.title,
    r.requirement_code,
    r.requirement_text,
    c.status,
    c.score,
    c.remarks
FROM bids b
JOIN bid_requirements r
    ON b.bid_id = r.bid_id
LEFT JOIN compliance_checks c
    ON r.requirement_id = c.requirement_id
WHERE b.bid_id = 1;