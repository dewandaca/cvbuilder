'use client'

import { useMemo, useState, useEffect, useRef } from 'react';
import { extractCvToBuilderDataApi, polishTextApi } from '@/lib/llamaApiClient';
import { HarvardCV } from '@/components/HarvardCV';
import { pdf } from '@react-pdf/renderer';
import { 
  Plus, Trash2, Loader2, Save, ArrowLeft, 
  Briefcase, GraduationCap, Trophy, Code, FolderGit2, Sparkles, UploadCloud, ArrowUp, ArrowDown, Eye, X
} from 'lucide-react';
import Link from 'next/link';

// --- Type Definitions ---
type Education = { id: number; school: string; major: string; gpa: string; startDate: string; endDate: string; isCurrent: boolean; description: string; };
type Experience = { id: number; role: string; company: string; startDate: string; endDate: string; isCurrent: boolean; description: string; };
type Project = { id: number; name: string; role: string; startDate: string; endDate: string; description: string; };
type Achievement = { id: number; name: string; year: string; };
type CustomSectionMode = 'simple' | 'experience';
type CustomSectionItem = {
  id: number;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};
type CustomSection = {
  id: number;
  title: string;
  content: string;
  mode?: CustomSectionMode;
  items?: CustomSectionItem[];
};
type BaseSectionKey = 'summary' | 'education' | 'experience' | 'projects' | 'skills' | 'achievements';
type SectionOrderToken = BaseSectionKey | `custom:${number}`;
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
  sectionOrder?: string[];
};

const DEFAULT_SECTION_ORDER: BaseSectionKey[] = [
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'achievements',
];

const SECTION_ORDER_LABELS: Record<BaseSectionKey, string> = {
  summary: 'Summary',
  education: 'Education',
  experience: 'Work Experience',
  projects: 'Projects',
  skills: 'Skills',
  achievements: 'Honors & Awards',
};

const BASE_SECTION_LOOKUP = new Set<BaseSectionKey>(DEFAULT_SECTION_ORDER);
const CUSTOM_SECTION_TOKEN_PREFIX = 'custom:';
const LEGACY_CUSTOM_SECTION_TOKEN = 'custom';

function isBaseSectionKey(token: string): token is BaseSectionKey {
  return BASE_SECTION_LOOKUP.has(token as BaseSectionKey);
}

function getCustomSectionToken(id: number): `custom:${number}` {
  return `custom:${id}`;
}

function getCustomSectionIdFromToken(token: string): number | null {
  if (!token.startsWith(CUSTOM_SECTION_TOKEN_PREFIX)) return null;

  const rawId = token.slice(CUSTOM_SECTION_TOKEN_PREFIX.length);
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function resolveSectionOrder(sectionOrder: string[] | undefined, customSections: CustomSection[]): SectionOrderToken[] {
  const customTokens = customSections.map((section) => getCustomSectionToken(section.id));
  const validCustomTokenSet = new Set<string>(customTokens);
  const seen = new Set<string>();
  const resolved: string[] = [];

  const appendToken = (token: string) => {
    if (seen.has(token)) return;
    seen.add(token);
    resolved.push(token);
  };

  for (const rawToken of sectionOrder || []) {
    if (isBaseSectionKey(rawToken)) {
      appendToken(rawToken);
      continue;
    }

    if (rawToken === LEGACY_CUSTOM_SECTION_TOKEN) {
      for (const customToken of customTokens) {
        appendToken(customToken);
      }
      continue;
    }

    if (validCustomTokenSet.has(rawToken)) {
      appendToken(rawToken);
    }
  }

  for (const baseSection of DEFAULT_SECTION_ORDER) {
    appendToken(baseSection);
  }

  for (const customToken of customTokens) {
    appendToken(customToken);
  }

  return resolved as SectionOrderToken[];
}

function getSectionOrderLabel(token: SectionOrderToken, customSections: CustomSection[]): string {
  if (isBaseSectionKey(token)) {
    return SECTION_ORDER_LABELS[token];
  }

  const customId = getCustomSectionIdFromToken(token);
  if (!customId) return 'Custom Section';

  const section = customSections.find((item) => item.id === customId);
  const title = section?.title.trim();
  return title ? `Custom: ${title}` : `Custom Section #${customId}`;
}

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

const createEmptyCustomSectionItem = (id: number): CustomSectionItem => ({
  id,
  title: '',
  subtitle: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
});

const normalizeCustomSectionItems = (items?: CustomSectionItem[]): CustomSectionItem[] => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const fallback = createEmptyCustomSectionItem(index + 1);
    const id = typeof item?.id === 'number' && item.id > 0 ? item.id : index + 1;

    return {
      ...fallback,
      ...item,
      id,
      title: typeof item?.title === 'string' ? item.title : '',
      subtitle: typeof item?.subtitle === 'string' ? item.subtitle : '',
      startDate: typeof item?.startDate === 'string' ? item.startDate : '',
      endDate: typeof item?.endDate === 'string' ? item.endDate : '',
      description: typeof item?.description === 'string' ? item.description : '',
      isCurrent: item?.isCurrent === true,
    };
  });
};

const normalizeCustomSections = (sections?: CustomSection[]): CustomSection[] => {
  if (!Array.isArray(sections)) return [];

  return sections.map((section, index) => {
    const id = typeof section?.id === 'number' && section.id > 0 ? section.id : index + 1;

    return {
      id,
      title: typeof section?.title === 'string' ? section.title : '',
      content: typeof section?.content === 'string' ? section.content : '',
      mode: section?.mode === 'experience' ? 'experience' : 'simple',
      items: normalizeCustomSectionItems(section?.items),
    };
  });
};

const hasCustomSectionExperienceContent = (section: CustomSection): boolean =>
  normalizeCustomSectionItems(section.items).some((item) =>
    item.title.trim() ||
    item.subtitle.trim() ||
    item.startDate.trim() ||
    item.endDate.trim() ||
    item.description.trim(),
  );

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

  const orderedSections = resolveSectionOrder(data.sectionOrder, data.customSections);
  const customSectionsWithContent = data.customSections
    .filter((section) => {
      const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
      if (mode === 'experience') {
        return section.title.trim() || hasCustomSectionExperienceContent(section);
      }

      return section.title.trim() || section.content.trim();
    });
  const customSectionsById = new Map(customSectionsWithContent.map((section) => [section.id, section]));

  const sectionContent: Record<BaseSectionKey, React.ReactNode> = {
    summary: data.personalInfo.summary.trim()
      ? (
        <section key="summary">
          <PreviewSectionTitle>Summary</PreviewSectionTitle>
          <p className="text-[10.5px] leading-[1.45] text-justify">{data.personalInfo.summary}</p>
        </section>
      )
      : null,
    education: data.educations.length > 0
      ? (
        <section key="education">
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
      )
      : null,
    experience: data.experiences.length > 0
      ? (
        <section key="experience">
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
      )
      : null,
    projects: data.projects.length > 0
      ? (
        <section key="projects">
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
      )
      : null,
    skills: (data.skills.hard.trim() || data.skills.soft.trim())
      ? (
        <section key="skills">
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
      )
      : null,
    achievements: data.achievements.length > 0 && data.achievements[0].name !== ''
      ? (
        <section key="achievements">
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
      )
      : null,
  };

  const renderCustomSection = (section: CustomSection): React.ReactNode => {
    const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
    const entries = normalizeCustomSectionItems(section.items).filter((item) =>
      item.title.trim() ||
      item.subtitle.trim() ||
      item.startDate.trim() ||
      item.endDate.trim() ||
      item.description.trim(),
    );
    const bullets = parseBulletItemsPreview(section.content);

    return (
      <section key={`custom-${section.id}`}>
        <PreviewSectionTitle>{section.title || 'Custom Section'}</PreviewSectionTitle>
        {mode === 'experience' && entries.length > 0
          ? entries.map((entry) => {
            const dateRange = formatDateRangePreview(entry.startDate, entry.endDate, entry.isCurrent);
            const entryHeading = [entry.title.trim(), entry.subtitle.trim()].filter(Boolean).join(', ');
            const entryBullets = parseBulletItemsPreview(entry.description);

            return (
              <div key={`custom-entry-${section.id}-${entry.id}`} className="mb-2 text-[10.5px] leading-[1.4]">
                <div className="flex items-end justify-between gap-4">
                  <p className="font-bold">{entryHeading || 'Entry'}</p>
                  <p>{dateRange}</p>
                </div>
                {entryBullets.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                    {entryBullets.map((item, index) => (
                      <li key={`custom-entry-bullet-${section.id}-${entry.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
          : bullets.length > 0 && (
            <ul className="ml-4 list-disc space-y-0.5 text-[10.5px] leading-[1.4]">
              {bullets.map((item, index) => (
                <li key={`${section.id}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
      </section>
    );
  };

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

        {orderedSections.map((sectionKey) => {
          if (isBaseSectionKey(sectionKey)) {
            return sectionContent[sectionKey];
          }

          const customId = getCustomSectionIdFromToken(sectionKey);
          if (!customId) return null;

          const customSection = customSectionsById.get(customId);
          return customSection ? renderCustomSection(customSection) : null;
        })}
      </div>
    </div>
  );
};

// Generic type-safe helper for items with id
type ItemWithId = { id: number; [key: string]: unknown };

const createEmptyPersonalInfo = () => ({ fullName: '', email: '', phone: '', linkedin: '', summary: '' });
const createEmptyEducation = (id: number): Education => ({ id, school: '', major: '', gpa: '', startDate: '', endDate: '', isCurrent: false, description: '' });
const createEmptyExperience = (id: number): Experience => ({ id, role: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' });
const createEmptyProject = (id: number): Project => ({ id, name: '', role: '', startDate: '', endDate: '', description: '' });
const createEmptyAchievement = (id: number): Achievement => ({ id, name: '', year: '' });
const createEmptyCustomSection = (): Omit<CustomSection, 'id'> => ({
  title: '',
  content: '',
  mode: 'simple',
  items: [],
});

export default function CvBuilder() {
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [builderMode, setBuilderMode] = useState<'new' | 'edit'>('new');
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [existingCvFile, setExistingCvFile] = useState<File | null>(null);
  const [isImportingCv, setIsImportingCv] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  
  // --- STATE ---
  const [personalInfo, setPersonalInfo] = useState(createEmptyPersonalInfo());
  const [educations, setEducations] = useState<Education[]>([createEmptyEducation(1)]);
  const [experiences, setExperiences] = useState<Experience[]>([createEmptyExperience(1)]);
  const [projects, setProjects] = useState<Project[]>([createEmptyProject(1)]);
  const [achievements, setAchievements] = useState<Achievement[]>([createEmptyAchievement(1)]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [skills, setSkills] = useState({ hard: '', soft: '' });
  const [sectionOrder, setSectionOrder] = useState<SectionOrderToken[]>(() => [...DEFAULT_SECTION_ORDER]);

  const orderedSectionOrder = useMemo(
    () => resolveSectionOrder(sectionOrder, customSections),
    [sectionOrder, customSections],
  );

  const fullData = useMemo(
    () => ({
      personalInfo,
      educations,
      experiences,
      projects,
      achievements,
      customSections,
      skills,
      sectionOrder: orderedSectionOrder,
    }),
    [personalInfo, educations, experiences, projects, achievements, customSections, skills, orderedSectionOrder]
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

  const updateCustomSection = <K extends keyof CustomSection>(
    sectionId: number,
    key: K,
    value: CustomSection[K],
  ) => {
    setCustomSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, [key]: value } : section)),
    );
  };

  const setCustomSectionMode = (sectionId: number, mode: CustomSectionMode) => {
    setCustomSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        if (mode === 'experience') {
          const items = normalizeCustomSectionItems(section.items);
          return {
            ...section,
            mode,
            items: items.length > 0 ? items : [createEmptyCustomSectionItem(1)],
          };
        }

        return {
          ...section,
          mode,
          items: normalizeCustomSectionItems(section.items),
        };
      }),
    );
  };

  const addCustomSectionItem = (sectionId: number) => {
    setCustomSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        const items = normalizeCustomSectionItems(section.items);
        const newId = items.length > 0 ? items[items.length - 1].id + 1 : 1;

        return {
          ...section,
          mode: 'experience',
          items: [...items, createEmptyCustomSectionItem(newId)],
        };
      }),
    );
  };

  const updateCustomSectionItem = <K extends keyof CustomSectionItem>(
    sectionId: number,
    itemId: number,
    key: K,
    value: CustomSectionItem[K],
  ) => {
    setCustomSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          items: normalizeCustomSectionItems(section.items).map((item) =>
            item.id === itemId ? { ...item, [key]: value } : item,
          ),
        };
      }),
    );
  };

  const removeCustomSectionItem = (sectionId: number, itemId: number) => {
    setCustomSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          items: normalizeCustomSectionItems(section.items).filter((item) => item.id !== itemId),
        };
      }),
    );
  };

  const moveSection = (section: SectionOrderToken, direction: -1 | 1) => {
    setSectionOrder((current) => {
      const normalized = resolveSectionOrder(current, customSections);
      const fromIndex = normalized.indexOf(section);
      const targetIndex = fromIndex + direction;

      if (fromIndex < 0 || targetIndex < 0 || targetIndex >= normalized.length) {
        return normalized;
      }

      const next = [...normalized];
      [next[fromIndex], next[targetIndex]] = [next[targetIndex], next[fromIndex]];
      return next;
    });
  };

  const resetToNewCv = () => {
    setPersonalInfo(createEmptyPersonalInfo());
    setEducations([createEmptyEducation(1)]);
    setExperiences([createEmptyExperience(1)]);
    setProjects([createEmptyProject(1)]);
    setAchievements([createEmptyAchievement(1)]);
    setCustomSections([]);
    setSkills({ hard: '', soft: '' });
    setSectionOrder([...DEFAULT_SECTION_ORDER]);
    setExistingCvFile(null);
    setImportNotice('');
  };

  const handleImportExistingCv = async () => {
    if (!existingCvFile) {
      alert('Pilih file CV PDF dulu.');
      return;
    }

    setIsImportingCv(true);
    setImportNotice('');

    try {
      const formData = new FormData();
      formData.append('file', existingCvFile);
      const parsed = await extractCvToBuilderDataApi<CVData>(formData);

      if (!parsed) {
        alert('Gagal mendeteksi isi CV. Pastikan PDF berisi teks yang bisa dibaca.');
        return;
      }

      setPersonalInfo(parsed.personalInfo || createEmptyPersonalInfo());
      setEducations(parsed.educations.length > 0 ? parsed.educations : [createEmptyEducation(1)]);
      setExperiences(parsed.experiences.length > 0 ? parsed.experiences : [createEmptyExperience(1)]);
      setProjects(parsed.projects.length > 0 ? parsed.projects : [createEmptyProject(1)]);
      setAchievements(parsed.achievements.length > 0 ? parsed.achievements : [createEmptyAchievement(1)]);
      setCustomSections(normalizeCustomSections(parsed.customSections));
      setSkills(parsed.skills || { hard: '', soft: '' });
      setImportNotice('CV berhasil dideteksi. Semua field sudah diisi otomatis, tinggal kamu review/edit seperti flow buat CV baru.');
    } catch (error) {
      console.error(error);
      alert('Terjadi error saat membaca CV. Coba lagi.');
    } finally {
      setIsImportingCv(false);
    }
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
      const result = await polishTextApi(text, type, mode);
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

  useEffect(() => {
    if (!isMobilePreviewOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobilePreviewOpen]);

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

        <section className="relative overflow-hidden bg-white p-4 sm:p-7 rounded-2xl border border-slate-200 shadow-lg">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Mulai Dari Mana?</h2>
            <p className="text-sm text-slate-500 mt-1">Pilih buat CV baru dari nol, atau upload CV lama agar form Harvard terisi otomatis.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setBuilderMode('new');
                resetToNewCv();
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                builderMode === 'new'
                  ? 'border-blue-500 bg-blue-50/80 shadow-md shadow-blue-500/10'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              <p className="text-sm font-bold text-slate-800">Buat CV Baru</p>
              <p className="text-xs text-slate-500 mt-1">Mulai dari form kosong seperti sistem saat ini.</p>
            </button>

            <button
              onClick={() => {
                setBuilderMode('edit');
                setImportNotice('');
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                builderMode === 'edit'
                  ? 'border-blue-500 bg-blue-50/80 shadow-md shadow-blue-500/10'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              <p className="text-sm font-bold text-slate-800">Edit CV Existing</p>
              <p className="text-xs text-slate-500 mt-1">Upload PDF lalu sistem isi form otomatis, setelah itu tinggal kamu edit.</p>
            </button>
          </div>

          {builderMode === 'edit' && (
            <div className="mt-5 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-4 sm:p-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Upload CV PDF</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <label className="flex-1 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50/40 transition">
                  <div className="flex items-center gap-2">
                    <UploadCloud size={16} />
                    <span>{existingCvFile ? existingCvFile.name : 'Pilih file CV (.pdf)'}</span>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setExistingCvFile(e.target.files?.[0] || null)}
                  />
                </label>

                <button
                  onClick={handleImportExistingCv}
                  disabled={isImportingCv || !existingCvFile}
                  className="sm:w-auto w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isImportingCv ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isImportingCv ? 'Deteksi Isi CV...' : 'Deteksi & Isi Form'}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-3">Setelah terisi otomatis, kamu lanjut edit di form yang sama seperti mode buat CV baru.</p>
            </div>
          )}

          {importNotice && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {importNotice}
            </div>
          )}
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 p-4 sm:p-8 rounded-2xl border border-indigo-200/50 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-indigo-200/80">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">CV Section Order</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Pakai tombol panah untuk ubah urutan section di preview dan hasil PDF.</p>
            </div>

            <div className="space-y-2">
              {orderedSectionOrder.map((section, index) => {
                const atTop = index === 0;
                const atBottom = index === orderedSectionOrder.length - 1;
                const sectionLabel = getSectionOrderLabel(section, customSections);

                return (
                  <div
                    key={section}
                    className="flex items-center justify-between rounded-xl border border-indigo-200/60 bg-white/80 px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-700">{sectionLabel}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveSection(section, -1)}
                        disabled={atTop}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Move ${sectionLabel} up`}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(section, 1)}
                        disabled={atBottom}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Move ${sectionLabel} down`}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        
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
                onClick={() => addItem(customSections, setCustomSections, createEmptyCustomSection())}
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

                  {(() => {
                    const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
                    const sectionItems = normalizeCustomSectionItems(section.items);

                    return (
                      <>
                        <div className="mb-4 pr-10 sm:pr-12">
                          <label className={labelClass}>Section Header</label>
                          <input
                            type="text"
                            className={inputClass}
                            placeholder="Contoh: Languages"
                            value={section.title}
                            onChange={(e) => updateCustomSection(section.id, 'title', e.target.value)}
                          />
                        </div>

                        <div className="mb-4">
                          <label className={labelClass}>Format</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomSectionMode(section.id, 'simple')}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                mode === 'simple'
                                  ? 'border-slate-700 bg-slate-700 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              Simple List
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomSectionMode(section.id, 'experience')}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                mode === 'experience'
                                  ? 'border-slate-700 bg-slate-700 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              Experience Style
                            </button>
                          </div>
                        </div>

                        {mode === 'experience' ? (
                          <div className="space-y-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => addCustomSectionItem(section.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                              >
                                <Plus size={14} /> Add Entry
                              </button>
                            </div>

                            {sectionItems.length === 0 && (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                Belum ada entry. Klik Add Entry untuk menambahkan format seperti work experience.
                              </div>
                            )}

                            {sectionItems.map((item) => (
                              <div key={`section-${section.id}-item-${item.id}`} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                                <div className="mb-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => removeCustomSectionItem(section.id, item.id)}
                                    className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-4">
                                  <div>
                                    <label className={labelClass}>Title / Role</label>
                                    <input
                                      type="text"
                                      className={inputClass}
                                      placeholder="Contoh: Volunteer Lead"
                                      value={item.title}
                                      onChange={(e) => updateCustomSectionItem(section.id, item.id, 'title', e.target.value)}
                                    />
                                  </div>

                                  <div>
                                    <label className={labelClass}>Organization / Subtitle</label>
                                    <input
                                      type="text"
                                      className={inputClass}
                                      placeholder="Contoh: AIESEC"
                                      value={item.subtitle}
                                      onChange={(e) => updateCustomSectionItem(section.id, item.id, 'subtitle', e.target.value)}
                                    />
                                  </div>

                                  <div className="flex gap-3 sm:gap-4">
                                    <div className="flex-1">
                                      <label className={labelClass}>Start</label>
                                      <input
                                        type="text"
                                        className={inputClass}
                                        value={item.startDate}
                                        onChange={(e) => updateCustomSectionItem(section.id, item.id, 'startDate', e.target.value)}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className={labelClass}>End</label>
                                      <input
                                        type="text"
                                        className={`${inputClass} disabled:bg-slate-100`}
                                        disabled={item.isCurrent}
                                        value={item.endDate}
                                        onChange={(e) => updateCustomSectionItem(section.id, item.id, 'endDate', e.target.value)}
                                      />
                                    </div>
                                  </div>

                                  <label className="flex items-center gap-2 text-sm text-slate-600 pt-3 sm:pt-4 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded text-slate-700"
                                      checked={item.isCurrent}
                                      onChange={(e) => updateCustomSectionItem(section.id, item.id, 'isCurrent', e.target.checked)}
                                    />
                                    Present
                                  </label>
                                </div>

                                <div>
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                                    <label className={labelClass}>Description (Bullet Points)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                                      <MagicButton
                                        onClick={() => handlePolish(
                                          'bullet',
                                          'enhance',
                                          item.description,
                                          `custom-${section.id}-entry-${item.id}-enhance`,
                                          (val) => updateCustomSectionItem(section.id, item.id, 'description', val),
                                        )}
                                        loading={loadingAI === `custom-${section.id}-entry-${item.id}-enhance`}
                                        label="AI Enhance"
                                        variant="enhance"
                                      />
                                      <MagicButton
                                        onClick={() => handlePolish(
                                          'bullet',
                                          'translate',
                                          item.description,
                                          `custom-${section.id}-entry-${item.id}-translate`,
                                          (val) => updateCustomSectionItem(section.id, item.id, 'description', val),
                                        )}
                                        loading={loadingAI === `custom-${section.id}-entry-${item.id}-translate`}
                                        label="Enhance to EN"
                                        variant="translate"
                                      />
                                    </div>
                                  </div>
                                  <textarea
                                    rows={3}
                                    className={inputClass}
                                    placeholder="- Jelaskan kontribusi dan impact"
                                    value={item.description}
                                    onChange={(e) => updateCustomSectionItem(section.id, item.id, 'description', e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <label className={labelClass}>Content (one item per line)</label>
                            <textarea
                              rows={4}
                              className={inputClass}
                              placeholder={"- English (Professional)\n- Bahasa Indonesia (Native)"}
                              value={section.content}
                              onChange={(e) => updateCustomSection(section.id, 'content', e.target.value)}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
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

      <button
        type="button"
        onClick={() => setIsMobilePreviewOpen(true)}
        className="xl:hidden fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95"
      >
        <Eye size={16} /> Realtime Preview
      </button>

      {isMobilePreviewOpen && (
        <div className="xl:hidden fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm p-3 sm:p-5">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-slate-800">Realtime Preview</h2>
                <p className="text-xs text-slate-500">Scroll preview CV di sini tanpa harus turun ke bawah form.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-2">
              <HarvardCVLivePreview data={fullData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
