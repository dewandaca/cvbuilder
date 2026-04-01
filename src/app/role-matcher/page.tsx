'use client'

import { useState } from 'react';
import { matchRole } from '../actions';
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
      const data = await matchRole(formData);
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-4">
           <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-xl flex items-center gap-2">
            Role Matcher <span className="text-slate-400 font-normal text-sm">/ Cek Kecocokan Karir</span>
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 px-6 grid lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
               Upload CV
             </h2>
             <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 hover:border-blue-400 transition cursor-pointer relative group">
                <input type="file" accept="application/pdf" onChange={(e) => e.target.files && setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {file ? (
                  <div className="text-green-600 font-bold flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle2 size={24}/></div>
                    {file.name}
                  </div>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-2 group-hover:text-blue-500 transition">
                    <UploadCloud size={32}/>
                    <span className="text-sm font-medium">Klik untuk upload PDF</span>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-80">
             <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">2</div>
               Job Description
             </h2>
             <textarea 
               className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none text-sm leading-relaxed"
               placeholder="Paste deskripsi lowongan kerja di sini..."
               value={jobDesc}
               onChange={(e) => setJobDesc(e.target.value)}
             />
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={loading || !file || !jobDesc}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition shadow-xl shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-lg transform hover:-translate-y-1"
          >
            {loading ? <Loader2 className="animate-spin"/> : <>Analisis Sekarang <ChevronRight/></>}
          </button>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-7">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 min-h-125">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Briefcase size={32} className="opacity-30"/>
              </div>
              <p>Hasil analisis akan muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
              
              {/* MAIN SCORE */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex items-center justify-between">
                   <div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Match Score</div>
                      <div className={`text-6xl font-black ${getScoreColor(result.match_percentage).split(' ')[0]}`}>{result.match_percentage}%</div>
                      <div className="text-lg font-bold text-slate-700 mt-2">{result.match_status}</div>
                   </div>
                   <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center bg-white ${getScoreColor(result.match_percentage)}`}>
                      <Zap size={32} className={getScoreColor(result.match_percentage).split(' ')[0]} />
                   </div>
                </div>
              </div>

              {/* SKILL GAP GRID */}
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                   <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2"><CheckCircle2 size={20}/> You Have</h3>
                   <div className="flex flex-wrap gap-2">
                     {result.matching_skills?.map((skill:string, i:number) => (
                       <span key={i} className="text-xs font-bold bg-white text-green-700 border border-green-200 px-3 py-1.5 rounded-lg shadow-sm">{skill}</span>
                     ))}
                   </div>
                 </div>
                 <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                   <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><XCircle size={20}/> Missing Skills</h3>
                   <div className="flex flex-wrap gap-2">
                     {result.missing_skills?.map((skill:string, i:number) => (
                       <span key={i} className="text-xs font-bold bg-white text-red-700 border border-red-200 px-3 py-1.5 rounded-lg shadow-sm">{skill}</span>
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
  );
}