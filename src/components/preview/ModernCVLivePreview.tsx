'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { CVData, CustomSection, CustomSectionMode, BaseSectionKey } from '@/types/cv';
import {
  resolveSectionOrder,
  isBaseSectionKey,
  getCustomSectionIdFromToken,
  normalizeCustomSectionItems,
  hasCustomSectionExperienceContent,
  parseBulletItemsPreview,
  formatDateRangePreview,
} from '@/lib/cvUtils';

const NAVY = '#1a3c6e';

const ModernSectionTitle = ({ children }: { children: string }) => (
  <h3 style={{ color: NAVY, borderBottom: `1.5px solid ${NAVY}`, paddingBottom: 2, marginTop: 10, marginBottom: 4, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    {children}
  </h3>
);

export const ModernCVLivePreview = ({ data }: { data: CVData & { profilePhoto?: string } }) => {
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
