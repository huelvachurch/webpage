import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function test() {
  try {
    await addDoc(collection(db, 'contact_notifications'), {
        nombre: 'Test User',
        apellidos: 'Test Last',
        whatsapp: '123456789',
        email: 'test@example.com',
        zona: 'Zone A',
        cellName: 'Cell A',
        leaderId: 'admin',
        leaderEmail: 'admin@example.com',
        leaderName: 'Admin',
        supervisorId: '',
        supervisorEmail: '',
        supervisorName: '',
        createdAt: new Date().toISOString(),
        readByLeader: false,
        readBySupervisor: false
    });
    console.log("Success");
  } catch (err) {
    console.log("Error:", err.message);
  }
}

test();
