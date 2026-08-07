async function main() {
  const url = "http://localhost:3000/api/drive/test-connection";
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
