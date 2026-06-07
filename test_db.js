import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-34449",
  appId: "1:458081726794:web:c336d849be408a223291b3",
  apiKey: "AIzaSyCJ2Cl3Q3TEcZ2KcWYps2hwASCVRDjXQU8",
};

const app = initializeApp(firebaseConfig);
const db2 = getFirestore(app, "ai-studio-a2eeb6ca-be40-4061-b380-b75b9d9fb2ef");

async function run() {
  try {
    const snap = await getDocs(collection(db2, "studies"));
    console.log("Count:", snap.size);
    snap.docs.forEach(doc => {
       const keys = Object.keys(doc.data());
       console.log(doc.id, keys, doc.data().title, doc.data().studyTitle);
    });
  } catch(e) { console.log("error", e.message); }
  
  process.exit(0);
}
run();
