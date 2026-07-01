import { auth, db } from "./config";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// ১. রেজিস্ট্রেশন ফাংশন
export const registerUser = async (formData: any) => {
  const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
  
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    role: formData.role,
    status: "pending", 
    createdAt: new Date().toISOString()
  });

  return userCredential;
};

// ২. লগইন ফাংশন (যেখানে সিকিউরিটি চেক করা হয়েছে)
export const loginUser = async (email: string, password: string) => {
  // ক. ইমেইল ও পাসওয়ার্ড ভ্যালিডেশন (Firebase Auth)
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // খ. Firestore থেকে ইউজারের ডেটা আনা (রেজিস্ট্রেশন চেক)
  const userDocRef = doc(db, "users", userCredential.user.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    // যদি ডাটাবেসে ইউজার না থাকে, তবে লগইন হতে দেবে না
    await signOut(auth);
    throw new Error("এই ইউজারটি সিস্টেমে রেজিস্টার্ড নয়।");
  }

  const userData = userDoc.data();

  // গ. স্ট্যাটাস চেক (অ্যাপ্রুভাল পেন্ডিং চেক)
  if (userData.status === "pending") {
    await signOut(auth); // ইউজারকে লগআউট করিয়ে দেওয়া হচ্ছে
    throw new Error("আপনার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অনুগ্রহ করে অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।");
  }

  return { ...userCredential.user, ...userData };
};