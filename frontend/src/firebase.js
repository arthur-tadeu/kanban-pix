import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTDrcY84QOzSl13DudemqX0AcR1GKm760",
  authDomain: "banco-josue.firebaseapp.com",
  projectId: "banco-josue",
  storageBucket: "banco-josue.firebasestorage.app",
  messagingSenderId: "717980553376",
  appId: "1:717980553376:web:af879ed7e7c7988214b9c5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
