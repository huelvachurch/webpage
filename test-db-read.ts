import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
     console.log("Fetching doc...");
     const snap = await getDoc(doc(db, "settings", "general"));
     console.log("Exists:", snap.exists());
     console.log("Data:", snap.data());
  } catch(e) {
     console.error("Error:", e);
  }
  process.exit();
}
test();
