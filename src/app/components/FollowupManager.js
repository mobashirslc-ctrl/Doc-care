import React, { useState, useEffect } from 'react';

// এটি আপনার মেইন অ্যাপ বা ড্যাশবোর্ডে import করবেন
export const useFollowupManager = (initialCallList) => {
  const [callList, setCallList] = useState(initialCallList || []);

  // ১. কল কমপ্লিট এবং ২ দিন পর অটো-ফলোআপ সেট করা
  const completeCallAndScheduleNext = (callId, patientId, agentId, note) => {
    // বর্তমান কলটি কমপ্লিট করা
    const updatedCalls = callList.map(call => 
      call.id === callId ? { ...call, status: 'completed', note: note, completedAt: new Date() } : call
    );

    // ২ দিনের অটো-ফলোআপ ক্যালকুলেশন
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