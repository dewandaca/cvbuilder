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

const PreviewSectionTitle = ({ children }: { children: string }) => (
  <h3 className="mt-4 mb-2 border-b border-black pb-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
    {children}
  </h3>
);

export const HarvardCVLivePreview = ({ data }: { data: CVData }) => {
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
