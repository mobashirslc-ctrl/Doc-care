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

// ২. লগইন ফাংশন (এজেন্ট ও ইউজারদের জন্য)
export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  let userDocRef = doc(db, "agents", userCredential.user.uid);
  let userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    userDocRef = doc(db, "users", userCredential.user.uid);
    userDoc = await getDoc(userDocRef);
  }
  
  if (!userDoc.exists()) {
    await signOut(auth);
    throw new Error("এই ইউজারটি সিস্টেমে রেজিস্টার্ড নয়।");
  }

  const userData = userDoc.data() as any;
  console.log("Firestore Data:", userData);

  if (userData.status === "pending") {
    await signOut(auth);
    throw new Error("আপনার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অনুগ্রহ করে অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।");
  }

  // রোল না থাকলে ডিফল্ট "agent" সেট হবে
  const finalRole = userData.role ? userData.role : "agent";

  return { 
    ...userCredential.user, 
    ...userData, 
    role: finalRole 
  };
};

// ৩. অ্যাডমিন লগইন
export const loginAdmin = async (email: string, password: string) => {
  const ADMIN_EMAIL = "admintech@gmail.com"; 

  if (email !== ADMIN_EMAIL) {
    throw new Error("আপনি অ্যাডমিন নন!");
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  return { ...userCredential.user, role: "admin" };
};

// ৪. লগআউট ফাংশন
export const logoutUser = async () => {
  await signOut(auth);
};