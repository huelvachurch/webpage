import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const studiesDb = getFirestore(app, "ai-studio-a2eeb6ca-be40-4061-b380-b75b9d9fb2ef");

async function run() {
  const q = query(collection(studiesDb, 'user_study_interactions'), where('studyId', '==', '1780680434062'), where('userId', '==', 'S4F3NgGY5FbwTddJLhkXxtRndBw1'));
  const snap = await getDocs(q);
  console.log('Interactions found:', snap.size);
  snap.forEach(d => console.log('Inter Data:', d.data()));

  const userDoc = await getDoc(doc(db, 'users', 'S4F3NgGY5FbwTddJLhkXxtRndBw1'));
  if (userDoc.exists()) {
    console.log('User Data:', userDoc.data());
  } else {
    console.log('User not found');
  }
}

run().catch(console.error);
