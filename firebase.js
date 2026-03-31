import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmEivwBF_2fBRDfKgLsmzLk_xEauG6iHw",
  authDomain: "cardvault-9e1eb.firebaseapp.com",
  projectId: "cardvault-9e1eb",
  storageBucket: "cardvault-9e1eb.firebasestorage.app",
  messagingSenderId: "965970652947",
  appId: "1:965970652947:web:c31b581dedcd40cb0a74e6",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
