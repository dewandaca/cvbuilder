'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, ScanEye, Target, Mic, ArrowRight, Sparkles, 
  CheckCircle2, Zap, Star, XCircle 
} from 'lucide-react';

export default function Home() {
  // --- STATE FOR HYDRATION ERROR FIX ---
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    setWaveform(Array.from({ length: 15 }, () => Math.random() * 60 + 20));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200">
      
      {/* --- CUSTOM CSS ANIMATIONS & UTILS --- */}
      <style jsx global>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.02); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float 10s ease-in-out infinite reverse; }
        .animate-shimmer { background-size: 200% auto; animation: shimmer 4s linear infinite; }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
        }
      `}</style>

      {/* ================= HERO SECTION ================= */}
      <div className="relative bg-slate-950 text-white pt-28 pb-32 md:pt-40 md:pb-48 overflow-hidden flex flex-col items-center">
        
        {/* Animated Background Orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] animate-float mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-float-delayed mix-blend-screen pointer-events-none"></div>
        
        {/* Tech Grid Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          
          {/* Badge */}
          <div className="opacity-0 animate-fade-in-up inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-8 shadow-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs md:text-sm font-semibold tracking-wide text-slate-200">Powered by Llama 3.3 AI (70B)</span>
          </div>
          
          {/* Main Title */}
          <h1 className="opacity-0 animate-fade-in-up delay-100 text-5xl sm:text-6xl md:text-8xl font-heading font-black tracking-tight mb-8 leading-[1.1] text-balance">
            Karir Global <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-300 animate-shimmer">
              Butuh Strategi AI.
            </span>
          </h1>
          
          <p className="opacity-0 animate-fade-in-up delay-200 text-lg md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed text-balance font-medium">
            Platform karir All-in-One. Dari memoles CV format Harvard, audit otomatis, 
            cek kecocokan lowongan, hingga simulasi interview cerdas.
          </p>

          {/* Buttons */}
          <div className="opacity-0 animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full px-4 sm:w-auto">
            <Link 
              href="/cv-builder"
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] flex items-center justify-center gap-2 transform hover:-translate-y-1"
            >
              <FileText size={22} /> Mulai Buat CV
            </Link>
            <Link 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all border border-white/10 flex items-center justify-center gap-2 backdrop-blur-sm transform hover:-translate-y-1"
            >
              Pelajari Fitur <ArrowRight size={22} className="opacity-70" />
            </Link>
          </div>

          {/* Metrics */}
          <div className="opacity-0 animate-fade-in-up delay-400 mt-16 md:mt-24 pt-8 md:pt-12 border-t border-white/5 grid grid-cols-2 md:flex justify-center gap-x-8 gap-y-10 md:gap-24 text-slate-500 w-full max-w-3xl">
             <div className="flex flex-col items-center gap-2 transition-transform hover:scale-105">
                <span className="text-3xl md:text-4xl font-heading font-black text-white drop-shadow-md">100%</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Privacy Safe</span>
             </div>
             <div className="flex flex-col items-center gap-2 transition-transform hover:scale-105">
                <span className="text-3xl md:text-4xl font-heading font-black text-white drop-shadow-md">4-in-1</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Super App</span>
             </div>
             <div className="col-span-2 md:col-span-1 flex flex-col items-center gap-2 transition-transform hover:scale-105">
                <span className="text-3xl md:text-4xl font-heading font-black text-white drop-shadow-md">Harvard</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Standard</span>
             </div>
          </div>
        </div>
      </div>

      {/* ================= FEATURE 1: CV BUILDER ================= */}
      <section id="features" className="py-24 md:py-32 bg-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 md:gap-24 items-center relative z-10">
          
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-blue-600 font-bold bg-blue-50 border border-blue-100 px-4 py-2 rounded-full mb-8 text-xs md:text-sm uppercase tracking-wider shadow-sm">
               <Zap size={16} className="text-blue-500"/> Smart Builder
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-slate-900 mb-6 leading-tight text-balance">
              CV Harvard. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                Dipoles AI Otomatis.
              </span>
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
              Ketik pengalamanmu dalam Bahasa Indonesia, lalu gunakan 2 tombol AI: 
              <strong className="text-slate-900 font-semibold"> Lengkapi Bullet Points</strong> atau 
              <strong className="text-slate-900 font-semibold"> Translate ke Professional English</strong> sesuai kebutuhanmu.
            </p>
            <ul className="space-y-4 mb-10">
              {['Format Harvard', '2 Tombol AI: Lengkapi + Translate EN', 'Saran Action Verbs & Metrik'].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-700 font-medium text-base md:text-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm"><CheckCircle2 size={16} strokeWidth={3}/></div> {item}
                </li>
              ))}
            </ul>
            <Link href="/cv-builder" className="inline-flex items-center gap-2 text-lg font-bold text-blue-600 hover:text-blue-700 transition group/link bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-full">
              Buka Builder <ArrowRight size={20} className="group-hover/link:translate-x-1 transition-transform"/>
            </Link>
          </div>

          <div className="order-1 md:order-2 relative perspective-1000">
             <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border border-slate-100/50 relative transform transition-all duration-700 hover:rotate-2 hover:scale-[1.02] bg-gradient-to-b from-white to-slate-50/50">
                <div className="space-y-5">
                   <div className="flex gap-5 mb-8">
                      <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex-shrink-0"></div>
                      <div className="space-y-3 w-full pt-1">
                         <div className="h-5 w-2/3 bg-slate-800 rounded-md"></div>
                         <div className="h-4 w-1/3 bg-slate-300 rounded-md"></div>
                      </div>
                   </div>
                   <div className="space-y-3">
                     <div className="h-4 w-full bg-slate-100 rounded-md"></div>
                     <div className="h-4 w-[95%] bg-slate-100 rounded-md"></div>
                     <div className="h-4 w-[85%] bg-slate-100 rounded-md"></div>
                   </div>
                   
                   <div className="absolute -right-4 md:-right-10 top-1/2 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center gap-4 transform translate-y-4 md:translate-y-0 animate-float border border-slate-700">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2.5 rounded-xl shadow-inner"><Sparkles size={18} className="text-white"/></div>
                      <div className="text-sm">
                         <div className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-0.5">AI Action</div>
                         <div className="font-bold">Polishing...</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURE 2: AI REVIEWER ================= */}
      <section className="py-24 md:py-32 bg-slate-950 text-white relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 opacity-80 pointer-events-none"></div>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 md:gap-24 items-center relative z-10">
          
          <div className="relative order-2 md:order-1">
             <div className="bg-slate-900/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:-translate-y-2 hover:border-slate-700">
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-2">Audit Report</h3>
                      <h2 className="text-2xl md:text-3xl font-heading font-black">CV Analysis</h2>
                   </div>
                   <div className="w-20 h-20 rounded-full border-[6px] border-rose-500/20 flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-[6px] border-rose-500 border-t-transparent border-l-transparent transform rotate-45"></div>
                      <span className="text-2xl font-black text-rose-500">65</span>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl flex gap-4 items-start hover:bg-rose-500/10 transition-colors">
                      <XCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={22}/>
                      <div>
                         <strong className="text-white block mb-1.5 text-sm md:text-base">Fatal Mistake Found</strong>
                         <p className="text-sm text-rose-200/80 leading-relaxed">Missing quantitative metrics in your latest work experience.</p>
                      </div>
                   </div>
                   <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl flex gap-4 items-start hover:bg-emerald-500/10 transition-colors">
                      <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={22}/>
                      <div>
                         <strong className="text-white block mb-1.5 text-sm md:text-base">Good Formatting</strong>
                         <p className="text-sm text-emerald-200/80 leading-relaxed">Clean and consistent layout passes ATS parsing perfectly.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-8 text-xs md:text-sm uppercase tracking-wider">
               <ScanEye size={16}/> Ruthless Auditor
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-black mb-6 leading-tight text-balance">
              Reviewer Kejam. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">Tapi Jujur.</span>
            </h2>
            <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
              HRD membuang CV dalam 6 detik. AI kami akan mencari keyword ATS yang hilang, dan memberitahu bagian mana yang 
              <strong className="text-white font-semibold"> merupakan "Red Flag"</strong>.
            </p>
            <Link href="/cv-reviewer" className="inline-flex items-center gap-2 text-lg font-bold text-white bg-white/10 hover:bg-white/20 border border-white/5 backdrop-blur-sm px-6 py-3 rounded-full transition-all group/link">
              Audit CV Saya <ArrowRight size={20} className="group-hover/link:translate-x-1 transition-transform"/>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURE 3: ROLE MATCHER ================= */}
      <section className="py-24 md:py-32 bg-slate-50 relative overflow-hidden group">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 md:gap-24 items-center">
          
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-emerald-600 font-bold bg-emerald-100/50 border border-emerald-200 px-4 py-2 rounded-full mb-8 text-xs md:text-sm uppercase tracking-wider">
               <Target size={16}/> Precision Matcher
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-slate-900 mb-6 leading-tight text-balance">
              Jangan Asal Lamar. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Cek Dulu.</span>
            </h2>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed font-medium">
              Tempel Job Description dari lowongan manapun. AI akan memberitahu skill apa yang kurang dan memberikan 
              <strong className="text-slate-900 font-semibold"> "Cheat Sheet" jawaban interview</strong> untuk menutupi kelemahanmu.
            </p>
            <Link href="/role-matcher" className="inline-flex items-center gap-2 text-lg font-bold text-emerald-700 hover:text-emerald-800 transition group/link bg-emerald-100/50 hover:bg-emerald-200 px-6 py-3 rounded-full">
              Cek Kecocokan <ArrowRight size={20} className="group-hover/link:translate-x-1 transition-transform"/>
            </Link>
          </div>

          <div className="order-1 md:order-2">
             <div className="bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 text-white font-mono text-sm transform transition-all duration-700 hover:rotate-[-1deg] hover:scale-[1.02]">
                <div className="flex justify-between items-center border-b border-slate-800 pb-5 mb-6">
                   <div className="flex items-center gap-2">
                     <div className="flex gap-1.5">
                       <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                       <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                       <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                     </div>
                     <span className="ml-4 text-slate-500">match.json</span>
                   </div>
                   <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-full">MATCH: 85%</div>
                </div>
                <div className="space-y-5">
                   <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10"><CheckCircle2 size={18}/> "Python" Found</div>
                   <div className="flex items-center gap-3 text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20"><XCircle size={18}/> "Docker" Missing!</div>
                   <div className="pl-5 border-l-2 border-indigo-500/50 text-indigo-300/80 mt-4 text-xs md:text-sm">
                      <span className="text-indigo-400/50 block mb-1">{"// AI Suggestion:"}</span>
                      "Diplomatic Answer: While I haven't used Docker in prod, my strong Python background allows me to adapt quickly..."
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURE 4: INTERVIEW SIMULATOR ================= */}
      <section className="py-24 md:py-32 bg-slate-900 border-t border-slate-800 text-white relative overflow-hidden">
         <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 md:gap-24 items-center relative z-10">
            
            <div className="relative group order-2 md:order-1 perspective-1000">
              <div className="relative bg-slate-800/50 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] border border-slate-700/50 shadow-2xl transition-all duration-500 hover:shadow-cyan-500/10">
                 <div className="flex items-center gap-5 mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-slate-700/50 border border-slate-600/50 flex items-center justify-center text-3xl shadow-inner">🤖</div>
                    <div>
                       <div className="font-heading font-bold text-xl mb-1">AI Recruiter</div>
                       <div className="flex items-center gap-2">
                         <span className="relative flex h-2.5 w-2.5">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                         </span>
                         <span className="text-emerald-400 text-sm font-medium tracking-wide">Listening...</span>
                       </div>
                    </div>
                 </div>
                 
                 {/* Waveform */}
                 <div className="flex items-center justify-center gap-2 h-28 mb-10 bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-inner">
                    {waveform.map((height, i) => (
                      <div 
                        key={i} 
                        className="w-1.5 md:w-2 bg-gradient-to-t from-cyan-500 to-indigo-500 rounded-full animate-pulse opacity-80" 
                        style={{ height: `${height}%`, animationDelay: `${i * 0.1}s` }} 
                      ></div>
                    ))}
                 </div>
                 
                 <div className="bg-slate-900/60 p-5 rounded-2xl border-l-[3px] border-cyan-500 text-slate-300 italic text-base leading-relaxed">
                    "Tell me about a time you failed in a project. How did you handle it?"
                 </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full mb-8 text-xs md:text-sm uppercase tracking-wider">
                 <Mic size={16}/> Voice AI Simulation
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-black mb-6 leading-tight text-balance">
                Takut Gagap? <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Latihan Dulu.</span>
              </h2>
              <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
                Simulasi interview suara 2 arah. Jawab pakai microphone, dan dapatkan 
                <strong className="text-white font-semibold"> Rapor Penilaian</strong> tata bahasa dan intonasi di akhir sesi.
              </p>
              <Link href="/interview" className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-bold inline-flex items-center gap-3 transition-all shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-cyan-600/30 transform hover:-translate-y-1">
                Mulai Simulasi <Mic size={22}/>
              </Link>
            </div>
         </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-32 bg-white text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[150px] opacity-70 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
           <h2 className="text-5xl md:text-6xl font-heading font-black text-slate-900 mb-8 tracking-tight text-balance">
             Siap Melompat ke <span className="text-indigo-600">Karir Global?</span>
           </h2>
           <p className="text-xl md:text-2xl text-slate-600 mb-12 px-4 font-medium text-balance">
             Semua alat canggih ini Gratis. Jangan sampai kalah saing dengan kandidat lain yang udah mengoptimalkan AI.
           </p>
           <Link 
              href="/cv-builder"
              className="inline-flex px-12 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg md:text-xl transition-all shadow-xl hover:shadow-2xl items-center gap-3 transform hover:-translate-y-1"
            >
              🚀 Buat CV Pertamaku
            </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200/60 py-12 text-center text-slate-500 font-medium">
        <p className="font-heading font-bold text-slate-900 text-lg mb-2">Karir Global AI</p>
        <p className="text-sm">&copy; {new Date().getFullYear()} Built for Future Leaders.</p>
      </footer>

    </div>
  );
}