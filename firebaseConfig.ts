import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";
import * as firebaseAuth from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDs2PK8YITgeOv6tLFP3P5WOY950ooEFM8",
  authDomain: "values-passport.firebaseapp.com",
  projectId: "values-passport",
  storageBucket: "values-passport.firebasestorage.app",
  messagingSenderId: "153649398478",
  appId: "1:153649398478:web:127370de5fca668ba1469f",
  measurementId: "G-PMQFZG0DRX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Initialize Services
export const db = getFirestore(app);
export const auth = firebaseAuth.getAuth(app);
