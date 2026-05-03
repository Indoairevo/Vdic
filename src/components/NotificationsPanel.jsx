import React, { useState } from 'react';
import { Send, Mail } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function NotificationsPanel({ axios, showToast }) {
  const [type, setType] = useState('general_announcement');
  const [targetRole, setTargetRole] = useState('student');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [usersCount, setUsersCount] = useState(0);

  React.useEffect(() => {
    axios.get('/api/users').then(res => {
      const count = res.data.filter(u => u.email && (targetRole === 'all' || u.role === targetRole)).length;
      setUsersCount(count);
    }).catch(() => {});
  }, [targetRole, axios]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (usersCount === 0) {
      showToast('No users found with an email address for the selected role.', 'error');
      return;
    }
    setLoading(true);
    try {
      const usersRes = await axios.get('/api/users');
      const allUsers = usersRes.data;
      const users = allUsers.filter(u => u.email && (targetRole === 'all' || u.role === targetRole));
      
      const emails = [];
      for (const user of users) {
        const prompt = `Generate a sophisticated, personalized email for ${user.name} regarding ${type}. 
        Additional context/message: ${message}. 
        Keep it professional, educational, and polite. Include the user's name in the greeting.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        
        emails.push({
          email: user.email,
          subject: subject || 'School Notification',
          message: response.text
        });
      }
      
      const res = await axios.post('/api/notifications/send', { emails });
      showToast(`Emails sent successfully to ${res.data.sentCount} users.`, 'success');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send notifications. ' + (err.response?.data?.error || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Email Notifications</h2>
        <p className="text-slate-500 font-medium">Send automated or custom emails to students and teachers.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 text-indigo-600">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Mail size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Compose Notification</h3>
          </div>
        </div>
        
        <form onSubmit={handleSend} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notification Type</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="general_announcement">General Announcement</option>
                <option value="fee_confirmation">Fee Payment Confirmation</option>
                <option value="exam_schedule">Exam Schedule Update</option>
                <option value="daily_attendance">Daily Attendance Update</option>
                <option value="performance_report">Performance Report Update</option>
                <option value="library_due">Library Book Due Reminder</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Audience</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
              >
                <option value="student">All Students</option>
                <option value="teacher">All Teachers</option>
                <option value="parent">All Parents</option>
                <option value="all">Everyone</option>
              </select>
              <p className="text-xs text-slate-500 font-medium">
                {usersCount} user(s) with valid email found.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject (Optional for automated types)</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="e.g. Important Update Regarding Exams"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required={type === 'general_announcement'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Content (Optional for automated types)</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[150px] resize-y"
              placeholder="Type your message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required={type === 'general_announcement'}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={async () => {
                try {
                  showToast('Sending test email...', 'info');
                  const res = await axios.post('/api/notifications/test-config', { email: 'test@example.com' });
                  showToast(res.data.message, 'success');
                } catch (err) {
                  showToast('Test failed: ' + (err.response?.data?.error || err.message), 'error');
                }
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
            >
              Test SMTP Config
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {loading ? 'Sending...' : 'Send Notifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
