async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  const base64Data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  const body = {
    fileName: "form-test-canvas.jpg",
    mimeType: "image/jpeg",
    base64Data: base64Data,
    reimbursementCode: "TEST-CANVAS",
    gasWebAppUrl: "https://script.google.com/macros/s/AKfycbys7pHRFVR5SSiEbVuA709KldNRNd7m57sXkcCKDhDpJjCGkIxs5clFa41ncNxPAEGjRQ/exec"
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
