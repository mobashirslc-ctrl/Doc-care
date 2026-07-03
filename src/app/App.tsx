import { useState, useEffect, useRef } from "react";
import AdminDashboardFixed from "./components/AdminDashboardFixed";
import { auth, db } from "../firebase/config";
import { registerUser, loginUser, loginAdmin } from "../firebase/auth";
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
// src/app/app.tsx
import AgentDashboard from './components/AgentDashboard';
import {
  User, Lock, Mail, Phone, Upload, QrCode, Activity,
  Users, FileText, Settings, Bell, Star, Play, Download,
  CheckCircle, Calendar, Clock, TrendingUp, BarChart2,
  LogOut, Eye, EyeOff, Camera, PhoneCall, PhoneOff,
  Check, Home, BookOpen, Briefcase, Heart, Pause,
  ArrowRight, Zap, Globe, CreditCard, UserCheck,
  ClipboardList, ChevronDown, X, Plus, Shield,
  Headphones, Menu, Search, AlertCircle, RefreshCw,
  AlertTriangle, UserPlus // <--- এই UserPlus টি এখানে যোগ করে দিন
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart,
  Pie, Cell
} from "recharts";


// ============================================================
// TYPES
// ============================================================
type View =
  | "landing" | "login" | "register" | "pending"
  | "doctor" | "patient" | "agent" | "admin"
  | "qrscan" | "doctor-payment" | "doctor-pending";

type Role = "doctor" | "patient" | "agent" | "admin";
type AgentStatus = "pending" | "interview" | "approved" | "suspended";
type PackageKey = "starter" | "pro" | "enterprise";

interface Agent {
  id: string; name: string; email: string; phone: string;
  status: AgentStatus; workExp: string; qualification: string;
  appliedDate: string; calls: number; successRate: number; isLive: boolean;
}

interface DocMgmt {
  id: string; name: string; spec: string; patients: number;
  status: "active" | "pending" | "blocked"; pkg: PackageKey; daysLeft: number;
}

// ============================================================
// PACKAGES CONFIG
// ============================================================
const PACKAGES: Record<PackageKey, {
  name: string; nameEn: string; priceDisplay: string;
  color: string; lightBg: string; features: string[]; tabs: string[]; popular: boolean;
}> = {
  starter: {
    name: "স্টার্টার", nameEn: "Starter",
    priceDisplay: "১৫৳ / রোগী",
    color: "#64748B", lightBg: "#F8FAFC",
    features: ["পার-পেশেন্ট মডেল", "কোনো ফিক্সড ফি নেই", "QR কোড জেনারেটর", "বেসিক পেশেন্ট লগ", "মাসিক রিপোর্ট", "ফাইন্যান্স হিস্ট্রি"],
    tabs: ["overview", "patients", "qr", "reports", "finance", "benefits"],
    popular: false,
  },
  pro: {
    name: "প্রো", nameEn: "Pro",
    priceDisplay: "৩,০০০৳ / মাস",
    color: "#FF5E13", lightBg: "#FFF3ED",
    features: ["৫০০ রোগী/মাস", "ডেডিকেটেড এজেন্ট", "My Team মনিটরিং", "লাইভ কল রেকর্ডিং", "কাস্টম QR স্ট্যান্ডি", "ফুল অ্যানালিটিক্স", "Finance Dashboard", "সেটিংস", "VIP ও কর্পোরেট প্যাকেজ"],
    tabs: ["overview", "patients", "team", "qr", "reports", "finance", "benefits", "settings"],
    popular: true,
  },
  enterprise: {
    name: "এন্টারপ্রাইজ", nameEn: "Enterprise",
    priceDisplay: "৫,০০০+৳ / মাস",
    color: "#7C3AED", lightBg: "#F5F3FF",
    features: ["আনলিমিটেড রোগী", "মাল্টি-চেম্বার", "হোয়াটসঅ্যাপ API", "গুগল রিভিউ বুস্টিং", "My Team মনিটরিং", "লাইভ কল রেকর্ডিং", "Finance Dashboard", "প্রিয়রিটি সাপোর্ট", "VIP ও কর্পোরেট প্যাকেজ"],
    tabs: ["overview", "patients", "team", "qr", "reports", "finance", "benefits", "settings"],
    popular: false,
  },
};

// ============================================================
// MOCK DATA
// ============================================================
const INITIAL_AGENTS: Agent[] = [
  { id: "a1", name: "রাফি হাসান", email: "rafi@example.com", phone: "01712345678",
    status: "approved", workExp: "২ বছর কাস্টমার সার্ভিস", qualification: "BBA, ঢাকা বিশ্ববিদ্যালয়",
    appliedDate: "১০ জুন ২০২৫", calls: 42, successRate: 94, isLive: true },
  { id: "a2", name: "সুমাইয়া খানম", email: "sumaiya@example.com", phone: "01898765432",
    status: "interview", workExp: "১ বছর হেলথকেয়ার সাপোর্ট", qualification: "MBA, BRAC University",
    appliedDate: "১৫ জুন ২০২৫", calls: 0, successRate: 0, isLive: false },
  { id: "a3", name: "তানভীর আহমেদ", email: "tanvir@example.com", phone: "01534567890",
    status: "pending", workExp: "৩ বছর কল সেন্টার", qualification: "HSC",
    appliedDate: "২০ জুন ২০২৫", calls: 0, successRate: 0, isLive: false },
  { id: "a4", name: "নাসরিন আক্তার", email: "nasrin@example.com", phone: "01677890123",
    status: "suspended", workExp: "৪ বছর মেডিকেল অ্যাসিস্ট্যান্ট", qualification: "BSc Nursing",
    appliedDate: "১ মে ২০২৫", calls: 128, successRate: 87, isLive: false },
];

const INITIAL_DOCTORS: DocMgmt[] = [
  { id: "d1", name: "ডা. আহমেদ করিম", spec: "কার্ডিওলজি", patients: 342, status: "active", pkg: "pro", daysLeft: 28 },
  { id: "d2", name: "ডা. সাবিনা ইসলাম", spec: "মেডিসিন", patients: 0, status: "pending", pkg: "starter", daysLeft: 0 },
  { id: "d3", name: "ডা. মাহমুদ রহমান", spec: "শিশু রোগ", patients: 198, status: "blocked", pkg: "enterprise", daysLeft: 0 },
  { id: "d4", name: "ডা. রেহানা পারভীন", spec: "গাইনোকোলজি", patients: 264, status: "active", pkg: "pro", daysLeft: 6 },
];

const PATIENTS = [
  { id: "p1", name: "মো. রহিম উদ্দিন", phone: "01712345678", age: 45, lastVisit: "২০ জুন ২০২৫", nextFollowup: "১২ জুলাই ২০২৫", status: "follow-up", doctorNote: "রক্তচাপ নিয়ন্ত্রণে আছে, ওষুধ চালিয়ে যান" },
  { id: "p2", name: "ফাতেমা বেগম", phone: "01898765432", age: 38, lastVisit: "১৮ জুন ২০২৫", nextFollowup: "২ জুলাই ২০২৫", status: "urgent", doctorNote: "ডায়াবেটিস টেস্ট পেন্ডিং" },
  { id: "p3", name: "করিম শেখ", phone: "01556789012", age: 62, lastVisit: "১৫ জুন ২০২৫", nextFollowup: "১৫ জুলাই ২০২৫", status: "stable", doctorNote: "থাইরয়েড ওষুধ পরিবর্তন করা হয়েছে" },
  { id: "p4", name: "আয়েশা সিদ্দিকা", phone: "01923456789", age: 29, lastVisit: "২২ জুন ২০২৫", nextFollowup: "২২ জুলাই ২০২৫", status: "stable", doctorNote: "আয়রন সাপ্লিমেন্ট দেওয়া হয়েছে" },
  { id: "p5", name: "আব্দুল হক", phone: "01534567890", age: 55, lastVisit: "১০ জুন ২০২৫", nextFollowup: "১০ জুলাই ২০২৫", status: "follow-up", doctorNote: "হার্টের ওষুধ চেক করুন" },
];

const CALLS = [
  { id: "c1", patient: "মো. রহিম উদ্দিন", phone: "01712345678", time: "10:23 AM", agent: "রাফি হাসান", note: "আগামী রবিবারে রিপোর্ট দেখাবেন", duration: "3:42", hasRec: true },
  { id: "c2", patient: "ফাতেমা বেগম", phone: "01898765432", time: "11:05 AM", agent: "রাফি হাসান", note: "ডায়াবেটিস টেস্ট করে রিপোর্ট পাঠাবেন", duration: "5:18", hasRec: true },
  { id: "c3", patient: "করিম শেখ", phone: "01556789012", time: "12:30 PM", agent: "রাফি হাসান", note: "নতুন ওষুধ সম্পর্কে জানানো হয়েছে", duration: "2:55", hasRec: false },
  { id: "c4", patient: "আয়েশা সিদ্দিকা", phone: "01923456789", time: "02:15 PM", agent: "রাফি হাসান", note: "পরবর্তী অ্যাপয়েন্টমেন্ট কনফার্ম", duration: "1:48", hasRec: true },
];

const QUEUE = [
  { id: "q1", patient: "নাসরিন আক্তার", phone: "01677890123", type: "prescription", time: "২ মিনিট আগে", urgent: true, doctor: "ডা. আহমেদ করিম" },
  { id: "q2", patient: "আব্দুল হক", phone: "01534567890", type: "call", time: "৫ মিনিট আগে", urgent: false, doctor: "ডা. আহমেদ করিম" },
  { id: "q3", patient: "সেলিনা পারভীন", phone: "01923456789", type: "query", time: "৮ মিনিট আগে", urgent: false, doctor: "ডা. আহমেদ করিম" },
];

const CHART_DATA = [
  { day: "শনি", patients: 28, followups: 22 }, { day: "রবি", patients: 35, followups: 28 },
  { day: "সোম", patients: 42, followups: 35 }, { day: "মঙ্গল", patients: 38, followups: 30 },
  { day: "বুধ", patients: 45, followups: 40 }, { day: "বৃহ", patients: 50, followups: 45 },
  { day: "আজ", patients: 32, followups: 28 },
];

const PERF_DATA = [
  { day: "শনি", calls: 38 }, { day: "রবি", calls: 42 }, { day: "সোম", calls: 35 },
  { day: "মঙ্গল", calls: 48 }, { day: "বুধ", calls: 52 }, { day: "বৃহ", calls: 44 }, { day: "আজ", calls: 42 },
];

const CALL_PIE = [{ name: "সফল", value: 94 }, { name: "মিসড", value: 6 }];

const PAYMENT_HISTORY = [
  { date: "১ জুন ২০২৫", amount: "৩,০০০৳", method: "bKash", txId: "TXN8CK234XF", invoice: "#INV-003" },
  { date: "১ মে ২০২৫", amount: "৩,০০০৳", method: "Nagad", txId: "TXN7NG891KL", invoice: "#INV-002" },
  { date: "১ এপ্রিল ২০২৫", amount: "৩,০০০৳", method: "bKash", txId: "TXN6BK456MN", invoice: "#INV-001" },
];

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Field({ label, icon, type, val, onChange, placeholder, show }: {
  label: string; icon: JSX.Element; type: string; val: string;
  onChange: (v: string) => void; placeholder: string; show?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none">{icon}</div>
        <input type={type === "password" && show ? "text" : type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
               className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"/>
      </div>
    </div>
  );
}

function QRCodeSVG({ size = 180, color = "#FF5E13" }: { size?: number; color?: string }) {
  const cell = size / 21;
  const pattern = [
    [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,0,1,0,0,0,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,0,1,0],[0,1,0,1,1,0,0,0,1,1,0,1,1,0,0,1,1,0,1,0,1],
    [1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0],[0,1,0,0,1,0,0,0,0,1,0,1,0,0,1,0,0,1,0,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,0],[0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,1,1,0,0,1],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,0,1,0,1,0],[1,0,0,0,0,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,1,0,1,0,1,0],[1,0,1,1,1,0,1,0,1,0,1,1,0,1,0,0,1,0,0,1,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,0,0],[1,0,0,0,0,0,1,0,1,1,0,1,0,1,0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,0,1,0,1,0,1,0,1,1,0,0,1],
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="4"/>
      {pattern.map((row, i) => row.map((v, j) => v === 1 ? <rect key={`${i}-${j}`} x={j * cell} y={i * cell} width={cell} height={cell} fill={color}/> : null))}
      <rect x={size / 2 - 18} y={size / 2 - 18} width={36} height={36} fill="white" rx="4"/>
      <text x={size / 2} y={size / 2 + 7} textAnchor="middle" fontSize={14} fill={color} fontWeight="bold">M</text>
    </svg>
  );
}

// ============================================================
// LANDING PAGE
// ============================================================
function LandingPage({ go }: { go: (v: View) => void }) {
  return (
    <div style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: "rgba(255,94,19,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Heart className="w-5 h-5" style={{ color: "#FF5E13" }}/></div>
          <span className="text-white font-bold text-xl">মেডিকেয়ার BD</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-white/90 text-sm font-medium">
          <a href="#features" className="hover:text-white transition-colors">সুবিধাসমূহ</a>
          <a href="#pricing" className="hover:text-white transition-colors">মূল্য পরিকল্পনা</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => go("login")} className="text-white border border-white/40 px-4 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-all">লগইন</button>
          <button onClick={() => go("register")} className="bg-white px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-50 transition-all shadow-lg" style={{ color: "#FF5E13" }}>রেজিস্ট্রেশন</button>
        </div>
      </nav>

      <section className="min-h-screen flex items-center pt-20 pb-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 60%, #BF360C 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}/>
          <div className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}/>
        </div>
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="relative order-2 md:order-1">
            <div className="relative w-full max-w-md mx-auto">
              <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&h=600&fit=crop&auto=format" alt="ডাক্তার" className="w-full rounded-2xl object-cover shadow-2xl" style={{ height: "480px" }}/>
              <div className="absolute -right-4 bottom-20 bg-white rounded-2xl shadow-xl p-4 min-w-[160px]">
                <div className="text-xs text-gray-500 mb-1">আজকের রোগী</div>
                <div className="text-2xl font-bold text-gray-900">১২৪ জন</div>
                <div className="flex items-center gap-1 text-green-500 text-xs mt-1"><TrendingUp className="w-3 h-3"/>১৮% বেশি</div>
              </div>
              <div className="absolute -left-4 top-20 bg-white rounded-2xl shadow-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"><Star className="w-4 h-4 fill-orange-500 text-orange-500"/></div>
                  <div><div className="text-sm font-bold text-gray-900">৪.৯ ★</div><div className="text-xs text-gray-500">গুগল রিভিউ</div></div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-white order-1 md:order-2">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm mb-6">
              <Zap className="w-4 h-4"/> বাংলাদেশের প্রথম ডাক্তার ফলো-আপ প্ল্যাটফর্ম
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              আপনার চেম্বার সামলাবে আমাদের টিম।
              <span className="block text-orange-200">আপনি শুধু চিকিৎসা দিন।</span>
            </h1>
            <p className="text-lg text-white/85 mb-8 leading-relaxed">ডাক্তারদের জন্য তৈরি বাংলাদেশের প্রথম ডেডিকেটেড পার্সোনাল ফলো-আপ ও রেপুটেশন ম্যানেজমেন্ট প্ল্যাটফর্ম।</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => go("register")} className="bg-white font-bold py-4 px-8 rounded-full text-lg shadow-2xl hover:scale-105 transition-all" style={{ color: "#FF5E13" }}>ফ্রি ডেমো বুক করুন →</button>
              <button onClick={() => go("login")} className="border-2 border-white/50 text-white font-semibold py-4 px-8 rounded-full text-lg hover:bg-white/10 transition-all">লগইন করুন</button>
            </div>
            <div className="flex items-center gap-8 mt-10">
              {[["৫০০+", "নিবন্ধিত ডাক্তার"], ["৯৮%", "ফলো-আপ সাফল্য"], ["২৪/৭", "এজেন্ট সাপোর্ট"]].map(([v, l], i) => (
                <div key={i} className="flex items-center gap-8">
                  {i > 0 && <div className="w-px h-10 bg-white/20"/>}
                  <div><div className="text-2xl font-bold">{v}</div><div className="text-sm text-white/70">{l}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 animate-bounce"><ChevronDown className="w-6 h-6"/></div>
      </section>

      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">আপনার চেম্বারের সমস্যাগুলো আমরা জানি</h2>
            <p className="text-gray-500">প্রতিটি ডাক্তারের একই সমস্যা — কিন্তু এখন সমাধান আছে।</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <PhoneOff className="w-8 h-8"/>, title: "মিসড কল ও ব্যস্ত অ্যাসিস্ট্যান্ট", desc: "ডেডিকেটেড এজেন্ট টিম প্রতিটি কল রিসিভ করে রেকর্ড রাখে।", stat: "০% মিসড কল", iconBg: "bg-red-100 text-red-500", cardBg: "bg-red-50 border border-red-100" },
              { icon: <Calendar className="w-8 h-8"/>, title: "হারিয়ে যাওয়া ফলো-আপ", desc: "স্বয়ংক্রিয়ভাবে রিমাইন্ড করে অ্যাপয়েন্টমেন্ট বুক করে দেয়।", stat: "৯৮% ফলো-আপ হার", iconBg: "bg-orange-100 text-orange-500", cardBg: "bg-orange-50 border border-orange-100" },
              { icon: <Star className="w-8 h-8"/>, title: "ডিজিটাল রেপুটেশন", desc: "সন্তুষ্ট রোগীদের রিভিউ দিতে উৎসাহিত করি — গুগল ও ফেসবুকে।", stat: "৪.৯★ গড় রেটিং", iconBg: "bg-yellow-100 text-yellow-600", cardBg: "bg-yellow-50 border border-yellow-100" },
            ].map((item, i) => (
              <div key={i} className={`${item.cardBg} rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1`}>
                <div className={`w-16 h-16 ${item.iconBg} rounded-2xl flex items-center justify-center mb-6`}>{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-4">{item.desc}</p>
                <div className="text-sm font-bold" style={{ color: "#FF5E13" }}>{item.stat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">স্বচ্ছ মূল্য পরিকল্পনা</h2>
            <p className="text-gray-500">আপনার চেম্বারের আকার অনুযায়ী প্যাকেজ বেছে নিন।</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {(Object.entries(PACKAGES) as [PackageKey, typeof PACKAGES.pro][]).map(([key, plan]) => (
              <div key={key} className={`relative rounded-2xl p-8 transition-all hover:-translate-y-1 ${plan.popular ? "shadow-2xl scale-105" : "border border-gray-100 shadow-md hover:shadow-xl"}`}
                   style={plan.popular ? { background: "linear-gradient(135deg, #FF5E13, #D84315)", color: "white" } : { background: plan.lightBg }}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">সবচেয়ে জনপ্রিয় 🔥</div>}
                <div className={`text-sm font-semibold mb-2`} style={{ color: plan.popular ? "rgba(255,255,255,0.7)" : plan.color }}>{plan.nameEn}</div>
                <div className={`text-2xl font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.name}</div>
                <div className={`text-2xl font-bold mb-4 ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.priceDisplay}</div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.popular ? "text-white" : "text-gray-700"}`}>
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.popular ? "rgba(255,255,255,0.8)" : plan.color }}/>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => go("register")} className={`w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90 ${plan.popular ? "bg-white text-orange-600" : "text-white"}`}
                        style={!plan.popular ? { background: plan.color } : {}}>শুরু করুন →</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">আজই শুরু করুন — বিনামূল্যে ডেমো</h2>
          <p className="text-orange-100 mb-8">আপনার চেম্বারের জন্য কাস্টম সলিউশন দেখতে আমাদের সাথে কথা বলুন।</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => go("register")} className="bg-white font-bold py-4 px-8 rounded-full text-lg hover:scale-105 shadow-lg" style={{ color: "#FF5E13" }}>ফ্রি রেজিস্ট্রেশন করুন</button>
            <button onClick={() => go("login")} className="border-2 border-white text-white font-semibold py-4 px-8 rounded-full text-lg hover:bg-white/10">ডেমো লগইন করুন</button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Heart className="w-5 h-5 text-white"/></div><span className="text-white font-bold">মেডিকেয়ার BD</span></div>
              <p className="text-sm leading-relaxed">বাংলাদেশের ডাক্তারদের জন্য প্রিমিয়াম হেলথকেয়ার ম্যানেজমেন্ট প্ল্যাটফর্ম।</p>
            </div>
            {[
              { title: "প্ল্যাটফর্ম", links: [["ডক্টর পোর্টাল", "doctor"], ["পেশেন্ট পোর্টাল", "patient"], ["এজেন্ট ওয়ার্কস্পেস", "agent"], ["QR স্ক্যান", "qrscan"]] },
              { title: "অ্যাকাউন্ট", links: [["লগইন", "login"], ["রেজিস্ট্রেশন", "register"], ["অ্যাডমিন", "admin"]] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2 text-sm">
                  {col.links.map(([label, view]) => <li key={label}><button onClick={() => go(view as View)} className="hover:text-white transition-colors">{label}</button></li>)}
                </ul>
              </div>
            ))}
            <div>
              <h4 className="text-white font-semibold mb-4">যোগাযোগ</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500"/> 01700-000000</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-orange-500"/> info@medicare-bd.com</div>
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500"/> www.medicare-bd.com</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm">© ২০২৫ মেডিকেয়ার BD। সর্বস্বত্ব সংরক্ষিত।</div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ go, setAuth }: { go: (v: View) => void; setAuth: (u: { name: string; role: Role }) => void }) {
  const [role, setRole] = useState<Role>("doctor");
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = identifier.length > 0 && password.length >= 6;
  const tabs = [
    { id: "doctor" as Role, label: "ডাক্তার", icon: <User className="w-4 h-4"/> }, 
    { id: "patient" as Role, label: "রোগী", icon: <Heart className="w-4 h-4"/> }, 
    { id: "agent" as Role, label: "এজেন্ট", icon: <Headphones className="w-4 h-4"/> }, 
    { id: "admin" as Role, label: "অ্যাডমিন", icon: <Shield className="w-4 h-4"/> }
  ];

  const handleLogin = async () => {
  setLoading(true);
  try {
    let userData;

    // ১. চেক করা হচ্ছে ইউজার নাকি অ্যাডমিন লগইন করছে
    if (role === "admin") {
      // এটি আপনার auth.tsx-এ তৈরি করা নতুন ফাংশন
      userData = await loginAdmin(identifier, password);
    } else {
      // এটি আপনার আগের ইউজার লগইন ফাংশন
      userData = await loginUser(identifier, password);
    }

    // ২. অ্যাপের অথেন্টিকেশন স্টেট আপডেট
    // অ্যাডমিন হলে নাম "Admin" হিসেবে সেট হবে
    setAuth({ 
      name: userData.name || "Admin", 
      role: userData.role || "admin" 
    });

    // ৩. ইউজারের রোল অনুযায়ী সঠিক ড্যাশবোর্ডে রিডাইরেক্ট করুন
    // যদি role 'admin' হয়, তবে এটি "admin" ভিউতে পাঠাবে
    go(userData.role); 
    
  } catch (error: any) {
    alert("লগইন ব্যর্থ: " + error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">স্বাগতম!</h2>
        <p className="text-gray-500 text-sm mb-6">আপনার অ্যাকাউন্টে লগইন করুন</p>
        
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl mb-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setRole(t.id)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${role === t.id ? "bg-white shadow text-orange-600" : "text-gray-500 hover:text-gray-700"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">ইমেইল</label>
            <input type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="email@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-300"/>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">পাসওয়ার্ড</label>
            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-300"/>
          </div>
          
          <button onClick={handleLogin} disabled={!isValid || loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-orange-600 hover:bg-orange-700 transition-all disabled:opacity-50">
            {loading ? "অপেক্ষা করুন..." : "লগইন করুন"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">অ্যাকাউন্ট নেই?{" "}
          <button onClick={() => go("register")} className="font-semibold text-orange-600 hover:underline">রেজিস্ট্রেশন করুন</button>
        </p>
      </div>
    </div>
  );
}// ============================================================
// REGISTER PAGE
// ============================================================
function RegisterPage({ go, setDocPackage }: { go: (v: View) => void; setDocPackage: (p: PackageKey) => void }) {
  const [role, setRole] = useState<Role>("doctor");
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [cvName, setCvName] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<PackageKey | null>(null);
  const [emergencyPermission, setEmergencyPermission] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPass: "", specialty: "", chamber: "", dob: "", workExp: "", qualification: "", institution: "", year: "", agentRole: "", company: "", adminCode: "" });
  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const baseValid = form.name.length > 0 && form.email.includes("@") && form.phone.length >= 11 && form.password.length >= 6 && form.password === form.confirmPass;
  const isStepValid = () => {
    if (role === "doctor") { if (step === 1) return baseValid && form.specialty.length > 0 && form.chamber.length > 0 && emergencyPermission !== null; return selectedPkg !== null; }
    if (role === "patient") return form.name.length > 0 && form.phone.length >= 11 && form.password.length >= 6 && form.password === form.confirmPass && form.dob.length > 0;
    if (role === "admin") return baseValid && form.adminCode === "ADMIN2025";
    if (role === "agent") { if (step === 1) return baseValid; if (step === 2) return form.qualification.length > 0 && form.institution.length > 0; if (step === 3) return form.workExp.length > 0; return cvName.length > 0; }
    return false;
  };

  // ঠিক সেই জায়গায় এই নতুন কোডটি পেস্ট করুন
const handleFinalSubmit = async (e: any) => {
  if (e) e.preventDefault();
  
  // এখানে নিশ্চিত করুন যে role এবং অন্যান্য ডাটা form অবজেক্টে আছে
  const completeFormData = {
    ...form,
    role: role, // এখানে নিশ্চিতভাবে role পাঠানো হচ্ছে
    package: role === "doctor" ? selectedPkg : null
  };
  
  try {
    console.log("রেজিস্ট্রেশন শুরু হচ্ছে...", completeFormData);
    
    // updated ডাটা পাঠান
    await registerUser(completeFormData); 
    
    console.log("রেজিস্ট্রেশন সফল!");

    if (role === "doctor") { 
      setDocPackage(selectedPkg!); 
      go("doctor-payment"); 
    }
    else if (role === "agent") go("pending");
    else if (role === "patient") go("patient");
    else go("admin");

  } catch (error: any) {
    console.error("Firebase Error:", error.message);
    alert("রেজিস্ট্রেশন ব্যর্থ: " + error.message);
  }
};

  const maxSteps = role === "doctor" ? 2 : role === "agent" ? 4 : 1;
  const tabs = [{ id: "doctor" as Role, label: "ডাক্তার", icon: <User className="w-4 h-4"/> }, { id: "patient" as Role, label: "রোগী", icon: <Heart className="w-4 h-4"/> }, { id: "agent" as Role, label: "এজেন্ট", icon: <Headphones className="w-4 h-4"/> }, { id: "admin" as Role, label: "অ্যাডমিন", icon: <Shield className="w-4 h-4"/> }];
  const agentSteps = ["ব্যক্তিগত তথ্য", "শিক্ষাগত যোগ্যতা", "কাজের অভিজ্ঞতা", "সিভি আপলোড"];
  const valid = isStepValid();

  const renderDocStep = () => {
    if (step === 1) return (
      <>
        <Field label="পূর্ণ নাম (উপাধিসহ)" icon={<User className="w-5 h-5"/>} type="text" val={form.name} onChange={v => upd("name", v)} placeholder="ডা. আপনার নাম"/>
        <Field label="ইমেইল" icon={<Mail className="w-5 h-5"/>} type="email" val={form.email} onChange={v => upd("email", v)} placeholder="email@example.com"/>
        <Field label="মোবাইল নম্বর" icon={<Phone className="w-5 h-5"/>} type="tel" val={form.phone} onChange={v => upd("phone", v)} placeholder="01XXXXXXXXX"/>
        <div><label className="text-sm font-semibold text-gray-700 block mb-1.5">বিশেষজ্ঞতা</label>
          <select value={form.specialty} onChange={e => upd("specialty", e.target.value)} className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="">বেছে নিন</option>
            {["কার্ডিওলজি", "মেডিসিন", "গাইনোকোলজি", "শিশু বিশেষজ্ঞ", "অর্থোপেডিক", "ডার্মাটোলজি", "নিউরোলজি", "সার্জারি", "চক্ষু", "অন্যান্য"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <Field label="চেম্বারের ঠিকানা" icon={<Globe className="w-5 h-5"/>} type="text" val={form.chamber} onChange={v => upd("chamber", v)} placeholder="ধানমন্ডি, ঢাকা"/>
        <Field label="পাসওয়ার্ড" icon={<Lock className="w-5 h-5"/>} type="password" val={form.password} onChange={v => upd("password", v)} placeholder="কমপক্ষে ৬ অক্ষর" show={showPass}/>
        <Field label="পাসওয়ার্ড নিশ্চিত করুন" icon={<Lock className="w-5 h-5"/>} type="password" val={form.confirmPass} onChange={v => upd("confirmPass", v)} placeholder="পাসওয়ার্ড আবার লিখুন" show={showPass}/>
        <button type="button" onClick={() => setShowPass(!showPass)} className="text-xs text-gray-500 hover:text-gray-700">{showPass ? "লুকান" : "পাসওয়ার্ড দেখান"}</button>
        {/* Emergency Contact Permission */}
        <div className="border-2 rounded-2xl p-4 transition-all" style={{ borderColor: emergencyPermission === true ? "#22c55e" : emergencyPermission === false ? "#64748B" : "#FF5E13", background: emergencyPermission === true ? "#f0fdf4" : emergencyPermission === false ? "#f8fafc" : "#FFF3ED" }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="text-xl flex-shrink-0">🚨</div>
            <div>
              <div className="font-bold text-gray-900 text-sm mb-1">জরুরি যোগাযোগের অনুমতি <span className="text-red-500">*</span></div>
              <p className="text-xs text-gray-600 leading-relaxed">রোগীর গুরুতর ইমার্জেন্সিতে (মারাত্মক সাইড ইফেক্ট, অবস্থার অবনতি) আমাদের এজেন্ট কি আপনার সাথে ব্যক্তিগতভাবে সরাসরি যোগাযোগ করতে পারবে?</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setEmergencyPermission(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${emergencyPermission === true ? "bg-green-500 text-white shadow-md" : "border-2 border-green-300 text-green-700 hover:bg-green-50"}`}>
              <Check className="w-4 h-4"/> হ্যাঁ, সম্মত আছি
            </button>
            <button type="button" onClick={() => setEmergencyPermission(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${emergencyPermission === false ? "bg-gray-600 text-white shadow-md" : "border-2 border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
              <X className="w-4 h-4"/> না
            </button>
          </div>
          {emergencyPermission === true && <p className="text-xs text-green-700 mt-2 bg-green-100 rounded-lg p-2 font-medium">✓ আপনার সম্মতির জন্য ধন্যবাদ। রোগীর জরুরি প্রয়োজনে সরাসরি আপনাকে জানানো হবে।</p>}
          {emergencyPermission === false && <p className="text-xs text-gray-500 mt-2 bg-gray-100 rounded-lg p-2">শুধু আমাদের এজেন্টই রোগীর সাথে যোগাযোগ করবে। ডাক্তারকে সরাসরি কল করা হবে না।</p>}
        </div>
      </>
    );
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-700 mb-3">আপনার প্যাকেজ বেছে নিন:</div>
        {(Object.entries(PACKAGES) as [PackageKey, typeof PACKAGES.pro][]).map(([key, pkg]) => (
          <div key={key} onClick={() => setSelectedPkg(key)}
               className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${selectedPkg === key ? "shadow-md" : "border-gray-200 hover:border-gray-300"}`}
               style={selectedPkg === key ? { borderColor: pkg.color, background: pkg.lightBg } : {}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                     style={{ borderColor: pkg.color, background: selectedPkg === key ? pkg.color : "transparent" }}>
                  {selectedPkg === key && <Check className="w-2.5 h-2.5 text-white"/>}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{pkg.name} <span className="text-xs font-normal text-gray-500">({pkg.nameEn})</span></div>
                  <div className="text-sm font-bold" style={{ color: pkg.color }}>{pkg.priceDisplay}</div>
                </div>
              </div>
              {pkg.popular && <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2.5 py-1 rounded-full">Most Popular</span>}
            </div>
            {selectedPkg === key && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${pkg.color}30` }}>
                <div className="grid grid-cols-2 gap-1">
                  {pkg.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: pkg.color }}/>{f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAgentStep = () => {
    if (step === 1) return (<><Field label="পূর্ণ নাম" icon={<User className="w-5 h-5"/>} type="text" val={form.name} onChange={v => upd("name", v)} placeholder="আপনার পূর্ণ নাম"/><Field label="ইমেইল" icon={<Mail className="w-5 h-5"/>} type="email" val={form.email} onChange={v => upd("email", v)} placeholder="email@example.com"/><Field label="মোবাইল নম্বর" icon={<Phone className="w-5 h-5"/>} type="tel" val={form.phone} onChange={v => upd("phone", v)} placeholder="01XXXXXXXXX"/><Field label="পাসওয়ার্ড" icon={<Lock className="w-5 h-5"/>} type="password" val={form.password} onChange={v => upd("password", v)} placeholder="কমপক্ষে ৬ অক্ষর" show={showPass}/><Field label="পাসওয়ার্ড নিশ্চিত করুন" icon={<Lock className="w-5 h-5"/>} type="password" val={form.confirmPass} onChange={v => upd("confirmPass", v)} placeholder="পাসওয়ার্ড আবার লিখুন" show={showPass}/><button type="button" onClick={() => setShowPass(!showPass)} className="text-xs text-gray-500">{showPass ? "লুকান" : "দেখান"}</button></>);
    if (step === 2) return (<><div><label className="text-sm font-semibold text-gray-700 block mb-1.5">শিক্ষাগত যোগ্যতা</label><select value={form.qualification} onChange={e => upd("qualification", e.target.value)} className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"><option value="">বেছে নিন</option>{["SSC", "HSC", "Diploma", "BSc / BA / BBA", "MSc / MA / MBA", "BSc Nursing", "অন্যান্য"].map(s => <option key={s}>{s}</option>)}</select></div><Field label="শিক্ষা প্রতিষ্ঠান" icon={<BookOpen className="w-5 h-5"/>} type="text" val={form.institution} onChange={v => upd("institution", v)} placeholder="প্রতিষ্ঠানের নাম"/><Field label="পাসের বছর" icon={<Calendar className="w-5 h-5"/>} type="text" val={form.year} onChange={v => upd("year", v)} placeholder="যেমন: ২০২০"/></>);
    if (step === 3) return (<><Field label="কোম্পানি / প্রতিষ্ঠান" icon={<Briefcase className="w-5 h-5"/>} type="text" val={form.company} onChange={v => upd("company", v)} placeholder="কোম্পানির নাম"/><Field label="পদবী / ভূমিকা" icon={<User className="w-5 h-5"/>} type="text" val={form.agentRole} onChange={v => upd("agentRole", v)} placeholder="Customer Service Executive"/><div><label className="text-sm font-semibold text-gray-700 block mb-1.5">মোট কাজের অভিজ্ঞতা</label><select value={form.workExp} onChange={e => upd("workExp", e.target.value)} className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"><option value="">বেছে নিন</option>{["কোনো অভিজ্ঞতা নেই (ফ্রেশার)", "৬ মাস - ১ বছর", "১ - ২ বছর", "২ - ৩ বছর", "৩+ বছর"].map(s => <option key={s}>{s}</option>)}</select></div></>);
    return (
      <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${cvName ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-orange-400 bg-gray-50 hover:bg-orange-50"}`}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setCvName(f.name); }}/>
        {cvName ? (<><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/><p className="font-semibold text-green-700">{cvName}</p></>) : (<><Upload className="w-12 h-12 text-gray-400 mx-auto mb-3"/><p className="font-semibold text-gray-600">CV আপলোড করুন</p><p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX</p></>)}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"><div className="absolute top-10 left-10 w-80 h-80 bg-white rounded-full blur-3xl"/><div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl"/></div>
      <div className="relative w-full max-w-lg mx-4">
        <div className="text-center mb-6">
          <button onClick={() => go("landing")} className="inline-flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Heart className="w-7 h-7" style={{ color: "#FF5E13" }}/></div>
            <span className="text-2xl font-bold">মেডিকেয়ার BD</span>
          </button>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">নতুন অ্যাকাউন্ট তৈরি করুন</h2>
          <p className="text-gray-500 text-sm mb-6">আপনার ভূমিকা অনুযায়ী রেজিস্ট্রেশন করুন</p>
          <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl mb-6">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setRole(t.id); setStep(1); setSelectedPkg(null); }}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${role === t.id ? "bg-white shadow text-orange-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {role === "doctor" && (
            <div className="mb-5">
              <div className="flex items-center mb-2">
                {["ব্যক্তিগত তথ্য", "প্যাকেজ নির্বাচন"].map((s, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                         style={{ background: i + 1 < step ? "#22c55e" : i + 1 === step ? "#FF5E13" : "#e5e7eb", color: i + 1 <= step ? "white" : "#6b7280" }}>
                      {i + 1 < step ? <Check className="w-4 h-4"/> : i + 1}
                    </div>
                    {i < 1 && <div className="h-0.5 flex-1 mx-1" style={{ background: i + 1 < step ? "#22c55e" : "#e5e7eb" }}/>}
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-gray-700">ধাপ {step}: {step === 1 ? "ব্যক্তিগত তথ্য ও চেম্বার" : "প্যাকেজ নির্বাচন করুন"}</p>
            </div>
          )}

          {role === "agent" && (
            <div className="mb-5">
              <div className="flex items-center mb-2">
                {agentSteps.map((s, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                         style={{ background: i + 1 < step ? "#22c55e" : i + 1 === step ? "#FF5E13" : "#e5e7eb", color: i + 1 <= step ? "white" : "#6b7280" }}>
                      {i + 1 < step ? <Check className="w-4 h-4"/> : i + 1}
                    </div>
                    {i < 3 && <div className="h-0.5 flex-1 mx-1" style={{ background: i + 1 < step ? "#22c55e" : "#e5e7eb" }}/>}
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-gray-700">ধাপ {step}: {agentSteps[step - 1]}</p>
            </div>
          )}

          <div className="space-y-4">
            {role === "doctor" && renderDocStep()}
            {role === "patient" && (<><Field label="পূর্ণ নাম" icon={<User className="w-5 h-5"/>} type="text" val={form.name} onChange={v => upd("name", v)} placeholder="আপনার নাম"/><Field label="মোবাইল নম্বর" icon={<Phone className="w-5 h-5"/>} type="tel" val={form.phone} onChange={v => upd("phone", v)} placeholder="01XXXXXXXXX"/><Field label="ইমেইল (ঐচ্ছিক)" icon={<Mail className="w-5 h-5"/>} type="email" val={form.email} onChange={v => upd("email", v)} placeholder="email@example.com"/><Field label="জন্ম তারিখ" icon={<Calendar className="w-5 h-5"/>} type="date" val={form.dob} onChange={v => upd("dob", v)} placeholder=""/><Field label="পাসওয়ার্ড" icon={<Lock className="w-5 h-5"/>} type="password" val={form.password} onChange={v => upd("password", v)} placeholder="কমপক্ষে ৬ অক্ষর" show={showPass}/><Field label="পাসওয়ার্ড নিশ্চিত করুন" icon={<Lock className="w-5 h-5"/>} type="password" val={form.confirmPass} onChange={v => upd("confirmPass", v)} placeholder="আবার লিখুন" show={showPass}/></>)}
            {role === "admin" && (<><Field label="পূর্ণ নাম" icon={<User className="w-5 h-5"/>} type="text" val={form.name} onChange={v => upd("name", v)} placeholder="আপনার নাম"/><Field label="ইমেইল" icon={<Mail className="w-5 h-5"/>} type="email" val={form.email} onChange={v => upd("email", v)} placeholder="email@example.com"/><Field label="মোবাইল নম্বর" icon={<Phone className="w-5 h-5"/>} type="tel" val={form.phone} onChange={v => upd("phone", v)} placeholder="01XXXXXXXXX"/><Field label="পাসওয়ার্ড" icon={<Lock className="w-5 h-5"/>} type="password" val={form.password} onChange={v => upd("password", v)} placeholder="কমপক্ষে ৬ অক্ষর" show={showPass}/><Field label="পাসওয়ার্ড নিশ্চিত করুন" icon={<Lock className="w-5 h-5"/>} type="password" val={form.confirmPass} onChange={v => upd("confirmPass", v)} placeholder="আবার লিখুন" show={showPass}/><div><label className="text-sm font-semibold text-gray-700 block mb-1.5">অ্যাডমিন কোড</label><div className="relative"><Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"/><input type="text" value={form.adminCode} onChange={e => upd("adminCode", e.target.value)} placeholder="ADMIN2025" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"/></div><p className="text-xs text-gray-400 mt-1">Demo: ADMIN2025</p></div></>)}
            {role === "agent" && renderAgentStep()}
          </div>

          <div className="mt-6 flex gap-3">
            {((role === "doctor" && step > 1) || (role === "agent" && step > 1)) && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">← পূর্ববর্তী</button>
            )}
            {((role === "doctor" && step < maxSteps) || (role === "agent" && step < maxSteps)) ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!valid}
                      className={`flex-1 py-3.5 rounded-xl font-bold text-white text-sm transition-all ${valid ? "hover:opacity-90 shadow-md" : "opacity-40 cursor-not-allowed"}`}
                      style={{ background: valid ? "linear-gradient(135deg, #FF5E13, #D84315)" : "#cbd5e1" }}>
                পরবর্তী ধাপ →
              </button>
            ) : (
              <button onClick={handleFinalSubmit} disabled={!valid}
                      className={`flex-1 py-3.5 rounded-xl font-bold text-white text-sm transition-all ${valid ? "hover:opacity-90 shadow-md" : "opacity-40 cursor-not-allowed"}`}
                      style={{ background: valid ? "linear-gradient(135deg, #FF5E13, #D84315)" : "#cbd5e1" }}>
                {role === "agent" ? "আবেদন জমা দিন ✓" : role === "doctor" ? "পেমেন্টে যান →" : "রেজিস্ট্রেশন সম্পন্ন করুন ✓"}
              </button>
            )}
          </div>
          <p className="text-center text-sm text-gray-500 mt-5">ইতোমধ্যে অ্যাকাউন্ট আছে?{" "}<button onClick={() => go("login")} className="font-semibold hover:underline" style={{ color: "#FF5E13" }}>লগইন করুন</button></p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCTOR PAYMENT PAGE
// ============================================================
function DoctorPaymentPage({ go, docPackage }: { go: (v: View) => void; docPackage: PackageKey }) {
  const [method, setMethod] = useState<"bkash" | "nagad" | null>(null);
  const [txId, setTxId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const pkg = PACKAGES[docPackage] || PACKAGES.pro;

  if (confirmed) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-gray-900 mb-2">পেমেন্ট তথ্য জমা হয়েছে!</h2>
        <p className="text-gray-500 text-sm mb-6">আমরা ১-২ কার্যদিবসের মধ্যে যাচাই করব এবং আপনার ড্যাশবোর্ড সক্রিয় করব।</p>
        <button onClick={() => go("doctor-pending")} className="w-full py-3.5 rounded-xl font-bold text-white hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}>আবেদনের অবস্থা দেখুন →</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center py-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"><div className="absolute top-10 left-10 w-80 h-80 bg-white rounded-full blur-3xl"/></div>
      <div className="relative w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <button onClick={() => go("landing")} className="inline-flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Heart className="w-7 h-7" style={{ color: "#FF5E13" }}/></div>
            <span className="text-2xl font-bold">মেডিকেয়ার BD</span>
          </button>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">পেমেন্ট করুন</h2>
          <p className="text-gray-500 text-sm mb-6">আপনার নির্বাচিত প্যাকেজের পেমেন্ট সম্পন্ন করুন</p>

          <div className="rounded-2xl p-4 mb-6 border-2" style={{ borderColor: pkg.color, background: pkg.lightBg }}>
            <div className="flex items-center justify-between">
              <div><div className="text-xs text-gray-500 mb-0.5">নির্বাচিত প্যাকেজ</div><div className="font-bold text-gray-900">{pkg.name} ({pkg.nameEn})</div></div>
              <div className="text-right"><div className="text-xs text-gray-500 mb-0.5">পেমেন্ট</div><div className="text-xl font-bold" style={{ color: pkg.color }}>{pkg.priceDisplay}</div></div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-1">
              {pkg.features.slice(0, 4).map(f => <div key={f} className="flex items-center gap-1 text-xs text-gray-600"><Check className="w-3 h-3 flex-shrink-0" style={{ color: pkg.color }}/>{f}</div>)}
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-700 mb-3">পেমেন্ট পদ্ধতি বেছে নিন:</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[{ id: "bkash" as const, name: "bKash", color: "#E2136E", number: "01700-000000" }, { id: "nagad" as const, name: "Nagad", color: "#F7941D", number: "01700-000001" }].map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                      className={`border-2 rounded-2xl p-4 text-center transition-all ${method === m.id ? "shadow-md" : "border-gray-200 hover:border-gray-300"}`}
                      style={method === m.id ? { borderColor: m.color, background: `${m.color}10` } : {}}>
                <div className="text-2xl font-black mb-1" style={{ color: m.color }}>{m.name}</div>
                <div className="text-xs text-gray-500">Send Money</div>
              </button>
            ))}
          </div>

          {method && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
              <p className="text-sm font-bold text-gray-800 mb-3">{method === "bkash" ? "bKash" : "Nagad"} এ পেমেন্ট করার নিয়ম:</p>
              <ol className="space-y-2">
                {[`${method === "bkash" ? "bKash" : "Nagad"} অ্যাপ খুলুন`, '"Send Money" বেছে নিন', `নম্বর দিন: ${method === "bkash" ? "01700-000000" : "01700-000001"}`, `পরিমাণ দিন: ${pkg.priceDisplay}`, "পেমেন্ট সম্পন্ন করুন এবং Transaction ID নিচে দিন"].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white mt-0.5" style={{ background: method === "bkash" ? "#E2136E" : "#F7941D" }}>{i + 1}</span>{s}
                  </li>
                ))}
              </ol>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">পাঠানোর নম্বর:</div>
                <div className="font-bold text-lg" style={{ color: method === "bkash" ? "#E2136E" : "#F7941D" }}>{method === "bkash" ? "01700-000000" : "01700-000001"}</div>
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Transaction ID / রেফারেন্স নম্বর</label>
            <input type="text" value={txId} onChange={e => setTxId(e.target.value)} placeholder="যেমন: 8CK234XF12" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"/>
            <p className="text-xs text-gray-400 mt-1">পেমেন্টের পর Transaction ID বা Reference নম্বরটি দিন</p>
          </div>

          <button onClick={() => setConfirmed(true)} disabled={!method || !txId.trim()}
                  className={`w-full py-4 rounded-xl font-bold text-white text-sm transition-all ${method && txId.trim() ? "hover:opacity-90 shadow-md" : "opacity-40 cursor-not-allowed"}`}
                  style={{ background: method && txId.trim() ? "linear-gradient(135deg, #FF5E13, #D84315)" : "#cbd5e1" }}>
            পেমেন্ট নিশ্চিত করুন ✓
          </button>
          <button onClick={() => go("register")} className="w-full mt-3 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors">← রেজিস্ট্রেশনে ফিরুন</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCTOR PENDING PAGE
// ============================================================
function DoctorPendingPage({ go, docPackage }: { go: (v: View) => void; docPackage: PackageKey }) {
  const pkg = PACKAGES[docPackage] || PACKAGES.pro;
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="relative w-full max-w-lg">
        <div className="text-center mb-6">
          <button onClick={() => go("landing")} className="inline-flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Heart className="w-7 h-7" style={{ color: "#FF5E13" }}/></div>
            <span className="text-2xl font-bold">মেডিকেয়ার BD</span>
          </button>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-white text-sm shadow-lg" style={{ background: pkg.color }}>
              <CheckCircle className="w-4 h-4"/> {pkg.name} প্যাকেজ নির্বাচিত
            </div>
          </div>
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${pkg.color}15` }}>
              <Clock className="w-10 h-10" style={{ color: pkg.color }}/>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">আপনার আবেদন প্রক্রিয়াধীন</h2>
            <p className="text-gray-500 text-sm">সাধারণত ১-২ কার্যদিবসের মধ্যে ড্যাশবোর্ড সক্রিয় হয়।</p>
          </div>
          <div className="space-y-3 mb-8">
            {[
              { n: "১", title: "পেমেন্ট ভেরিফিকেশন", desc: "আপনার পেমেন্ট তথ্য যাচাই করা হচ্ছে", icon: <CreditCard className="w-5 h-5"/>, current: true },
              { n: "২", title: "প্রোফাইল রিভিউ", desc: "চেম্বার ও ডাক্তারের তথ্য অ্যাডমিন যাচাই করবে", icon: <User className="w-5 h-5"/>, current: false },
              { n: "৩", title: "QR কোড জেনারেশন", desc: "আপনার চেম্বারের জন্য কাস্টম QR তৈরি হবে", icon: <QrCode className="w-5 h-5"/>, current: false },
              { n: "৪", title: "ড্যাশবোর্ড অ্যাক্টিভেশন", desc: `${pkg.name} প্যাকেজের সব ফিচার সক্রিয় হবে`, icon: <CheckCircle className="w-5 h-5"/>, current: false },
            ].map(s => (
              <div key={s.n} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${s.current ? "border-2" : "border bg-gray-50"}`}
                   style={s.current ? { borderColor: pkg.color, background: `${pkg.color}08` } : {}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={s.current ? { background: pkg.color } : { background: "#e5e7eb" }}>
                  {s.current ? <div className="text-white">{s.icon}</div> : <span className="text-sm font-bold text-gray-500">{s.n}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{s.title}</span>
                    {s.current && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: pkg.color }}>চলছে...</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-4 mb-6" style={{ background: pkg.lightBg }}>
            <p className="text-xs font-bold mb-2" style={{ color: pkg.color }}>আপনার {pkg.name} প্যাকেজে যা থাকবে:</p>
            <div className="grid grid-cols-2 gap-1">
              {pkg.features.map(f => <div key={f} className="flex items-center gap-1.5 text-xs text-gray-700"><Check className="w-3 h-3 flex-shrink-0" style={{ color: pkg.color }}/>{f}</div>)}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-5 text-center">সম্পন্ন হলে আপনার মোবাইল ও ইমেইলে নোটিফিকেশন পাঠানো হবে।</p>
          <div className="flex gap-3">
            <button onClick={() => go("landing")} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50">হোম পেজ</button>
            <button onClick={() => go("login")} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}>লগইন পেজ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AGENT PENDING PAGE
// ============================================================
function PendingApprovalPage({ go }: { go: (v: View) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 100%)" }}>
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"><ClipboardList className="w-10 h-10 text-orange-500"/></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">আবেদন সফলভাবে জমা হয়েছে!</h2>
        <p className="text-gray-600 mb-6 leading-relaxed">আপনার আবেদন ম্যানেজমেন্ট টিম রিভিউ করছে। পরবর্তী ধাপ:</p>
        <div className="text-left space-y-3 mb-8">
          {[{ n: "১", t: "ডকুমেন্ট ভেরিফিকেশন", d: "সিভি ও সার্টিফিকেট যাচাই করা হবে", cur: true },
            { n: "২", t: "ইন্টারভিউ", d: "ভেরিফিকেশন শেষে ইন্টারভিউয়ের জন্য ডাকা হবে", cur: false },
            { n: "৩", t: "অ্যাক্টিভেশন", d: "সফল ইন্টারভিউর পর লগইন অ্যাক্সেস দেওয়া হবে", cur: false }].map(s => (
            <div key={s.n} className={`flex items-start gap-4 p-4 rounded-xl ${s.cur ? "bg-orange-50 border border-orange-200" : "bg-gray-50"}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: s.cur ? "#FF5E13" : "#e5e7eb", color: s.cur ? "white" : "#6b7280" }}>{s.n}</div>
              <div><div className="font-semibold text-gray-900 text-sm">{s.t}</div><div className="text-xs text-gray-500 mt-0.5">{s.d}</div></div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => go("landing")} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50">হোম পেজ</button>
          <button onClick={() => go("login")} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}>লগইন পেজ</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCTOR DASHBOARD
// ============================================================
function DoctorDashboard({ 
  user, // নতুন প্রপস যুক্ত হয়েছে
  go, 
  setAuth, 
  docPackage, 
  subscriptionDays, 
  setSubscriptionDays, 
  isDashboardBlocked, 
  setIsDashboardBlocked 
}: {
  user: any; // ইউজার ডেটা অবজেক্ট
  go: (v: View) => void; 
  setAuth: (u: null) => void;
  docPackage: PackageKey; 
  subscriptionDays: number; 
  setSubscriptionDays: (n: number) => void;
  isDashboardBlocked: boolean; 
  setIsDashboardBlocked: (b: boolean) => void;
}) {
  
  // ... বাকি স্টেটগুলো আগের মতোই থাকবে

  
  // ... বাকি সব কোড আগের মতো থাকবে
  
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [playingCall, setPlayingCall] = useState<string | null>(null);
  
  const [payMethod, setPayMethod] = useState<"bkash" | "nagad" | null>(null);
  const [payTxId, setPayTxId] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [reportMonth, setReportMonth] = useState("জুন ২০২৫");

  const pkg = PACKAGES[docPackage] || PACKAGES.pro;

  const ALL_NAV = [
    { id: "overview", label: "Overview", icon: <Home className="w-5 h-5"/> },
    { id: "patients", label: "Patient Logs", icon: <Users className="w-5 h-5"/> },
    { id: "team", label: "My Team", icon: <Headphones className="w-5 h-5"/> },
    { id: "qr", label: "QR Generator", icon: <QrCode className="w-5 h-5"/> },
    { id: "reports", label: "Reports", icon: <BarChart2 className="w-5 h-5"/> },
    { id: "finance", label: "Finance", icon: <CreditCard className="w-5 h-5"/> },
    { id: "benefits", label: "My Benefits", icon: <Star className="w-5 h-5"/> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5"/> },
  ];
  const navItems = ALL_NAV.filter(n => pkg.tabs.includes(n.id));
  const activeLabel = navItems.find(n => n.id === tab)?.label || "Overview";
  const urgDays = subscriptionDays <= 3 ? "text-red-500" : subscriptionDays <= 7 ? "text-orange-500" : "text-green-600";

  const handleReactivate = () => { setIsDashboardBlocked(false); setSubscriptionDays(30); setPaySuccess(false); setPayMethod(null); setPayTxId(""); };

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#FFFBF9", fontFamily: "'Inter', sans-serif" }}>
      {/* BLOCKED OVERLAY */}
      {isDashboardBlocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Lock className="w-10 h-10 text-red-500"/>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ড্যাশবোর্ড সাময়িকভাবে ব্লক</h2>
            <p className="text-gray-600 mb-1">আপনার <strong style={{ color: pkg.color }}>{pkg.name}</strong> প্যাকেজের মেয়াদ শেষ হয়েছে।</p>
            <p className="text-gray-500 text-sm mb-6">পুনরায় সক্রিয় করতে নিচে পেমেন্ট করুন।</p>
            {!paySuccess ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{ id: "bkash" as const, name: "bKash", color: "#E2136E", num: "01700-000000" }, { id: "nagad" as const, name: "Nagad", color: "#F7941D", num: "01700-000001" }].map(m => (
                    <button key={m.id} onClick={() => setPayMethod(m.id)} className={`border-2 rounded-xl p-3 transition-all ${payMethod === m.id ? "shadow-md" : "border-gray-200"}`}
                            style={payMethod === m.id ? { borderColor: m.color, background: `${m.color}10` } : {}}>
                      <div className="font-black text-lg" style={{ color: m.color }}>{m.name}</div>
                      <div className="text-xs text-gray-500">{m.num}</div>
                    </button>
                  ))}
                </div>
                {payMethod && <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600 text-left">পরিমাণ: <strong style={{ color: pkg.color }}>{pkg.priceDisplay}</strong> পাঠান <strong>{payMethod === "bkash" ? "01700-000000" : "01700-000001"}</strong> নম্বরে (Send Money)</div>}
                <input type="text" value={payTxId} onChange={e => setPayTxId(e.target.value)} placeholder="Transaction ID / Reference নম্বর" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-300"/>
                <button onClick={() => setPaySuccess(true)} disabled={!payMethod || !payTxId.trim()}
                        className={`w-full py-4 rounded-xl font-bold text-white text-sm transition-all ${payMethod && payTxId.trim() ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"}`}
                        style={{ background: payMethod && payTxId.trim() ? "#22c55e" : "#cbd5e1" }}>
                  পেমেন্ট নিশ্চিত করুন →
                </button>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
                <p className="text-green-700 font-semibold mb-4">পেমেন্ট তথ্য জমা হয়েছে!</p>
                <button onClick={handleReactivate} className="w-full py-4 rounded-xl font-bold text-white text-sm hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}>
                  <RefreshCw className="w-4 h-4 inline mr-2"/>ড্যাশবোর্ড Activate করুন
                </button>
              </>
            )}
            <button onClick={() => { setAuth(null); go("landing"); }} className="mt-3 text-gray-400 text-sm hover:text-gray-600 block w-full">লগ আউট</button>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} flex-shrink-0 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 shadow-sm`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FF5E13" }}><Heart className="w-5 h-5 text-white"/></div>
            {sidebarOpen && <span className="font-bold text-gray-900 text-sm">মেডিকেয়ার BD</span>}
          </div>
        </div>
        {sidebarOpen && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&auto=format" alt="Doctor" className="w-10 h-10 rounded-full object-cover bg-gray-200"/>
              <div>
  <div className="text-sm font-bold text-gray-900">{user?.name || "ব্যবহারকারী"}</div>
  <div className="text-xs text-gray-500">{user?.role || "ডাক্তার"}</div>
</div>
            </div>
            <div className="rounded-xl p-3 mb-2" style={{ background: pkg.lightBg }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold" style={{ color: pkg.color }}>{pkg.name} প্যাকেজ</span>
                <span className={`text-xs font-semibold ${urgDays}`}>{subscriptionDays}d left</span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((subscriptionDays / 30) * 100, 100)}%`, background: subscriptionDays <= 3 ? "#ef4444" : subscriptionDays <= 7 ? "#f97316" : pkg.color }}/>
              </div>
              {subscriptionDays <= 7 && <p className="text-xs text-red-500 mt-1.5 font-medium">⚠ মেয়াদ শেষের দিকে!</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setSubscriptionDays(Math.max(0, subscriptionDays - 5))} className="flex-1 text-xs py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">-5d</button>
              <button onClick={() => setIsDashboardBlocked(true)} className="flex-1 text-xs py-1 border border-red-200 rounded-lg text-red-500 hover:bg-red-50">Block</button>
              <button onClick={() => { setSubscriptionDays(30); setIsDashboardBlocked(false); }} className="flex-1 text-xs py-1 border border-green-200 rounded-lg text-green-600 hover:bg-green-50">Reset</button>
            </div>
          </div>
        )}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? "text-white shadow-md" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                    style={tab === item.id ? { background: "linear-gradient(135deg, #FF5E13, #D84315)" } : {}}>
              {item.icon}{sidebarOpen && item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => { setAuth(null); go("landing"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut className="w-5 h-5"/>{sidebarOpen && "লগ আউট"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700"><Menu className="w-5 h-5"/></button>
            <div><h1 className="font-bold text-gray-900">{activeLabel}</h1><p className="text-xs text-gray-500">রবিবার, ২৯ জুন ২০২৫</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:flex text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: pkg.lightBg, color: pkg.color }}>{pkg.name}</span>
            {subscriptionDays <= 7 && <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-100"><AlertTriangle className="w-3.5 h-3.5"/> মেয়াদ শেষের দিকে</div>}
            <div className="relative cursor-pointer"><Bell className="w-5 h-5 text-gray-500"/><span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center">৩</span></div>
          </div>
        </div>

        <div className="p-6">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Starter package: show call-based billing tracker */}
              {docPackage === "starter" && (
                <div className="rounded-2xl p-5 border-2" style={{ borderColor: "#64748B", background: "#F8FAFC" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">স্টার্টার প্যাকেজ — কল ভিত্তিক চার্জ ট্র্যাকার</h3>
                      <p className="text-xs text-gray-500 mt-0.5">প্রতি সফল ফলো-আপ কলে ১৫৳ চার্জ হবে</p>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded-full font-bold text-white" style={{ background: "#64748B" }}>Starter</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                      { label: "মোট কল", val: "৪২টি", sub: "এই মাসে", color: "bg-blue-50 text-blue-600", icon: <PhoneCall className="w-5 h-5"/> },
                      { label: "সফল কল", val: "৩৮টি", sub: "৯০% সাফল্য", color: "bg-green-50 text-green-600", icon: <CheckCircle className="w-5 h-5"/> },
                      { label: "মিসড কল", val: "৪টি", sub: "রিকোয়েস্ট করা হয়েছে", color: "bg-orange-50 text-orange-600", icon: <PhoneOff className="w-5 h-5"/> },
                      { label: "মোট চার্জ", val: "৫৭০৳", sub: "৩৮ × ১৫৳", color: "bg-slate-50 text-slate-700 font-bold", icon: <CreditCard className="w-5 h-5"/> },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
                        <div className="text-xl font-bold text-gray-900">{s.val}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        <div className="text-xs font-medium mt-0.5" style={{ color: "#64748B" }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">এই মাসের কল লগ</span>
                      <span className="text-xs text-gray-400">জুন ২০২৫</span>
                    </div>
                    <div className="space-y-2">
                      {[{ t: "10:23 AM", p: "রহিম উদ্দিন", s: "success", charge: "১৫৳" }, { t: "11:05 AM", p: "ফাতেমা বেগম", s: "success", charge: "১৫৳" }, { t: "12:30 PM", p: "করিম শেখ", s: "missed", charge: "—" }].map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${c.s === "success" ? "bg-green-500" : "bg-gray-300"}`}/>
                            <span className="text-gray-500">{c.t}</span>
                            <span className="font-medium text-gray-800">{c.p}</span>
                          </div>
                          <span className={`font-bold ${c.s === "success" ? "text-green-600" : "text-gray-400"}`}>{c.charge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(docPackage === "starter"
                  ? [{ label: "আজকের রোগী", value: "৩২", trend: "+৮%", icon: <Users className="w-5 h-5"/>, bg: "bg-blue-50 text-blue-600" }, { label: "সফল কল (আজ)", value: "৮টি", trend: "×১৫৳ = ১২০৳", icon: <CheckCircle className="w-5 h-5"/>, bg: "bg-green-50 text-green-600" }, { label: "মিসড কল (আজ)", value: "০টি", trend: "০%", icon: <PhoneOff className="w-5 h-5"/>, bg: "bg-orange-50 text-orange-600" }, { label: "আজকের চার্জ", value: "১২০৳", trend: "৮ কল × ১৫৳", icon: <CreditCard className="w-5 h-5"/>, bg: "bg-slate-50 text-slate-700" }]
                  : [{ label: "আজকের রোগী", value: "৩২", trend: "+৮%", icon: <Users className="w-5 h-5"/>, bg: "bg-blue-50 text-blue-600" }, { label: "সফল ফলো-আপ", value: "২৮", trend: "+১২%", icon: <CheckCircle className="w-5 h-5"/>, bg: "bg-green-50 text-green-600" }, { label: "লাইভ কল", value: "৩টি", trend: "Active", icon: <PhoneCall className="w-5 h-5"/>, bg: "bg-orange-50 text-orange-600" }, { label: "রেটিং", value: "৪.৯★", trend: "Google", icon: <Star className="w-5 h-5"/>, bg: "bg-yellow-50 text-yellow-600" }]
                ).map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>{s.icon}</div><span className="text-xs text-green-500 font-semibold">{s.trend}</span></div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-1">সাপ্তাহিক পেশেন্ট ট্র্যাকিং</h3>
                  <p className="text-xs text-gray-500 mb-4">রোগী ও ফলো-আপ তুলনা</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={CHART_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="day" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 11 }}/><Tooltip/>
                      <Line type="monotone" dataKey="patients" stroke="#FF5E13" strokeWidth={2.5} dot={false} name="রোগী"/>
                      <Line type="monotone" dataKey="followups" stroke="#22c55e" strokeWidth={2.5} dot={false} name="ফলো-আপ"/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-1">এজেন্ট পারফরম্যান্স</h3>
                  <p className="text-xs text-gray-500 mb-4">সাপ্তাহিক কল হ্যান্ডেল</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={PERF_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="day" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 11 }}/><Tooltip/>
                      <Bar dataKey="calls" fill="#FF5E13" radius={[4, 4, 0, 0]} name="কল"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">সাম্প্রতিক রোগী</h3>
                  <button onClick={() => setTab("patients")} className="text-sm font-medium hover:underline" style={{ color: "#FF5E13" }}>সব দেখুন →</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {PATIENTS.slice(0, 3).map(p => (
                    <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">{p.name[0]}</div>
                        <div><div className="font-semibold text-sm text-gray-900">{p.name}</div><div className="text-xs text-gray-500">{p.phone} · বয়স {p.age}</div></div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === "urgent" ? "bg-red-100 text-red-600" : p.status === "follow-up" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                          {p.status === "urgent" ? "⚠ জরুরি" : p.status === "follow-up" ? "ফলো-আপ" : "✓ স্থিতিশীল"}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">পরবর্তী: {p.nextFollowup}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PATIENT LOGS */}
          {tab === "patients" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/><input type="text" placeholder="রোগী খুঁজুন..." className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 w-64"/></div>
                <button className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90" style={{ background: "#FF5E13" }}><Plus className="w-4 h-4"/> নতুন রোগী</button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">{["রোগী", "ফোন", "শেষ ভিজিট", "পরবর্তী ফলো-আপ", "স্ট্যাটাস", "ডাক্তারের নোট"].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {PATIENTS.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">{p.name[0]}</div><div><div className="font-semibold text-sm text-gray-900">{p.name}</div><div className="text-xs text-gray-400">বয়স: {p.age}</div></div></div></td>
                          <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{p.phone}</td>
                          <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{p.lastVisit}</td>
                          <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{p.nextFollowup}</td>
                          <td className="px-5 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${p.status === "urgent" ? "bg-red-100 text-red-600" : p.status === "follow-up" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>{p.status === "urgent" ? "⚠ জরুরি" : p.status === "follow-up" ? "ফলো-আপ" : "✓ স্থিতিশীল"}</span></td>
                          <td className="px-5 py-4 text-xs text-gray-500 max-w-[200px] truncate">{p.doctorNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MY TEAM */}
          {tab === "team" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                {[{ name: "রাফি হাসান", avatar: "র", status: "live", calls: 42 }, { name: "সুমাইয়া খানম", avatar: "স", status: "available", calls: 38 }].map((a, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative"><div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">{a.avatar}</div><div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${a.status === "live" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}/></div>
                      <div><div className="font-bold text-gray-900 text-sm">{a.name}</div><div className={`text-xs font-medium ${a.status === "live" ? "text-green-600" : "text-gray-400"}`}>{a.status === "live" ? "● Live" : "○ Available"}</div></div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-500">আজকের কল</span><span className="font-bold text-gray-900">{a.calls}টি</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(a.calls / 60) * 100}%`, background: "#FF5E13" }}/></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">আজকের কল ভলিউম</h3>
                <div className="space-y-3">
                  {[{ label: "ইনকামিং কল", val: 125, max: 150, color: "#3b82f6" }, { label: "সফল ফলো-আপ", val: 98, max: 125, color: "#22c55e" }, { label: "মিসড কল", val: 0, max: 10, color: "#ef4444" }].map(b => (
                    <div key={b.label} className="flex items-center gap-4"><span className="text-sm text-gray-600 w-36 flex-shrink-0">{b.label}</span><div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.max > 0 ? (b.val / b.max) * 100 : 0}%`, background: b.color }}/></div><span className="text-sm font-bold text-gray-900 w-8 text-right">{b.val}</span></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">কল রেকর্ড ও অ্যাকশন লগ</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">{["রোগী", "সময়", "এজেন্ট নোট", "রেকর্ডিং", "আপলোড"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {CALLS.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-5 py-4"><div className="font-semibold text-sm text-gray-900">{c.patient}</div><div className="text-xs text-gray-400">{c.phone}</div></td>
                          <td className="px-5 py-4"><div className="text-sm text-gray-600 whitespace-nowrap">{c.time}</div><div className="text-xs text-gray-400">{c.duration}</div></td>
                          <td className="px-5 py-4 text-xs text-gray-600 max-w-[200px]">{c.note}</td>
                          <td className="px-5 py-4">{c.hasRec ? (<button onClick={() => setPlayingCall(playingCall === c.id ? null : c.id)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${playingCall === c.id ? "bg-orange-100 text-orange-700" : "text-white hover:opacity-90"}`} style={playingCall !== c.id ? { background: "#FF5E13" } : {}}>{playingCall === c.id ? <Pause className="w-3 h-3"/> : <Play className="w-3 h-3"/>}{playingCall === c.id ? "Pause" : "Play"}</button>) : <span className="text-xs text-gray-400">নেই</span>}</td>
                          <td className="px-5 py-4"><button className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><Upload className="w-4 h-4"/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* QR GENERATOR */}
          {tab === "qr" && (
            <div className="flex flex-col items-center py-8">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">আপনার QR কোড</h3>
                <p className="text-sm text-gray-500 mb-8">রোগীরা এই QR কোড স্ক্যান করে প্রেসক্রিপশন জমা দিতে পারবেন।</p>
                <div className="flex justify-center mb-8"><div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-lg"><QRCodeSVG size={200} color={pkg.color}/></div></div>
                <div className="text-sm text-gray-600 mb-6 bg-orange-50 rounded-xl p-4">
                  <strong className="text-orange-600">ডা. আহমেদ করিম</strong><br/>কার্ডিওলজিস্ট · ধানমন্ডি, ঢাকা<br/>
                  <button onClick={() => go("qrscan")} className="text-xs text-orange-500 hover:underline mt-1 block">medicare-bd.com/dr/ahmed-karim →</button>
                </div>
                <button className="w-full py-4 rounded-2xl text-white font-bold text-sm hover:opacity-90 shadow-lg" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}>
                  <Download className="w-4 h-4 inline mr-2"/>Download Ready Print Standee (PDF)
                </button>
                <div className="mt-4 flex gap-3">
                  <button className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50">শেয়ার করুন</button>
                  <button className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50">প্রিন্ট করুন</button>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {tab === "reports" && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div><h3 className="font-bold text-gray-900 text-lg">মাসিক রিপোর্ট</h3><p className="text-xs text-gray-500 mt-0.5">ডাক্তার ড্যাশবোর্ড — <span style={{ color: pkg.color }}>{pkg.name}</span> প্যাকেজ</p></div>
                  <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                    {["জুন ২০২৫", "মে ২০২৫", "এপ্রিল ২০২৫", "মার্চ ২০২৫"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[{ label: "মোট রোগী", val: "৩৪২", icon: <Users className="w-5 h-5"/>, bg: "bg-blue-50 text-blue-600" }, { label: "ফলো-আপ সম্পন্ন", val: "২৯৮", icon: <CheckCircle className="w-5 h-5"/>, bg: "bg-green-50 text-green-600" }, { label: "কল হ্যান্ডেল", val: "৪২৫", icon: <PhoneCall className="w-5 h-5"/>, bg: "bg-orange-50 text-orange-600" }, { label: "সাফল্যের হার", val: "৯৪%", icon: <Star className="w-5 h-5"/>, bg: "bg-yellow-50 text-yellow-600" }].map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4"><div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.bg}`}>{s.icon}</div><div className="text-xl font-bold text-gray-900">{s.val}</div><div className="text-xs text-gray-500 mt-0.5">{s.label}</div></div>
                  ))}
                </div>
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">মাসিক রোগী প্রবাহ</h4>
                  <ResponsiveContainer width="100%" height={180}><BarChart data={CHART_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="day" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 11 }}/><Tooltip/><Bar dataKey="patients" fill="#FF5E13" radius={[4, 4, 0, 0]} name="রোগী"/></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-700">
                  <div className="font-semibold mb-2">সারসংক্ষেপ — {reportMonth}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>মিসড কল: <strong className="text-green-600">০টি</strong></div>
                    <div>গড় রেসপন্স: <strong>৩.২ ঘণ্টা</strong></div>
                    <div>রোগী রেটিং: <strong>৪.৯★</strong></div>
                    <div>প্যাকেজ: <strong style={{ color: pkg.color }}>{pkg.name}</strong></div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}><Download className="w-4 h-4"/> PDF ডাউনলোড</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"><Mail className="w-4 h-4"/> ইমেইলে পাঠান</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-green-200 text-green-700 hover:bg-green-50"><Phone className="w-4 h-4"/> WhatsApp</button>
                </div>
              </div>
            </div>
          )}

          {/* FINANCE */}
          {tab === "finance" && (
            <div className="space-y-6 max-w-4xl">
              <div className="rounded-2xl p-6 border-2" style={{ borderColor: pkg.color, background: pkg.lightBg }}>
                <div className="flex items-center justify-between mb-3">
                  <div><div className="text-xs text-gray-500 mb-0.5">বর্তমান সাবস্ক্রিপশন</div><div className="font-bold text-gray-900 text-xl">{pkg.name} ({pkg.nameEn})</div><div className="text-sm font-semibold mt-0.5" style={{ color: pkg.color }}>{pkg.priceDisplay}</div></div>
                  <div className="text-right"><div className="text-xs text-gray-500 mb-1">মেয়াদ</div><div className={`text-2xl font-bold ${subscriptionDays <= 7 ? "text-red-600" : subscriptionDays <= 14 ? "text-orange-500" : "text-green-600"}`}>{subscriptionDays} দিন</div><div className="text-xs text-gray-500">বাকি</div></div>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-3"><div className="h-full rounded-full" style={{ width: `${(subscriptionDays / 30) * 100}%`, background: subscriptionDays <= 7 ? "#ef4444" : subscriptionDays <= 14 ? "#f97316" : pkg.color }}/></div>
                {subscriptionDays <= 7 && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0"/> মেয়াদ শেষের দিকে! দ্রুত নবায়ন করুন।</div>}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"><h3 className="font-bold text-gray-900">পেমেন্ট হিস্ট্রি</h3><button className="text-xs font-semibold hover:underline" style={{ color: "#FF5E13" }}>সব Invoice →</button></div>
                  <div className="divide-y divide-gray-50">
                    {PAYMENT_HISTORY.map((p, i) => (
                      <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50">
                        <div><div className="text-sm font-semibold text-gray-900">{p.invoice}</div><div className="text-xs text-gray-500">{p.date} · {p.method}</div></div>
                        <div className="text-right"><div className="text-sm font-bold text-green-600">{p.amount}</div><div className="flex items-center gap-2 mt-1 justify-end"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Paid</span><button className="text-xs text-gray-400 hover:text-orange-500"><Download className="w-3.5 h-3.5"/></button></div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">নতুন পেমেন্ট করুন</h3>
                  <div className="bg-orange-50 rounded-xl p-4 mb-4"><div className="text-sm text-gray-700">পরবর্তী বিল: <strong style={{ color: "#FF5E13" }}>{pkg.priceDisplay}</strong></div><div className="text-xs text-gray-500 mt-0.5">নবায়নের তারিখ: ১ জুলাই ২০২৫</div></div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[{ id: "bkash" as const, name: "bKash", color: "#E2136E", num: "01700-000000" }, { id: "nagad" as const, name: "Nagad", color: "#F7941D", num: "01700-000001" }].map(m => (
                      <button key={m.id} onClick={() => setPayMethod(m.id)} className={`border-2 rounded-xl p-3 text-center transition-all ${payMethod === m.id ? "shadow-md" : "border-gray-200"}`} style={payMethod === m.id ? { borderColor: m.color, background: `${m.color}10` } : {}}>
                        <div className="font-black text-base" style={{ color: m.color }}>{m.name}</div>
                        <div className="text-xs text-gray-400">{m.num}</div>
                      </button>
                    ))}
                  </div>
                  {payMethod && <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-600"><strong>{payMethod === "bkash" ? "01700-000000" : "01700-000001"}</strong> নম্বরে <strong>{pkg.priceDisplay}</strong> পাঠান (Send Money)</div>}
                  <input type="text" value={payTxId} onChange={e => setPayTxId(e.target.value)} placeholder="Transaction ID দিন" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-300"/>
                  <button disabled={!payMethod || !payTxId.trim()} onClick={() => { setPaySuccess(true); setSubscriptionDays(30); }}
                          className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all ${payMethod && payTxId.trim() ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"}`}
                          style={{ background: payMethod && payTxId.trim() ? "#22c55e" : "#cbd5e1" }}>
                    {paySuccess ? "✓ পেমেন্ট সাবমিট হয়েছে" : "পেমেন্ট নিশ্চিত করুন"}
                  </button>
                  {paySuccess && <p className="text-xs text-green-600 mt-2 text-center font-medium">✓ Invoice ইমেইল ও WhatsApp এ পাঠানো হয়েছে।</p>}
                </div>
              </div>
            </div>
          )}

          {/* BENEFITS — VIP & Corporate Packages */}
          {tab === "benefits" && <BenefitsTab pkg={pkg}/>}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">প্রোফাইল সেটিংস</h3></div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&auto=format" alt="Doctor" className="w-16 h-16 rounded-full object-cover bg-gray-200"/>
                    <div><div className="font-bold text-gray-900">ডা. আহমেদ করিম</div><div className="text-sm text-gray-500">dr.karim@example.com</div><button className="mt-1 text-xs font-semibold hover:underline" style={{ color: "#FF5E13" }}>ছবি পরিবর্তন করুন</button></div>
                  </div>
                  {[["পূর্ণ নাম", "ডা. আহমেদ করিম"], ["বিশেষজ্ঞতা", "কার্ডিওলজি"], ["চেম্বারের ঠিকানা", "ধানমন্ডি ২৭, ঢাকা ১২০৯"], ["মোবাইল নম্বর", "01712345678"]].map(([l, v]) => (
                    <div key={l}><label className="text-xs font-semibold text-gray-500 block mb-1">{l}</label><input defaultValue={v} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"/></div>
                  ))}
                  <button className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90" style={{ background: "#FF5E13" }}>পরিবর্তন সেভ করুন</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// BENEFITS TAB — VIP & Corporate Doctor Packages
// ============================================================
function BenefitsTab({ pkg }: { pkg: typeof PACKAGES.pro }) {
  const [vipEnabled, setVipEnabled] = useState(false);
  const [vipExpanded, setVipExpanded] = useState(false);
  const [vipSubmitted, setVipSubmitted] = useState(false);
  const [vipForm, setVipForm] = useState({ services: "", monthlyFee: "", extra: "" });

  const [corpEnabled, setCorpEnabled] = useState(false);
  const [corpExpanded, setCorpExpanded] = useState(false);
  const [corpSubmitted, setCorpSubmitted] = useState(false);
  const [corpForm, setCorpForm] = useState({ orgType: "", services: "", fee: "", period: "মাসিক" });

  const vipValid = vipForm.services.trim().length > 0 && vipForm.monthlyFee.trim().length > 0;
  const corpValid = corpForm.orgType.length > 0 && corpForm.services.trim().length > 0 && corpForm.fee.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: pkg.lightBg }}>
            <Star className="w-6 h-6" style={{ color: pkg.color }}/>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">ডাক্তার-এক্সক্লুসিভ প্যাকেজ অফার</h3>
            <p className="text-sm text-gray-500 mt-1">আপনার চেম্বারে প্রিমিয়াম ও কর্পোরেট রোগী আনতে নিচের প্যাকেজগুলো চালু করুন। আমাদের মার্কেটিং টিম আপনার কাছে উপযুক্ত রোগী পৌঁছে দেবে।</p>
          </div>
        </div>
      </div>

      {/* VIP Patient Package */}
      <div className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${vipEnabled ? "border-yellow-400" : "border-gray-100"}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-2xl">👑</div>
              <div>
                <div className="font-bold text-gray-900">VIP পেশেন্ট প্যাকেজ</div>
                <div className="text-xs text-gray-500 mt-0.5">প্রিমিয়াম ও উচ্চবিত্ত রোগীদের জন্য বিশেষ সেবা</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${vipEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {vipEnabled ? "● সক্রিয়" : "○ নিষ্ক্রিয়"}
              </span>
              {!vipEnabled && (
                <button onClick={() => { setVipEnabled(true); setVipExpanded(true); }}
                        className="text-sm font-bold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-all"
                        style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                  Enable করুন
                </button>
              )}
              {vipEnabled && !vipSubmitted && (
                <button onClick={() => setVipExpanded(!vipExpanded)} className="text-sm text-gray-500 px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50">
                  {vipExpanded ? "সংকুচিত করুন ↑" : "বিস্তারিত দেখুন ↓"}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {["অগ্রাধিকার অ্যাপয়েন্টমেন্ট", "বাসায় ভিজিট অপশন", "২৪/৭ এজেন্ট সাপোর্ট", "প্রিমিয়াম ফলো-আপ", "ডেডিকেটেড কনসালটেশন", "স্বাস্থ্য প্রতিবেদন"].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600 bg-yellow-50 rounded-lg p-2">
                <Check className="w-3 h-3 flex-shrink-0 text-yellow-600"/>{f}
              </div>
            ))}
          </div>

          {vipEnabled && vipExpanded && !vipSubmitted && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-800">
                <strong>কীভাবে কাজ করে:</strong> আপনি নিচে আপনার VIP সেবার বিবরণ ও মাসিক চার্জ লিখুন। আমাদের মার্কেটিং টিম উপযুক্ত VIP রোগীদের আপনার কাছে পাঠাবে।
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">আপনি কি কি সেবা দেবেন? <span className="text-red-500">*</span></label>
                <textarea value={vipForm.services} onChange={e => setVipForm(p => ({ ...p, services: e.target.value }))}
                          placeholder="যেমন: বাড়িতে ভিজিট, ২৪ ঘণ্টা ফোনে সাড়া, প্রিমিয়াম ওষুধ পরামর্শ, মাসিক স্বাস্থ্য পর্যালোচনা..."
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300" rows={3}/>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">মাসিক চার্জ (BDT) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                    <input type="number" value={vipForm.monthlyFee} onChange={e => setVipForm(p => ({ ...p, monthlyFee: e.target.value }))}
                           placeholder="যেমন: 5000" className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"/>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">অতিরিক্ত সুবিধা (ঐচ্ছিক)</label>
                  <input type="text" value={vipForm.extra} onChange={e => setVipForm(p => ({ ...p, extra: e.target.value }))}
                         placeholder="যেমন: বিনামূল্যে ল্যাব টেস্ট রেফারেল" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"/>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setVipEnabled(false); setVipExpanded(false); }} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-50">বাতিল করুন</button>
                <button onClick={() => { if(vipValid) { setVipSubmitted(true); setVipExpanded(false); } }} disabled={!vipValid}
                        className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all ${vipValid ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"}`}
                        style={{ background: vipValid ? "linear-gradient(135deg, #F59E0B, #D97706)" : "#cbd5e1" }}>
                  VIP প্যাকেজ Confirm করুন ✓
                </button>
              </div>
            </div>
          )}

          {vipEnabled && vipSubmitted && (
            <div className="border-t border-gray-100 pt-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="font-semibold text-green-800 text-sm">VIP প্যাকেজ সক্রিয় হয়েছে!</div>
                    <div className="text-xs text-green-700 mt-1">মাসিক চার্জ: <strong>৳{vipForm.monthlyFee}</strong> · আমাদের মার্কেটিং টিম VIP রোগীদের আপনার কাছে পৌঁছে দেবে।</div>
                    <div className="text-xs text-gray-500 mt-2 bg-white rounded-lg p-2">সেবা: {vipForm.services}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => { setVipSubmitted(false); setVipExpanded(true); }} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">সেবার বিবরণ পরিবর্তন করুন</button>
            </div>
          )}
        </div>
      </div>

      {/* Corporate Package */}
      <div className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${corpEnabled ? "border-blue-400" : "border-gray-100"}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">🏢</div>
              <div>
                <div className="font-bold text-gray-900">কর্পোরেট প্যাকেজ</div>
                <div className="text-xs text-gray-500 mt-0.5">কর্পোরেট প্রতিষ্ঠানের কর্মীদের জন্য বিশেষ স্বাস্থ্যসেবা</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${corpEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {corpEnabled ? "● সক্রিয়" : "○ নিষ্ক্রিয়"}
              </span>
              {!corpEnabled && (
                <button onClick={() => { setCorpEnabled(true); setCorpExpanded(true); }}
                        className="text-sm font-bold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-all"
                        style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                  Enable করুন
                </button>
              )}
              {corpEnabled && !corpSubmitted && (
                <button onClick={() => setCorpExpanded(!corpExpanded)} className="text-sm text-gray-500 px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50">
                  {corpExpanded ? "সংকুচিত করুন ↑" : "বিস্তারিত দেখুন ↓"}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {["কর্মী স্বাস্থ্য পরীক্ষা", "বাল্ক অ্যাপয়েন্টমেন্ট", "কোম্পানি স্বাস্থ্য রিপোর্ট", "অনসাইট ভিজিট", "টেলিকনসালটেশন", "ডেডিকেটেড লাইন"].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600 bg-blue-50 rounded-lg p-2">
                <Check className="w-3 h-3 flex-shrink-0 text-blue-600"/>{f}
              </div>
            ))}
          </div>

          {corpEnabled && corpExpanded && !corpSubmitted && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <strong>কীভাবে কাজ করে:</strong> আপনি কর্পোরেট সেবার বিবরণ ও চার্জ লিখুন। আমাদের B2B মার্কেটিং টিম কোম্পানিগুলোর সাথে চুক্তি করে কর্মীদের আপনার কাছে পাঠাবে।
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">কোন ধরনের প্রতিষ্ঠান? <span className="text-red-500">*</span></label>
                <select value={corpForm.orgType} onChange={e => setCorpForm(p => ({ ...p, orgType: e.target.value }))}
                        className="w-full py-3 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">বেছে নিন</option>
                  {["গার্মেন্টস / ম্যানুফ্যাকচারিং", "আইটি / টেকনোলজি", "ব্যাংক / আর্থিক প্রতিষ্ঠান", "ফার্মাসিউটিক্যালস", "শিক্ষা প্রতিষ্ঠান", "টেলিকম", "অন্যান্য কর্পোরেট"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">সেবার বিবরণ <span className="text-red-500">*</span></label>
                <textarea value={corpForm.services} onChange={e => setCorpForm(p => ({ ...p, services: e.target.value }))}
                          placeholder="যেমন: মাসিক স্বাস্থ্য পরীক্ষা, কর্মী ফলো-আপ, অনসাইট মেডিকেল ক্যাম্প..."
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" rows={3}/>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">চার্জ (BDT) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                    <input type="number" value={corpForm.fee} onChange={e => setCorpForm(p => ({ ...p, fee: e.target.value }))}
                           placeholder="প্রতি কর্মী বা মাসিক চুক্তিতে" className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">পেমেন্ট পিরিয়ড</label>
                  <select value={corpForm.period} onChange={e => setCorpForm(p => ({ ...p, period: e.target.value }))}
                          className="w-full py-2.5 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {["মাসিক", "ত্রৈমাসিক", "বার্ষিক", "প্রতি কর্মী/ভিজিট"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setCorpEnabled(false); setCorpExpanded(false); }} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-50">বাতিল করুন</button>
                <button onClick={() => { if(corpValid) { setCorpSubmitted(true); setCorpExpanded(false); } }} disabled={!corpValid}
                        className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all ${corpValid ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"}`}
                        style={{ background: corpValid ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#cbd5e1" }}>
                  কর্পোরেট প্যাকেজ Confirm করুন ✓
                </button>
              </div>
            </div>
          )}

          {corpEnabled && corpSubmitted && (
            <div className="border-t border-gray-100 pt-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
                  <div>
                    <div className="font-semibold text-green-800 text-sm">কর্পোরেট প্যাকেজ সক্রিয় হয়েছে!</div>
                    <div className="text-xs text-green-700 mt-1">চার্জ: <strong>৳{corpForm.fee} ({corpForm.period})</strong> · টার্গেট: {corpForm.orgType}</div>
                    <div className="text-xs text-gray-500 mt-2 bg-white rounded-lg p-2">সেবা: {corpForm.services}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => { setCorpSubmitted(false); setCorpExpanded(true); }} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">সেবার বিবরণ পরিবর্তন করুন</button>
            </div>
          )}
        </div>
      </div>

      {/* Admin note */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"/>
          <div className="text-sm text-gray-600">
            <strong className="text-gray-800">মার্কেটিং টিমের ভূমিকা:</strong> আপনি প্যাকেজ সক্রিয় করার পর আমাদের ডেডিকেটেড মার্কেটিং টিম আপনার অফার উপযুক্ত রোগী ও কর্পোরেট প্রতিষ্ঠানের কাছে পৌঁছে দেবে। আপনাকে শুধু চিকিৎসা দিতে হবে।
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PATIENT DASHBOARD
// ============================================================
function PatientDashboard({ go, setAuth }: { go: (v: View) => void; setAuth: (u: null) => void }) {
  const [urgentOpen, setUrgentOpen] = useState(false); const [urgentMsg, setUrgentMsg] = useState(""); const [urgentSent, setUrgentSent] = useState(false);
  const meds = [{ name: "Amlodipine 5mg", m: true, n: false, e: true }, { name: "Losartan 50mg", m: true, n: false, e: false }, { name: "Aspirin 75mg", m: false, n: false, e: true }];
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FF5E13 0%, #D84315 60%, #BF360C 100%)", fontFamily: "'Hind Siliguri', 'Inter', sans-serif" }}>
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-center justify-between text-white mb-2">
          <div><p className="text-sm text-orange-200">স্বাগতম,</p><h1 className="text-xl font-bold">মো. রহিম উদ্দিন</h1></div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"><Bell className="w-5 h-5 text-white"/></button>
            <button onClick={() => { setAuth(null); go("landing"); }} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"><LogOut className="w-5 h-5 text-white"/></button>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 rounded-t-3xl min-h-screen px-4 pt-6 pb-32">
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center gap-4">
            <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&auto=format" alt="Doctor" className="w-16 h-16 rounded-2xl object-cover bg-gray-200"/>
            <div className="flex-1"><div className="text-xs text-orange-500 font-semibold mb-0.5">আপনার ডাক্তার</div><div className="font-bold text-gray-900">ডা. আহমেদ করিম</div><div className="text-xs text-gray-500">কার্ডিওলজিস্ট · ধানমন্ডি, ঢাকা</div></div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="text-xs text-gray-500 mb-2">আপনার ডেডিকেটেড সাপোর্ট এজেন্ট</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative"><div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">র</div><div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"/></div>
                <div><div className="text-sm font-semibold text-gray-900">রাফি হাসান</div><div className="text-xs text-gray-500">01712345678</div></div>
              </div>
              <a href="tel:01712345678" className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 shadow-md" style={{ background: "#22c55e" }}><PhoneCall className="w-4 h-4"/> কল করুন</a>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-900">পরবর্তী ফলো-আপ</h3><span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full font-semibold">১২ জুলাই ২০২৫</span></div>
          <p className="text-sm text-gray-600 mb-3">আমাদের এজেন্ট আপনাকে যথাসময়ে কল করে স্লট বুক করে দেবে।</p>
          <div className="space-y-2"><div className="flex justify-between text-xs text-gray-500"><span>শেষ ভিজিট: ২০ জুন</span><span className="font-semibold text-orange-600">আর ১২ দিন বাকি</span></div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: "55%", background: "linear-gradient(90deg, #FF5E13, #FF7A00)" }}/></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-4">ওষুধের সময়সূচি</h3>
          <div className="space-y-3">
            {meds.map((med, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-800">{med.name}</span>
                <div className="flex gap-1.5">
                  {[["সকাল", med.m], ["দুপুর", med.n], ["রাত", med.e]].map(([l, v]) => (
                    <div key={l as string} className={`text-xs px-2 py-1 rounded-lg font-medium ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>{l}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4"><div className="text-xs text-gray-500 mb-2 font-medium">ডাক্তারের পরামর্শ:</div><div className="text-sm text-gray-700 bg-blue-50 rounded-xl p-3">রক্তচাপ নিয়ন্ত্রণে আছে। ওষুধ চালিয়ে যান এবং লবণ কম খান।</div></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-900">আমার স্বাস্থ্য রিপোর্ট</h3><span className="text-xs bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-semibold">জুন ২০২৫</span></div>
          <div className="grid grid-cols-3 gap-3">
            {[{ l: "মোট ভিজিট", v: "৩বার" }, { l: "মিসড ডোজ", v: "০টি" }, { l: "পরবর্তী চেক", v: "১২ জুলাই" }].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center"><div className="font-bold text-gray-900">{s.v}</div><div className="text-xs text-gray-500 mt-0.5">{s.l}</div></div>
            ))}
          </div>
          <button className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-2"><Download className="w-4 h-4"/> রিপোর্ট ডাউনলোড করুন</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-3">প্রেসক্রিপশন আপলোড করুন</h3>
          <div className="border-2 border-dashed border-orange-200 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
            <Camera className="w-10 h-10 text-orange-400 mx-auto mb-2"/>
            <p className="text-sm text-gray-600 font-medium">এখানে ক্লিক করে আপনার প্রেসক্রিপশনের ছবি তুলুন বা আপলোড করুন</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG বা PDF</p>
          </div>
        </div>
      </div>
      <div className="fixed bottom-6 left-0 right-0 px-4 z-30">
        <button onClick={() => setUrgentOpen(true)} className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-2xl hover:scale-105 transition-all" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
          🚨 ডক্টরকে জানান (Urgent Query)
        </button>
      </div>
      {urgentOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6">
            {urgentSent ? (
              <div className="text-center py-8"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/><h3 className="text-xl font-bold text-gray-900 mb-2">পাঠানো হয়েছে!</h3><p className="text-gray-500 text-sm">আমাদের এজেন্ট শীঘ্রই যোগাযোগ করবেন।</p><button onClick={() => { setUrgentOpen(false); setUrgentSent(false); setUrgentMsg(""); }} className="mt-6 px-8 py-3 rounded-xl text-white font-semibold" style={{ background: "#FF5E13" }}>ঠিক আছে</button></div>
            ) : (
              <><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-900">জরুরি সমস্যা জানান</h3><button onClick={() => setUrgentOpen(false)}><X className="w-5 h-5 text-gray-500"/></button></div>
              <textarea value={urgentMsg} onChange={e => setUrgentMsg(e.target.value)} placeholder="আপনার সমস্যা বা সাইড-ইফেক্টের কথা লিখুন..." className="w-full h-32 border border-gray-200 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"/>
              <button onClick={() => setUrgentSent(true)} disabled={!urgentMsg.trim()} className={`w-full mt-3 py-3.5 rounded-xl font-bold text-white text-sm transition-all ${urgentMsg.trim() ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"}`} style={{ background: urgentMsg.trim() ? "#ef4444" : "#cbd5e1" }}>🚨 জরুরি বার্তা পাঠান</button></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================

// ============================================================


// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [view, setView] = useState<View>("landing");
  const [authUser, setAuthUser] = useState<{ name: string; role: Role } | null>(null);
  
  // Firebase থেকে ডাটা আসার জন্য নতুন স্টেট
  const [agentList, setAgentList] = useState<any[]>([]);
  const [doctorList, setDoctorList] = useState<any[]>([]);
  
  const [docPackage, setDocPackage] = useState<PackageKey>("pro");
  const [subscriptionDays, setSubscriptionDays] = useState(28);
  const [isDashboardBlocked, setIsDashboardBlocked] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [callList, setCallList] = useState<any[]>([]);
const [patientList, setPatientList] = useState<any[]>([]);
  // Firebase Real-time Listener
  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, "agents"), (snapshot) => {
      setAgentList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubDoctors = onSnapshot(collection(db, "doctors"), (snapshot) => {
      setDoctorList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubAgents(); unsubDoctors(); };
  }, []);

  // AdminDashboard এর জন্য প্রয়োজনীয় ফাংশন
  const handleUpdateAgent = async (id: string, status: string) => {
    await updateDoc(doc(db, "agents", id), { status });
  };

  const handleToggleDoctor = async (id: string) => {
    const docRef = doc(db, "doctors", id);
    const doctor = doctorList.find((d: any) => d.id === id);
    if (doctor) {
      await updateDoc(docRef, { status: doctor.status === "active" ? "blocked" : "active" });
    }
  };

  const handleAssignCall = async (agentId: string, doctorId: string) => {
    await addDoc(collection(db, "call_assignments"), {
      agentId, doctorId, timestamp: serverTimestamp()
    });
    alert("কল সফলভাবে অ্যাসাইন হয়েছে!");
  };
  const handleAddPatient = async (newPatient: any) => {
  try {
    // ১. অ্যাডমিন টেবিলের সাথে মিল রেখে ডাটা সাজানো
    const patientPayload = {
      name: newPatient.name,
      phone: newPatient.phone,
      doctorName: newPatient.doctor || newPatient.doctorName,
      disease: newPatient.prescription || newPatient.disease,
      age: newPatient.age,
      address: newPatient.address,
      followups: [], // এটি টেবিলের ম্যাপ ফাংশনের এরর এড়াতে বাধ্যতামূলক
      assignedAgentId: null,
      createdAt: serverTimestamp() // ফায়ারবেসের সার্ভার টাইমস্ট্যাম্প
    };

    // ২. ফায়ারবেসে সেভ করা
    const docRef = await addDoc(collection(db, "patients"), patientPayload);
    
    // ৩. স্টেট আপডেট করা (অ্যাডমিন ড্যাশবোর্ডে সাথে সাথে দেখাবে)
    setPatientList(prev => [...prev, { id: docRef.id, ...patientPayload }]);
    
    alert("রোগী সফলভাবে ডাটাবেসে যোগ হয়েছে!");
  } catch (error) {
    console.error("Error adding patient: ", error);
    alert("রোগী যোগ করতে সমস্যা হয়েছে, দয়া করে আবার চেষ্টা করুন।");
  }
};
  const go = (v: View) => setView(v);
  const setAuth = (u: { name: string; role: Role } | null) => setAuthUser(u);

  const renderView = () => {
    switch (view) {
      case "landing": return <LandingPage go={go} />;
      case "login": return <LoginPage go={go} setAuth={setAuth} />;
      case "register": return <RegisterPage go={go} setDocPackage={setDocPackage} />;
      case "doctor-payment": return <DoctorPaymentPage go={go} docPackage={docPackage} />;
      case "doctor-pending": return <DoctorPendingPage go={go} docPackage={docPackage} />;
      case "pending": return <PendingApprovalPage go={go} />;
      case "doctor":
        return (
          <DoctorDashboard
            user={authUser} go={go} setAuth={() => setAuth(null)}
            docPackage={docPackage} subscriptionDays={subscriptionDays}
            setSubscriptionDays={setSubscriptionDays}
            isDashboardBlocked={isDashboardBlocked}
            setIsDashboardBlocked={setIsDashboardBlocked}
          />
        );
      case "patient": return <PatientDashboard go={go} setAuth={() => setAuth(null)} />;
      case "agent":
  return (
    <AgentDashboard 
      go={go} 
      setAuth={() => setAuth(null)} 
      currentUser={authUser} 
      users={[]} 
      patients={patients} 
      callList={callList}
      
      // ডাটাবেস এবং স্টেট আপডেট করার জন্য সেন্ট্রাল ফাংশনটি কল করছি
      onAddPatient={(p) => { 
        const newPatientData = {
          ...p,
          doctorName: p.doctor,           
          disease: p.prescription,        
          followups: [],                  
          assignedAgentId: null,          
          createdAt: new Date().toISOString()
        };
        
        handleAddPatient(newPatientData); // এটি আপনার সেই মেইন ফাংশনটি কল করবে
      }}
      
      onCompleteCall={(id, note, date) => {
        setCallList(prev => prev.map(c => c.id === id ? { ...c, status: "completed", note, followupDate: date } : c));
      }}
    />
  );;
  case "admin":
      return (
        <AdminDashboardFixed 
          go={go} 
          setAuth={() => setAuth(null)} 
          agentList={agentList} 
          doctorList={doctorList}
          onUpdateAgent={handleUpdateAgent}
          onToggleDoctor={handleToggleDoctor}
          onAssignCall={handleAssignCall}
          onAddPatient={handleAddPatient} 
          patientList={patientList}      
        />
      ); // <--- এখানে এই ) এবং ; টি অবশ্যই থাকতে হবে
    case "qrscan": 
      return <QRScanPage go={go} />;
    default: 
      return <LandingPage go={go} />;
  }
};

return <div className="w-full min-h-screen bg-gray-50">{renderView()}</div>;
}