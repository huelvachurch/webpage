async function main() {
  const url = "https://script.google.com/macros/s/AKfycbys7pHRFVR5SSiEbVuA709KldNRNd7m57sXkcCKDhDpJjCGkIxs5clFa41ncNxPAEGjRQ/exec";
  console.log("Sending GET to", url);
  try {
    const res = await fetch(url, {
      method: "GET"
    });
    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response starts with:", text.substring(0, 100));
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
