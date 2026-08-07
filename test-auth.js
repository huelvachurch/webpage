const { GoogleAuth } = require('google-auth-library');
async function test() {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    console.log("Service Account:", client.email || client.credentials?.client_email || "Unknown");
  } catch (e) {
    console.error(e);
  }
}
test();
