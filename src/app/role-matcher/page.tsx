'use client'

import { useState } from 'react';
import { matchRoleApi } from '@/lib/llamaApiClient';
import { 
  ArrowLeft, UploadCloud, FileText, CheckCircle2, 
  XCircle, Zap, MessageSquareQuote, Loader2, Briefcase, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

type InterviewStrategyItem = {
  missing_skill: string;
  diplomatic_answer: string;
};

type RequirementItem = {
  requirement: string;
  importance: 'Must Have' | 'Preferred';
  cv_evidence: string;
  fit_score: number;
};

type RoleMatchResult = {
  match_percentage: number;
  match_status: string;
  missing_skills?: string[];
  matching_skills?: string[];
  interview_strategy?: InterviewStrategyItem[];
  quick_fix?: string[];
  requirement_breakdown?: RequirementItem[];
  cv_tailoring_bullets?: string[];
};

export default function RoleMatcher() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoleMatchResult | null>(null);

  const handleAnalyze = async () => {
    if (!file || !jobDesc) return alert("Upload CV dan isi Job Desc dulu!");
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDesc);

    try {
      const data = await matchRoleApi<RoleMatchResult>(formData);
      if(data) setResult(data);
      else alert("Gagal menganalisis.");
    } catch (e) { alert("Error sistem."); } finally { setLoading(false); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200 ring-green-500';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200 ring-yellow-500';
    return 'text-red-600 bg-red-50 border-red-200 ring-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-100/50 via-slate-50 to-slate-50 pointer-events-none z-0"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none z-0"></div>
      <div className="absolute top-20 -left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none z-0"></div>

      {/* HEADER */}
      <div className="bg-white/70 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all duration-300">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-extrabold text-2xl flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Role Matcher <span className="text-slate-400 font-medium text-sm ml-2">Cek Kecocokan Karir</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 px-6 relative z-10">
        {/* Intro text */}
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Seberapa Cocok Kamu dengan Peran Ini?</h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Unggah CV kamu dan masukkan deskripsi pekerjaan impianmu. AI kami akan membedah profilmu, 
            menemukan celah keahlian, dan memberikan contekan strategi interview.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-5 space-y-6 sticky top-28">
          <div className="bg-white/80 p-8 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-blue-900/5 transition duration-500 group relative">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition duration-700 pointer-events-none"></div>
             <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-3 relative z-10 text-lg">
               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">1</div>
               Unggah CV Masterpiece Kamu
             </h2>
             <div className="border-2 border-dashed border-slate-300/60 rounded-2xl p-8 text-center hover:bg-blue-50/30 hover:border-blue-400 transition-all duration-300 cursor-pointer relative lg:h-32 flex flex-col justify-center items-center backdrop-blur-sm z-10">
                <input type="file" accept="application/pdf" onChange={(e) => e.target.files && setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 hover:bg-blue-500/5" aria-label="Upload PDF CV" />
                {file ? (
                  <div className="text-green-600 font-bold flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shadow-inner shadow-green-200"><CheckCircle2 size={28}/></div>
                    <span className="truncate max-w-full px-4 text-sm">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-3 group-hover:text-blue-500 transition duration-300">
                    <UploadCloud size={36} className="text-slate-300 group-hover:text-blue-500 group-hover:-translate-y-1 transition duration-300"/>
                    <span className="text-sm font-semibold tracking-wide uppercase">Tarik PDF atau Klik Di Sini</span>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-white/80 p-8 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-indigo-900/5 transition duration-500 flex flex-col h-96 group relative">
             <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition duration-700 pointer-events-none"></div>
             <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-3 relative z-10 text-lg">
               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">2</div>
               Deskripsi Pekerjaan
             </h2>
             <div className="relative flex-1 z-10">
               <textarea 
                 className="absolute inset-0 w-full p-5 bg-white border border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-inner placeholder:text-slate-400/80 transition-all duration-300"
                 placeholder="Tempel (paste) deskripsi detail lowongan kerjanya di sini. Makin lengkap makin presisi hasilnya... ✨"
                 value={jobDesc}
                 onChange={(e) => setJobDesc(e.target.value)}
               />
             </div>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={loading || !file || !jobDesc}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 text-lg transform hover:-translate-y-1 active:translate-y-0 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-15deg] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>
            {loading ? (
              <span className="flex items-center gap-3 relative z-10"><Loader2 className="animate-spin w-6 h-6"/> Menganalisis Potensi...</span>
            ) : (
              <span className="flex items-center gap-3 relative z-10">Siapkan Senjataku <Zap className="w-5 h-5"/></span>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-7">
          {!result ? (
           <div className="h-[600px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-blue-200/50 rounded-[2rem] bg-gradient-to-br from-white to-blue-50/50 shadow-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
              
              <div className="w-24 h-24 bg-blue-100/50 rounded-full flex flex-col items-center justify-center mb-6 relative z-10 shadow-inner">
                 <Briefcase size={40} className="text-blue-500/50 mb-1"/>
                 <Zap size={16} className="text-blue-400 absolute bottom-4 right-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2 relative z-10">Siap Menganalisis Potensi Kamu</h3>
              <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed relative z-10">
                 Semua wawasan berharga tentang kecocokanmu dengan lowongan, kesenjangan skill, dan panduan interview jenius akan muncul di sini.
              </p>
           </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
              
              {/* MAIN SCORE */}
              <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/2 filter blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center justify-between">
                   <div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-500" /> Match Score
                      </div>
                      <div className={`text-6xl md:text-7xl font-black tracking-tight ${getScoreColor(result.match_percentage).split(' ')[0]}`}>
                        {result.match_percentage}%
                      </div>
                      <div className="text-lg font-bold text-slate-700 mt-2 bg-slate-100/50 inline-block px-3 py-1 rounded-lg">
                        {result.match_status}
                      </div>
                   </div>
                   <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-[10px] flex items-center justify-center bg-white shadow-xl shadow-slate-200/50 ${getScoreColor(result.match_percentage)}`}>
                      <Zap size={40} className={getScoreColor(result.match_percentage).split(' ')[0]} />
                   </div>
                </div>
              </div>

              {/* SKILL GAP GRID */}
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 p-6 rounded-3xl border border-green-100/80 shadow-sm hover:shadow-md transition duration-300">
                   <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2"><CheckCircle2 size={24} className="text-green-500"/> You Have</h3>
                   <div className="flex flex-wrap gap-2">
                     {result.matching_skills?.map((skill:string, i:number) => (
                       <span key={i} className="text-xs font-bold bg-white text-green-700 border border-green-200 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform">{skill}</span>
                     ))}
                   </div>
                 </div>
                 <div className="bg-gradient-to-br from-red-50 to-rose-50/50 p-6 rounded-3xl border border-red-100/80 shadow-sm hover:shadow-md transition duration-300">
                   <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><XCircle size={24} className="text-red-500"/> Missing Skills</h3>
                   <div className="flex flex-wrap gap-2">
                     {result.missing_skills?.map((skill:string, i:number) => (
                       <span key={i} className="text-xs font-bold bg-white text-red-700 border border-red-200 px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 transition-transform">{skill}</span>
                     ))}
                   </div>
                 </div>
              </div>

              {/* STRATEGY CARDS */}
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                  <MessageSquareQuote className="text-purple-400"/> Cheat Sheet Interview
                </h3>
                <div className="space-y-6">
                  {result.interview_strategy?.map((item: InterviewStrategyItem, i: number) => (
                    <div key={i} className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                      <div className="text-xs font-bold text-purple-400 uppercase mb-2 tracking-wide">
                        If asked about "{item.missing_skill}"
                      </div>
                      <p className="text-slate-300 italic leading-relaxed text-sm border-l-2 border-purple-500 pl-4">
                        "{item.diplomatic_answer}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* QUICK FIX */}
              {!!result.quick_fix?.length && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Quick Fix CV</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {result.quick_fix.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 text-blue-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* REQUIREMENT BREAKDOWN */}
              {!!result.requirement_breakdown?.length && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Requirement Breakdown</h3>
                  <div className="space-y-3">
                    {result.requirement_breakdown.map((item: RequirementItem, i: number) => (
                      <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-slate-900">{item.requirement}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${item.importance === 'Must Have' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {item.importance}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-blue-100 text-blue-700">
                            Fit {item.fit_score}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">Evidence: {item.cv_evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAILORING BULLETS */}
              {!!result.cv_tailoring_bullets?.length && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">CV Tailoring Bullets</h3>
                  <div className="space-y-2">
                    {result.cv_tailoring_bullets.map((item: string, i: number) => (
                      <p key={i} className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}