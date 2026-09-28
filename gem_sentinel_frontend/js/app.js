
const state={role:"bidder",page:"dashboard"};
let bids = [];

const API_BASE_URL = "https://bid-compliance-system.onrender.com";

async function loadBids() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bids`);

        if (!response.ok) {
            throw new Error("Failed to fetch bids");
        }

        const data = await response.json();

        bids = (data.bids || []).map(bid => ({
            id: bid.bid_id,
            tender: bid.tender_id,
            title: bid.title,
            authority: bid.issuing_authority,
            value: Number(bid.estimated_value).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }),
            deadline: new Date(bid.submission_deadline).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }),
            status: bid.bid_status,
            score: null
        }));

        console.log("Bids loaded:", bids);

    } catch (error) {
        console.error("Error loading bids:", error);
        showToast("Could not connect to GEM Sentinel backend");
    }
}

async function loadVerifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bids/1/verifications`);

        if (!response.ok) {
            throw new Error("Failed to fetch verifications");
        }

        const data = await response.json();

        console.log("Verifications loaded:", data.verifications);

    } catch (error) {
        console.error("Error loading verifications:", error);
        showToast("Could not load verification data from backend");
    }
}

/*
 * These functions are kept safe because their original implementations
 * were not included in the app.js you provided.
 * They do not change your existing UI.
 */
async function loadDocuments() {
    return;
}

async function loadCompliance() {
    return;
}

async function loadExtractions() {
    return;
}

const docs=[
    {name:"GST_Certificate.pdf",type:"GST Certificate",status:"PROCESSED"},
    {name:"Udyam_Certificate.pdf",type:"Udyam Certificate",status:"PROCESSED"},
    {name:"Company_Profile.pdf",type:"Company Profile",status:"PROCESSED"},
    {name:"Financial_Statement.pdf",type:"Financial Statement",status:"PROCESSED"}
];

const checks=[
    {
        code:"REQ-001",
        text:"Bidder must possess a valid GST registration.",
        category:"LEGAL",
        status:"COMPLIANT",
        score:100,
        remark:"GST number found in document and verification returned active status.",
        evidence:"GSTIN: 09ABCDE1234F1Z5",
        doc:"GST_Certificate.pdf",
        page:1
    },
    {
        code:"REQ-002",
        text:"Bidder must have a valid Udyam registration.",
        category:"ELIGIBILITY",
        status:"COMPLIANT",
        score:100,
        remark:"Valid Udyam registration found and verified.",
        evidence:"Udyam Registration Number: UDYAM-UP-01-1234567",
        doc:"Udyam_Certificate.pdf",
        page:1
    },
    {
        code:"REQ-003",
        text:"Minimum annual turnover must be 50 lakh rupees.",
        category:"FINANCIAL",
        status:"COMPLIANT",
        score:100,
        remark:"Annual turnover extracted as 75 lakh, exceeding required 50 lakh.",
        evidence:"Annual turnover: INR 75,00,000",
        doc:"Financial_Statement.pdf",
        page:3
    },
    {
        code:"REQ-004",
        text:"Bidder must provide required technical documentation.",
        category:"TECHNICAL",
        status:"PENDING",
        score:null,
        remark:"Technical documentation requires manual review.",
        evidence:null,
        doc:null,
        page:null
    }
];

function $(id){return document.getElementById(id)}

function showLanding(){
    $("landing").classList.remove("hidden");
    $("login").classList.add("hidden");
    $("app").classList.add("hidden")
}

function showLogin(role){
    $("landing").classList.add("hidden");
    $("login").classList.remove("hidden");
    $("app").classList.add("hidden");
    if(role)selectRole(role)
}

function selectRole(role){
    state.role=role;
    document.querySelectorAll(".role-card").forEach(x=>x.classList.remove("active"));
    $(role==="bidder"?"roleBidder":"roleReviewer").classList.add("active")
}

function enterApp(){
    $("login").classList.add("hidden");
    $("landing").classList.add("hidden");
    $("app").classList.remove("hidden");

    buildNav();

    history.replaceState(
        { page: "dashboard", role: state.role },
        "",
        "#dashboard"
    );

    go("dashboard", false);
}

function buildNav(){
    const bidder=state.role==="bidder";

    $("profileName").textContent=bidder?"ABC Technologies Pvt Ltd":"Compliance Reviewer";
    $("profileRole").textContent=bidder?"Bidder":"Reviewer";

    $("sideNav").innerHTML=bidder?`
<div class="nav-label">WORKSPACE</div>
${nav("dashboard","▦","Dashboard")}${nav("bids","◈","My Bids")}${nav("documents","□","Documents")}${nav("compliance","✓","Compliance")}${nav("notifications","○","Notifications")}
<div class="nav-label">ACCOUNT</div>${nav("profile","◎","Company Profile")}
`:`<div class="nav-label">REVIEW WORKSPACE</div>
${nav("dashboard","▦","Dashboard")}${nav("tenders","◇","GeM Tenders")}${nav("reviews","✓","Bid Review")}${nav("analytics","◒","Analytics")}${nav("verifications","◇","Verifications")}
<div class="nav-label">SYSTEM</div>${nav("audit","◌","Audit Trail")}${nav("profile","◎","Profile")}`
}

function nav(page,icon,label){
    return `<button class="nav-item ${state.page===page?"active":""}" onclick="go('${page}')"><span class="nav-icon">${icon}</span>${label}</button>`
}

function go(page, addToHistory = true) {
    state.page = page;

    if (addToHistory) {
        history.pushState(
            { page: page, role: state.role },
            "",
            "#" + page
        );
    }

    buildNav();

    $("pageTitle").textContent = pageTitle(page);

    $("pageContent").innerHTML =
        state.role === "bidder"
            ? bidderPage(page)
            : reviewerPage(page);

    window.scrollTo(0, 0);
}

function pageTitle(p){
    return ({
        dashboard:"Dashboard",
        bids:"My Bids",
        documents:"Documents",
        compliance:"Compliance Center",
        notifications:"Notifications",
        profile:"Company Profile",
        tenders:"GeM Tenders",
        reviews:"Bid Review",
        analytics:"Analytics",
        verifications:"Verifications",
        audit:"Audit Trail"
    })[p]||"Dashboard"
}

function header(title,desc,action=""){
    return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div>${action?`<div class="head-actions">${action}</div>`:""}</div>`
}

function bidderPage(p){
    if(p==="dashboard")return bidderDashboard();

    if(p==="bids")return `<div class="page">${header("My Bids","Track your GeM bids, deadlines and compliance status.",`<button class="primary-btn" onclick="showToast('GeM bid discovery is ready for API integration.')">+ Find GeM Bid</button>`)}<div class="card"><div class="searchbar"><input class="search-input" placeholder="Search tender ID, title or authority..." oninput="filterBids(this.value)"><select class="filter"><option>All statuses</option><option>Under review</option><option>Compliant</option></select></div><div id="bidTable">${bidTable()}</div></div></div>`;

    if(p==="documents")return `<div class="page">${header("Document Vault","Upload and track documents attached to your bids.")}<div class="grid-2"><div class="card"><div class="card-head"><h3>Upload documents</h3><span class="badge blue">BID #1</span></div><div class="dropzone" onclick="$('fileInput').click()" ondragover="event.preventDefault()" ondrop="handleDrop(event)"><div class="upload-icon">↑</div><h4>Drop files here</h4><p>PDF, JPG or PNG · Click to browse</p><button class="secondary-btn">Browse files</button><input id="fileInput" type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png" onchange="handleFiles(this.files)"></div><div id="uploadedList" class="file-list">${docRows()}</div></div><div class="card"><div class="card-head"><h3>Processing pipeline</h3></div>${pipeline("Uploaded","4 documents received","green",100)}${pipeline("Extraction","OCR fields extracted","green",100)}${pipeline("Compliance","3/4 requirements cleared","amber",75)}${pipeline("Review","Technical document pending","amber",25)}</div></div></div>`;

    if(p==="compliance")return `<div class="page">${header("Compliance Center","Evidence-backed checks for GEM/2026/B/123456.")}<div class="grid-2"><div class="card"><div class="card-head"><h3>Overall compliance</h3><span class="badge amber">UNDER REVIEW</span></div><div class="compliance-card"><div class="big-ring"><span>92%</span></div><div class="check-list">${checks.map(c=>`<div class="check-line"><span>${c.text}</span><span class="check ${c.status==="COMPLIANT"?"ok":"pending"}">${c.status==="COMPLIANT"?"✓":"◐"} ${c.status==="COMPLIANT"?"Pass":"Review"}</span></div>`).join("")}</div></div></div><div class="card"><div class="card-head"><h3>Verification signals</h3></div>${verify("GST","09ABCDE1234F1Z5","VERIFIED")}${verify("UDYAM","UDYAM-UP-01-1234567","VERIFIED")}</div></div><div class="card" style="margin-top:18px"><div class="card-head"><h3>Requirement details</h3></div>${checks.map(checkCard).join("")}</div></div>`;

    if(p==="notifications")return `<div class="page">${header("Notifications","Recent events related to your bids.")}<div class="card">${activityItem("✓","GST verification completed successfully","2 hours ago")}${activityItem("◐","Technical documentation requires manual review","Today, 10:31 AM")}${activityItem("↑","Financial Statement processed successfully","Yesterday, 4:42 PM")}</div></div>`;

    return profilePage("Company Profile","ABC Technologies Pvt Ltd");
}

function bidderDashboard(){
    return `<div class="page">${header("Good morning, Bidder 👋","Here’s what needs your attention today.",`<button class="secondary-btn" onclick="go('documents')">Upload documents</button><button class="primary-btn" onclick="go('bids')">View GeM bids →</button>`)}<div class="stats">${stat("Active bids","01","Under review","◈")}${stat("Documents","04","All processed","□")}${stat("Compliance","92%","3 of 4 cleared","✓","green")}${stat("Days to deadline","23","15 Oct 2026","◷")}</div><div class="grid-2"><div class="card"><div class="card-head"><h3>Active bid</h3><button class="link-btn" onclick="go('bids')">View all</button></div>${bidTable()}</div><div class="card"><div class="card-head"><h3>Compliance snapshot</h3></div><div class="compliance-card"><div class="big-ring"><span>92%</span></div><div class="check-list">${checks.map(c=>`<div class="check-line"><span>${c.code}</span><span class="check ${c.status==="COMPLIANT"?"ok":"pending"}">${c.status==="COMPLIANT"?"✓":"◐"}</span></div>`).join("")}</div></div></div></div><div class="grid-2" style="margin-top:18px"><div class="card"><div class="card-head"><h3>Document processing</h3><button class="link-btn" onclick="go('documents')">Manage</button></div>${pipeline("Documents uploaded","4 / 4","green",100)}${pipeline("Fields extracted","4 / 4","green",100)}${pipeline("Compliance checks","3 / 4","amber",75)}</div><div class="card"><div class="card-head"><h3>Recent activity</h3></div><div class="activity">${activityItem("✓","GST and Udyam details verified","Today, 10:42 AM")}${activityItem("◐","Technical documentation flagged for review","Today, 10:31 AM")}${activityItem("□","Financial Statement processed","Yesterday, 4:42 PM")}</div></div></div></div>`
}

function reviewerPage(p){
    if(p==="dashboard")return reviewerDashboard();

    if(p==="tenders")return `<div class="page">${header("GeM Tenders","Monitor tender-linked bids and procurement activity.",`<button class="primary-btn" onclick="showToast('Tender creation form can be connected to your backend.')">+ Create tender</button>`)}<div class="stats">${stat("Open tenders","12","Active","◇")}${stat("Bids received","87","+12 this week","◈")}${stat("Under review","19","Needs attention","◐","amber")}${stat("Flagged","06","Requires action","!","red")}</div><div class="card">${bidTable(true)}</div></div>`;

    if(p==="reviews")return reviewPage();

    if(p==="analytics")return analyticsPage();

    if(p==="verifications")return `<div class="page">${header("Verifications","External identity and registration verification signals.")}<div class="card"><div class="card-head"><h3>Verification queue</h3><span class="badge green">2 verified</span></div>${verify("GST","09ABCDE1234F1Z5","VERIFIED")}${verify("UDYAM","UDYAM-UP-01-1234567","VERIFIED")}${verify("PAN","ABCDE1234F","PENDING")}</div></div>`;

    if(p==="audit")return `<div class="page">${header("Audit Trail","Immutable-style activity view for review actions.")}<div class="card"><div class="activity">${activityItem("✓","Compliance check · GST requirement marked compliant","Reviewer · Today 10:42 AM")}${activityItem("◇","Verification · GST and Udyam details verified successfully","Reviewer · Today 10:40 AM")}${activityItem("□","Document review · Bid documents reviewed","Reviewer · Today 10:31 AM")}</div></div></div>`;

    return profilePage("Reviewer Profile","Compliance Reviewer");
}

function reviewerDashboard(){
    return `<div class="page">${header("Procurement overview","A live view of bids, compliance and review workload.",`<button class="secondary-btn" onclick="go('analytics')">View analytics</button><button class="primary-btn" onclick="go('reviews')">Review queue →</button>`)}<div class="stats">${stat("Active tenders","12","Open for bids","◇")}${stat("Bids received","87","+12 this week","◈")}${stat("Compliant","63","72% of reviewed","✓","green")}${stat("Flagged","06","Requires action","!","red")}</div><div class="grid-2"><div class="card"><div class="card-head"><h3>Recent bids</h3><button class="link-btn" onclick="go('reviews')">Open review queue</button></div>${bidTable(true)}</div><div class="card"><div class="card-head"><h3>Review workload</h3></div>${pipeline("Compliant","63 bids cleared","green",72)}${pipeline("Under review","19 bids","amber",45)}${pipeline("Flagged","6 bids","red",18)}<div class="activity" style="margin-top:18px">${activityItem("!","1 technical requirement needs review","10 min ago")}${activityItem("✓","GST verification completed","32 min ago")}</div></div></div></div>`
}

function reviewPage(){
    return `<div class="page">${header("Bid review","GEM/2026/B/123456 · ABC Technologies Pvt Ltd",`<button class="secondary-btn" onclick="showToast('Clarification request queued.')">Request clarification</button><button class="primary-btn" onclick="showToast('Bid marked ready for approval.')">Approve bid</button>`)}<div class="review-layout"><div class="card"><div class="card-head"><h3>Compliance requirements</h3><span class="badge amber">3 PASS · 1 REVIEW</span></div>${checks.map(checkCardReviewer).join("")}</div><div><div class="card"><div class="card-head"><h3>Bid summary</h3></div><div class="progress-row"><div class="progress-meta"><span>Compliance score</span><b>92%</b></div><div class="progress-track"><div class="progress-fill green" style="width:92%"></div></div></div>${summaryRow("Tender ID","GEM/2026/B/123456")}${summaryRow("Bidder","ABC Technologies Pvt Ltd")}${summaryRow("Value","₹75,00,000")}${summaryRow("Deadline","15 Oct 2026 · 5:00 PM")}</div><div class="card" style="margin-top:18px"><div class="card-head"><h3>Evidence trail</h3></div>${activityItem("✓","GST evidence · Page 1","Verified")}${activityItem("✓","Udyam evidence · Page 1","Verified")}${activityItem("✓","Turnover evidence · Page 3","Verified")}</div></div></div></div>`
}

function analyticsPage(){
    return `<div class="page">${header("Compliance analytics","Portfolio-level view of procurement review signals.")}<div class="stats">${stat("Avg. compliance","86.4%","Across reviewed bids","✓")}${stat("Compliant","63","72% of bids","✓","green")}${stat("Partial","12","14% of bids","◐","amber")}${stat("Non-compliant","12","14% of bids","!","red")}</div><div class="grid-2"><div class="card"><div class="card-head"><h3>Compliance distribution</h3></div><div class="progress-row">${pipeline("Compliant","63 bids", "green",72)}${pipeline("Partially compliant","12 bids","amber",14)}${pipeline("Non-compliant","12 bids","red",14)}</div></div><div class="card"><div class="card-head"><h3>Requirement categories</h3></div>${pipeline("Legal","92% pass rate","green",92)}${pipeline("Eligibility","88% pass rate","green",88)}${pipeline("Financial","81% pass rate","amber",81)}${pipeline("Technical","74% pass rate","amber",74)}</div></div></div>`
}

function bidTable(officer=false){
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Bid / Tender</th><th>Bidder</th><th>Value</th><th>Deadline</th><th>Compliance</th><th>Status</th></tr></thead><tbody>${bids.map(b=>`<tr onclick="go('${officer?'reviews':'bids'}')" style="cursor:pointer"><td><span class="bid-id">${b.tender}</span><span class="sub">${b.title}</span></td><td>${officer?"ABC Technologies Pvt Ltd":"Government Department"}</td><td>${b.value}</td><td>${b.deadline}</td><td><span class="score green">${b.score}%</span></td><td><span class="badge amber">${b.status.replace("_"," ")}</span></td></tr>`).join("")}</tbody></table></div>`
}

function checkCard(c){
    return `<div class="review-item"><div class="review-head"><b>${c.code} · ${c.category}</b><span class="badge ${c.status==="COMPLIANT"?"green":"amber"}">${c.status}</span></div><p>${c.text}</p>${c.evidence?`<div class="evidence"><b>Evidence:</b> ${c.evidence} · ${c.doc} · Page ${c.page}</div>`:`<div class="evidence"><b>Reviewer note:</b> ${c.remark}</div>`}</div>`
}

function checkCardReviewer(c){
    return `<div class="review-item"><div class="review-head"><b>${c.code} · ${c.category}</b><span class="badge ${c.status==="COMPLIANT"?"green":"amber"}">${c.status}</span></div><p>${c.text}</p><div class="evidence">${c.evidence?`<b>Evidence:</b> ${c.evidence}<br><span>${c.doc} · Page ${c.page}</span>`:`<b>Review required:</b> ${c.remark}`}</div><div class="action-row">${c.status==="COMPLIANT"?`<button class="small-btn approve" onclick="showToast('${c.code} confirmed compliant.')">✓ Confirm</button>`:`<button class="small-btn flag" onclick="showToast('Requirement sent for manual review.')">Review evidence</button>`}<button class="small-btn neutral" onclick="showToast('Document viewer opened in production.')">View document</button></div></div>`
}

function stat(label,value,sub,icon,tone=""){
    return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><h3>${value}</h3><small class="${tone==="green"?"up":tone==="amber"?"":tone==="red"?"":""}">${sub}</small></div>`
}

function pipeline(name,sub,tone,pct){
    return `<div class="progress-row"><div class="progress-meta"><span>${name}</span><b>${sub}</b></div><div class="progress-track"><div class="progress-fill ${tone}" style="width:${pct}%"></div></div></div>`
}

function activityItem(icon,title,time){
    return `<div class="activity-item"><div class="activity-dot">${icon}</div><div><b>${title}</b><small>${time}</small></div></div>`
}

function verify(type,ref,status){
    return `<div class="check-line" style="padding:13px 0"><span><b>${type}</b><small class="sub">${ref}</small></span><span class="badge ${status==="VERIFIED"?"green":"amber"}">${status}</span></div>`
}

function summaryRow(a,b){
    return `<div class="check-line"><span>${a}</span><b>${b}</b></div>`
}

function docRows(){
    return docs.map(d=>`<div class="file-row"><span class="file-symbol">PDF</span><div><b>${d.name}</b><small>${d.type} · ${d.status}</small></div><span class="badge green">Processed</span></div>`).join("")
}

function profilePage(title,company){
    return `<div class="page">${header(title,company)}<div class="card"><div class="card-head"><h3>Organization details</h3><span class="badge green">Verified identity</span></div>${summaryRow("Company","ABC Technologies Pvt Ltd")}${summaryRow("GST","09ABCDE1234F1Z5")}${summaryRow("Udyam","UDYAM-UP-01-1234567")}${summaryRow("PAN","ABCDE1234F")}${summaryRow("CIN","U12345UP2020PTC123456")}${summaryRow("Location","Lucknow, Uttar Pradesh")}</div></div>`
}

async function handleFiles(files) {
    if (!files.length) return;

    for (const file of files) {
        try {
            const formData = new FormData();
            formData.append("document", file);

            const response = await fetch(
                `${API_BASE_URL}/api/bids/1/documents`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Upload failed");
            }

            docs.push({
                name: file.name,
                type: file.type || "Uploaded document",
                status: "UPLOADED"
            });

            showToast(file.name + " uploaded successfully.");

        } catch (error) {
            console.error("Upload Error:", error);
            showToast("Upload failed: " + file.name);
        }
    }

    $("uploadedList").innerHTML = docRows();
}

function handleDrop(e){
    e.preventDefault();
    handleFiles(e.dataTransfer.files)
}

function filterBids(v){
    $("bidTable").innerHTML=v.toLowerCase().includes("xyz")
        ?'<div class="empty">No matching bids found.</div>'
        :bidTable(state.role==="reviewer")
}

function showToast(msg){
    const t=$("toast");
    t.textContent=msg;
    t.classList.add("show");
    clearTimeout(window.__toast);
    window.__toast=setTimeout(()=>t.classList.remove("show"),2500)
}

function toggleSidebar(){
    $(".sidebar").classList.toggle("open")
}

window.addEventListener("popstate", function(event) {
    const page = event.state?.page || "dashboard";

    state.page = page;

    buildNav();

    $("pageTitle").textContent = pageTitle(page);

    $("pageContent").innerHTML =
        state.role === "bidder"
            ? bidderPage(page)
            : reviewerPage(page);

    window.scrollTo(0, 0);
});

window.onload = async () => {
    showLanding();

    await loadBids();
    await loadDocuments();
    await loadCompliance();
    await loadExtractions();
    await loadVerifications();
};
