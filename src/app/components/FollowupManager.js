import { useState } from 'react';
import { db } from "../firebase/config"; // আপনার সঠিক পাথ চেক করে নিন
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const useFollowupManager = (initialCallList) => {
  const [callList, setCallList] = useState(initialCallList || []);

  const completeCallAndScheduleNext = async (callId, patientId, agentId, note) => {
    // ১. স্টেট আপডেট (লোকাল UI এর জন্য)
    const updatedCalls = callList.map(call => 
      call.id === callId ? { ...call, status: 'completed', note: note, completedAt: new Date() } : call
    );

    // ২. Firestore-এ ডাটা পুশ করা (ডাক্তারের ড্যাশবোর্ডের জন্য রিয়েল-টাইম ব্রিজ)
    try {
      await addDoc(collection(db, "daily_activities"), {
        patientId,
        agentId,
        note,
        status: "completed",
        timestamp: serverTimestamp(),
        type: "followup_update"
      });
    } catch (error) {
      console.error("Error pushing to Firestore:", error);
    }

    // ৩. ২ দিনের ফলো-আপ শিডিউল লজিক
    const nextFollowupDate = new Date();
    nextFollowupDate.setDate(nextFollowupDate.getDate() + 2);

    const nextCall = {
      id: `f_${Date.now()}`,
      patientId: patientId,
      agentId: agentId,
      status: 'pending',
      scheduledDate: nextFollowupDate.toISOString().split('T')[0],
      type: 'followup',
      attempt: (callList.filter(c => c.patientId === patientId).length) + 1
    };

    setCallList([...updatedCalls, nextCall]);
  };

  // অ্যাডমিন বা এজেন্ট নতুন কল ম্যানুয়ালি যোগ করার জন্য
  const addManualCall = (newCall) => {
    setCallList([...callList, { ...newCall, id: `m_${Date.now()}`, status: 'pending' }]);
  };

  // ড্যাশবোর্ডে দেখানোর জন্য ফিল্টার করা কিউ
  const getAgentQueue = (agentId) => {
    return callList.filter(c => c.agentId === agentId && c.status === 'pending')
                   .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  };

  return { callList, completeCallAndScheduleNext, addManualCall, getAgentQueue };
};