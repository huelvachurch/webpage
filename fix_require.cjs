const fs = require('fs');

// Fix Lideres.tsx
let lideres = fs.readFileSync('src/pages/Lideres.tsx', 'utf-8');
lideres = lideres.replace(/const \{ updateDoc, doc, serverTimestamp \} = require\('firebase\/firestore'\);\n/g, '');
fs.writeFileSync('src/pages/Lideres.tsx', lideres);

// Fix MiCelula.tsx
let micelula = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');
micelula = micelula.replace(
  /import \{ collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp \} from 'firebase\/firestore';/,
  "import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';"
);
micelula = micelula.replace(/const \{ updateDoc, doc, serverTimestamp \} = require\('firebase\/firestore'\);\n/g, '');
fs.writeFileSync('src/pages/MiCelula.tsx', micelula);
