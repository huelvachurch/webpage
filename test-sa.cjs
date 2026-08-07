const { GoogleAuth } = require('google-auth-library');
async function main() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  console.log('Credentials keys:', Object.keys(client.credentials || {}));
  console.log('Credentials:', client.credentials);
}
main().catch(console.error);
