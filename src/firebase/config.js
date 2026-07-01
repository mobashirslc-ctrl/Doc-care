import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";        // ১. এটি যুক্ত করুন
import { getFirestore } from "firebase/firestore"; // ২. এটি যুক্ত করুন

const firebaseConfig = {
  apiKey: "AIzaSyBoI7w6g0WuJy9L3L_6l7F-rlAgh8OPfOI",
  authDomain: "doc-care-4fe26.firebaseapp.com",
  projectId: "doc-care-4fe26",
  storageBucket: "doc-care-4fe26.firebasestorage.app",
  messagingSenderId: "876136814358",
  appId: "1:876136814358:web:d9d4456530cdad9b976237",
  measurementId: "G-N058SGEX3W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ৩. এগুলো এক্সপোর্ট করুন যাতে অন্য ফাইল থেকে ব্যবহার করা যায়
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };