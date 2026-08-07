async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  const body = {
    fileName: "test-express.txt",
    mimeType: "text/plain",
    base64Data: Buffer.from("Hello from Express Test").toString('base64'),
    reimbursementCode: "TEST-123"
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
