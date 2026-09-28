# GEM Sentinel Frontend

Modern vanilla HTML/CSS/JavaScript prototype based on the supplied `gem_sentinel.sql` schema.

## Run
Open `index.html` directly in a browser, or serve the folder with a local server.

## Demo
Landing page -> Sign in -> choose Bidder or Reviewer.

The UI uses mock frontend data matching the supplied SQL:
- GEM/2026/B/123456
- ABC Technologies Pvt Ltd
- 4 uploaded documents
- 4 requirements
- 3 compliant checks + 1 pending
- GST and Udyam verified

## Backend integration
Replace the mock arrays/functions in `js/app.js` with API calls to your Flask/PHP/Node backend. The database should remain the source of truth. Uploaded files can initially be stored in a local server `/uploads` folder, with `bid_documents.file_path` storing the path.
