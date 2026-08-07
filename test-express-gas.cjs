async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  const body = {
    fileName: "form-test.txt",
    mimeType: "text/plain",
    base64Data: Buffer.from("Hello from Express through GAS").toString('base64'),
    reimbursementCode: "TEST-456",
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
