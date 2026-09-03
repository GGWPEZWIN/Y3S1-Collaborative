import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdWZNDebQyqnsHzYpete9j9q4Jmx8rFuU",
  authDomain: "greentrip-malaysia.firebaseapp.com",
  projectId: "greentrip-malaysia",
  storageBucket: "greentrip-malaysia.firebasestorage.app",
  messagingSenderId: "1082521143838",
  appId: "1:1082521143838:web:248aa48fca37f4e90d3c0f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);