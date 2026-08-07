async function main() {
  const url = "http://localhost:3000/api/drive/test-connection?gasUrl=https://script.google.com/macros/s/AKfycbys7pHRFVR5SSiEbVuA709KldNRNd7m57sXkcCKDhDpJjCGkIxs5clFa41ncNxPAEGjRQ/exec";
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
