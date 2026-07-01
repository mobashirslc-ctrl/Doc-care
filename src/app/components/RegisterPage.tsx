import React, { useState, useRef } from "react";
import { User, Lock, Mail, Phone, Heart, Check, X, Upload, BookOpen, Calendar, Briefcase, Globe } from "lucide-react";
import { registerUser } from "../firebase/auth"; // আপনার তৈরি করা auth লজিক

export function RegisterPage({ go, setDocPackage }: { go: (v: any) => void; setDocPackage: (p: any) => void }) {
  const [role, setRole] = useState("doctor");
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPass: "", specialty: "", chamber: "", role: "doctor" });

  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleFinalSubmit = async () => {
    try {
      // Firebase-এ রেজিস্ট্রেশন
      await registerUser({ ...form, role });
      
      // রেজিস্ট্রেশন সফল হলে ডাইরেকশন
      if (role === "doctor") {
        setDocPackage("pro"); // ডিফল্ট প্যাকেজ
        go("doctor-payment");
      } else if (role === "agent") {
        go("pending");
      } else {
        go(role);
      }
    } catch (error: any) {
      alert("রেজিস্ট্রেশন ব্যর্থ: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-10" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">নতুন অ্যাকাউন্ট তৈরি করুন</h2>
        
        {/* Role Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl mb-6">
          {["doctor", "patient", "agent", "admin"].map((r) => (
            <button key={r} onClick={() => { setRole(r); setForm(p => ({ ...p, role: r })); }}
              className={`py-2 px-1 rounded-lg text-xs font-semibold capitalize ${role === r ? "bg-white shadow text-orange-600" : "text-gray-500"}`}>
              {r}
            </button>
          ))}
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <input className="w-full p-3 border rounded-xl" placeholder="পূর্ণ নাম" onChange={(e) => upd("name", e.target.value)} />
          <input className="w-full p-3 border rounded-xl" placeholder="ইমেইল" onChange={(e) => upd("email", e.target.value)} />
          <input className="w-full p-3 border rounded-xl" placeholder="মোবাইল নম্বর" onChange={(e) => upd("phone", e.target.value)} />
          <input type="password" className="w-full p-3 border rounded-xl" placeholder="পাসওয়ার্ড" onChange={(e) => upd("password", e.target.value)} />
          <input type="password" className="w-full p-3 border rounded-xl" placeholder="পাসওয়ার্ড নিশ্চিত করুন" onChange={(e) => upd("confirmPass", e.target.value)} />
        </div>

        <button 
          onClick={handleFinalSubmit}
          className="w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}
        >
          রেজিস্ট্রেশন সম্পন্ন করুন ✓
        </button>
      </div>
    </div>
  );
}