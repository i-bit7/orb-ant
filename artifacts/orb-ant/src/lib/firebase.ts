import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCrhw4LZf-wRuLyhOcRCmY372v9U3s4pBo",
  authDomain: "pro21-c2b3e.firebaseapp.com",
  databaseURL: "https://pro21-c2b3e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pro21-c2b3e",
  storageBucket: "pro21-c2b3e.firebasestorage.app",
  messagingSenderId: "284021311046",
  appId: "1:284021311046:web:797ce7db2cfc21ead96c47",
  measurementId: "G-NM4LECWFEB",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
