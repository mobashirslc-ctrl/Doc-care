import { auth, db } from "./config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export const registerUser = async (formData: any) => {
  // ১. Firebase Auth-এ ইউজার অ্যাকাউন্ট তৈরি
  const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
  
  // ২. Firestore ডাটাবেসে ইউজারের তথ্য সেভ করা
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    role: formData.role, // ডক্টর, রোগী বা এজেন্ট
    status: "pending",   // সব রেজিস্ট্রেশন এখন থেকে পেন্ডিং থাকবে
    createdAt: new Date().toISOString()
  });

  return userCredential;
};