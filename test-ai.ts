import fs from 'fs';

async function testai() {
  const result = await fetch('http://127.0.0.1:3000/api/gemini/generate-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: "Un informe sobre Jesús de Nazaret",
      imageData: null,
      imageMimeType: null
    })
  });
  const data = await result.json();
  console.log(result.status, data);
}

testai();
