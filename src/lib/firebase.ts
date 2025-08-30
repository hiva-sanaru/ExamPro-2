
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "exampro-2-z3fpi",
  "appId": "1:552284590150:web:669ae96b51df245488ba47",
  "storageBucket": "exampro-2-z3fpi.firebasestorage.app",
  "apiKey": "AIzaSyCf-k-Keo54pBqvHjiUO796kT7tGP8WuHI",
  "authDomain": "exampro-2-z3fpi.firebaseapp.com",
  "messagingSenderId": "552284590150"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with memory cache to disable offline persistence
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});


export { app, db };
