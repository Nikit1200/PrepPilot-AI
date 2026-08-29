const { generatePdfFromHtml } = require("../src/services/ai.service");

generatePdfFromHtml("<!doctype html><html><body><h1>CareerMateAI PDF smoke test</h1></body></html>")
    .then((pdf) => {
        if (!Buffer.isBuffer(pdf) || pdf.length === 0) throw new Error("No PDF buffer was generated.");
        console.log(`PDF smoke test passed (${pdf.length} bytes).`);
    })
    .catch((error) => {
        console.error("PDF smoke test failed:", error.message);
        process.exitCode = 1;
    });
