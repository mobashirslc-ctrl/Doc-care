import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config"; // আপনার কনফিগ ফাইল

export function LoginPage({ go, setAuth }: { go: (v: any) => void; setAuth: (u: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Firebase-এ লগইন
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // লগইন সফল হলে ড্যাশবোর্ডে পাঠানো
      // এখানে আপনি চাইলে Firestore থেকে ইউজারের Role চেক করে ডাইরেক্ট করতে পারেন
      alert("লগইন সফল!");
      go("doctor"); // অথবা আপনার লজিক অনুযায়ী ডাইনামিক ড্যাশবোর্ড
    } catch (error: any) {
      alert("লগইন ব্যর্থ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">লগইন করুন</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            className="w-full p-3 border rounded-xl" 
            placeholder="ইমেইল" 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            className="w-full p-3 border rounded-xl" 
            placeholder="পাসওয়ার্ড" 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[#FF5E13] text-white rounded-xl font-bold"
          >
            {loading ? "অপেক্ষা করুন..." : "লগইন করুন"}
          </button>
        </form>
        <p className="text-center mt-4 text-sm">
          অ্যাকাউন্ট নেই? <button onClick={() => go("register")} className="text-[#FF5E13] font-bold">রেজিস্ট্রেশন করুন</button>
        </p>
      </div>
    </div>
  );
}