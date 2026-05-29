import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const q = query(collection(db, 'posts'), limit(1));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      console.log(doc.id, "=>", doc.data().title);
    });
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
test();
