import http from 'http';
import crypto from 'crypto';
const data = crypto.randomBytes(10 * 1024 * 1024).toString('base64');
const body = JSON.stringify({ pdfBase64: data, mimeType: 'application/pdf' });
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/gemini/analyze-pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let resBody = '';
  res.on('data', d => resBody += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', resBody));
});
req.on('error', e => console.error('Error:', e));
req.write(body);
req.end();
