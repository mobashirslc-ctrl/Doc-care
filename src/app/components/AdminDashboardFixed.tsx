import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { Download, Mail, Shield, LogOut, PhoneCall, ArrowRight, Users, UserCheck, CreditCard, BarChart2, RefreshCw, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
const PACKAGES: any = {
  basic: { name: "Basic", color: "#64748B" },
  pro: { name: "Professional", color: "#FF5E13" },
  premium: { name: "Premium", color: "#8B5CF6" } // প্রয়োজন হলে আরও যোগ করতে পারেন
};
const PERF_DATA = [
  { day: "শনি", calls: 400 },
  { day: "রবি", calls: 300 },
  { day: "সোম", calls: 600 },
  { day: "মঙ্গল", calls: 800 },
  { day: "বুধ", calls: 500 },
];
export default function AdminDashboardFixed({ 
  go, 
  setAuth, 
  agentList, 
  doctorList, 
  onAssignCall, 
  onUpdateAgent, 
  onToggleDoctor, 
  onAddPatient, 
  patientList // এই অংশটি নিশ্চিত করুন যোগ করেছেন
}: any) {
    const [newPatient, setNewPatient] = useState({ 
    name: "", age: "", phone: "", address: "", doctor: "", prescription: "" 
  });
   const [tab, setTab] = useState("doctors");
const [sidebarOpen, setSidebarOpen] = useState(true);
const [selectedAgentId, setSelectedAgentId] = useState("");
const [selectedDoctorId, setSelectedDoctorId] = useState("");
const [reportMonth, setReportMonth] = useState("জুন ২০২৫"); // এটি মিসিং ছিল
const [stats, setStats] = useState({ totalDocs: 0, activeAgents: 0, totalPatients: 0 });
const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.phone) {
      alert("রোগীর নাম এবং মোবাইল নম্বর দেওয়া বাধ্যতামূলক!");
      return;
    }

    const patientPayload = {
      ...newPatient,
      id: "p_" + Date.now(),
      status: "pending", 
      assignedAgentId: null, 
      createdAt: new Date().toISOString()
    };

    if (onAddPatient) {
      onAddPatient(patientPayload);
    }

    alert("সফলভাবে এন্ট্রি হয়েছে! এখন কল ম্যানেজার থেকে এজেন্ট এসাইন করুন।");
    
    setNewPatient({ 
      name: "", age: "", phone: "", address: "", doctor: "", prescription: "" 
    });

    setTab("calls");
  };
   const statusLabels: any = {
  pending: "Pending",
  interview: "Interviewing",
  approved: "Active",
  suspended: "Suspended"
};

  const navItems = [
    { id: "doctors", label: "Doctor Management", icon: <Users className="w-5 h-5"/> },
    { id: "agents", label: "Agent Management", icon: <UserCheck className="w-5 h-5"/> },
    { id: "billing", label: "Billing & Finance", icon: <CreditCard className="w-5 h-5"/> },
    { id: "calls", label: "Call Manager", icon: <PhoneCall className="w-5 h-5"/> },
    { id: "reports", label: "Reports", icon: <BarChart2 className="w-5 h-5"/> }
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-[#1E293B] border-r border-white/10 flex flex-col transition-all duration-300`}>
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FF5E13" }}><Shield className="w-5 h-5 text-white"/></div>
          {sidebarOpen && <span className="font-bold text-white">Admin Control</span>}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${tab === item.id ? "text-white" : "text-gray-400"}`} style={tab === item.id ? { background: "#FF5E13" } : {}}>
              {item.icon}{sidebarOpen && item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => { setAuth(null); go("landing"); }} className="p-4 border-t border-white/10 text-gray-400 flex items-center gap-3 hover:text-red-400"><LogOut className="w-5 h-5"/>{sidebarOpen && "Logout"}</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        
<table className="w-full text-left text-sm text-gray-400">
  <thead>
    <tr className="border-b border-white/10 text-white">
      <th className="p-3">Patient Name & Contact</th>
      <th className="p-3">Referred Doctor</th>
      <th className="p-3">Disease/Issue</th>
      <th className="p-3">Follow-up History</th>
      <th className="p-3">Assign Agent</th>
    </tr>
  </thead>
  <tbody>
  {patientList.map((p: any) => (
    <tr key={p.id} className="border-b border-white/5">
      <td className="p-3 text-white font-bold">{p.name}<br/><span className="font-normal">{p.phone}</span></td>
      <td className="p-3">{p.doctorName}</td>
      <td className="p-3">{p.disease}</td>
      <td className="p-3">
        {p.followups?.map((f: any, i: number) => (
          <div key={i} className="text-xs bg-gray-800 p-1 mb-1 rounded">{f.date}: {f.note}</div>
        ))}
      </td>
      <td className="p-3">
        <select onChange={(e) => onAssignCall(e.target.value, p.id)} className="bg-black p-1 rounded">
          <option>Agent Assign</option>
          {agentList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </td>
    </tr>
  ))}
</tbody>
</table>
{tab === "manual-entry" && (
  <div className="rounded-2xl border border-white/10 p-6 bg-[#1E293B]">
    <h3 className="font-bold text-white mb-6">Admin Patient Data Entry</h3>
    <form onSubmit={handlePatientSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input 
        className="bg-[#0f172a] text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5E13]"
        placeholder="Patient Name" 
        value={newPatient.name}
        onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
      />
      <input 
        className="bg-[#0f172a] text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5E13]"
        placeholder="Age" 
        value={newPatient.age}
        onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
      />
      <input 
        className="bg-[#0f172a] text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5E13]"
        placeholder="Phone Number" 
        value={newPatient.phone}
        onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
      />
      <input 
        className="bg-[#0f172a] text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5E13]"
        placeholder="Address" 
        value={newPatient.address}
        onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
      />
      <input 
        className="bg-[#0f172a] text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5E13] md:col-span-2"
        placeholder="Doctor Name" 
        value={newPatient.doctor}
        onChange={(e) => setNewPatient({...newPatient, doctor: e.target.value})}
      />
      <textarea 
        className="bg-[#0f172a] text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF5E13] md:col-span-2"
        placeholder="Prescription/Notes" 
        rows={3}
        value={newPatient.prescription}
        onChange={(e) => setNewPatient({...newPatient, prescription: e.target.value})}
      />
      
      <button 
        type="submit" 
        className="md:col-span-2 bg-[#FF5E13] text-white p-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
      >
        Submit Patient for Assignment
      </button>
    </form>
  </div>
)}

        {/* Doctor Management */}
{tab === "doctors" && (
  <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#1E293B" }}>
    {/* Header */}
    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
      <h3 className="font-bold text-white">Doctor Management</h3>
      <button className="text-xs text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition" style={{ background: "#FF5E13" }}>
        + নতুন ডাক্তার
      </button>
    </div>
    
    {/* Table */}
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {["ডাক্তার", "প্যাকেজ", "রোগী", "সাবস্ক্রিপশন", "স্ট্যাটাস", "অ্যাকশন"].map(h => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {doctorList.map(d => (
            <tr key={d.id} className="hover:bg-white/5 transition-colors">
              {/* Doctor Name & Spec */}
              <td className="px-5 py-4">
                <div className="font-semibold text-sm text-white">{d.name}</div>
                <div className="text-xs text-gray-500">{d.spec}</div>
              </td>
              
              {/* Package Badge */}
              <td className="px-5 py-4">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold text-white whitespace-nowrap" 
                      style={{ background: PACKAGES[d.pkg]?.color || "#64748B" }}>
                  {PACKAGES[d.pkg]?.name || d.pkg}
                </span>
              </td>
              
              <td className="px-5 py-4 text-sm text-gray-400">{d.patients}</td>
              
              {/* Subscription Progress */}
              <td className="px-5 py-4">
                {d.status !== "pending" && (
                  <div>
                    <div className={`text-xs font-semibold ${d.daysLeft <= 7 ? "text-red-400" : d.daysLeft <= 14 ? "text-yellow-400" : "text-green-400"}`}>
                      {d.daysLeft > 0 ? `${d.daysLeft} দিন বাকি` : "মেয়াদ শেষ"}
                    </div>
                    <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" 
                           style={{ width: `${Math.min((d.daysLeft / 30) * 100, 100)}%`, background: d.daysLeft <= 7 ? "#ef4444" : d.daysLeft <= 14 ? "#f97316" : "#22c55e" }}/>
                    </div>
                  </div>
                )}
              </td>
              
              {/* Status Badge */}
              <td className="px-5 py-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${d.status === "active" ? "bg-green-500/20 text-green-400" : d.status === "blocked" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {d.status === "active" ? "Active" : d.status === "blocked" ? "Blocked" : "Pending"}
                </span>
              </td>
              
              {/* Actions */}
              <td className="px-5 py-4">
                <div className="flex gap-2 flex-nowrap">
                  {d.status === "pending" && (
                    <button onClick={() => onToggleDoctor(d.id)} className="text-xs text-white px-3 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap" style={{ background: "#22c55e" }}>
                      ✓ Approve & Generate QR
                    </button>
                  )}
                  {d.status === "active" && (
                    <button onClick={() => onToggleDoctor(d.id)} className="text-xs text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 whitespace-nowrap">
                      Block Dashboard
                    </button>
                  )}
                  {d.status === "blocked" && (
                    <button onClick={() => onToggleDoctor(d.id)} className="text-xs text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 hover:bg-green-500/10 whitespace-nowrap flex items-center gap-1">
                      <RefreshCw className="w-3 h-3"/> Reactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
        {/* Agent Management */}
       
        {tab === "agents" && (
  <div className="space-y-4">
    {/* এজেন্ট–ডাক্তার অ্যাসাইনমেন্ট বক্স */}
    <div className="rounded-2xl border border-white/10 p-6" style={{ background: "#1E293B" }}>
      <h3 className="font-bold text-white mb-4">এজেন্ট–ডাক্তার অ্যাসাইনমেন্ট</h3>
      <div className="flex items-center gap-4">
        <select 
          onChange={(e) => setSelectedAgentId(e.target.value)} 
          className="flex-1 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none" 
          style={{ background: "#0f172a" }}
        >
          <option value="">এজেন্ট সিলেক্ট করুন</option>
          {agentList.filter(a => a.status === "approved").map(a => (
            <option key={a.id} value={a.id} className="bg-gray-900">{a.name}</option>
          ))}
        </select>

        <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />

        <select 
          onChange={(e) => setSelectedDoctorId(e.target.value)} 
          className="flex-1 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none" 
          style={{ background: "#0f172a" }}
        >
          <option value="">ডাক্তার সিলেক্ট করুন</option>
          {doctorList.map(d => (
            <option key={d.id} value={d.id} className="bg-gray-900">{d.name}</option>
          ))}
        </select>

        <button 
          onClick={() => {
            if (selectedAgentId && selectedDoctorId) {
              onAssignCall(selectedAgentId, selectedDoctorId); // আপনার মেইন ফাংশন
            } else {
              alert("দয়া করে এজেন্ট এবং ডাক্তার উভয়ই সিলেক্ট করুন");
            }
          }}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 flex-shrink-0" 
          style={{ background: "#FF5E13" }}
        >
          Assign
        </button>
      </div>
    </div>

    {/* এজেন্ট আবেদন ও ভেরিফিকেশন টেবিল */}
    <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#1E293B" }}>
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="font-bold text-white">এজেন্ট আবেদন ও ভেরিফিকেশন</h3>
        <p className="text-xs text-gray-500 mt-0.5">pending → interview → approved | suspend → reactivate</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["এজেন্ট", "যোগ্যতা", "অভিজ্ঞতা", "তারিখ", "স্ট্যাটাস", "অ্যাকশন"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {agentList.map(agent => (
              <tr key={agent.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-4"><div className="font-semibold text-sm text-white">{agent.name}</div><div className="text-xs text-gray-500">{agent.email}</div></td>
                <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{agent.qualification}</td>
                <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{agent.workExp}</td>
                <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{agent.appliedDate}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${agent.status === "approved" ? "bg-green-500/20 text-green-400" : agent.status === "interview" ? "bg-blue-500/20 text-blue-400" : agent.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                    {statusLabels[agent.status]}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2 flex-nowrap">
                    {agent.status === "pending" && <button onClick={() => onUpdateAgent(agent.id, "interview")} className="text-xs text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 whitespace-nowrap">ইন্টারভিউ শিডিউল</button>}
                    {agent.status === "interview" && <button onClick={() => onUpdateAgent(agent.id, "approved")} className="text-xs text-white px-3 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap" style={{ background: "#22c55e" }}>✓ Approve & Activate</button>}
                    {agent.status === "approved" && <button onClick={() => onUpdateAgent(agent.id, "suspended")} className="text-xs text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10">Suspend</button>}
                    {agent.status === "suspended" && <button onClick={() => onUpdateAgent(agent.id, "approved")} className="text-xs text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 hover:bg-green-500/10">Reactivate</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
        {tab === "billing" && (
  <div className="grid md:grid-cols-2 gap-6">
    {/* পেমেন্ট পেন্ডিং ভেরিফিকেশন */}
    <div className="rounded-2xl border border-white/10 p-6" style={{ background: "#1E293B" }}>
      <h3 className="font-bold text-white mb-4">পেমেন্ট পেন্ডিং ভেরিফিকেশন</h3>
      <div className="space-y-3">
        {[{ doctor: "ডা. আহমেদ করিম", pkg: "প্রো", amount: "৩,০০০৳", method: "bKash", txId: "TXN9BK123" }, 
          { doctor: "ডা. রেহানা পারভীন", pkg: "প্রো", amount: "৩,০০০৳", method: "Nagad", txId: "TXN9NG456" }].map((b, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
            <div>
              <div className="text-sm font-semibold text-white">{b.doctor}</div>
              <div className="text-xs text-gray-500">{b.pkg} · {b.method} · {b.txId}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-orange-400">{b.amount}</div>
              <button onClick={() => alert(`${b.doctor} এর পেমেন্ট ভেরিফাই হয়েছে`)} className="text-xs text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition" style={{ background: "#22c55e" }}>
                ✓ Verify
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* রেভিনিউ সারসংক্ষেপ */}
    <div className="rounded-2xl border border-white/10 p-6" style={{ background: "#1E293B" }}>
      <h3 className="font-bold text-white mb-4">রেভিনিউ সারসংক্ষেপ</h3>
      <div className="space-y-4">
        {[{ label: "পার-পেশেন্ট রেভিনিউ", val: "১,৮২,৫০০৳", color: "text-orange-400" }, 
          { label: "সাবস্ক্রিপশন রেভিনিউ", val: "২,০০,০০০৳", color: "text-green-400" }, 
          { label: "মোট এই মাসে", val: "৩,৮২,৫০০৳", color: "text-white", bold: true }].map((r, i) => (
          <div key={i} className={`flex justify-between ${r.bold ? "border-t border-white/10 pt-4 font-bold" : ""}`}>
            <span className="text-sm text-gray-400">{r.label}</span>
            <span className={`text-sm font-bold ${r.color}`}>{r.val}</span>
          </div>
        ))}
      </div>
      
      {/* অ্যাকশন বাটনস */}
      <button className="w-full mt-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition" style={{ background: "#FF5E13" }}>
        📲 Generate Invoice & Send to WhatsApp
      </button>
      <button className="w-full mt-2 py-2.5 rounded-xl text-gray-400 text-sm border border-white/10 hover:bg-white/5 transition">
        ✉ Send Invoice via Email
      </button>
    </div>
  </div>
)}
{/* রিপোর্ট ট্যাব */}
        {tab === "reports" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: "#1E293B" }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-white text-lg">প্ল্যাটফর্ম মাসিক রিপোর্ট</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Admin — Central Control Room</p>
                </div>
                <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="border border-white/20 text-white rounded-xl px-4 py-2 text-sm focus:outline-none" style={{ background: "#0f172a" }}>
                  {["জুন ২০২৫", "মে ২০২৫"].map(m => <option key={m} className="bg-gray-900">{m}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "মোট ডাক্তার", val: stats.totalDocs },
                  { label: "অ্যাক্টিভ এজেন্ট", val: stats.activeAgents },
                  { label: "রোগী সংখ্যা", val: stats.totalPatients },
                  { label: "রেভিনিউ", val: "৩.৮২L৳" }
                ].map((s, i) => (
                  <div key={i} className="rounded-xl p-4 border border-white/10" style={{ background: "#0f172a" }}>
                    <div className="text-xl font-bold text-white">{s.val}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">সাপ্তাহিক কার্যক্রম</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={PERF_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "#1E293B", border: "none", borderRadius: "12px" }} />
                    <Bar dataKey="calls" fill="#FF5E13" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "#FF5E13" }}><Download className="w-4 h-4" /> PDF ডাউনলোড</button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-white/10 text-gray-300"><Mail className="w-4 h-4" /> ইমেইল</button>
              </div>
            </div>
          </div>
        )}

 {/* সিস্টেম ট্যাব */}
        {tab === "system" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: "#1E293B" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">QR Service Status</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="text-xl font-bold text-green-400">{stats.totalDocs}</div>
              <div className="text-xs text-gray-500 mt-1">মোট কিউআর কোড জেনারেটেড</div>
            </div>

            <div className="rounded-2xl border border-white/10 p-6" style={{ background: "#1E293B" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">System Health</span>
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
              <div className="text-xl font-bold text-blue-400">99.9%</div>
              <div className="text-xs text-gray-500 mt-1">API & Database Stability</div>
            </div>
          </div>
        )}
        
      </main>
    </div> 
  );
}