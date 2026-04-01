'use client'

import { useState } from 'react'
import { login, signup } from './actions' // Kita buat actions ini sebentar lagi
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setMessage('')
    
    let error;
    if (mode === 'login') {
      const res = await login(formData)
      error = res?.error
    } else {
      const res = await signup(formData)
      error = res?.error
      if (!error) setMessage('✅ Cek email kamu untuk konfirmasi pendaftaran!')
    }

    if (error) setMessage(`❌ ${error}`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-white">
      
      {/* LEFT SIDE: Visual */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
        <div className="relative z-10 text-center p-12">
           <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="text-yellow-400" size={16}/>
              <span className="text-white text-sm font-medium">Join 10,000+ Professionals</span>
           </div>
           <h1 className="text-5xl font-black text-white mb-6 leading-tight">
             Akselerasi Karirmu <br/> dengan AI.
           </h1>
           <p className="text-slate-400 text-lg max-w-md mx-auto">
             Akses CV Builder, Reviewer, dan Interview Simulator tercanggih secara gratis.
           </p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition">
            <ArrowLeft size={18}/> Kembali ke Home
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
            </h2>
            <p className="text-slate-500">
              {mode === 'login' ? 'Masuk untuk mengakses workspace kamu.' : 'Mulai perjalanan karirmu hari ini.'}
            </p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
              <input name="email" type="email" required placeholder="nama@email.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <input name="password" type="password" required placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}

            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70">
              {loading && <Loader2 className="animate-spin" size={20} />}
              {mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
              <button 
                onClick={() => {setMode(mode === 'login' ? 'signup' : 'login'); setMessage('');}}
                className="text-blue-600 font-bold ml-2 hover:underline"
              >
                {mode === 'login' ? 'Daftar Gratis' : 'Login Disini'}
              </button>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}