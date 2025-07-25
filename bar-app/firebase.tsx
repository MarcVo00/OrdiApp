import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDnuqvjp982dOH6sms2WAcX4OD3_yiB7dE",
  authDomain: "ordiapp00.firebaseapp.com",
  projectId: "ordiapp00",
  storageBucket: "ordiapp00.firebasestorage.app",
  messagingSenderId: "156793524836",
  appId: "1:156793524836:web:8307ec8aecc03187a04571"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };