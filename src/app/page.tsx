'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, ArrowRight, Sparkles, CheckCircle2, Zap, 
  Upload, Wand2, Download, ArrowUpRight, ChevronRight
} from 'lucide-react';

export default function Home() {
  // AI Simulation State for the Hero Visual Mockup
  const [simStep, setSimStep] = useState<0 | 1 | 2>(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setSimStep((prev) => {
        if (prev === 0) return 1;
        if (prev === 1) return 2;
        return 0;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-slate-100 overflow-x-hidden selection:bg-brand-primary/40 selection:text-white">
      
      {/* Global CSS overrides and utility classes */}
      <style jsx global>{`
        /* Dynamic font adjustments */
        h1, h2, h3, .font-heading {
          font-family: var(--font-bricolage), system-ui, sans-serif;
        }
        p, span, li, a, button, .font-sans {
          font-family: var(--font-manrope), system-ui, sans-serif;
        }

        /* Exponential ease-out transition wrapper */
        .expo-transition {
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Smooth border glow */
        .glow-border {
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 20px -2px rgba(0, 0, 0, 0.4);
        }
        .glow-border:hover {
          box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.25), 0 0 30px -5px rgba(99, 102, 241, 0.15), 0 10px 30px -10px rgba(0, 0, 0, 0.6);
        }

        /* Grid Background Pattern */
        .brand-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(99, 102, 241, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
          background-size: 56px 56px;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50% { opacity: 0.22; transform: scale(1.08); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .expo-transition, .animate-pulse-slow {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* ============================================================
          HEADER / NAVIGATION
      ============================================================ */}
      <header className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText size={18} className="text-white" />
          </div>
          <span className="font-heading text-lg font-extrabold tracking-tight text-white">NextCV</span>
        </div>
        <Link 
          href="/cv-builder" 
          className="expo-transition inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10"
        >
          Mulai Bikin <ArrowUpRight size={14} />
        </Link>
      </header>

      {/* ============================================================
          HERO SECTION
      ============================================================ */}
      <section className="relative pt-12 pb-32 md:pt-20 md:pb-48 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[650px] h-[650px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[550px] h-[550px] bg-indigo-800/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 brand-grid-pattern pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          
          {/* Left Column: Headline copy */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-3.5 py-1.5 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent" />
              </span>
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">Ditenagai Llama 3.3 70B · 100% Gratis</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] tracking-[-0.03em] text-white mb-6 max-w-[18ch] text-balance">
              Bikin CV profesional dibantu AI, anti-ribet.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-[55ch] mb-10 leading-relaxed text-balance">
              Tulis pengalaman kerjamu seadanya. AI kami akan menyusun kalimatnya menjadi rapi, profesional, dan siap lolos seleksi ATS. Pilih template, unduh PDF instan tanpa buat akun.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <Link
                href="/cv-builder"
                id="cta-hero-primary"
                className="expo-transition inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 rounded-xl font-extrabold text-base shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/25 active:scale-98"
              >
                <Sparkles size={18} /> Mulai Buat CV Sekarang
              </Link>
              <a
                href="#cara-kerja"
                className="expo-transition inline-flex items-center justify-center gap-1.5 px-6 py-4 text-slate-400 hover:text-white text-sm font-semibold hover:translate-x-1"
              >
                Pelajari cara kerjanya <ChevronRight size={16} />
              </a>
            </div>
          </div>

          {/* Right Column: AI Live Simulation Mockup */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-[440px] bg-brand-card/90 border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
              {/* Decorative browser dots */}
              <div className="flex items-center gap-1.5 mb-5 border-b border-white/5 pb-4">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-slate-500 ml-2">Llama AI Editor Simulator</span>
              </div>

              {/* Simulation Screen Content */}
              <div className="space-y-4">
                {/* 1. Raw text card */}
                <div className={`expo-transition p-4 rounded-xl border text-xs leading-relaxed ${
                  simStep === 0 
                    ? 'bg-white/5 border-indigo-500/30 text-slate-200' 
                    : 'bg-white/2 border-white/5 text-slate-400 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Input Pengguna:</span>
                    {simStep === 0 && <span className="text-brand-accent animate-pulse font-semibold">Mengetik...</span>}
                  </div>
                  <p className="font-mono text-[11px]">
                    &quot;saya marketing manager tokopedia selama 3 tahun. tugasnya bikin campaign ramadhan dan sukses naikin sales 20% lewat sosmed.&quot;
                  </p>
                </div>

                {/* 2. Magic action indicator */}
                <div className="flex justify-center my-3 relative">
                  <div className={`expo-transition flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg ${
                    simStep === 1 
                      ? 'bg-brand-primary text-white scale-105 shadow-brand-primary/30' 
                      : 'bg-slate-900 border border-white/10 text-slate-500 scale-95'
                  }`}>
                    <Wand2 size={13} className={simStep === 1 ? 'animate-spin' : ''} />
                    <span>{simStep === 1 ? 'AI Sedang Merapikan...' : 'Proses AI'}</span>
                  </div>
                </div>

                {/* 3. Polished output preview card */}
                <div className={`expo-transition p-4 rounded-xl border text-xs ${
                  simStep === 2 
                    ? 'bg-slate-900 border-emerald-500/30 text-white shadow-lg shadow-emerald-950/20' 
                    : 'bg-white/2 border-white/5 text-slate-500 opacity-40'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Hasil Rapi AI (Format ATS):</span>
                    {simStep === 2 && <span className="text-emerald-400 font-semibold text-[10px]">Sukses!</span>}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100">Marketing Manager | Tokopedia</p>
                    <p className="text-[10px] text-slate-400 italic mb-2">2021 – Present</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-300">
                      <li>Merancang dan mengeksekusi kampanye pemasaran digital spesial Ramadhan yang berhasil meningkatkan volume penjualan sebesar 20% YoY.</li>
                      <li>Mengoptimalkan strategi promosi media sosial terintegrasi untuk memperluas jangkauan brand.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Glow accent inside the box */}
              <div className={`absolute bottom-[-10px] right-[-10px] w-24 h-24 bg-brand-primary/20 rounded-full blur-2xl expo-transition ${
                simStep === 1 ? 'opacity-100 scale-125' : 'opacity-40'
              }`} />
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS (Not boring, staggered step visuals)
      ============================================================ */}
      <section id="cara-kerja" className="py-24 md:py-32 bg-white text-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-50 rounded-full blur-[140px] opacity-70 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-100 rounded-full blur-[120px] opacity-60 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="mb-20 text-center max-w-xl mx-auto">
            <h2 className="font-heading text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-[-0.02em] mb-4">
              Hanya 3 Langkah Mudah
            </h2>
            <p className="text-slate-500 text-base sm:text-lg">
              Alur super cepat untuk melamar kerja. Bebas ribet, tanpa pendaftaran akun.
            </p>
          </div>

          {/* Staggered visual process blocks */}
          <div className="space-y-16">
            
            {/* Step 1 */}
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 order-2 md:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-sm">01</span>
                  <h3 className="font-heading font-extrabold text-slate-900 text-2xl tracking-tight">Masukkan Data Pengalaman</h3>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Tulis riwayat pendidikan, kontak, dan pengalaman kerja Anda. Cukup ketik dalam kalimat santai atau pointers mentah. Form builder kami dirancang sangat intuitif.
                </p>
                <div className="flex gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">Formulir Fleksibel</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">Auto-save</span>
                </div>
              </div>
              <div className="md:col-span-7 order-1 md:order-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md expo-transition">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 font-mono text-[11px] text-slate-400">
                  <div className="h-5 bg-slate-100 rounded w-1/3 mb-1" />
                  <div className="h-9 bg-slate-50 border border-slate-200 rounded w-full flex items-center px-3 text-slate-500">
                    Dewanda Chen Ahnaf
                  </div>
                  <div className="h-5 bg-slate-100 rounded w-1/4 mt-2 mb-1" />
                  <div className="h-16 bg-slate-50 border border-slate-200 rounded w-full flex items-start p-2 text-slate-400">
                    - Kuliah di UI jurusan Ilmu Komputer gpa 3.8
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md expo-transition">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Kalimat Mentah</span>
                    <button className="flex items-center gap-1.5 px-3 py-1 bg-brand-primary text-white text-[10px] font-bold rounded-full">
                      <Sparkles size={10} /> AI Polish
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                    &quot;saya bisa python dan biasa bikin dashboard database pendaftaran sekolah&quot;
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 mt-2">
                    ✓ Dioptimalkan AI: &quot;Mengembangkan dashboard basis data pendaftaran siswa berbasis Python.&quot;
                  </p>
                </div>
              </div>
              <div className="md:col-span-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-sm">02</span>
                  <h3 className="font-heading font-extrabold text-slate-900 text-2xl tracking-tight">Poles Instan dengan AI</h3>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Cukup klik tombol **&quot;AI Enhance&quot;** pada kolom deskripsi. AI kami akan memodifikasi tata bahasa Anda menjadi kalimat aktif berstandar profesional. Bisa juga diterjemahkan ke Bahasa Inggris secara otomatis.
                </p>
                <div className="flex gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">Bahasa Inggris & Indo</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">Diksi Profesional</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 order-2 md:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-sm">03</span>
                  <h3 className="font-heading font-extrabold text-slate-900 text-2xl tracking-tight">Pilih Layout & Unduh PDF</h3>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Sistem langsung merender CV Anda secara real-time. Pilih template yang diinginkan (seperti Harvard style), tinjau previewnya, lalu klik export untuk mendapatkan file PDF resmi yang siap dikirim.
                </p>
                <div className="flex gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">Ekspor Instan</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">Tanpa Tanda Air</span>
                </div>
              </div>
              <div className="md:col-span-7 order-1 md:order-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md expo-transition">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-red-100 text-red-600 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">CV_Dewanda_Harvard.pdf</p>
                      <p className="text-[10px] text-slate-400">PDF Document · 120 KB</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors">
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          IMPORT SECTION (PDF Parser UI)
      ============================================================ */}
      <section className="py-24 md:py-32 bg-brand-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.04),transparent_50%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12 md:gap-16 items-center relative z-10">
          
          {/* Visual box parser */}
          <div className="md:col-span-6 bg-slate-900/60 border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-white/10 expo-transition">
            <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                <Upload size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Import CV PDF Lama</p>
                <p className="text-slate-500 text-xs mt-0.5">Sistem parses teks otomatis</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { label: 'Analisis Informasi Kontak', status: 'Selesai' },
                { label: 'Ekstraksi Riwayat Pekerjaan', status: 'Selesai' },
                { label: 'Pemetaan Riwayat Pendidikan', status: 'Selesai' },
                { label: 'Pengelompokan Kemampuan & Skill', status: 'Selesai' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-slate-300 font-medium">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">{item.status}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2.5 p-3.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl text-xs text-indigo-300 font-semibold">
              <Sparkles size={16} className="text-brand-primary" />
              <span>Semua data terisi otomatis dalam waktu kurang dari 5 detik!</span>
            </div>
          </div>

          {/* Text descriptions */}
          <div className="md:col-span-6 flex flex-col items-start">
            <h2 className="font-heading text-4xl md:text-5xl font-black mb-6 leading-tight text-white tracking-[-0.02em] text-balance">
              Sudah punya CV lama? Tarik otomatis di sini.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-[50ch]">
              Unggah file CV lama Anda dalam format PDF. AI kami akan secara cerdas mem-parsing isi dokumen dan memetakan datanya ke dalam form builder. Anda cukup memperbarui atau menambahkan info baru yang dirasa perlu.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Mendeteksi nama, email, dan detail kontak tanpa salah ketik',
                'Mengurai job deskripsi kerja dan pencapaian historis',
                'Mengelompokkan data kompetensi keras dan lunak secara otomatis',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                  <Zap size={16} className="text-brand-accent mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/cv-builder"
              className="expo-transition inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 bg-white hover:bg-slate-100 px-6 py-3.5 rounded-xl shadow-lg"
            >
              Coba Import PDF <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </section>

      {/* ============================================================
          BENEFITS / FEATURES (Asymmetrical layout, no flat grids)
      ============================================================ */}
      <section className="py-24 md:py-32 bg-white text-slate-900 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          
          {/* Asymmetric layout */}
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Left side: Sticky brief summary */}
            <div className="lg:col-span-4 lg:sticky lg:top-8">
              <h2 className="font-heading text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-[-0.02em] mb-4 text-balance">
                Apa Yang Benar-benar Anda Dapatkan?
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Kami tidak menjanjikan kelulusan mutlak, tetapi kami memastikan CV Anda memenuhi seluruh kriteria teknis terbaik untuk menarik perhatian rekruter global.
              </p>
              <div className="w-16 h-1 bg-brand-primary rounded-full" />
            </div>

            {/* Right side: Staggered sizes cards */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Feature card 1 (Featured - larger) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 hover:border-brand-primary/30 expo-transition">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-5 text-brand-primary">
                  <FileText size={24} />
                </div>
                <h3 className="font-heading font-extrabold text-slate-900 text-xl mb-3 tracking-tight">Format Layout Berstandar Dunia</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Kami mengadopsi standar Harvard CV yang sangat populer di kalangan rekruter internasional. Menggunakan font Times New Roman, struktur satu kolom, dan navigasi data berurutan yang lolos pemindaian ATS tanpa hambatan.
                </p>
              </div>

              {/* Smaller features split columns */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Feature card 2 */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:border-brand-primary/30 expo-transition">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-brand-accent">
                    <Wand2 size={20} />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg mb-2.5 tracking-tight">AI yang Membantu, Bukan Menggantikan</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    AI kami bertugas merapikan diksi, menghindari frasa pasif, serta mengoptimalkan keyword kompetensi. Anda tetap memegang kendali penuh atas cerita karir Anda.
                  </p>
                </div>

                {/* Feature card 3 */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 hover:border-brand-primary/30 expo-transition">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                    <Download size={20} />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg mb-2.5 tracking-tight">Ekspor PDF Asli & Akurat</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Unduh file PDF dengan rendering font berkualitas tinggi yang siap dicetak. Kami menjamin tidak ada coretan watermark atau elemen promosi apa pun pada CV Anda.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ============================================================
          FINAL CTA SECTION (Drenched background visual)
      ============================================================ */}
      <section className="py-32 bg-brand-bg text-center relative overflow-hidden">
        {/* Glowing background gradient elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="font-heading text-4xl sm:text-6xl font-extrabold text-white mb-6 tracking-[-0.03em] leading-[1.08] text-balance">
            Jangan biarkan karir impian Anda tertunda karena layout CV kaku.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Gratis tanpa batasan limit. Buat CV berkualitas dalam hitungan menit.
          </p>
          <Link
            href="/cv-builder"
            className="expo-transition inline-flex items-center gap-2.5 px-10 py-4.5 bg-brand-accent hover:bg-brand-accent-hover text-slate-950 rounded-xl font-extrabold text-base shadow-lg shadow-amber-500/15"
          >
            <Sparkles size={18} /> Bikin CV Sekarang — Gratis
          </Link>
        </div>
      </section>

      {/* ============================================================
          FOOTER
      ============================================================ */}
      <footer className="bg-brand-bg border-t border-white/5 py-12 text-center text-slate-600">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-primary rounded flex items-center justify-center">
              <FileText size={13} className="text-white" />
            </div>
            <span className="font-heading text-sm font-bold text-white tracking-tight">NextCV</span>
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} NextCV · Dioptimalkan untuk Karir Anda.</p>
        </div>
      </footer>

    </div>
  );
}