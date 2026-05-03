import React from 'react';
import { LogIn, GraduationCap, BookOpen, Users, Award, MapPin, Phone, Mail, ArrowRight, CheckCircle2, Monitor, ShieldCheck, Heart, Calendar, ArrowUpRight } from 'lucide-react';

export default function LandingPage({ onLoginClick, onPrivacyClick, onEnrollClick }) {
  return (
    <div className="font-sans text-slate-800 bg-slate-50 min-h-screen scroll-smooth">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md px-4 sm:px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-green-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-bold text-xl shadow-lg">V</div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">V.D.I.C.</h1>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest hidden sm:block">Vaidik Dharm Inter College</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-sm font-bold text-slate-600 hover:text-orange-600 transition-colors">About</a>
          <a href="#digital" className="text-sm font-bold text-slate-600 hover:text-orange-600 transition-colors">Digital Campus</a>
          <a href="#notice" className="text-sm font-bold text-slate-600 hover:text-orange-600 transition-colors">Notices</a>
          <div className="h-6 w-px bg-slate-200"></div>
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <LogIn size={16} />
            ERP Login
          </button>
        </nav>
        <button 
          onClick={onLoginClick}
          className="md:hidden flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-slate-800 shadow-lg"
        >
          <LogIn size={16} />
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-900 -z-20"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center -z-10 opacity-30 mix-blend-overlay"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2000&auto=format&fit=crop')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent -z-10"></div>
        
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Admissions Open for 2026-27
          </div>
          
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 text-white tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Empowering Minds. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Building Character.</span>
          </h2>
          
          <p className="text-lg md:text-2xl mb-10 text-slate-300 font-medium max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
             ज्ञान • अनुशासन • संस्कार
            <span className="block mt-3 text-base md:text-lg text-slate-400 font-normal">Established 1952 &nbsp;|&nbsp; UP Board Affiliated &nbsp;|&nbsp; Classes 6–12</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <button onClick={onEnrollClick} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_40px_-10px_rgba(249,115,22,0.8)] transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
              Apply Online <ArrowRight size={20} />
            </button>
            <button onClick={onLoginClick} className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2">
              Student/Parent Portal <LogIn size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Board Overlap */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="flex justify-center mb-3"><Calendar className="text-orange-500" size={32} /></div>
            <h4 className="text-3xl font-black text-slate-900">70+</h4>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide mt-1">Years Legacy</p>
          </div>
          <div className="text-center border-l border-slate-100">
            <div className="flex justify-center mb-3"><Users className="text-blue-500" size={32} /></div>
            <h4 className="text-3xl font-black text-slate-900">2.5k+</h4>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide mt-1">Students</p>
          </div>
          <div className="text-center md:border-l border-slate-100 hidden sm:block">
            <div className="flex justify-center mb-3"><Award className="text-emerald-500" size={32} /></div>
            <h4 className="text-3xl font-black text-slate-900">100%</h4>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide mt-1">Dedication</p>
          </div>
          <div className="text-center border-l border-slate-100 hidden sm:block">
            <div className="flex justify-center mb-3"><GraduationCap className="text-purple-500" size={32} /></div>
            <h4 className="text-3xl font-black text-slate-900">50+</h4>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide mt-1">Expert Faculty</p>
          </div>
        </div>
      </section>

      {/* About Split Section */}
      <section id="about" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Rooted in Tradition. <br/><span className="text-orange-500">Growing with Tech.</span></h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-6 font-medium">
              Founded in 1952, Vaidik Dharm Inter College is a government-aided, Hindi medium co-educational institution dedicated to academic excellence and moral values.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Serving students from Class 6 to 12, the college continues its legacy of discipline and cultural education while completely digitizing its infrastructure to provide modern amenities.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-700 font-bold">
                <CheckCircle2 className="text-emerald-500" size={24} /> UP Board English & Hindi Medium Support
              </li>
              <li className="flex items-center gap-3 text-slate-700 font-bold">
                <CheckCircle2 className="text-emerald-500" size={24} /> Focus on Discipline and Sanskaar
              </li>
              <li className="flex items-center gap-3 text-slate-700 font-bold">
                <CheckCircle2 className="text-emerald-500" size={24} /> Dedicated Sports & Physical Education
              </li>
            </ul>
          </div>
          <div className="relative">
            <div className="aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative z-10">
              <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1600&auto=format&fit=crop" alt="Campus Students" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 z-0"></div>
            <div className="absolute -top-8 -right-8 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 z-0"></div>
          </div>
        </div>
      </section>

      {/* Digital Campus (ERP Integration Features) */}
      <section id="digital" className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 hidden md:block"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Our Smart Campus ERP</h2>
            <p className="text-lg text-slate-300">Vaidik Dharm Inter College adopts modern technologies to keep parents informed, students engaged, and administration efficient.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 hover:bg-slate-800 hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 bg-indigo-900/50 border border-indigo-700/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Monitor className="text-indigo-400" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Parent Dashboard</h3>
              <p className="text-slate-400 leading-relaxed">Log in anytime to view your child's real-time attendance, daily exam marks, and financial due dates from anywhere.</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 hover:bg-slate-800 hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 bg-emerald-900/50 border border-emerald-700/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="text-emerald-400" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Security & Biometrics</h3>
              <p className="text-slate-400 leading-relaxed">Integrated AI facial recognition and biometric gating ensures maximum physical security and verified attendance records.</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 hover:bg-slate-800 hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 bg-orange-900/50 border border-orange-700/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="text-orange-400" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Digital Academics</h3>
              <p className="text-slate-400 leading-relaxed">Access daily homework, track syllabus progression, and consult our online library repository right from your mobile device.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Notices & Contact */}
      <section id="notice" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Notice Board */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100 to-transparent rounded-bl-full -z-0 opacity-80"></div>
            <h3 className="text-2xl font-black mb-8 text-slate-900 border-b border-slate-100 pb-4 relative z-10 flex border-orange-500">Notice Board</h3>
            <div className="space-y-6 relative z-10">
              {[
                { date: "Oct 15", title: "Admissions Open for Session 2026-27" },
                { date: "Oct 12", title: "UP Board Practical Exams Schedule Coming Soon" },
                { date: "Oct 08", title: "Annual Sports Day Announcement - Participation Mandatory" },
                { date: "Sep 29", title: "Scholarship Form Submission Deadline Extended" },
              ].map((notice, idx) => (
                <div key={idx} className="flex gap-4 items-start group cursor-pointer hover:bg-slate-50 p-3 rounded-2xl transition-colors -mx-3">
                  <div className="flex-shrink-0 w-16 h-16 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-200 group-hover:bg-white group-hover:border-orange-200 group-hover:shadow-sm transition-all">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{notice.date.split(' ')[0]}</span>
                    <span className="text-xl font-black text-orange-600 leading-none mt-1">{notice.date.split(' ')[1]}</span>
                  </div>
                  <div className="pt-1">
                    <h4 className="font-bold text-slate-800 leading-snug group-hover:text-orange-600 transition-colors">{notice.title}</h4>
                    <p className="text-xs text-orange-500 mt-2 flex items-center gap-1 font-bold">Read details <ArrowUpRight size={12}/></p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">View All Notices</button>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Visit Our Campus</h2>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">We invite parents and guardians to visit us during working hours to understand our ethos and explore the campus facilities.</p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-orange-600">
                  <MapPin size={24} />
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-slate-900 text-lg">Location</h4>
                  <p className="text-slate-600 leading-relaxed mt-1">Dumri Nivas, Pali, Gorakhpur,<br/>Uttar Pradesh – 273209</p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <Phone size={24} />
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-slate-900 text-lg">Contact Helpdesk</h4>
                  <p className="text-slate-600 leading-relaxed mt-1">+91 98765 43210 <br/> Operating hours: 8AM — 4PM</p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Mail size={24} />
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-slate-900 text-lg">Email Administration</h4>
                  <p className="text-slate-600 leading-relaxed mt-1">info@vaidikdharmintercollege.in</p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-purple-600">
                  <Heart size={24} />
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-slate-900 text-lg">UDISE Code</h4>
                  <p className="text-slate-600 font-mono tracking-wide mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">09581301007</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">V</div>
             <div>
                <h4 className="font-black text-white leading-none">VDIC Gorakhpur</h4>
                <p className="text-[10px] tracking-widest uppercase mt-1 text-slate-500">Established 1952</p>
             </div>
          </div>
          <div className="text-sm font-medium text-slate-500">
             © {new Date().getFullYear()} Vaidik Dharm Inter College. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm font-bold">
             <button onClick={onPrivacyClick} className="hover:text-white transition-colors">Privacy Policy</button>
             <button className="hover:text-white transition-colors">Terms of Use</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
