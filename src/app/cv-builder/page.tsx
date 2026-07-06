'use client'

import { useMemo, useState, useEffect, useRef } from 'react';
import { polishTextApi } from '@/lib/llamaApiClient';
import { HarvardCV } from '@/components/HarvardCV';
import { ModernCV } from '@/components/ModernCV';
import { pdf } from '@react-pdf/renderer';
import { 
  Plus, Trash2, Loader2, Save, ArrowLeft, ArrowRight,
  Briefcase, GraduationCap, Trophy, Code, FolderGit2, Sparkles, ArrowUp, ArrowDown, Eye, X, Upload, FileText, CheckCircle2, AlertCircle, ImageIcon, Camera
} from 'lucide-react';
import { parseCvApi } from '@/lib/llamaApiClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    address: string;
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
  sectionTitles?: Record<string, string>;
  profilePhoto?: string; // base64 data URL
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

function getSectionOrderLabel(
  token: SectionOrderToken,
  customSections: CustomSection[],
  sectionTitles?: Record<string, string>
): string {
  if (isBaseSectionKey(token)) {
    return sectionTitles?.[token] || SECTION_ORDER_LABELS[token];
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

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

  // Separately track the natural (unscaled) height of the content
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContentHeight(el.scrollHeight);
    });
    ro.observe(el);
    setContentHeight(el.scrollHeight);
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
          <PreviewSectionTitle>{data.sectionTitles?.summary || 'Summary'}</PreviewSectionTitle>
          <p className="text-[10.5px] leading-[1.45] text-justify">{data.personalInfo.summary}</p>
        </section>
      )
      : null,
    education: data.educations.length > 0
      ? (
        <section key="education">
          <PreviewSectionTitle>{data.sectionTitles?.education || 'Education'}</PreviewSectionTitle>
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
          <PreviewSectionTitle>{data.sectionTitles?.experience || 'Work Experience'}</PreviewSectionTitle>
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
          <PreviewSectionTitle>{data.sectionTitles?.projects || 'Projects'}</PreviewSectionTitle>
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
          <PreviewSectionTitle>{data.sectionTitles?.skills || 'Skills'}</PreviewSectionTitle>
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
          <PreviewSectionTitle>{data.sectionTitles?.achievements || 'Honors & Awards'}</PreviewSectionTitle>
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
    <div ref={containerRef} className="bg-transparent p-2 w-full flex justify-center">
      {/* Wrapper div that tells the scroll container the true scaled height and centers the page */}
      <div style={{ width: 794 * scale, height: contentHeight > 0 ? contentHeight * scale : 'auto', position: 'relative' }}>
        <div
          ref={contentRef}
          className="bg-white p-6 sm:p-8 text-black shadow-sm"
          style={{
            fontFamily: 'Times New Roman, Times, serif',
            fontSize: 10.5,
            lineHeight: 1.4,
            width: 794,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
        <div className="mb-4 text-center">
          <h1 className="mb-2 text-[20px] font-bold uppercase tracking-wide">
            {data.personalInfo.fullName || 'YOUR NAME'}
          </h1>
          <p className="text-[10px]">
            {[
              data.personalInfo.address,
              data.personalInfo.email,
              data.personalInfo.phone,
              displayLinkedin,
            ].filter(Boolean).join(' | ')}
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
    </div>
  );
};

// --- MODERN CV LIVE PREVIEW ---
const ModernCVLivePreview = ({ data }: { data: CVData & { profilePhoto?: string } }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const available = el.offsetWidth - 16;
      setScale(Math.min(1, available / 794));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight));
    ro.observe(el);
    setContentHeight(el.scrollHeight);
    return () => ro.disconnect();
  }, []);

  const displayLinkedin = data.personalInfo.linkedin
    ? data.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : '';

  const orderedSections = resolveSectionOrder(data.sectionOrder, data.customSections);
  const customSectionsWithContent = data.customSections.filter((section) => {
    const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
    if (mode === 'experience') return section.title.trim() || hasCustomSectionExperienceContent(section);
    return section.title.trim() || section.content.trim();
  });
  const customSectionsById = new Map(customSectionsWithContent.map((section) => [section.id, section]));

  const NAVY = '#1a3c6e';

  const ModernSectionTitle = ({ children }: { children: string }) => (
    <h3 style={{ color: NAVY, borderBottom: `1.5px solid ${NAVY}`, paddingBottom: 2, marginTop: 10, marginBottom: 4, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </h3>
  );

  const sectionContent: Record<BaseSectionKey, React.ReactNode> = {
    summary: data.personalInfo.summary.trim()
      ? (
        <section key="summary">
          <ModernSectionTitle>{data.sectionTitles?.summary || 'Summary'}</ModernSectionTitle>
          <p style={{ textAlign: 'justify', lineHeight: 1.5, fontSize: 10.5 }}>{data.personalInfo.summary}</p>
        </section>
      ) : null,
    education: data.educations.length > 0
      ? (
        <section key="education">
          <ModernSectionTitle>{data.sectionTitles?.education || 'Education'}</ModernSectionTitle>
          {data.educations.map((edu) => {
            const bullets = parseBulletItemsPreview(edu.description);
            const dateRange = formatDateRangePreview(edu.startDate, edu.endDate, edu.isCurrent);
            return (
              <div key={edu.id} className="mb-2 text-[10.5px] leading-[1.4]">
                <div className="flex items-end justify-between gap-4">
                  <p className="font-bold">{edu.school}</p>
                  <p className="shrink-0">{dateRange}</p>
                </div>
                {(edu.major || edu.gpa) && (
                  <p className="italic">{edu.major}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</p>
                )}
                {bullets.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                    {bullets.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ) : null,
    experience: data.experiences.length > 0
      ? (
        <section key="experience">
          <ModernSectionTitle>{data.sectionTitles?.experience || 'Experience'}</ModernSectionTitle>
          {data.experiences.map((exp) => {
            const bullets = parseBulletItemsPreview(exp.description);
            const dateRange = formatDateRangePreview(exp.startDate, exp.endDate, exp.isCurrent);
            return (
              <div key={exp.id} className="mb-2 text-[10.5px] leading-[1.4]">
                <div className="flex items-end justify-between gap-4">
                  <p className="font-bold">{exp.role} - {exp.company}</p>
                  <p className="shrink-0">{dateRange}</p>
                </div>
                {bullets.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                    {bullets.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ) : null,
    projects: data.projects.length > 0
      ? (
        <section key="projects">
          <ModernSectionTitle>{data.sectionTitles?.projects || 'Projects'}</ModernSectionTitle>
          {data.projects.map((proj) => {
            const bullets = parseBulletItemsPreview(proj.description);
            const dateRange = formatDateRangePreview(proj.startDate, proj.endDate);
            return (
              <div key={proj.id} className="mb-2 text-[10.5px] leading-[1.4]">
                <div className="flex items-end justify-between gap-4">
                  <p className="font-bold">{proj.name} | {proj.role}</p>
                  <p className="shrink-0">{dateRange}</p>
                </div>
                {bullets.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-justify">
                    {bullets.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ) : null,
    skills: (data.skills.hard.trim() || data.skills.soft.trim())
      ? (
        <section key="skills">
          <ModernSectionTitle>{data.sectionTitles?.skills || 'Skills'}</ModernSectionTitle>
          {data.skills.hard.trim() && (
            <p className="mb-1 text-[10.5px]">• <span className="font-bold">Hard Skills: </span>{data.skills.hard}</p>
          )}
          {data.skills.soft.trim() && (
            <p className="text-[10.5px]">• <span className="font-bold">Soft Skills: </span>{data.skills.soft}</p>
          )}
        </section>
      ) : null,
    achievements: data.achievements.length > 0 && data.achievements[0].name !== ''
      ? (
        <section key="achievements">
          <ModernSectionTitle>{data.sectionTitles?.achievements || 'Honors & Awards'}</ModernSectionTitle>
          <ul className="ml-4 list-disc space-y-0.5 text-[10.5px] leading-[1.4]">
            {data.achievements.map((ach) => (
              <li key={ach.id}>{ach.name}{ach.year ? ` (${ach.year})` : ''}</li>
            ))}
          </ul>
        </section>
      ) : null,
  };

  const renderCustomSection = (section: CustomSection): React.ReactNode => {
    const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
    const entries = normalizeCustomSectionItems(section.items).filter((item) =>
      item.title.trim() || item.subtitle.trim() || item.startDate.trim() || item.endDate.trim() || item.description.trim(),
    );
    const bullets = parseBulletItemsPreview(section.content);
    return (
      <section key={`custom-${section.id}`}>
        <ModernSectionTitle>{section.title || 'Custom Section'}</ModernSectionTitle>
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
                    {entryBullets.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            );
          })
          : bullets.length > 0 && (
            <ul className="ml-4 list-disc space-y-0.5 text-[10.5px] leading-[1.4]">
              {bullets.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}
      </section>
    );
  };

  const contactFields = [
    data.personalInfo.address ? { label: 'Address:', value: data.personalInfo.address } : null,
    data.personalInfo.phone ? { label: 'Phone:', value: data.personalInfo.phone } : null,
    data.personalInfo.email ? { label: 'Email:', value: data.personalInfo.email } : null,
    displayLinkedin ? { label: 'LinkedIn:', value: displayLinkedin } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div ref={containerRef} className="bg-transparent p-2 w-full flex justify-center">
      <div style={{ width: 794 * scale, height: contentHeight > 0 ? contentHeight * scale : 'auto', position: 'relative' }}>
        <div
          ref={contentRef}
          className="bg-white text-black shadow-sm"
          style={{
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 10.5,
            lineHeight: 1.4,
            width: 794,
            padding: 30,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* HEADER: Photo + Name/Contact */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
            {/* Photo */}
            <div style={{ width: 75, height: 90, marginRight: 16, flexShrink: 0, background: '#d0d8e8', overflow: 'hidden' }}>
              {data.profilePhoto && (
                <img src={data.profilePhoto} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            {/* Name + Contact */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 'bold', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>
                {data.personalInfo.fullName || 'YOUR NAME'}
              </h1>
              {contactFields.map((field, i) => (
                <div key={i} style={{ display: 'flex', marginBottom: 3, fontSize: 10 }}>
                  <span style={{ fontWeight: 'bold', width: 52, flexShrink: 0 }}>{field.label}</span>
                  <span style={{ flex: 1 }}>{field.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          {orderedSections.map((sectionKey) => {
            if (isBaseSectionKey(sectionKey)) return sectionContent[sectionKey];
            const customId = getCustomSectionIdFromToken(sectionKey);
            if (!customId) return null;
            const customSection = customSectionsById.get(customId);
            return customSection ? renderCustomSection(customSection) : null;
          })}
        </div>
      </div>
    </div>
  );
};

// Generic type-safe helper for items with id
type ItemWithId = { id: number; [key: string]: unknown };

const createEmptyPersonalInfo = () => ({ fullName: '', address: '', email: '', phone: '', linkedin: '', summary: '' });
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

/**
 * ensureAllLinesHaveBullets: Formats a multi-line string so that any line
 * with content starts with '• '.
 */
const ensureAllLinesHaveBullets = (text: string): string => {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed === '') return line;
    if (line.startsWith('• ')) return line;
    if (/^(•|-|\*)\s*/.test(line)) {
      return line.replace(/^(•|-|\*)\s*/, '• ');
    }
    return '• ' + line;
  }).join('\n');
};

/**
 * handleBulletChange: Formats manual typing to ensure it conforms to the bullet list style.
 */
const handleBulletChange = (
  e: React.ChangeEvent<HTMLTextAreaElement>,
  setter: (val: string) => void
) => {
  const formatted = ensureAllLinesHaveBullets(e.target.value);
  setter(formatted);
};

/**
 * handleBulletFocus: Pre-fills an empty bullet textarea with '• ' upon focus.
 */
const handleBulletFocus = (
  e: React.FocusEvent<HTMLTextAreaElement>,
  value: string,
  setter: (val: string) => void
) => {
  if (!value || value.trim() === '') {
    setter('• ');
    const ta = e.currentTarget;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = 2;
    });
  }
};

/**
 * handleBulletBlur: Removes solitary bullets when user clicks away from an empty input.
 */
const handleBulletBlur = (
  e: React.FocusEvent<HTMLTextAreaElement>,
  value: string,
  setter: (val: string) => void
) => {
  if (value === '• ' || value === '•') {
    setter('');
  }
};

/**
 * handleBulletKeyDown: Intercepts Enter in bullet-style textareas and inserts
 * a newline + bullet prefix so lines don't look crammed together.
 * The raw value (including '• ') is stored in state, but parseBulletItemsPreview
 * already strips those characters before rendering the live preview and PDF.
 */
const handleBulletKeyDown = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  setter: (val: string) => void
) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const ta = e.currentTarget;
  const start = ta.selectionStart ?? value.length;
  const end = ta.selectionEnd ?? value.length;
  const insert = '\n• ';
  const newValue = value.slice(0, start) + insert + value.slice(end);
  setter(newValue);
  // Restore cursor position after React re-renders
  requestAnimationFrame(() => {
    ta.selectionStart = ta.selectionEnd = start + insert.length;
  });
};

export default function CvBuilder() {
  const router = useRouter();
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false); // kept for type safety, no longer used

  // --- Import CV State ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsingCv, setIsParsingCv] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- STATE ---
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'harvard' | 'modern' | 'creative'>('harvard');
  const [hasSelectedTemplate, setHasSelectedTemplate] = useState<boolean>(false);

  const [personalInfo, setPersonalInfo] = useState(createEmptyPersonalInfo());
  const [educations, setEducations] = useState<Education[]>([createEmptyEducation(1)]);
  const [experiences, setExperiences] = useState<Experience[]>([createEmptyExperience(1)]);
  const [projects, setProjects] = useState<Project[]>([createEmptyProject(1)]);
  const [achievements, setAchievements] = useState<Achievement[]>([createEmptyAchievement(1)]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [skills, setSkills] = useState({ hard: '', soft: '' });
  const [sectionOrder, setSectionOrder] = useState<SectionOrderToken[]>(() => [...DEFAULT_SECTION_ORDER]);
  const [activeSection, setActiveSection] = useState<SectionOrderToken>('summary');
  const [sectionTitles, setSectionTitles] = useState<Record<BaseSectionKey, string>>({
    summary: 'Summary',
    education: 'Education',
    experience: 'Work Experience',
    projects: 'Projects',
    skills: 'Skills',
    achievements: 'Honors & Awards',
  });

  useEffect(() => {
    const saved = localStorage.getItem('cv-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPersonalInfo(data.personalInfo || createEmptyPersonalInfo());
        setEducations(data.educations || [createEmptyEducation(1)]);
        setExperiences(data.experiences || [createEmptyExperience(1)]);
        setProjects(data.projects || [createEmptyProject(1)]);
        setAchievements(data.achievements || [createEmptyAchievement(1)]);
        setCustomSections(data.customSections || []);
        setSkills(data.skills || { hard: '', soft: '' });
        setSectionOrder(data.sectionOrder || [...DEFAULT_SECTION_ORDER]);
        setSectionTitles(data.sectionTitles || {});
        if (data.selectedTemplate) {
          setSelectedTemplate(data.selectedTemplate);
        }
        if (data.profilePhoto) {
          setProfilePhoto(data.profilePhoto);
        }
        if (data.hasSelectedTemplate !== undefined) {
          setHasSelectedTemplate(data.hasSelectedTemplate);
        } else if (saved) {
          // If we have saved data from before this feature, they have selected a template
          setHasSelectedTemplate(true);
        }
      } catch {
        // ignore corrupted data
      }
    }
    setIsHydrated(true);
  }, []);


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
      sectionTitles,
      selectedTemplate,
      hasSelectedTemplate,
      profilePhoto: profilePhoto || undefined,
    }),
    [personalInfo, educations, experiences, projects, achievements, customSections, skills, orderedSectionOrder, sectionTitles, selectedTemplate, hasSelectedTemplate, profilePhoto]
  );

  // Auto-save to localStorage whenever data changes (only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('cv-data', JSON.stringify(fullData));
  }, [fullData, isHydrated]);

  const hasAnyData = () => {
    const hasPersonal = Object.values(personalInfo).some(val => val.trim() !== '');
    const hasEducations = educations.length > 1 || (educations[0] && (educations[0].school || educations[0].major || educations[0].description));
    const hasExperiences = experiences.length > 1 || (experiences[0] && (experiences[0].role || experiences[0].company || experiences[0].description));
    const hasProjects = projects.length > 1 || (projects[0] && (projects[0].name || projects[0].role || projects[0].description));
    const hasAchievements = achievements.length > 1 || (achievements[0] && (achievements[0].name || achievements[0].year));
    const hasCustom = customSections.length > 0;
    const hasSkills = skills.hard.trim() !== '' || skills.soft.trim() !== '';

    return hasPersonal || hasEducations || hasExperiences || hasProjects || hasAchievements || hasCustom || hasSkills;
  };

  // Browser leave/tab close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyData()) {
        e.preventDefault();
        e.returnValue = ''; // triggers standard browser prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [personalInfo, educations, experiences, projects, achievements, customSections, skills]);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Data is auto-saved to localStorage — navigate directly without any prompt
    router.push('/');
  };

  const handleConfirmExit = () => {
    // Clear localStorage to start fresh
    localStorage.removeItem('cv-data');
    
    // Reset React state
    setPersonalInfo(createEmptyPersonalInfo());
    setEducations([createEmptyEducation(1)]);
    setExperiences([createEmptyExperience(1)]);
    setProjects([createEmptyProject(1)]);
    setAchievements([createEmptyAchievement(1)]);
    setCustomSections([]);
    setSkills({ hard: '', soft: '' });
    setSectionOrder([...DEFAULT_SECTION_ORDER]);
    setActiveSection('summary');
    setSectionTitles({
      summary: 'Summary',
      education: 'Education',
      experience: 'Work Experience',
      projects: 'Projects',
      skills: 'Skills',
      achievements: 'Honors & Awards',
    });
    setSelectedTemplate('harvard');
    setHasSelectedTemplate(false);
    setProfilePhoto(null);
    
    setIsExitModalOpen(false);
    router.push('/');
  };

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

  const addCustomSection = () => {
    const newId = customSections.length > 0 ? Math.max(...customSections.map((s) => s.id)) + 1 : 1;
    const newSection: CustomSection = {
      id: newId,
      title: '',
      content: '',
      mode: 'simple',
      items: [],
    };
    setCustomSections([...customSections, newSection]);
    setSectionOrder((current) => [...current, `custom:${newId}`]);
    setActiveSection(`custom:${newId}`);
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
    setActiveSection('summary');
    setSectionTitles({
      summary: 'Summary',
      education: 'Education',
      experience: 'Work Experience',
      projects: 'Projects',
      skills: 'Skills',
      achievements: 'Honors & Awards',
    });
    setProfilePhoto(null);
  };


  // --- AI LOGIC ---
  const handlePolish = async (
    type: 'summary' | 'bullet',
    mode: 'id' | 'en',
    text: string,
    idStr: string,
    setterCallback?: (val: string) => void
  ) => {
    if (!text) return alert("Isi teks dulu sebelum minta bantuan AI!");
    setLoadingAI(idStr);
    try {
      const result = await polishTextApi(text, type, mode);
      if (setterCallback) {
        const finalValue = type === 'bullet' ? ensureAllLinesHaveBullets(result) : result;
        setterCallback(finalValue);
      }
    } catch { alert("AI Error."); } finally { setLoadingAI(null); }
  };

  // --- PDF GENERATION ---
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const cvComponent = selectedTemplate === 'modern'
        ? <ModernCV data={fullData} />
        : <HarvardCV data={fullData} />;
      const templateName = selectedTemplate === 'modern' ? 'Modern' : 'Harvard';
      const blob = await pdf(cvComponent).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${personalInfo.fullName || 'User'}_${templateName}.pdf`;
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

  // --- PHOTO UPLOAD ---
  const handlePhotoUpload = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      alert('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setProfilePhoto(result);
    };
    reader.readAsDataURL(file);
  };

  // --- IMPORT CV ---
  const handleFileSelect = (file: File) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    if (!allowed.includes(file.type)) {
      setImportError('Format tidak didukung. Gunakan PDF atau DOCX/DOC.');
      return;
    }
    setSelectedFile(file);
    setImportError(null);
    setImportSuccess(false);
  };

  const handleImportCv = async () => {
    if (!selectedFile) return;
    setIsParsingCv(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      type ParsedCustomSectionItem = {
        title?: string;
        subtitle?: string;
        startDate?: string;
        endDate?: string;
        isCurrent?: boolean;
        description?: string;
      };
      type ParsedCustomSection = {
        title?: string;
        mode?: 'simple' | 'experience';
        content?: string;
        items?: ParsedCustomSectionItem[];
      };
      type ParsedCVData = {
        personalInfo?: { fullName?: string; address?: string; email?: string; phone?: string; linkedin?: string; summary?: string; };
        educations?: Array<{ school?: string; major?: string; gpa?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string; }>;
        experiences?: Array<{ role?: string; company?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string; }>;
        projects?: Array<{ name?: string; role?: string; startDate?: string; endDate?: string; description?: string; }>;
        achievements?: Array<{ name?: string; year?: string; }>;
        skills?: { hard?: string; soft?: string; };
        customSections?: ParsedCustomSection[];
        sectionOrder?: string[];
      };

      const data = await parseCvApi<ParsedCVData>(formData);

      // Fill personal info
      if (data.personalInfo) {
        setPersonalInfo({
          fullName: data.personalInfo.fullName || '',
          address: data.personalInfo.address || '',
          email: data.personalInfo.email || '',
          phone: data.personalInfo.phone || '',
          linkedin: data.personalInfo.linkedin || '',
          summary: data.personalInfo.summary || '',
        });
      }

      // Fill educations
      if (data.educations && data.educations.length > 0) {
        setEducations(data.educations.map((edu, i) => ({
          id: i + 1,
          school: edu.school || '',
          major: edu.major || '',
          gpa: edu.gpa || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          isCurrent: edu.isCurrent || false,
          description: edu.description || '',
        })));
      }

      // Fill experiences
      if (data.experiences && data.experiences.length > 0) {
        setExperiences(data.experiences.map((exp, i) => ({
          id: i + 1,
          role: exp.role || '',
          company: exp.company || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          isCurrent: exp.isCurrent || false,
          description: exp.description || '',
        })));
      }

      // Fill projects
      if (data.projects && data.projects.length > 0) {
        setProjects(data.projects.map((proj, i) => ({
          id: i + 1,
          name: proj.name || '',
          role: proj.role || '',
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          description: proj.description || '',
        })));
      }

      // Fill achievements
      if (data.achievements && data.achievements.length > 0) {
        setAchievements(data.achievements.map((ach, i) => ({
          id: i + 1,
          name: ach.name || '',
          year: ach.year || '',
        })));
      }

      // Fill skills
      if (data.skills) {
        setSkills({
          hard: data.skills.hard || '',
          soft: data.skills.soft || '',
        });
      }

      // Fill custom sections from AI (non-standard sections)
      // Build a title-to-id map so we can link sectionOrder tokens to actual custom section IDs
      const importedCustomSections: CustomSection[] = [];
      const titleToCustomId = new Map<string, number>();

      if (data.customSections && data.customSections.length > 0) {
        data.customSections.forEach((cs, i) => {
          const id = i + 1;
          const sectionTitle = cs.title || '';
          const mode: CustomSectionMode = cs.mode === 'experience' ? 'experience' : 'simple';
          const items: CustomSectionItem[] = (cs.items || []).map((item, j) => ({
            id: j + 1,
            title: item.title || '',
            subtitle: item.subtitle || '',
            startDate: item.startDate || '',
            endDate: item.endDate || '',
            isCurrent: item.isCurrent || false,
            description: item.description || '',
          }));

          importedCustomSections.push({
            id,
            title: sectionTitle,
            content: cs.content || '',
            mode,
            items,
          });

          // Map both the exact title and the "custom:<title>" token format to the id
          titleToCustomId.set(sectionTitle, id);
          titleToCustomId.set(`custom:${sectionTitle}`, id);
        });
        setCustomSections(importedCustomSections);
      } else {
        setCustomSections([]);
      }

      // Rebuild sectionOrder from AI-provided order (respecting the CV's original layout)
      if (data.sectionOrder && data.sectionOrder.length > 0) {
        const resolvedOrder: SectionOrderToken[] = [];
        const seen = new Set<string>();

        const appendToken = (token: SectionOrderToken) => {
          if (seen.has(token)) return;
          seen.add(token);
          resolvedOrder.push(token);
        };

        for (const rawToken of data.sectionOrder) {
          if (isBaseSectionKey(rawToken)) {
            appendToken(rawToken);
          } else if (rawToken.startsWith('custom:')) {
            // The AI returns "custom:<title>", we need to find the matching id
            const matchedId = titleToCustomId.get(rawToken);
            if (matchedId !== undefined) {
              appendToken(`custom:${matchedId}` as `custom:${number}`);
            }
          }
        }

        // Append any base sections not mentioned by AI
        for (const baseSection of DEFAULT_SECTION_ORDER) {
          appendToken(baseSection);
        }

        // Append any custom sections not referenced in sectionOrder
        for (const cs of importedCustomSections) {
          appendToken(`custom:${cs.id}` as `custom:${number}`);
        }

        setSectionOrder(resolvedOrder);
      } else {
        // No sectionOrder from AI: reset to default + append custom sections
        const fallbackOrder: SectionOrderToken[] = [...DEFAULT_SECTION_ORDER];
        for (const cs of importedCustomSections) {
          fallbackOrder.push(`custom:${cs.id}` as `custom:${number}`);
        }
        setSectionOrder(fallbackOrder);
      }

      setImportSuccess(true);
      setActiveSection('summary');

      // Auto-close modal after 1.5s
      setTimeout(() => {
        setIsImportModalOpen(false);
        setSelectedFile(null);
        setImportSuccess(false);
      }, 1500);

    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsParsingCv(false);
    }
  };


  // --- UI COMPONENTS ---
  const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-slate-100">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm">
        <Icon size={20} className="sm:hidden" />
        <Icon size={24} className="hidden sm:block" />
      </div>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h2>
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
          ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 hover:shadow-purple-500/20'
          : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 hover:from-blue-600 hover:via-indigo-600 hover:to-cyan-600 hover:shadow-blue-500/20'
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
  const inputClass = "w-full px-4 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all hover:border-slate-300 focus:bg-white shadow-sm";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-0.5";

  useEffect(() => {
    if (!isMobilePreviewOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobilePreviewOpen]);

  if (!hasSelectedTemplate) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-white relative overflow-hidden">
        {/* Glow gradients */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-800/10 rounded-full blur-[110px] pointer-events-none" />

        {/* Header */}
        <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <button onClick={handleBackClick} className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition cursor-pointer">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <span className="font-heading text-sm font-bold tracking-tight text-white">Kembali ke Home</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-extrabold tracking-tight text-indigo-400">NextCV</span>
          </div>
        </header>

        {/* Content */}
        <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col justify-center">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-4">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Langkah Pertama</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
              Pilih Gaya Template CV Anda
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Pilih gaya template untuk memulai. Semua data yang Anda masukkan dapat ditransfer ke template lain nantinya saat tersedia.
            </p>
          </div>

          {/* Grid of Templates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* Card 1: Harvard Style */}
            <div 
              onClick={() => {
                setSelectedTemplate('harvard');
                setHasSelectedTemplate(true);
              }}
              className="group relative cursor-pointer bg-white/2 hover:bg-white/4 border border-indigo-500/30 hover:border-indigo-500 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold text-sm">
                    01
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                    ATS-Friendly
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-white text-lg mb-2">Harvard Style</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Template satu kolom klasik berbasis Times New Roman. Sangat ramah penyaringan sistem ATS dan disukai oleh banyak rekruter.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                <span>Gunakan Template Ini</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Modern With Photo */}
            <div 
              onClick={() => {
                setSelectedTemplate('modern');
                setHasSelectedTemplate(true);
              }}
              className="group relative cursor-pointer bg-white/2 hover:bg-white/4 border border-sky-500/30 hover:border-sky-500 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center font-bold text-sm">
                    02
                  </div>
                  <span className="text-[10px] font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 uppercase tracking-wider">
                    Dengan Foto
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-white text-lg mb-2">Modern + Foto</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Layout modern dengan header dua kolom — foto profil di kiri, nama &amp; kontak di kanan. Judul seksi berwarna biru elegan. Cocok untuk melamar di perusahaan kreatif.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-sky-400 group-hover:text-sky-300 transition-colors">
                <span>Gunakan Template Ini</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Creative Style (Coming Soon) */}
            <div className="relative bg-white/1 border border-white/5 rounded-2xl p-6 flex flex-col justify-between opacity-60">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 text-slate-400 rounded-xl flex items-center justify-center font-bold text-sm">
                    03
                  </div>
                  <span className="text-[10px] font-bold bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-slate-400 text-lg mb-2">Visual Creative</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Desain dua kolom dengan sidebar kontak kiri, grafik level skill visual, dan ruang untuk portofolio singkat. Direkomendasikan untuk Desainer dan Developer.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Belum Tersedia</span>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-28 md:pb-32 font-sans text-slate-800 overflow-x-hidden selection:bg-blue-500/10 selection:text-blue-900">
      
      {/* 1. STICKY NAVBAR */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
             <button onClick={handleBackClick} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition shrink-0 border border-slate-200/60 cursor-pointer">
                <ArrowLeft size={20} />
             </button>
             <div>
                <h1 className="font-heading font-extrabold text-base sm:text-lg text-slate-800 leading-tight">{selectedTemplate === 'modern' ? 'Modern CV Builder' : 'Harvard CV Builder'}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] sm:text-xs text-slate-400">Draft Auto-saved</p>
                  <span className="text-slate-300 text-xs">•</span>
                  <button
                    onClick={() => setHasSelectedTemplate(false)}
                    className="text-[11px] sm:text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline transition cursor-pointer"
                  >
                    Ubah Template
                  </button>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-70"
            >
              {isGeneratingPdf ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} 
              {isGeneratingPdf ? "Membuat PDF..." : "Export PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto mt-6 sm:mt-10 px-4 sm:px-6 space-y-6">
        
        {/* Import CV Banner */}
        <div className="bg-gradient-to-r from-violet-50 via-purple-50/30 to-violet-50 p-5 rounded-2xl border border-violet-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center shrink-0">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Sudah punya CV sebelumnya?</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Upload di sini untuk mendeteksi data CV lama dan mengisi form secara otomatis.</p>
            </div>
          </div>
          <button
            onClick={() => { setIsImportModalOpen(true); setImportError(null); setImportSuccess(false); setSelectedFile(null); }}
            className="w-full md:w-auto px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-500/10 active:scale-95 shrink-0 cursor-pointer"
          >
            <Upload size={14} />
            Import CV
          </button>
        </div>

        {/* 2-Column Sidebar + Tab Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          
          {/* Left Column: CV Section Order Tabs */}
          <section className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-md lg:sticky lg:top-24">
            <div className="mb-4">
              <h2 className="text-lg font-heading font-extrabold text-slate-800">CV Section Order</h2>
              <p className="text-xs text-slate-500 mt-1">Klik bagian untuk mengedit. Pakai panah untuk ubah urutan PDF.</p>
            </div>

            <div className="space-y-2">
              {orderedSectionOrder.map((section, index) => {
                const atTop = index === 0;
                const atBottom = index === orderedSectionOrder.length - 1;
                const sectionLabel = getSectionOrderLabel(section, customSections, sectionTitles);
                const isActive = activeSection === section;

                return (
                  <div
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50/80 shadow-md shadow-blue-500/5'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>{sectionLabel}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(section, -1);
                        }}
                        disabled={atTop}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-20"
                        aria-label={`Move ${sectionLabel} up`}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(section, 1);
                        }}
                        disabled={atBottom}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-20"
                        aria-label={`Move ${sectionLabel} down`}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addCustomSection}
                className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-blue-50/80 border border-dashed border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300"
              >
                <Plus size={14} /> Tambah Custom Section
              </button>
            </div>
          </section>

          {/* Right Column: Active Form Editor */}
          <div className="space-y-6">
            
            {/* 2. PERSONAL INFO & SUMMARY */}
            {activeSection === 'summary' && (
              <section className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                <SectionHeader title="Personal Details & Summary" icon={Briefcase} />

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className={labelClass}>Section Title / Header</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sectionTitles.summary}
                    onChange={e => setSectionTitles({...sectionTitles, summary: e.target.value})}
                    placeholder="Summary"
                  />
                </div>

                {/* Photo Upload — only for Modern template */}
                {selectedTemplate === 'modern' && (
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <label className={labelClass}>Foto Profil</label>
                    <div className="flex items-center gap-4">
                      {/* Preview circle */}
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="relative w-24 h-28 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-sky-400 bg-slate-50 hover:bg-sky-50 flex items-center justify-center cursor-pointer transition-all group shrink-0"
                      >
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Foto profil" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-sky-500 transition">
                            <Camera size={24} />
                            <span className="text-[10px] font-bold text-center leading-tight">Upload<br/>Foto</span>
                          </div>
                        )}
                        {profilePhoto && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Camera size={20} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700 mb-1">Foto Profil CV</p>
                        <p className="text-xs text-slate-500 mb-3">Foto akan muncul di pojok kiri header CV. Format JPG, PNG, atau WEBP. Maks 5MB.</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg text-xs font-bold hover:bg-sky-100 transition"
                          >
                            <ImageIcon size={13} /> {profilePhoto ? 'Ganti Foto' : 'Pilih Foto'}
                          </button>
                          {profilePhoto && (
                            <button
                              type="button"
                              onClick={() => setProfilePhoto(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                            >
                              <X size={13} /> Hapus Foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div><label className={labelClass}>Full Name</label><input type="text" placeholder="e.g. Dewanda Chen Ahnaf" className={inputClass} value={personalInfo.fullName} onChange={e => setPersonalInfo({...personalInfo, fullName: e.target.value})} /></div>
                  <div><label className={labelClass}>Address</label><input type="text" placeholder="e.g. Jakarta, Indonesia" className={inputClass} value={personalInfo.address} onChange={e => setPersonalInfo({...personalInfo, address: e.target.value})} /></div>
                  <div><label className={labelClass}>Email Address</label><input type="email" placeholder="e.g. dewa@gmail.com" className={inputClass} value={personalInfo.email} onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})} /></div>
                  <div><label className={labelClass}>Phone Number</label><input type="text" placeholder="e.g. +62 812..." className={inputClass} value={personalInfo.phone} onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>LinkedIn URL</label><input type="text" placeholder="linkedin.com/in/..." className={inputClass} value={personalInfo.linkedin} onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})} /></div>
                </div>
                
                <div className="relative group">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <label className={labelClass}>Professional Summary</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                      <MagicButton 
                        onClick={() => handlePolish('summary', 'id', personalInfo.summary, 'summary-id', (val) => setPersonalInfo(p => ({...p, summary: val})))} 
                        loading={loadingAI === 'summary-id'} 
                        label="Polish ID" 
                        variant="enhance"
                      />
                      <MagicButton 
                        onClick={() => handlePolish('summary', 'en', personalInfo.summary, 'summary-en', (val) => setPersonalInfo(p => ({...p, summary: val})))} 
                        loading={loadingAI === 'summary-en'} 
                        label="Polish EN" 
                        variant="translate"
                      />
                    </div>
                  </div>
                  <textarea rows={4} className={inputClass} placeholder="Tulis deskripsi singkat mengenai latar belakang profesional kamu..." value={personalInfo.summary} onChange={e => setPersonalInfo({...personalInfo, summary: e.target.value})} />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400 pointer-events-none">
                     {personalInfo.summary.length} karakter
                  </div>
                </div>
              </section>
            )}

            {/* 3. EDUCATION */}
            {activeSection === 'education' && (
              <section className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <SectionHeader title="Education" icon={GraduationCap} />
                  <button 
                    onClick={() => addItem(educations, setEducations, { school: '', major: '', gpa: '', startDate: '', endDate: '', isCurrent: false, description: '' })} 
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-50/80 border border-blue-200/60 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-all"
                  >
                    <Plus size={15} /> Add School
                  </button>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className={labelClass}>Section Title / Header</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sectionTitles.education}
                    onChange={e => setSectionTitles({...sectionTitles, education: e.target.value})}
                    placeholder="Education"
                  />
                </div>

                <div className="space-y-5">
                  {educations.map((edu) => (
                    <div key={edu.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-slate-50/50 rounded-xl border border-slate-200/60 relative hover:border-blue-300 transition-all shadow-sm">
                      <button onClick={() => removeItem(edu.id, educations, setEducations)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div><label className={labelClass}>University / School</label><input type="text" className={inputClass} value={edu.school} onChange={e => updateItem(edu.id, 'school', e.target.value, educations, setEducations)} /></div>
                        <div><label className={labelClass}>Major / Degree</label><input type="text" className={inputClass} value={edu.major} onChange={e => updateItem(edu.id, 'major', e.target.value, educations, setEducations)} /></div>
                        <div className="flex gap-3">
                          <div className="flex-1"><label className={labelClass}>Start Year</label><input type="text" className={inputClass} value={edu.startDate} onChange={e => updateItem(edu.id, 'startDate', e.target.value, educations, setEducations)} /></div>
                          <div className="flex-1"><label className={labelClass}>End Year</label><input type="text" className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} disabled={edu.isCurrent} value={edu.endDate} onChange={e => updateItem(edu.id, 'endDate', e.target.value, educations, setEducations)} /></div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                          <div className="w-full sm:w-32"><label className={labelClass}>GPA</label><input type="text" className={inputClass} value={edu.gpa} onChange={e => updateItem(edu.id, 'gpa', e.target.value, educations, setEducations)} /></div>
                          <label className="flex items-center gap-2 text-xs text-slate-600 pb-3 cursor-pointer select-none">
                            <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300" checked={edu.isCurrent} onChange={e => updateItem(edu.id, 'isCurrent', e.target.checked, educations, setEducations)} /> 
                            Currently Studying
                          </label>
                        </div>
                      </div>
                      <div className="relative mt-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                          <label className={labelClass}>What You Studied & Achievements</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                            <MagicButton
                              onClick={() => handlePolish('bullet', 'id', edu.description, `edu-${edu.id}-id`, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                              loading={loadingAI === `edu-${edu.id}-id`}
                              label="Polish ID"
                              variant="enhance"
                            />
                            <MagicButton
                              onClick={() => handlePolish('bullet', 'en', edu.description, `edu-${edu.id}-en`, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                              loading={loadingAI === `edu-${edu.id}-en`}
                              label="Polish EN"
                              variant="translate"
                            />
                          </div>
                        </div>
                        <textarea
                          rows={4}
                          className={inputClass}
                          placeholder="- Indeks Prestasi..., - Proyek akhir tentang..., - Organisasi kampus..."
                          value={edu.description}
                          onChange={e => handleBulletChange(e, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                          onKeyDown={e => handleBulletKeyDown(e, edu.description, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                          onFocus={e => handleBulletFocus(e, edu.description, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                          onBlur={e => handleBulletBlur(e, edu.description, (val) => updateItem(edu.id, 'description', val, educations, setEducations))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. EXPERIENCE */}
            {activeSection === 'experience' && (
              <section className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <SectionHeader title="Work Experience" icon={Briefcase} />
                  <button 
                    onClick={() => addItem(experiences, setExperiences, { role: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' })} 
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-50/80 border border-blue-200/60 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-all"
                  >
                    <Plus size={15} /> Add Job
                  </button>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className={labelClass}>Section Title / Header</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sectionTitles.experience}
                    onChange={e => setSectionTitles({...sectionTitles, experience: e.target.value})}
                    placeholder="Work Experience"
                  />
                </div>

                <div className="space-y-6">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-slate-50/50 rounded-xl border border-slate-200/60 relative hover:border-blue-300 transition-all shadow-sm">
                       <button onClick={() => removeItem(exp.id, experiences, setExperiences)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-55/10 rounded-lg transition"><Trash2 size={16}/></button>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div><label className={labelClass}>Job Title</label><input type="text" className={inputClass} value={exp.role} onChange={e => updateItem(exp.id, 'role', e.target.value, experiences, setExperiences)} /></div>
                        <div><label className={labelClass}>Company</label><input type="text" className={inputClass} value={exp.company} onChange={e => updateItem(exp.id, 'company', e.target.value, experiences, setExperiences)} /></div>
                        <div className="flex gap-3">
                          <div className="flex-1"><label className={labelClass}>Start</label><input type="text" className={inputClass} value={exp.startDate} onChange={e => updateItem(exp.id, 'startDate', e.target.value, experiences, setExperiences)} /></div>
                          <div className="flex-1"><label className={labelClass}>End</label><input type="text" className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} disabled={exp.isCurrent} value={exp.endDate} onChange={e => updateItem(exp.id, 'endDate', e.target.value, experiences, setExperiences)} /></div>
                        </div>
                         <label className="flex items-center gap-2 text-xs text-slate-600 pt-3 cursor-pointer select-none">
                           <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300" checked={exp.isCurrent} onChange={e => updateItem(exp.id, 'isCurrent', e.target.checked, experiences, setExperiences)} /> 
                           Present
                         </label>
                      </div>
                      <div className="relative mt-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                          <label className={labelClass}>Description (Bullet Points)</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                            <MagicButton
                              onClick={() => handlePolish('bullet', 'id', exp.description, `exp-${exp.id}-id`, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                              loading={loadingAI === `exp-${exp.id}-id`}
                              label="Polish ID"
                              variant="enhance"
                            />
                            <MagicButton
                              onClick={() => handlePolish('bullet', 'en', exp.description, `exp-${exp.id}-en`, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                              loading={loadingAI === `exp-${exp.id}-en`}
                              label="Polish EN"
                              variant="translate"
                            />
                          </div>
                        </div>
                        <textarea
                          rows={5}
                          className={inputClass}
                          placeholder="- Merancang strategi pemasaran..., - Berhasil meningkatkan 20%..."
                          value={exp.description}
                          onChange={e => handleBulletChange(e, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                          onKeyDown={e => handleBulletKeyDown(e, exp.description, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                          onFocus={e => handleBulletFocus(e, exp.description, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                          onBlur={e => handleBulletBlur(e, exp.description, (val) => updateItem(exp.id, 'description', val, experiences, setExperiences))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. PROJECTS */}
            {activeSection === 'projects' && (
              <section className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <SectionHeader title="Projects" icon={FolderGit2} />
                  <button 
                    onClick={() => addItem(projects, setProjects, { name: '', role: '', startDate: '', endDate: '', description: '' })} 
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-50/80 border border-blue-200/60 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-all"
                  >
                    <Plus size={15} /> Add Project
                  </button>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className={labelClass}>Section Title / Header</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sectionTitles.projects}
                    onChange={e => setSectionTitles({...sectionTitles, projects: e.target.value})}
                    placeholder="Projects"
                  />
                </div>

                <div className="space-y-5">
                  {projects.map((proj) => (
                     <div key={proj.id} className="p-4 pt-12 sm:pt-6 sm:p-6 bg-slate-50/50 rounded-xl border border-slate-200/60 relative hover:border-blue-300 transition-all shadow-sm">
                       <button onClick={() => removeItem(proj.id, projects, setProjects)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-500 hover:text-red-500 p-2 hover:bg-red-50/10 rounded-lg"><Trash2 size={16}/></button>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                              onClick={() => handlePolish('bullet', 'id', proj.description, `proj-${proj.id}-id`, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                              loading={loadingAI === `proj-${proj.id}-id`}
                              label="Polish ID"
                              variant="enhance"
                            />
                            <MagicButton
                              onClick={() => handlePolish('bullet', 'en', proj.description, `proj-${proj.id}-en`, (val) => updateItem(proj.id, 'description', ensureAllLinesHaveBullets(val), projects, setProjects))}
                              loading={loadingAI === `proj-${proj.id}-en`}
                              label="Polish EN"
                              variant="translate"
                            />
                          </div>
                        </div>
                        <textarea 
                          rows={3} 
                          className={inputClass} 
                          placeholder="Jelaskan detail proyek, teknologi, dan hasil akhir..." 
                          value={proj.description} 
                          onChange={e => handleBulletChange(e, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                          onKeyDown={e => handleBulletKeyDown(e, proj.description, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                          onFocus={e => handleBulletFocus(e, proj.description, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                          onBlur={e => handleBulletBlur(e, proj.description, (val) => updateItem(proj.id, 'description', val, projects, setProjects))}
                        />
                       </div>
                     </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. SKILLS */}
            {activeSection === 'skills' && (
              <section className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                <SectionHeader title="Skills" icon={Code} />

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className={labelClass}>Section Title / Header</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sectionTitles.skills}
                    onChange={e => setSectionTitles({...sectionTitles, skills: e.target.value})}
                    placeholder="Skills"
                  />
                </div>

                <div className="space-y-5">
                  <div>
                    <label className={labelClass}>Hard Skills</label>
                    <textarea rows={3} className={inputClass} placeholder="Python, React, SQL, Figma..." value={skills.hard} onChange={e => setSkills({...skills, hard: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Soft Skills</label>
                    <textarea rows={3} className={inputClass} placeholder="Leadership, Communication, Teamwork..." value={skills.soft} onChange={e => setSkills({...skills, soft: e.target.value})} />
                  </div>
                </div>
              </section>
            )}

            {/* 7. HONORS & AWARDS */}
            {activeSection === 'achievements' && (
              <section className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <SectionHeader title="Honors & Awards" icon={Trophy} />
                  <button 
                    onClick={() => addItem(achievements, setAchievements, { name: '', year: '' })} 
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-50/80 border border-blue-200/60 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-all"
                  >
                    <Plus size={15} /> Add Award
                  </button>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className={labelClass}>Section Title / Header</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sectionTitles.achievements}
                    onChange={e => setSectionTitles({...sectionTitles, achievements: e.target.value})}
                    placeholder="Honors & Awards"
                  />
                </div>

                <div className="space-y-3">
                  {achievements.map((ach) => (
                    <div key={ach.id} className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_96px_auto] gap-3 items-start sm:items-center">
                      <input type="text" placeholder="Award Name" className={inputClass} value={ach.name} onChange={e => updateItem(ach.id, 'name', e.target.value, achievements, setAchievements)} />
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input type="text" placeholder="Year" className={`${inputClass} flex-1 sm:w-24`} value={ach.year} onChange={e => updateItem(ach.id, 'year', e.target.value, achievements, setAchievements)} />
                        <button onClick={() => removeItem(ach.id, achievements, setAchievements)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-55/10 rounded-xl transition-colors shrink-0"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 8. CUSTOM SECTIONS */}
            {customSections.map((section) => {
              const token = getCustomSectionToken(section.id);
              if (activeSection !== token) return null;

              const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
              const sectionItems = normalizeCustomSectionItems(section.items);

              return (
                <section key={section.id} className="relative overflow-hidden bg-white p-5 sm:p-8 md:p-10 rounded-2xl border border-slate-200 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <SectionHeader title={section.title || 'Custom Section'} icon={FolderGit2} />
                    <button 
                      onClick={() => {
                        removeItem(section.id, customSections, setCustomSections);
                        setActiveSection('summary');
                      }} 
                      className="w-full sm:w-auto justify-center px-4 py-2 bg-red-50 border border-red-200/60 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={14}/> Delete Section
                    </button>
                  </div>

                  <div className="mb-4 pr-1">
                    <label className={labelClass}>Section Header</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Contoh: Languages atau Organisasi"
                      value={section.title}
                      onChange={(e) => updateCustomSection(section.id, 'title', e.target.value)}
                    />
                  </div>

                  <div className="mb-6">
                    <label className={labelClass}>Format Tampilan</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomSectionMode(section.id, 'simple')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          mode === 'simple'
                            ? 'border-blue-500 bg-blue-600 text-white'
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
                            ? 'border-blue-500 bg-blue-600 text-white'
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
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200/60 bg-blue-50/80 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                        >
                          <Plus size={14} /> Add Entry
                        </button>
                      </div>

                      {sectionItems.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/20 px-4 py-3 text-xs text-slate-500">
                          Belum ada entry. Klik Add Entry untuk menambahkan data list berformat tanggal dan subjudul.
                        </div>
                      )}

                      {sectionItems.map((item) => (
                        <div key={`section-${section.id}-item-${item.id}`} className="rounded-xl border border-slate-200 bg-slate-50/20 p-4 relative hover:border-blue-500/20 transition-all">
                          <button
                            type="button"
                            onClick={() => removeCustomSectionItem(section.id, item.id)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50/10 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pr-6 sm:pr-0">
                            <div>
                              <label className={labelClass}>Title / Role</label>
                              <input
                                type="text"
                                className={inputClass}
                                placeholder="Contoh: Volunteer Coordinator"
                                value={item.title}
                                onChange={(e) => updateCustomSectionItem(section.id, item.id, 'title', e.target.value)}
                              />
                            </div>

                            <div>
                              <label className={labelClass}>Organization / Subtitle</label>
                              <input
                                type="text"
                                className={inputClass}
                                placeholder="Contoh: Yayasan Kita Bisa"
                                value={item.subtitle}
                                onChange={(e) => updateCustomSectionItem(section.id, item.id, 'subtitle', e.target.value)}
                              />
                            </div>

                            <div className="flex gap-3">
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

                            <label className="flex items-center gap-2 text-xs text-slate-500 pt-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300"
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
                                    'id',
                                    item.description,
                                    `custom-${section.id}-entry-${item.id}-id`,
                                    (val) => updateCustomSectionItem(section.id, item.id, 'description', val),
                                  )}
                                  loading={loadingAI === `custom-${section.id}-entry-${item.id}-id`}
                                  label="Polish ID"
                                  variant="enhance"
                                />
                                <MagicButton
                                  onClick={() => handlePolish(
                                    'bullet',
                                    'en',
                                    item.description,
                                    `custom-${section.id}-entry-${item.id}-en`,
                                    (val) => updateCustomSectionItem(section.id, item.id, 'description', val),
                                  )}
                                  loading={loadingAI === `custom-${section.id}-entry-${item.id}-en`}
                                  label="Polish EN"
                                  variant="translate"
                                />
                              </div>
                            </div>
                            <textarea
                              rows={3}
                              className={inputClass}
                              placeholder="- Menangani koordinasi relawan..."
                              value={item.description}
                              onChange={(e) => handleBulletChange(e, (val) => updateCustomSectionItem(section.id, item.id, 'description', val))}
                              onKeyDown={(e) => handleBulletKeyDown(e, item.description, (val) => updateCustomSectionItem(section.id, item.id, 'description', val))}
                              onFocus={(e) => handleBulletFocus(e, item.description, (val) => updateCustomSectionItem(section.id, item.id, 'description', val))}
                              onBlur={(e) => handleBulletBlur(e, item.description, (val) => updateCustomSectionItem(section.id, item.id, 'description', val))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className={labelClass}>Content (satu baris per entri)</label>
                      <textarea
                        rows={4}
                        className={inputClass}
                        placeholder={"- English (Fluent)\n- French (Basic)"}
                        value={section.content}
                        onChange={(e) => handleBulletChange(e, (val) => updateCustomSection(section.id, 'content', val))}
                        onKeyDown={(e) => handleBulletKeyDown(e, section.content, (val) => updateCustomSection(section.id, 'content', val))}
                        onFocus={(e) => handleBulletFocus(e, section.content, (val) => updateCustomSection(section.id, 'content', val))}
                        onBlur={(e) => handleBulletBlur(e, section.content, (val) => updateCustomSection(section.id, 'content', val))}
                      />
                    </div>
                  )}
                </section>
              );
            })}

          </div>
        </div>
      </div>

      {/* Import CV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 font-heading">Import CV Lama</h2>
                  <p className="text-xs text-slate-400 mt-0.5">AI akan otomatis mengisi form dari CV kamu</p>
                </div>
              </div>
              <button
                onClick={() => { setIsImportModalOpen(false); setSelectedFile(null); setImportError(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">

              {/* Success State */}
              {importSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="text-emerald-500" size={32} />
                  </div>
                  <p className="text-base font-bold text-slate-800">CV berhasil diimpor!</p>
                  <p className="text-xs text-slate-500 text-center">Semua data sudah diisi otomatis. Silakan periksa dan edit sesuai kebutuhan.</p>
                </div>
              ) : (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                      dragOver
                        ? 'border-violet-400 bg-violet-50/60 scale-[1.01]'
                        : selectedFile
                          ? 'border-emerald-400 bg-emerald-50/50'
                          : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <FileText className="text-emerald-600" size={24} />
                        </div>
                        <p className="text-sm font-bold text-emerald-700">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk ganti file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <Upload className="text-slate-400" size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Drag & drop file CV kamu di sini</p>
                          <p className="text-xs text-slate-400 mt-1">atau klik untuk pilih file</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center">
                          {['PDF', 'DOCX', 'DOC'].map(fmt => (
                            <span key={fmt} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{fmt}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Data form yang ada saat ini akan <strong>digantikan</strong> oleh data dari CV yang diupload.</p>
                  </div>

                  {/* Error */}
                  {importError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{importError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setIsImportModalOpen(false); setSelectedFile(null); setImportError(null); }}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleImportCv}
                      disabled={!selectedFile || isParsingCv}
                      className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isParsingCv ? (
                        <>
                          <Loader2 className="animate-spin" size={15} />
                          AI sedang membaca CV...
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          Import & Auto-Fill
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating button for realtime preview (visible on both mobile and desktop) */}
      <button
        type="button"
        onClick={() => setIsMobilePreviewOpen(true)}
        className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95 border border-blue-500/20"
      >
        <Eye size={16} /> Realtime Preview
      </button>

      {/* Realtime preview overlay modal (works on both mobile and desktop) */}
      {isMobilePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm p-3 sm:p-5 flex items-center justify-center">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-slate-800 font-heading">Realtime Preview</h2>
                <p className="text-xs text-slate-500">Tinjau CV Anda secara langsung.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-800"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-2 flex justify-center">
              {selectedTemplate === 'modern'
                ? <ModernCVLivePreview data={fullData} />
                : <HarvardCVLivePreview data={fullData} />}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
