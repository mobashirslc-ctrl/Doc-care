import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMoBfbx_TYOHBhMMRtmgyLqquDsvXWHJA",
  authDomain: "doctor-f0226.firebaseapp.com",
  projectId: "doctor-f0226",
  storageBucket: "doctor-f0226.firebasestorage.app",
  messagingSenderId: "723651164549",
  appId: "1:723651164549:web:ac4b7c528948771869ecec",
  measurementId: "G-NSZW0HX3G8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);