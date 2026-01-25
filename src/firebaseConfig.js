// src/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDJ8HyRAm7z0RlgmYy3EjubVujy7E3ZBfA",
  authDomain: "drwaiting-30f56.firebaseapp.com",
  projectId: "drwaiting-30f56",
  storageBucket: "drwaiting-30f56.firebasestorage.app",
  messagingSenderId: "937005545176",
  appId: "1:937005545176:web:be56ec33fce7e64e9f49ad",
  measurementId: "G-34TTB75D9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);