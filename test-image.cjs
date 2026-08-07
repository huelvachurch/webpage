const fs = require('fs');
async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  // Read a dummy image, or create one
  const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // 1x1 pixel red image
  const body = {
    fileName: "form-test-image.png",
    mimeType: "image/png",
    base64Data: base64Data,
    reimbursementCode: "TEST-IMG",
    gasWebAppUrl: "https://script.google.com/macros/s/AKfycbys7pHRFVR5SSiEbVuA709KldNRNd7m57sXkcCKDhDpJjCGkIxs5clFa41ncNxPAEGjRQ/exec"
  };
  console.log("Sending POST to", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
