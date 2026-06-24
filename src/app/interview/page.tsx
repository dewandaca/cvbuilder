'use client'

import { useState, useEffect, useRef } from 'react';
import { chatInterviewApi, generateInterviewReportApi } from '@/lib/llamaApiClient';
import { Mic, User, Bot, Square, ArrowLeft, Send, CheckCircle, XCircle, AlertTriangle, Briefcase, Coffee, StopCircle } from 'lucide-react';
import Link from 'next/link';

type Message = { role: 'user' | 'assistant', content: string };

type TeachingMoment = {
  question: string;
  candidate_answer: string;
  better_answer: string;
};

export default function InterviewSim() {
  // --- STATE & REFS (Sama seperti sebelumnya) ---
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<'general' | 'technical'>('general');
  const [jobInfo, setJobInfo] = useState({ title: '', desc: '' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputBuffer, setInputBuffer] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const shouldKeepListeningRef = useRef(false);
  const isFinishingRef = useRef(false);
  const bufferRef = useRef(''); 

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        voicesRef.current = synthRef.current?.getVoices() ?? [];
      };

      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; recognition.lang = 'id-ID'; recognition.interimResults = true;
        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
          setInputBuffer(transcript); bufferRef.current = transcript;
        };
        recognition.onend = () => {
          if (shouldKeepListeningRef.current) {
            try {
              recognition.start();
            } catch {
              setTimeout(() => {
                if (!shouldKeepListeningRef.current) return;
                try {
                  recognition.start();
                } catch {}
              }, 200);
            }
            return;
          }

          setIsRecording(false);
          if (bufferRef.current.trim()) handleSendMessage(bufferRef.current);
        };
        recognitionRef.current = recognition;
      }

      return () => {
        if (synthRef.current) synthRef.current.onvoiceschanged = null;
      };
    }
  }, []); 

  const startInterview = () => { setStarted(true); handleSendMessage("", true); };
  const toggleMic = () => {
    if (isRecording) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
    }
    else {
      setInputBuffer('');
      bufferRef.current = '';
      shouldKeepListeningRef.current = true;
      recognitionRef.current?.start();
    }
  };
  const manualSend = () => { if (inputBuffer.trim()) handleSendMessage(inputBuffer); };
  const getIndonesianVoice = () => {
    const voices = voicesRef.current;
    if (!voices.length) return null;

    return (
      voices.find((voice) => voice.lang === 'id-ID') ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith('id')) ||
      voices.find((voice) => voice.lang === 'ms-MY') ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith('ms')) ||
      null
    );
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = getIndonesianVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'id-ID';
    }
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.onstart = () => setIsSpeaking(true); utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };
  const handleSendMessage = async (text: string, isInit = false) => {
    if (!text && !isInit) return;
    setInputBuffer(''); bufferRef.current = '';
    const newHistory: Message[] = isInit ? [] : [...messages, { role: 'user', content: text }];
    if (!isInit) setMessages(newHistory);
    setLoadingAI(true);
    const { reply: aiResponse, shouldFinish } = await chatInterviewApi(newHistory, { mode, jobTitle: jobInfo.title, jobDesc: jobInfo.desc });
    const finalHistory = [...newHistory, { role: 'assistant' as const, content: aiResponse }];
    setMessages(finalHistory);
    setLoadingAI(false);

    if (shouldFinish) {
      await finishSession(finalHistory);
      return;
    }

    speakText(aiResponse);
  };
  const finishSession = async (messagesForReport?: Message[]) => {
    if (isFinishingRef.current || generatingReport || report) return;
    isFinishingRef.current = true;
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current.stop();
    }
    setIsSpeaking(false); setIsRecording(false);
    setGeneratingReport(true);
    try {
      const data = await generateInterviewReportApi(messagesForReport ?? messages, { mode, jobTitle: jobInfo.title });
      setReport(data);
    } catch (e) { alert("Gagal membuat laporan."); } finally { setGeneratingReport(false); }
    isFinishingRef.current = false;
  };

  const teachingMoments: TeachingMoment[] = (() => {
    if (!report) return [];

    const fromArray = Array.isArray(report.sample_better_answers) ? report.sample_better_answers : [];
    const normalizedArray = fromArray
      .filter((item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item: Record<string, unknown>) => ({
        question: typeof item.question === 'string' ? item.question.trim() : '',
        candidate_answer: typeof item.candidate_answer === 'string' ? item.candidate_answer.trim() : '',
        better_answer: typeof item.better_answer === 'string' ? item.better_answer.trim() : '',
      }))
      .filter((item) => item.question && item.candidate_answer && item.better_answer);

    if (normalizedArray.length > 0) return normalizedArray;

    const legacy = report.sample_better_answer;
    if (!legacy || typeof legacy !== 'object') return [];

    const legacyQuestion = typeof legacy.question === 'string' ? legacy.question.trim() : '';
    const legacyCandidateAnswer = typeof legacy.candidate_answer === 'string' ? legacy.candidate_answer.trim() : '';
    const legacyBetterAnswer = typeof legacy.better_answer === 'string' ? legacy.better_answer.trim() : '';

    if (!legacyQuestion || !legacyCandidateAnswer || !legacyBetterAnswer) return [];

    return [{
      question: legacyQuestion,
      candidate_answer: legacyCandidateAnswer,
      better_answer: legacyBetterAnswer,
    }];
  })();

  // --- VIEW 1: REPORT CARD (Certificate Style) ---
  if (report) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex justify-center items-center font-sans text-slate-900">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500">
          <div className="bg-slate-900 text-white p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10"></div>
            <h2 className="text-xl font-bold uppercase tracking-[0.3em] opacity-70 mb-4 relative z-10">Performance Report</h2>
            <div className={`text-8xl font-black mb-4 relative z-10 ${report.score >= 75 ? 'text-green-400' : report.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{report.score}</div>
            <div className="inline-block px-6 py-2 bg-white/10 rounded-full font-bold text-lg border border-white/20 relative z-10">
              VERDICT: {report.verdict}
            </div>
          </div>

          <div className="p-10 space-y-10">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">Evaluasi Interviewer</h3>
              <p className="text-slate-600 leading-relaxed text-lg">"{report.feedback_summary}"</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2 text-lg"><CheckCircle/> Strengths</h4>
                <ul className="space-y-3">
                  {report.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-green-900 flex gap-2"><span className="font-bold">ΓÇó</span> {s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2 text-lg"><XCircle/> Areas to Improve</h4>
                <ul className="space-y-3">
                  {report.areas_for_improvement?.map((s: string, i: number) => (
                    <li key={i} className="text-red-900 flex gap-2"><span className="font-bold">ΓÇó</span> {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {teachingMoments.length > 0 && (
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg"><AlertTriangle className="text-yellow-500"/> Teaching Moments</h3>
                <div className="space-y-8">
                  {teachingMoments.map((moment, i) => (
                    <div key={i} className="space-y-6">
                      <div>
                        <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">PERTANYAAN {i + 1}</span>
                        <p className="text-slate-900 font-bold text-lg mt-1">"{moment.question}"</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm opacity-70">
                          <span className="text-xs font-bold text-red-500 uppercase mb-2 block">Jawaban Kamu</span>
                          <p className="text-slate-600 italic">"{moment.candidate_answer}"</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border-l-4 border-green-500 shadow-md">
                          <span className="text-xs font-bold text-green-600 uppercase mb-2 block">Saran Jawaban Pro</span>
                          <p className="text-slate-800 font-medium">"{moment.better_answer}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold hover:bg-black transition text-lg shadow-xl">
              Mulai Sesi Baru ≡ƒöä
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: LOADING ---
  if (generatingReport) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-bold mb-4">Menganalisis Performa...</h2>
        <p className="text-slate-400 text-lg">HR sedang membuat keputusan akhir.</p>
      </div>
    );
  }

  // --- VIEW 3: SETUP SCREEN ---
  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="bg-white max-w-xl w-full p-10 rounded-3xl border border-slate-200 shadow-2xl">
           <Link href="/" className="text-slate-400 hover:text-slate-900 mb-8 block flex items-center gap-2 font-bold"><ArrowLeft size={20}/> Kembali</Link>
           <h1 className="text-4xl font-black mb-4 text-slate-900">Interview Simulator</h1>
           <p className="text-slate-500 mb-10 text-lg">Pilih lawan bicaramu hari ini.</p>

           <div className="space-y-5 mb-10">
             <button onClick={() => setMode('general')} className={`group w-full p-6 rounded-2xl border-2 text-left transition-all duration-300 ${mode === 'general' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${mode === 'general' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}><Coffee size={24}/></div>
                  <div>
                    <div className="font-bold text-lg text-slate-800">HR Screening (Behavioral)</div>
                    <div className="text-sm text-slate-500 mt-1">Pertanyaan santai tentang kepribadian & motivasi.</div>
                  </div>
               </div>
             </button>

             <button onClick={() => setMode('technical')} className={`group w-full p-6 rounded-2xl border-2 text-left transition-all duration-300 ${mode === 'technical' ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'}`}>
               <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${mode === 'technical' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600'}`}><Briefcase size={24}/></div>
                  <div>
                    <div className="font-bold text-lg text-slate-800">Technical Deep Dive</div>
                    <div className="text-sm text-slate-500 mt-1">Pertanyaan teknis spesifik (Hard Skills).</div>
                  </div>
               </div>
             </button>

             {mode === 'technical' && (
               <div className="pl-4 border-l-4 border-purple-200 animate-in slide-in-from-top-2 space-y-3">
                 <input type="text" placeholder="Posisi (e.g. Senior React Dev)" className="w-full p-4 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 transition" onChange={e => setJobInfo({...jobInfo, title: e.target.value})} />
                 <textarea placeholder="Paste Job Description singkat..." rows={3} className="w-full p-4 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none resize-none focus:ring-2 focus:ring-purple-500 transition" onChange={e => setJobInfo({...jobInfo, desc: e.target.value})} />
               </div>
             )}
           </div>

           <button onClick={startInterview} disabled={mode === 'technical' && !jobInfo.title} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition disabled:opacity-50 shadow-xl text-lg flex items-center justify-center gap-3">
             Mulai Sesi <Mic size={20}/>
           </button>
        </div>
      </div>
    );
  }

  // --- VIEW 4: CHAT SCREEN (Dark Mode) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-4">
           <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
           <div>
             <div className="font-bold text-base text-slate-200">{mode === 'general' ? 'HR Manager' : jobInfo.title}</div>
             <div className="text-xs text-slate-500">{mode === 'general' ? 'Behavioral Interview' : 'Technical Interview'}</div>
           </div>
        </div>
        <button onClick={() => { void finishSession(); }} className="text-xs bg-red-600/10 text-red-500 border border-red-900/50 px-5 py-2 rounded-full hover:bg-red-600 hover:text-white font-bold transition flex items-center gap-2">
          <StopCircle size={14}/> Selesai & Nilai
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-3xl text-lg leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-900 text-slate-300 rounded-tl-sm border border-slate-800'}`}>
              <div className="flex items-center gap-2 mb-2 opacity-50 text-xs font-bold uppercase tracking-widest">
                {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>}
                {msg.role === 'user' ? 'You' : 'Recruiter'}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        {loadingAI && (
          <div className="flex justify-start">
            <div className="bg-slate-900 p-6 rounded-3xl rounded-tl-sm border border-slate-800 flex items-center gap-2">
               <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex-1 h-20 bg-slate-950 rounded-2xl flex items-center px-6 overflow-hidden relative border border-slate-800 shadow-inner">
            {isRecording ? (
               <div className="w-full flex items-center justify-center gap-1">
                 {[...Array(20)].map((_, i) => (
                   <div key={i} className="w-1 bg-red-500 rounded-full animate-[bounce_1s_infinite]" style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${i * 0.05}s` }}></div>
                 ))}
                 <p className="absolute text-red-500 font-bold text-xs bg-slate-950/90 px-4 py-1.5 rounded-full border border-red-900/50">Listening...</p>
               </div>
            ) : (
               <div className="w-full flex items-center gap-4">
                 <input 
                   type="text" 
                   className="bg-transparent border-none focus:ring-0 outline-none text-base w-full text-slate-300 placeholder:text-slate-600"
                   placeholder="Type your answer here or use mic..."
                   value={inputBuffer}
                   onChange={(e) => { setInputBuffer(e.target.value); bufferRef.current = e.target.value; }}
                   onKeyDown={(e) => e.key === 'Enter' && manualSend()}
                 />
                 {inputBuffer && <button onClick={manualSend} className="text-blue-500 hover:text-blue-400 p-2 bg-blue-500/10 rounded-xl transition"><Send size={24}/></button>}
               </div>
            )}
          </div>
          <button onClick={toggleMic} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl transform active:scale-95 ${isRecording ? 'bg-red-500 shadow-red-500/40 ring-4 ring-red-900' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/40'}`}>
            {isRecording ? <Square size={28} fill="white" className="text-white" /> : <Mic size={32} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
