async function main() {
  const url = "https://script.google.com/macros/s/AKfycbys7pHRFVR5SSiEbVuA709KldNRNd7m57sXkcCKDhDpJjCGkIxs5clFa41ncNxPAEGjRQ/exec";
  const body = {
    fileName: "test.txt",
    mimeType: "text/plain",
    base64Data: Buffer.from("Hello World").toString('base64'),
    folderId: "11EJzsr8vs0r0kkpSVeA1p0EdqFjrpH7s"
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
