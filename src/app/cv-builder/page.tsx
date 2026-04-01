'use client'

import { useMemo, useState, useEffect, useRef } from 'react';
import { polishText } from '../actions';
import { HarvardCV } from '@/components/HarvardCV';
import { pdf } from '@react-pdf/renderer';
import { 
  Plus, Trash2, Loader2, Save, ArrowLeft, 
  Briefcase, GraduationCap, Trophy, Code, FolderGit2, Sparkles 
} from 'lucide-react';
import Link from 'next/link';

// --- Type Definitions ---
type Education = { id: number; school: string; major: string; gpa: string; startDate: string; endDate: string; isCurrent: boolean; description: string; };
type Experience = { id: number; role: string; company: string; startDate: string; endDate: string; isCurrent: boolean; description: string; };
type Project = { id: number; name: string; role: string; startDate: string; endDate: string; description: string; };
type Achievement = { id: number; name: string; year: string; };
type CustomSection = { id: number; title: string; content: string; };
type CVData = {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    summary: string;
  };
  educations: Education[];
  experiences: Experience[];
  projects: Project[];
  achievements: Achievement[];
  customSections: CustomSection[];
  skills: {
    hard: string;
    soft: string;
  };
};

const formatDateRangePreview = (startDate?: string, endDate?: string, isCurrent?: boolean) => {
  const start = startDate?.trim();
  const end = endDate?.trim();

  if (isCurrent) {
    return start ? `${start} - Present` : 'Present';
  }

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

const parseBulletItemsPreview = (text: string) => {
  if (!text?.trim()) return [];

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items = lines
    .map((line) => line.replace(/^(•|-|\*)\s*/, '').trim())
    .filter((line) => line.length > 0);

  return items.length > 0 ? items : [text.trim()];
};

const PreviewSectionTitle = ({ children }: { children: string }) => (
  <h3 className="mt-4 mb-2 border-b border-black pb-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
    {children}
  </h3>
);

const HarvardCVLivePreview = ({ data }: { data: CVData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const available = el.offsetWidth - 16; // 16 = p-2 padding (8px each side)
      setScale(Math.min(1, available / 794));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const displayLinkedin = data.personalInfo.linkedin
    ? data.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : '';

  return (
    <div ref={containerRef} className="bg-slate-200 p-2 overflow-hidden">
      <div
        className="bg-white p-6 sm:p-8 text-black shadow-sm"
        style={{
          fontFamily: 'Times New Roman, Times, serif',
          fontSize: 10.5,
          lineHeight: 1.4,
          width: 794,
          zoom: scale,
        }}
      >
        <div className="mb-3 text-center">
          <h1 className="mb-2 text-[15px] font-bold uppercase tracking-wide">
            {data.personalInfo.fullName || 'YOUR NAME'}
          </h1>
          <p className="text-[10px]">
            {data.personalInfo.email}  |  {data.personalInfo.phone}  {displayLinkedin ? `|  ${displayLinkedin}` : ''}
          </p>
        </div>

        {data.personalInfo.summary.trim() && (
          <section>
            <PreviewSectionTitle>Summary</PreviewSectionTitle>
            <p className="text-[10.5px] leading-[1.45] text-justify">{data.personalInfo.summary}</p>
          </section>
        )}

        {data.educations.length > 0 && (
          <section>
            <PreviewSectionTitle>Education</PreviewSectionTitle>
            {data.educations.map((education) => {
              const bullets = parseBulletItemsPreview(education.description);
              const dateRange = formatDateRangePreview(education.startDate, education.endDate, education.isCurrent);

              return (
                <div key={education.id} className="mb-2 text-[10.5px] leading-[1.4]">
                  <div className="flex items-end justify-between gap-4">
                    <p className="font-bold">{education.school}</p>
                    <p>{dateRange}</p>
                  </div>
                  <p className="italic">
                    {education.major}
                    {education.gpa ? ` | GPA: ${education.gpa}` : ''}
                  </p>
                  {bullets.length > 0 && (
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                      {bullets.map((item, index) => (
                        <li key={`${education.id}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {data.experiences.length > 0 && (
          <section>
            <PreviewSectionTitle>Experience</PreviewSectionTitle>
            {data.experiences.map((experience) => {
              const bullets = parseBulletItemsPreview(experience.description);
              const dateRange = formatDateRangePreview(experience.startDate, experience.endDate, experience.isCurrent);

              return (
                <div key={experience.id} className="mb-2 text-[10.5px] leading-[1.4]">
                  <div className="flex items-end justify-between gap-4">
                    <p className="font-bold">{experience.role}, {experience.company}</p>
                    <p>{dateRange}</p>
                  </div>
                  {bullets.length > 0 && (
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                      {bullets.map((item, index) => (
                        <li key={`${experience.id}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {data.projects.length > 0 && (
          <section>
            <PreviewSectionTitle>Projects</PreviewSectionTitle>
            {data.projects.map((project) => {
              const bullets = parseBulletItemsPreview(project.description);
              const dateRange = formatDateRangePreview(project.startDate, project.endDate);

              return (
                <div key={project.id} className="mb-2 text-[10.5px] leading-[1.4]">
                  <div className="flex items-end justify-between gap-4">
                    <p className="font-bold">{project.name} | {project.role}</p>
                    <p>{dateRange}</p>
                  </div>
                  {bullets.length > 0 && (
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                      {bullets.map((item, index) => (
                        <li key={`${project.id}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {(data.skills.hard.trim() || data.skills.soft.trim()) && (
          <section>
            <PreviewSectionTitle>Skills</PreviewSectionTitle>
            {data.skills.hard.trim() && (
              <p className="mb-1 text-[10.5px]">
                <span className="font-bold">Hard Skills: </span>
                {data.skills.hard}
              </p>
            )}
            {data.skills.soft.trim() && (
              <p className="text-[10.5px]">
                <span className="font-bold">Soft Skills: </span>
                {data.skills.soft}
              </p>
            )}
          </section>
        )}

        {data.achievements.length > 0 && data.achievements[0].name !== '' && (
          <section>
            <PreviewSectionTitle>Honors & Awards</PreviewSectionTitle>
            <ul className="ml-4 list-disc space-y-0.5 text-[10.5px] leading-[1.4]">
              {data.achievements.map((achievement) => (
                <li key={achievement.id}>
                  {achievement.name}
                  {achievement.year ? ` (${achievement.year})` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.customSections
          .filter((section) => section.title.trim() || section.content.trim())
          .map((section) => {
            const bullets = parseBulletItemsPreview(section.content);

            return (
              <section key={section.id}>
                <PreviewSectionTitle>{section.title || 'Custom Section'}</PreviewSectionTitle>
                {bullets.length > 0 && (
                  <ul className="ml-4 list-disc space-y-0.5 text-[10.5px] leading-[1.4]">
                    {bullets.map((item, index) => (
                      <li key={`${section.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
};

// Generic type-safe helper for items with id
type ItemWithId = { id: number; [key: string]: unknown };

export default function CvBuilder() {
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // --- STATE ---
  const [personalInfo, setPersonalInfo] = useState({ fullName: '', email: '', phone: '', linkedin: '', summary: '' });
  const [educations, setEducations] = useState<Education[]>([{ id: 1, school: '', major: '', gpa: '', startDate: '', endDate: '', isCurrent: false, description: '' }]);
  const [experiences, setExperiences] = useState<Experience[]>([{ id: 1, role: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' }]);
  const [projects, setProjects] = useState<Project[]>([{ id: 1, name: '', role: '', startDate: '', endDate: '', description: '' }]);
  const [achievements, setAchievements] = useState<Achievement[]>([{ id: 1, name: '', year: '' }]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [skills, setSkills] = useState({ hard: '', soft: '' });

  const fullData = useMemo(
    () => ({ personalInfo, educations, experiences, projects, achievements, customSections, skills }),
    [personalInfo, educations, experiences, projects, achievements, customSections, skills]
  );

  /** 
   * addItem: Generic function to add a new item with auto-increment id
   * Why Generics? Enforces that template has all required fields before adding.
   * Type T ensures compile-time checks for correct template structure.
   */
  const addItem = <T extends ItemWithId>(
    list: T[], 
    setList: (list: T[]) => void, 
    template: Omit<T, 'id'>
  ) => {
    const newId = list.length > 0 ? (list[list.length - 1].id ?? 0) + 1 : 1;
    setList([...list, { ...template, id: newId } as T]);
  };

  /** 
   * removeItem: Generic function to remove item by id
   * Why Generics? Type-safe filtering without needing 'any' assertions.
   */
  const removeItem = <T extends ItemWithId>(
    id: number, 
    list: T[], 
    setList: (list: T[]) => void
  ) => {
    setList(list.filter((item) => item.id !== id));
  };

  const updateItem = <T extends ItemWithId, K extends keyof T>(
    id: number,
    key: K,
    value: T[K],
    list: T[],
    setList: (list: T[]) => void
  ) => {
    setList(
      list.map((item) =>
        item.id === id ? ({ ...item, [key]: value } as T) : item
      )
    );
  };

  // --- AI LOGIC ---
  const handlePolish = async (
    type: 'summary' | 'bullet',
    mode: 'enhance' | 'translate',
    text: string,
    idStr: string,
    setterCallback?: (val: string) => void
  ) => {
    if (!text) return alert("Isi teks dulu sebelum minta bantuan AI!");
    setLoadingAI(idStr);
    try {
      const result = await polishText(text, type, mode);
      if (setterCallback) setterCallback(result);
    } catch { alert("AI Error."); } finally { setLoadingAI(null); }
  };

  // --- PDF GENERATION ---
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await pdf(<HarvardCV data={fullData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${personalInfo.fullName || 'User'}_Harvard.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      alert("Gagal generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- UI COMPONENTS ---
  const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-blue-200/80">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:shadow-xl transition-all">
        <Icon size={20} className="sm:hidden" />
        <Icon size={24} className="hidden sm:block" />
      </div>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{title}</h2>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Complete this section for better results</p>
      </div>
    </div>
  );

  // Magic Button Style with enhanced animation
  const MagicButton = ({
    onClick,
    loading,
    label,
    variant = 'enhance'
  }: {
    onClick: () => void;
    loading: boolean;
    label: string;
    variant?: 'enhance' | 'translate';
  }) => (
    <button 
      onClick={onClick}
      disabled={loading}
      className={`group relative inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 min-h-10 text-sm sm:text-xs font-bold text-white transition-all duration-300 w-full sm:w-auto rounded-full shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:scale-105 active:scale-95 ${
        variant === 'enhance'
          ? 'bg-gradient-to-r from-purple-500/90 via-pink-500/90 to-rose-500/90 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 hover:shadow-purple-500/40'
          : 'bg-gradient-to-r from-blue-500/90 via-indigo-500/90 to-cyan-500/90 hover:from-blue-600 hover:via-indigo-600 hover:to-cyan-600 hover:shadow-blue-500/40'
      }`}
    >
      <span className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:blur-2xl transition opacity-0 group-hover:opacity-50"></span>
      <span className="relative flex items-center gap-1 z-10">
        {loading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} className="group-hover:rotate-12 group-hover:scale-110 transition"/>}
        {label}
      </span>
    </button>
  );

  // Enhanced Input Classes
  const inputClass = "w-full px-4 py-3 sm:py-2.5 bg-white/80 border border-slate-200/80 rounded-xl text-base sm:text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all hover:border-blue-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 ml-0.5";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 sm:pb-28 md:pb-32 font-sans text-slate-900">
      
      {/* 1. STICKY NAVBAR */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-0 sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4">
             <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition shrink-0">
                <ArrowLeft size={20} />
             </Link>
             <div>
                <h1 className="font-bold text-base sm:text-lg text-slate-800 leading-tight">Harvard CV Builder</h1>
                <p className="text-[11px] sm:text-xs text-slate-500">Draft Auto-saved</p>
             </div>
          </div>
          
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto justify-center px-4 sm:px-6 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-70"
          >
            {isGeneratingPdf ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} 
            {isGeneratingPdf ? "Building PDF..." : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto mt-6 sm:mt-10 px-3 sm:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(540px,620px)] xl:gap-8 items-start">
        <div className="space-y-5 sm:space-y-8">
        
        {/* 2. PERSONAL INFO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-blue-200/50 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <SectionHeader title="Personal Details" icon={Briefcase} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div><label className={labelClass}>Full Name</label><input type="text" placeholder="e.g. Dewanda Chen Ahnaf" className={inputClass} value={personalInfo.fullName} onChange={e => setPersonalInfo({...personalInfo, fullName: e.target.value})} /></div>
              <div><label className={labelClass}>Email Address</label><input type="email" placeholder="e.g. dewa@gmail.com" className={inputClass} value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} /></div>
              <div><label className={labelClass}>Phone Number</label><input type="text" placeholder="e.g. +62 812..." className={inputClass} value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} /></div>
              <div><label className={labelClass}>LinkedIn URL</label><input type="text" placeholder="linkedin.com/in/..." className={inputClass} value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} /></div>
            </div>
            
            <div className="relative group">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <label className={labelClass}>Professional Summary</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                  <MagicButton 
                    onClick={() => handlePolish('summary', 'enhance', personalInfo.summary, 'summary-enhance', (val) => setPersonalInfo(p => ({...p, summary: val})))} 
                    loading={loadingAI === 'summary-enhance'} 
                    label="AI Enhance" 
                    variant="enhance"
                  />
                  <MagicButton 
                    onClick={() => handlePolish('summary', 'translate', personalInfo.summary, 'summary-translate', (val) => setPersonalInfo(p => ({...p, summary: val})))} 
                    loading={loadingAI === 'summary-translate'} 
                    label="Enhance to EN" 
                    variant="translate"
                  />
                </div>
              </div>
              <textarea rows={4} className={inputClass} placeholder="Write a short bio about yourself..." value={personalInfo.summary} onChange={e => setPersonalInfo({...personalInfo, summary: e.target.value})} />
              <div className="absolute bottom-3 right-3 text-xs text-slate-400 pointer-events-none group-focus-within:text-blue-500">
                 {personalInfo.summary.length} chars
              </div>
            </div>
          </div>
        </section>

        {/* 3. EDUCATION */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-emerald-200/50 shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <SectionHeader title="Education" icon={GraduationCap} />
              <button onClick={() => addItem(educations, setEducations, { school: '', major: '', gpa: '', startDate: '', endDate: '', isCurrent: false, description: '' })} className="w-full sm:w-auto justify-center px-4 py-2.5 bg-emerald-50/80 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200/60 hover:border-emerald-300 hover:shadow-md">
                <Plus size={16} /> Add School
              </button>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {educations.map((edu) => (
                <div key={edu.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-white/60 rounded-2xl border border-emerald-200/40 relative group hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-sm hover:shadow-md">
                  <button onClick={() => removeItem(edu.id, educations, setEducations)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-4">
                    <div><label className={labelClass}>University / School</label><input type="text" className={inputClass} value={edu.school} onChange={e => updateItem(edu.id, 'school', e.target.value, educations, setEducations)} /></div>
                    <div><label className={labelClass}>Major / Degree</label><input type="text" className={inputClass} value={edu.major} onChange={e => updateItem(edu.id, 'major', e.target.value, educations, setEducations)} /></div>
                    <div className="flex gap-3 sm:gap-4">
                      <div className="flex-1"><label className={labelClass}>Start Year</label><input type="text" className={inputClass} value={edu.startDate} onChange={e => updateItem(edu.id, 'startDate', e.target.value, educations, setEducations)} /></div>
                      <div className="flex-1"><label className={labelClass}>End Year</label><input type="text" className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} disabled={edu.isCurrent} value={edu.endDate} onChange={e => updateItem(edu.id, 'endDate', e.target.value, educations, setEducations)} /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
                      <div className="w-full sm:w-32"><label className={labelClass}>GPA</label><input type="text" className={inputClass} value={edu.gpa} onChange={e => updateItem(edu.id, 'gpa', e.target.value, educations, setEducations)} /></div>
                      <label className="flex items-center gap-2 text-sm text-slate-600 pb-3 cursor-pointer select-none">
                        <input type="checkbox" className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" checked={edu.isCurrent} onChange={e => updateItem(edu.id, 'isCurrent', e.target.checked, educations, setEducations)} /> 
                        Currently Studying
                      </label>
                    </div>
                  </div>
                  <div className="relative mt-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <label className={labelClass}>What You Studied & Achievements</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                        <MagicButton
                          onClick={() => handlePolish('bullet', 'enhance', edu.description, `edu-${edu.id}-enhance`, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                          loading={loadingAI === `edu-${edu.id}-enhance`}
                          label="AI Enhance"
                          variant="enhance"
                        />
                        <MagicButton
                          onClick={() => handlePolish('bullet', 'translate', edu.description, `edu-${edu.id}-translate`, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                          loading={loadingAI === `edu-${edu.id}-translate`}
                          label="Enhance to EN"
                          variant="translate"
                        />
                      </div>
                    </div>
                    <textarea rows={4} className={inputClass} placeholder="- Coursework in..., - Leadership in..., - Relevant projects..." value={edu.description} onChange={e => updateItem(edu.id, 'description', e.target.value, educations, setEducations)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. EXPERIENCE */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-amber-200/50 shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <SectionHeader title="Work Experience" icon={Briefcase} />
              <button onClick={() => addItem(experiences, setExperiences, { role: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' })} className="w-full sm:w-auto justify-center px-4 py-2.5 bg-amber-50/80 text-amber-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-amber-100 transition-all border border-amber-200/60 hover:border-amber-300 hover:shadow-md">
                <Plus size={16} /> Add Job
              </button>
            </div>
            <div className="space-y-4 sm:space-y-8">
              {experiences.map((exp) => (
                <div key={exp.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-white/60 rounded-2xl border border-amber-200/40 relative hover:border-amber-300 hover:bg-amber-50/30 transition-all shadow-sm hover:shadow-md">
                   <button onClick={() => removeItem(exp.id, experiences, setExperiences)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
                    <div><label className={labelClass}>Job Title</label><input type="text" className={inputClass} value={exp.role} onChange={e => updateItem(exp.id, 'role', e.target.value, experiences, setExperiences)} /></div>
                    <div><label className={labelClass}>Company</label><input type="text" className={inputClass} value={exp.company} onChange={e => updateItem(exp.id, 'company', e.target.value, experiences, setExperiences)} /></div>
                    <div className="flex gap-3 sm:gap-4">
                      <div className="flex-1"><label className={labelClass}>Start</label><input type="text" className={inputClass} value={exp.startDate} onChange={e => updateItem(exp.id, 'startDate', e.target.value, experiences, setExperiences)} /></div>
                      <div className="flex-1"><label className={labelClass}>End</label><input type="text" className={`${inputClass} disabled:bg-slate-100`} disabled={exp.isCurrent} value={exp.endDate} onChange={e => updateItem(exp.id, 'endDate', e.target.value, experiences, setExperiences)} /></div>
                    </div>
                     <label className="flex items-center gap-2 text-sm text-slate-600 pt-3 sm:pt-4 cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 rounded text-amber-600" checked={exp.isCurrent} onChange={e => updateItem(exp.id, 'isCurrent', e.target.checked, experiences, setExperiences)} /> Present</label>
                  </div>
                  <div className="relative mt-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <label className={labelClass}>Description (Bullet Points)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                        <MagicButton
                          onClick={() => handlePolish('bullet', 'enhance', exp.description, `exp-${exp.id}-enhance`, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                          loading={loadingAI === `exp-${exp.id}-enhance`}
                          label="AI Enhance"
                          variant="enhance"
                        />
                        <MagicButton
                          onClick={() => handlePolish('bullet', 'translate', exp.description, `exp-${exp.id}-translate`, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                          loading={loadingAI === `exp-${exp.id}-translate`}
                          label="Enhance to EN"
                          variant="translate"
                        />
                      </div>
                    </div>
                    <textarea rows={5} className={inputClass} placeholder="- Achieved X by doing Y..." value={exp.description} onChange={e => updateItem(exp.id, 'description', e.target.value, experiences, setExperiences)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. PROJECTS */}
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-purple-200/50 shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <SectionHeader title="Projects" icon={FolderGit2} />
                <button onClick={() => addItem(projects, setProjects, { name: '', role: '', startDate: '', endDate: '', description: '' })} className="w-full sm:w-auto justify-center px-4 py-2.5 bg-purple-50/80 text-purple-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-100 transition-all border border-purple-200/60 hover:border-purple-300 hover:shadow-md"><Plus size={16} /> Add Project</button>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {projects.map((proj) => (
                 <div key={proj.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-white/60 rounded-2xl border border-purple-200/40 relative hover:border-purple-300 hover:bg-purple-50/30 transition-all shadow-sm hover:shadow-md">
                   <button onClick={() => removeItem(proj.id, projects, setProjects)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
                     <div><label className={labelClass}>Project Name</label><input type="text" className={inputClass} value={proj.name} onChange={e => updateItem(proj.id, 'name', e.target.value, projects, setProjects)} /></div>
                     <div><label className={labelClass}>Your Role</label><input type="text" className={inputClass} value={proj.role} onChange={e => updateItem(proj.id, 'role', e.target.value, projects, setProjects)} /></div>
                       <div><label className={labelClass}>Start Date</label><input type="text" placeholder="e.g. March 2024" className={inputClass} value={proj.startDate} onChange={e => updateItem(proj.id, 'startDate', e.target.value, projects, setProjects)} /></div>
                       <div><label className={labelClass}>End Date</label><input type="text" placeholder="e.g. March 2024" className={inputClass} value={proj.endDate} onChange={e => updateItem(proj.id, 'endDate', e.target.value, projects, setProjects)} /></div>
                   </div>
                   <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <label className={labelClass}>Description</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                        <MagicButton
                          onClick={() => handlePolish('bullet', 'enhance', proj.description, `proj-${proj.id}-enhance`, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                          loading={loadingAI === `proj-${proj.id}-enhance`}
                          label="AI Enhance"
                          variant="enhance"
                        />
                        <MagicButton
                          onClick={() => handlePolish('bullet', 'translate', proj.description, `proj-${proj.id}-translate`, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                          loading={loadingAI === `proj-${proj.id}-translate`}
                          label="Enhance to EN"
                          variant="translate"
                        />
                      </div>
                    </div>
                    <textarea rows={3} className={inputClass} placeholder="Details..." value={proj.description} onChange={e => updateItem(proj.id, 'description', e.target.value, projects, setProjects)} />
                   </div>
                 </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. SKILLS & AWARDS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50/80 via-white to-cyan-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-cyan-200/50 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <SectionHeader title="Skills" icon={Code} />
              <div className="space-y-4 sm:space-y-6">
                <div><label className={labelClass}>Hard Skills</label><textarea rows={3} className={inputClass} placeholder="Python, React, SQL..." value={skills.hard} onChange={e => setSkills({...skills, hard: e.target.value})} /></div>
                <div><label className={labelClass}>Soft Skills</label><textarea rows={3} className={inputClass} placeholder="Leadership, Communication..." value={skills.soft} onChange={e => setSkills({...skills, soft: e.target.value})} /></div>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-rose-200/50 shadow-lg hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6"><SectionHeader title="Awards" icon={Trophy} /><button onClick={() => addItem(achievements, setAchievements, { name: '', year: '' })} className="w-full sm:w-auto justify-center p-2.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition hover:shadow-md hover:border border-rose-200 flex items-center gap-2"><Plus size={16}/> Add Award</button></div>
               <div className="space-y-4 sm:space-y-3">
                 {achievements.map(ach => (
                   <div key={ach.id} className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_96px_auto] gap-3 items-start sm:items-center">
                     <input type="text" placeholder="Award Name" className={inputClass} value={ach.name} onChange={e => updateItem(ach.id, 'name', e.target.value, achievements, setAchievements)} />
                     <div className="flex items-center gap-3 w-full sm:w-auto">
                       <input type="text" placeholder="Year" className={`${inputClass} flex-1 sm:w-24`} value={ach.year} onChange={e => updateItem(ach.id, 'year', e.target.value, achievements, setAchievements)} />
                       <button onClick={() => removeItem(ach.id, achievements, setAchievements)} className="text-slate-400 hover:text-red-500 p-3 sm:p-2 bg-slate-100 sm:bg-transparent rounded-xl shrink-0 transition-colors"><Trash2 size={16}/></button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50/80 via-white to-slate-50/40 p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2rem] border border-slate-200/60 shadow-lg hover:shadow-2xl hover:shadow-slate-500/10 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <SectionHeader title="Custom Sections" icon={FolderGit2} />
              <button
                onClick={() => addItem(customSections, setCustomSections, { title: '', content: '' })}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-slate-100/90 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200/80 hover:border-slate-300 hover:shadow-md"
              >
                <Plus size={16} /> Add Section
              </button>
            </div>

            {customSections.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Belum ada custom section. Contoh: Bahasa, Sertifikasi, Organisasi, atau Volunteer.
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {customSections.map((section) => (
                <div key={section.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-white/70 text-slate-700 rounded-2xl border border-slate-200/70 relative hover:border-slate-300 transition-all shadow-sm hover:shadow-md">
                  <button onClick={() => removeItem(section.id, customSections, setCustomSections)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>

                  <div className="mb-4 pr-10 sm:pr-12">
                    <label className={labelClass}>Section Header</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Contoh: Languages"
                      value={section.title}
                      onChange={(e) => updateItem(section.id, 'title', e.target.value, customSections, setCustomSections)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Content (one item per line)</label>
                    <textarea
                      rows={4}
                      className={inputClass}
                      placeholder={"- English (Professional)\n- Bahasa Indonesia (Native)"}
                      value={section.content}
                      onChange={(e) => updateItem(section.id, 'content', e.target.value, customSections, setCustomSections)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

          <section className="xl:hidden bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-lg">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">Realtime Preview</h2>
              <p className="text-xs text-slate-500 mt-1">Preview akan otomatis update saat kamu mengisi form.</p>
            </div>
            <div className="h-[460px] sm:h-[620px] overflow-y-scroll overscroll-contain rounded-2xl border border-slate-200 bg-slate-100">
              <HarvardCVLivePreview data={fullData} />
            </div>
          </section>
        </div>

        <aside className="hidden xl:block sticky top-28">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-lg">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">Realtime Preview</h2>
              <p className="text-xs text-slate-500 mt-1">Preview akan otomatis update saat kamu mengisi form.</p>
            </div>
            <div className="h-[760px] overflow-y-scroll overscroll-contain rounded-2xl border border-slate-200 bg-slate-100">
              <HarvardCVLivePreview data={fullData} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
