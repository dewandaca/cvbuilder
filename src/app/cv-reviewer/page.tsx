'use client'

import { useState } from 'react';
import { reviewCvApi } from '@/lib/llamaApiClient';
import { 
  UploadCloud, XCircle, ArrowLeft, Loader2, 
  Search, Wand2, Target, FileText, AlertTriangle, ChevronRight, ListChecks, ThumbsUp, ThumbsDown,
  Zap, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

type ImpactLevel = string;
type EffortLevel = string;

type MagicRewrite = {
  original: string;
  better: string;
  reason: string;
};

type PrioritizedAction = {
  title: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  why: string;
  example: string;
};

type DetectedRole = {
  role: string;
  fit_score?: number;
  reason?: string;
};

type CVReviewResult = {
  executive_summary: string;
  ats_analysis?: {
    score?: number;
    detected_role?: string;
    detected_roles?: DetectedRole[];
    missing_keywords?: string[];
  };
  red_flags?: string[];
  section_audit?: {
    summary?: string;
    experience?: string;
  };
  strengths?: string[];
  weaknesses?: string[];
  prioritized_actions?: PrioritizedAction[];
  magic_rewrites?: MagicRewrite[];
};

export default function CvReviewer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CVReviewResult | null>(null);

  const detectedRoles = result?.ats_analysis?.detected_roles?.filter((item) => item?.role?.trim()) || [];
  const roleSuggestions =
    detectedRoles.length > 0
      ? detectedRoles
      : result?.ats_analysis?.detected_role
        ? [{ role: result.ats_analysis.detected_role }]
        : [];
  const strengths = Array.isArray(result?.strengths)
    ? result.strengths.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const weaknesses = Array.isArray(result?.weaknesses)
    ? result.weaknesses.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleReview = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await reviewCvApi<CVReviewResult>(formData);
      if (data) setResult(data as CVReviewResult);
      else alert("Gagal membaca CV. Pastikan format PDF teks.");
    } catch { alert("Terjadi kesalahan sistem."); } finally { setLoading(false); }
  };

  const normalizePriorityLevel = (value: string): 'high' | 'medium' | 'low' | 'unknown' => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return 'unknown';

    if (/\b(high|tinggi)\b/.test(normalized)) return 'high';
    if (/\b(medium|med|sedang)\b/.test(normalized)) return 'medium';
    if (/\b(low|rendah)\b/.test(normalized)) return 'low';
    return 'unknown';
  };

  const getImpactClass = (impact: string) => {
    const level = normalizePriorityLevel(impact);
    if (level === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (level === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (level === 'low') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getEffortClass = (effort: string) => {
    const level = normalizePriorityLevel(effort);
    if (level === 'low') return 'bg-green-100 text-green-700 border-green-200';
    if (level === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (level === 'high') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-4">
           <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-bold text-xl flex items-center gap-2">
              AI Resume Auditor <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded font-medium">Ruthless Mode</span>
            </h1>
            <span className="text-xs text-slate-500">Dapatkan feedback jujur, brutal, dan akurat untuk CV Anda</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-10 px-6">
        
        {/* HERO SECTION BEFORE UPLOAD */}
        {!result && (
          <div className="text-center mb-10 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Apakah CV Anda Siap Dilihat HRD?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Upload CV Anda (PDF) dan biarkan AI kami memberikan penilaian yang jujur tanpa ampun. 
              Mulai dari deteksi ATS, analisis kelebihan dan kekurangan utama, hingga saran penulisan ulang secara instan.
            </p>
          </div>
        )}

        {/* INPUT SECTION */}
        <div className={`bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden group transition-all duration-300 ${!result ? 'transform hover:-translate-y-1 hover:border-blue-400 max-w-3xl mx-auto' : ''}`}>
          {!result && (
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          )}
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          {!file ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-blue-50/80 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300 shadow-inner">
                <UploadCloud size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Drop CV PDF Disini</h3>
              <p className="text-slate-500">Atau klik untuk memilih file dari komputer Anda (Maks. 5MB)</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6">
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                    <FileText size={32}/>
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">{file.name}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1">
                      <ShieldCheck size={14} className="text-green-500" /> Ready to audit
                    </p>
                 </div>
              </div>
              <button 
                onClick={(e) => {e.stopPropagation(); handleReview();}} 
                disabled={loading}
                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 z-20 relative hover:scale-105"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Audit Sekarang <ChevronRight/></>}
              </button>
            </div>
          )}
        </div>

        {/* FEATURES SECTION BELOW UPLOAD */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap size={24} />
              </div>
              <h4 className="font-bold text-slate-800 mb-2">Review Brutal & Jujur</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Sistem akan menunjukkan letak kelemahan CV Anda tanpa basa-basi, seperti HRD dunia nyata.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search size={24} />
              </div>
              <h4 className="font-bold text-slate-800 mb-2">Simulasi ATS</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Cari tahu berapa persentase CV Anda lulus dari sistem screening otomatis menggunakan model standar industri.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wand2 size={24} />
              </div>
              <h4 className="font-bold text-slate-800 mb-2">Magic Rewrites</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Dapatkan saran kalimat langsung (sebelum & sesudah) untuk bagian-bagian vital agar terlihat lebih profesional.</p>
            </div>
          </div>
        )}

        {/* RESULT SECTION */}
        {result && (
          <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* 1. DASHBOARD HEADER */}
            <div className="grid gap-6">
              {/* Executive Summary */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative">
                <Target className="text-slate-200 absolute top-6 right-6" size={64}/>
                <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-8 bg-blue-600 rounded-full"></span> Executive Summary
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed relative z-10">&quot;{result.executive_summary}&quot;</p>
              </div>
            </div>

            {/* 2. ATS DARK CARD */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20"></div>
              <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                 <div>
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-2"><Search className="text-blue-400"/> ATS Analysis</h3>
                    <p className="text-slate-400 mb-3">Role Recommendations:</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {roleSuggestions.length > 0 ? roleSuggestions.map((item: DetectedRole, i: number) => (
                        <span key={`${item.role}-${i}`} className="text-white font-bold bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                          {item.role}{typeof item.fit_score === 'number' ? ` (${item.fit_score}%)` : ''}
                        </span>
                      )) : (
                        <span className="text-white font-bold bg-slate-800 px-3 py-1.5 rounded-lg text-sm">General</span>
                      )}
                    </div>
                    {roleSuggestions.some((item) => item.reason) && (
                      <div className="space-y-2 mb-6">
                        {roleSuggestions.map((item: DetectedRole, i: number) => (
                          item.reason ? (
                            <p key={`reason-${item.role}-${i}`} className="text-xs text-slate-300 leading-relaxed">
                              <span className="font-semibold text-slate-200">{item.role}:</span> {item.reason}
                            </p>
                          ) : null
                        ))}
                      </div>
                    )}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">MISSING KEYWORDS</p>
                      <div className="flex flex-wrap gap-2">
                        {result.ats_analysis?.missing_keywords?.map((kw: string, i: number) => (
                          <span key={i} className="bg-red-500/10 text-red-300 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm font-mono flex items-center gap-2">
                            <XCircle size={14}/> {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                 </div>
                 <div className="text-center md:text-right border-l border-slate-700 pl-8">
                    <div className="text-6xl font-black text-blue-400 mb-1">{result.ats_analysis?.score}%</div>
                    <p className="text-slate-500 text-sm uppercase tracking-wider">ATS Pass Rate</p>
                 </div>
              </div>
            </div>

            {/* 3. MAGIC REWRITES */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Wand2 className="text-purple-600"/> Magic Rewrites
              </h3>
              <div className="grid gap-6">
                {result.magic_rewrites?.map((item: MagicRewrite, i: number) => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className="grid md:grid-cols-2">
                      <div className="p-8 bg-red-50/30 border-r border-slate-100">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded mb-3">BEFORE</span>
                        <p className="text-slate-600 italic font-serif text-lg">&quot;{item.original}&quot;</p>
                      </div>
                      <div className="p-8 bg-green-50/30">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded mb-3">AFTER (AI POLISHED)</span>
                        <p className="text-slate-900 font-medium text-lg">&quot;{item.better}&quot;</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-8 py-4 text-sm text-slate-500 border-t border-slate-100 flex items-start gap-2">
                      <div className="mt-0.5"><AlertTriangle size={14}/></div>
                      <div><strong>Why:</strong> {item.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. RED FLAGS */}
            <div className="bg-white p-8 rounded-3xl border-l-8 border-red-500 shadow-sm">
                <h3 className="font-bold text-red-700 text-lg mb-6 flex items-center gap-2"><AlertTriangle size={24}/> Critical Red Flags</h3>
                <ul className="grid md:grid-cols-2 gap-4">
                  {result.red_flags?.map((flag: string, i: number) => (
                    <li key={i} className="flex gap-3 text-slate-700 bg-red-50 p-4 rounded-xl items-start">
                      <span className="text-red-500 font-bold mt-0.5">•</span> {flag}
                    </li>
                  ))}
                </ul>
            </div>

            {/* 5. STRENGTHS & WEAKNESSES */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ListChecks className="text-blue-600"/> Kelebihan & Kekurangan CV
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50/60 rounded-2xl p-5 border border-green-100">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <ThumbsUp size={18}/> Kelebihan
                  </h4>
                  {strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {strengths.map((item: string, i: number) => (
                        <li key={`strength-${i}`} className="flex items-start gap-2 text-slate-700">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-600 text-sm">Belum ada ringkasan kelebihan.</p>
                  )}
                </div>
                <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-100">
                  <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <ThumbsDown size={18}/> Kekurangan
                  </h4>
                  {weaknesses.length > 0 ? (
                    <ul className="space-y-2">
                      {weaknesses.map((item: string, i: number) => (
                        <li key={`weakness-${i}`} className="flex items-start gap-2 text-slate-700">
                          <span className="text-amber-600 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-600 text-sm">Belum ada ringkasan kekurangan.</p>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="font-semibold text-slate-800 mb-1">Summary</p>
                  <p className="text-slate-600">{result.section_audit?.summary || 'Belum ada evaluasi.'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="font-semibold text-slate-800 mb-1">Experience</p>
                  <p className="text-slate-600">{result.section_audit?.experience || 'Belum ada evaluasi.'}</p>
                </div>
              </div>
            </div>

            {/* 6. PRIORITIZED ACTION PLAN */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ListChecks className="text-emerald-600"/> Prioritized Action Plan
              </h3>
              <div className="space-y-4">
                {result.prioritized_actions?.map((action: PrioritizedAction, i: number) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-5 bg-slate-50/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <p className="font-bold text-slate-900">{i + 1}. {action.title}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className={`px-2.5 py-1 rounded-full border ${getImpactClass(action.impact)}`}>Impact: {action.impact}</span>
                        <span className={`px-2.5 py-1 rounded-full border ${getEffortClass(action.effort)}`}>Effort: {action.effort}</span>
                      </div>
                    </div>
                    <p className="text-slate-700 mb-2"><span className="font-semibold">Why:</span> {action.why}</p>
                    <p className="text-slate-600 text-sm"><span className="font-semibold">Example:</span> {action.example}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}