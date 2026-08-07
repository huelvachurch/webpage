async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  const base64Data = "A".repeat(8 * 1024 * 1024);
  const body = {
    fileName: "form-test-xlarge.txt",
    mimeType: "text/plain",
    base64Data: Buffer.from(base64Data).toString('base64'),
    reimbursementCode: "TEST-999",
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
    console.log("Response:", text.substring(0, 100));
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
