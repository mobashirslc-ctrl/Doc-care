import React, { useState } from "react";
import { useFollowupManager } from './FollowupManager';
import { 
  Activity, Users, ClipboardList, BarChart2, FileText, UserPlus,
  Headphones, LogOut, Menu, Search, Calendar, PhoneOff, PhoneCall, 
  Globe, CheckCircle, Clock, Download, Mail, Phone 
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, 
  Tooltip, Bar, PieChart, Pie, Cell 
} from "recharts";

// গ্লোবাল ফলব্যাক ডেটা (যদি প্রপস থেকে ডেটা আসতে দেরি হয়)
const DEFAULT_PERF = [{ day: "শনি", calls: 35 }, { day: "রবি", calls: 42 }, { day: "সোম", calls: 38 }, { day: "মঙ্গল", calls: 45 }, { day: "বুধ", calls: 40 }, { day: "বৃহ", calls: 48 }, { day: "শুক্র", calls: 20 }];
const DEFAULT_PIE = [{ name: "सफल", value: 94 }, { name: "মিসড", value: 6 }];

function AgentDashboard({ 
  go, 
  setAuth,
  currentUser,
  users = [],
  patients = [],
  callList = [],
  onAddPatient,
  onCompleteCall
}: { 
  go: (v: any) => void; 
  setAuth: (u: null) => void;
  currentUser?: any;
  users?: any[];
  patients?: any[];
  callList?: any[];
  onAddPatient?: (p: any) => void;
  onCompleteCall?: (callId: string, note: string, nextFollowupDate?: string) => void;
}) {
  // হুকটি এখানে ফাংশনের বডির ভেতরে নিয়ে এসেছি
  const { completeCallAndScheduleNext, callList: updatedCallList } = useFollowupManager(callList);
  const [tab, setTab] = useState("queue"); 
  const [selectedItem, setSelectedItem] = useState<any>(null); 
  const [calling, setCalling] = useState(false); 
  const [followupDate, setFollowupDate] = useState(""); 
  const [note, setNote] = useState(""); 
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [reportMonth, setReportMonth] = useState("জুন ২০২৫");

  // নতুন রোগীর স্টেটস
  const [newPatient, setNewPatient] = useState({ name: "", age: "", phone: "", address: "", doctor: "", prescription: "" });
  const [newAgent, setNewAgent] = useState({ name: "", phone: "", email: "", password: "" });

  // এজেন্টের নাম ও আইডি নির্ধারণ
  const agentName = currentUser?.name || "রাফি হাসান";
  const agentId = currentUser?.id || "rafi_hasan";

  // ডাইনামিক কিউ বা কল লিস্ট ফিল্টারিং
  const dynamicQueue = (updatedCallList || [])
  .filter((c: any) => c.agentId === agentId && c.status === "pending")
  .map((c: any) => {
    const p = (patients || []).find((pat: any) => pat.id === c.patientId);
    return {
      id: c.id,
      patient: p?.name || "অজানা রোগী",
      phone: p?.phone || "N/A",
      type: c.type || "call",
      urgent: c.urgent || false,
      time: c.scheduledDate || "আজকে",
      // এখানে পরিবর্তন হবে: doctor এর বদলে doctorName এবং prescription এর বদলে disease
      doctor: p?.doctorName || p?.doctor || "অনির্ধারিত", 
      disease: p?.disease || "N/A", 
      patientId: c.patientId
    };
  });
  const displayQueue = dynamicQueue.length > 0 ? dynamicQueue : (typeof QUEUE !== "undefined" ? QUEUE : []);
  const displayPatients = (patients && patients.length > 0) ? patients : (typeof PATIENTS !== "undefined" ? PATIENTS : []);
  const displayPerfData = typeof PERF_DATA !== "undefined" ? PERF_DATA : DEFAULT_PERF;
  const displayCallPie = typeof CALL_PIE !== "undefined" ? CALL_PIE : DEFAULT_PIE;
  const doctorList = users?.filter((u: any) => u.role === "doctor") || [];

 
  
  const handlePatientSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!newPatient.name || !newPatient.phone) {
    alert("রোগীর নাম এবং মোবাইল নম্বর দেওয়া বাধ্যতামূলক!");
    return;
  }

  // ডাটা পাঠানো হচ্ছে
  onAddPatient({
    name: newPatient.name,
    phone: newPatient.phone,
    doctor: newPatient.doctor,
    prescription: newPatient.prescription, // যদি ডিজিজ আলাদা না থাকে, এটিই ডিজিজ হিসেবে যাবে
    disease: newPatient.disease,           // নতুন যোগ করা ফিল্ড
    age: newPatient.age,
    address: newPatient.address
  });

  alert("রোগীর তথ্য সফলভাবে এন্ট্রি হয়েছে!");
  
  // ফর্ম রিসেট (নতুন ফিল্ডসহ)
  setNewPatient({ 
    name: "", 
    age: "", 
    phone: "", 
    address: "", 
    doctor: "", 
    prescription: "", 
    disease: "" 
  });
  
  setTab("queue");
};
  // ২. কল শেষ করে রেকর্ড সেভ করা এবং ২ দিন পরের ফলো-আপ শিডিউলিং লজিক
  // ২. কল শেষ করে রেকর্ড সেভ করা এবং ২ দিন পরের ফলো-আপ শিডিউলিং লজিক
// ২. কল শেষ করে রেকর্ড সেভ করা এবং ২ দিন পরের ফলো-আপ শিডিউলিং লজিক
const handleEndCallAndSave = () => {
  if (!note.trim()) {
    alert("কল সামারি বা নোট দেওয়া বাধ্যতামূলক!");
    return;
  }

  if (selectedItem) {
    // ১. আপনার নতুন ফাংশনটি কল করুন
    completeCallAndScheduleNext(selectedItem.id, selectedItem.patientId, agentId, note);
    
    // ২. নিশ্চিত করুন যে এটি একটি সেমিকোলন (;) দিয়ে শেষ হয়েছে
  } 

  // ৩. এরপর বাকি লাইনগুলো ঠিকভাবে রাখুন
  setCalling(false);
  setNote("");
  setSelectedItem(null);
  alert("কল সম্পন্ন হয়েছে! সিস্টেম ২ দিন পরের জন্য ফলো-আপ শিডিউল করেছে।");
};
const handleAddAgent = async () => {
  if (!newAgent.email || !newAgent.password) return alert("ইমেইল এবং পাসওয়ার্ড আবশ্যক!");

  // ফায়ারবেস অথেনটিকেশনে ইউজার তৈরি করা
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, newAgent.email, newAgent.password);
    
    // ডাটাবেসের 'agents' কালেকশনে তথ্য সেভ করা
    await setDoc(doc(db, "agents", userCredential.user.uid), {
      name: newAgent.name,
      phone: newAgent.phone,
      email: newAgent.email,
      role: "agent",
      status: "active",
      createdAt: new Date().toISOString()
    });

    alert("এজেন্ট সফলভাবে অনবোর্ড হয়েছে! ইউজারকে ইমেইল ও পাসওয়ার্ড জানিয়ে দিন।");
    setNewAgent({ name: "", phone: "", email: "", password: "" });
  } catch (error) {
    console.error("Error:", error);
    alert("এজেন্ট তৈরি করতে সমস্যা হয়েছে।");
  }
};
  const navItems = [
    { id: "queue", label: "Active Queue", icon: <Activity className="w-5 h-5"/> },
    { id: "add-patient", label: "নতুন এন্ট্রি", icon: <UserPlus className="w-5 h-5"/> },
    { id: "patients", label: "My Patients", icon: <Users className="w-5 h-5"/> },
    { id: "doctors", label: "Doctors Directory", icon: <ClipboardList className="w-5 h-5"/> },
    { id: "performance", label: "Performance", icon: <BarChart2 className="w-5 h-5"/> },
    { id: "reports", label: "Reports", icon: <FileText className="w-5 h-5"/> }
  ];

  // পারফরম্যান্স ক্যালকুলেশন
  const todayDoneCalls = (updatedCallList || []).filter((c: any) => c.agentId === agentId && c.status === "completed").length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} flex-shrink-0 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 shadow-sm`}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FF5E13" }}>
              <Headphones className="w-5 h-5 text-white"/>
            </div>
            {sidebarOpen && <span className="font-bold text-gray-900 text-sm">Agent Workspace</span>}
          </div>
        </div>
        
        {sidebarOpen && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                  {agentName[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"/>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{agentName}</div>
                <div className="text-xs text-green-600 font-medium">● Live</div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => { setTab(item.id); if (item.id !== "queue") setSelectedItem(null); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? "text-white shadow-md" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`} 
              style={tab === item.id ? { background: "linear-gradient(135deg, #FF5E13, #D84315)" } : {}}
            >
              {item.icon}
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => { setAuth(null); go("landing"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut className="w-5 h-5"/>
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top Navbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
              <Menu className="w-5 h-5"/>
            </button>
            <h1 className="font-bold text-gray-900">{navItems.find(n => n.id === tab)?.label}</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-100">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"/>
            {displayQueue.length} নতুন পেন্ডিং
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <div className="flex-1 overflow-hidden">
          
          {/* 1. Active Call Queue Tab */}
          {tab === "queue" && (
            <div className="flex h-full">
              {/* Queue List */}
              <div className="w-80 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-700">ইনকামিং ও ফলো-আপ কুয়েরি</div>
                  <div className="text-xs text-gray-400 mt-0.5">{displayQueue.length}টি পেন্ডিং কল রয়েছে</div>
                </div>
                <div className="divide-y divide-gray-50">
                  {displayQueue.map((q: any) => (
                    <button 
                      key={q.id} 
                      onClick={() => setSelectedItem(q)} 
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-all border-l-4 ${selectedItem?.id === q.id ? "bg-orange-50 border-orange-500" : "border-transparent"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 truncate">{q.patient}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{q.phone}</div>
                          <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1.5 font-medium ${q.type === "prescription" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                            {q.type === "prescription" ? "📄 প্রেসক্রিপশন" : "📞 কল রিকোয়েস্ট / ফলোআপ"}
                          </div>
                        </div>
                        {q.urgent && <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-ping mt-1"/>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">শিডিউল: {q.time}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Space / Details Panel */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedItem ? (
                  <div className="space-y-5 max-w-2xl">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xl">
                          {selectedItem.patient[0]}
                        </div>
                        <div>
                          <div className="font-bold text-lg text-gray-900">{selectedItem.patient}</div>
                          <div className="text-sm text-gray-500">{selectedItem.phone}</div>
                          <div className="text-xs text-gray-400 mt-0.5">ডাক্তার আইডি: {selectedItem.doctor}</div>
                        </div>
                      </div>
                    </div>

                    {selectedItem.type === "prescription" && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-gray-900">হোয়াটসঅ্যাপ প্রেসক্রিপশন ভিউয়ার</h3>
                        </div>
                        <div className="bg-gray-100 rounded-xl flex items-center justify-center" style={{ height: "180px" }}>
                          <div className="text-center text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-2"/>
                            <p className="text-sm">প্রেসক্রিপশনের ইমেজ/ডকুমেন্ট এখানে লোড হবে</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Data Entry Validation Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-900 mb-4">কল ডাটা ও ফলো-আপ আপডেট</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1.5">পরবর্তী ফলো-আপ ডেট (ঐচ্ছিক - ডিফল্ট ২ দিন পর)</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                            <input 
                              type="date" 
                              value={followupDate} 
                              onChange={e => setFollowupDate(e.target.value)} 
                              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1.5">স্পেশাল ফলোআপ নোট <span className="text-red-500">*</span></label>
                          <textarea 
                            value={note} 
                            onChange={e => setNote(e.target.value)} 
                            placeholder="রোগীর বর্তমান অবস্থা, ওষুধ সংক্রান্ত জিজ্ঞাসা ও কল ডাটা বিস্তারিত লিখুন..." 
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" 
                            rows={3}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Calling Management Action buttons */}
                    <button 
                      onClick={() => {
                        if (!calling) {
                          setCalling(true);
                        } else {
                          handleEndCallAndSave();
                        }
                      }} 
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-sm shadow-lg ${calling ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                    >
                      {calling ? <PhoneOff className="w-5 h-5"/> : <PhoneCall className="w-5 h-5"/>}
                      {calling ? "End Call & Save Records (নোট সহ)" : "Call Patient"}
                    </button>
                    {calling && (
  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mt-2">
    <p className="text-[11px] text-orange-700 font-medium">
      💡 এই কলটি শেষ করলে সিস্টেম স্বয়ংক্রিয়ভাবে {new Date(new Date().setDate(new Date().getDate() + 2)).toLocaleDateString()} তারিখে ফলো-আপ শিডিউল করবে।
    </p>
  </div>
)}
{calling && (
  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center mt-2">
    <div className="flex items-center justify-center gap-2 text-green-700 font-semibold animate-pulse">
      <PhoneCall className="w-4 h-4"/> কল চলছে... {selectedItem.phone}
    </div>
  </div>
)}
                    {calling && (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-green-700 font-semibold animate-pulse">
                          <PhoneCall className="w-4 h-4"/> কল চলছে... {selectedItem.phone}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Headphones className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                      <p className="text-lg font-medium text-gray-500">বাম পাশের কিউ থেকে একটি কল সিলেক্ট করুন</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. New Patient Manual Entry (WhatsApp Entry Form) */}
          {tab === "add-patient" && (
            <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-2">নতুন রোগীর তথ্য এন্ট্রি (হোয়াটসঅ্যাপ/ম্যানুয়াল)</h2>
                <p className="text-xs text-gray-400 mb-6">এখানে সাবমিট করার সাথে সাথেই রোগীর প্রোফাইল তৈরি হবে এবং একটি পেন্ডিং কল আপনার কিউতে চলে যাবে।</p>
                
                <form onSubmit={handlePatientSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">রোগীর নাম *</label>
                      <input type="text" placeholder="নাম লিখুন" className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-orange-300" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">বয়স</label>
                      <input type="number" placeholder="বয়স" className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-orange-300" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">মোবাইল নম্বর *</label>
                    <input type="text" placeholder="মোবাইল নম্বর" className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-orange-300" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} required />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">ঠিকানা</label>
                    <input type="text" placeholder="ঠিকানা" className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-orange-300" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">সংশ্লিষ্ট ডাক্তার নির্বাচন করুন *</label>
                    <select className="w-full border p-3 rounded-xl text-sm text-gray-600 focus:ring-2 focus:ring-orange-300" value={newPatient.doctor} onChange={e => setNewPatient({...newPatient, doctor: e.target.value})} required>
                      <option value="">ডাক্তার নির্বাচন করুন</option>
                      {doctorList.map((doc: any) => (
                        <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty || "General"})</option>
                      ))}
                      {doctorList.length === 0 && (
                        <>
                          <option value="dr_ahmed">ডা. আহমেদ করিম</option>
                          <option value="dr_sabina">ডা. সাবিনা ইসলাম</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">হোয়াটসঅ্যাপ ডেসক্রিপশন / প্রেসক্রিপশন ডিটেইলস</label>
                    <textarea placeholder="হোয়াটসঅ্যাপ থেকে প্রাপ্ত তথ্য বা টেক্সট এখানে কপি পেস্ট করুন..." className="w-full border p-3 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-300" rows={3} value={newPatient.prescription} onChange={e => setNewPatient({...newPatient, prescription: e.target.value})} />
                  </div>
                  
                  <button type="submit" className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-md">
                    সাবমিট ও অ্যাক্টিভ কল লিস্টে পাঠান
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. My Patients View */}
          {tab === "patients" && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">আমার এসাইনকৃত রোগীগণ</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                    <input type="text" placeholder="খুঁজুন..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none w-48"/>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {displayPatients.map((p: any) => (
                    <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                          {p.name ? p.name[0] : "P"}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.phone}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === "closed" ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-600"}`}>
                        {p.status === "closed" ? "ক্লোজড (ডাক্তার)" : "চলমান ফলো-আপ"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Doctors Directory View */}
          {tab === "doctors" && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="grid md:grid-cols-2 gap-4">
                {[{ name: "ডা. আহমেদ করিম", spec: "কার্ডিওলজিস্ট", chamber: "ধানমন্ডি, ঢাকা", patients: 342 }, { name: "ডা. সাবিনা ইসলাম", spec: "মেডিসিন", chamber: "গুলশান, ঢাকা", patients: 215 }].map((d, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">{d.name[4]}</div>
                      <div>
                        <div className="font-bold text-gray-900">{d.name}</div>
                        <div className="text-xs text-gray-500">{d.spec}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400 flex-shrink-0"/> {d.chamber}</div>
                      <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400 flex-shrink-0"/> {d.patients} রোগী</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Performance View */}
          {tab === "performance" && (
            <div className="p-6 overflow-y-auto h-full space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[{ label: "আজকের সম্পন্ন কল", val: `${todayDoneCalls}টি`, bg: "bg-blue-50 text-blue-600", icon: <PhoneCall className="w-5 h-5"/> }, { label: "সফলতার হার", val: "৯৪%", bg: "bg-green-50 text-green-600", icon: <CheckCircle className="w-5 h-5"/> }, { label: "গড় কল সময়", val: "৩:৪২", bg: "bg-orange-50 text-orange-600", icon: <Clock className="w-5 h-5"/> }].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>{s.icon}</div>
                    <div className="text-2xl font-bold text-gray-900">{s.val}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">সাপ্তাহিক পারফরম্যান্স ট্র্যাকিং</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={displayPerfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }}/>
                    <YAxis tick={{ fontSize: 11 }}/>
                    <Tooltip/>
                    <Bar dataKey="calls" fill="#FF5E13" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">কল আউটকাম অনুপাত</h3>
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={displayCallPie} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                        <Cell fill="#FF5E13"/>
                        <Cell fill="#e5e7eb"/>
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"/><span className="text-sm text-gray-600">সফল: <strong>৯৪%</strong></span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"/><span className="text-sm text-gray-600">মিসড: <strong>৬%</strong></span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Reports View */}
          {tab === "reports" && (
            <div className="p-6 overflow-y-auto h-full space-y-6 max-w-3xl">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">এজেন্ট মাসিক কাজের রিপোর্ট</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{agentName} — Agent Workspace</p>
                  </div>
                  <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                    {["জুন ২০২৫", "মে ২০২৫", "এপ্রিল ২০২৫"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[{ label: "মোট ফলোআপ কল", val: "৪২৫টি" }, { label: "সফল টাস্ক", val: "৩৯৯টি" }, { label: "ব্যর্থ বা মিসড কল", val: "০টি" }, { label: "সাফল্যের পারসেন্টেজ", val: "৯৪%" }].map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                      <div className="text-xl font-bold text-gray-900">{s.val}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF5E13, #D84315)" }}><Download className="w-4 h-4"/> PDF ডাউনলোড</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"><Mail className="w-4 h-4"/> ইমেইলে পাঠান</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-green-200 text-green-700 hover:bg-green-50"><Phone className="w-4 h-4"/> WhatsApp</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
export default AgentDashboard;