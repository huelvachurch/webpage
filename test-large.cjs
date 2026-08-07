async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  // Generate a dummy 1MB base64 string (1,333,333 chars)
  const base64Data = "A".repeat(1333333);
  const body = {
    fileName: "form-test-large.txt",
    mimeType: "text/plain",
    base64Data: Buffer.from(base64Data).toString('base64'),
    reimbursementCode: "TEST-789",
    gasWebAppUrl: "https://script.google.com/macros/s/AKfycbys7pHRFVR5SSiEbVuA709KldNRNd7m57sXkcCKDhDpJjCGkIxs5clFa41ncNxPAEGjRQ/exec"
  };
  console.log("Sending POST to", url, "with size", body.base64Data.length);
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
