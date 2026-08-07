async function main() {
  const url = "http://localhost:3000/api/drive/upload-attachment";
  // generate a fake image or something... actually let's use the random base64 string we tested before that was 8MB, it succeeded.
  // Wait, if 8MB text succeeded, then size is NOT the issue for GAS.
  console.log("Just checking if the server is up");
}
main();
