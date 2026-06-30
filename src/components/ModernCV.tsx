// src/components/ModernCV.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

type Education = {
  id: number;
  school: string;
  major: string;
  gpa: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type Experience = {
  id: number;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type Project = {
  id: number;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

type Achievement = {
  id: number;
  name: string;
  year: string;
};

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
    if (isBaseSectionKey(rawToken)) { appendToken(rawToken); continue; }
    if (rawToken === LEGACY_CUSTOM_SECTION_TOKEN) {
      for (const customToken of customTokens) appendToken(customToken);
      continue;
    }
    if (validCustomTokenSet.has(rawToken)) appendToken(rawToken);
  }

  for (const baseSection of DEFAULT_SECTION_ORDER) appendToken(baseSection);
  for (const customToken of customTokens) appendToken(customToken);

  return resolved as SectionOrderToken[];
}

const normalizeCustomSectionItems = (items?: CustomSectionItem[]): CustomSectionItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: typeof item?.id === 'number' && item.id > 0 ? item.id : index + 1,
    title: typeof item?.title === 'string' ? item.title : '',
    subtitle: typeof item?.subtitle === 'string' ? item.subtitle : '',
    startDate: typeof item?.startDate === 'string' ? item.startDate : '',
    endDate: typeof item?.endDate === 'string' ? item.endDate : '',
    isCurrent: item?.isCurrent === true,
    description: typeof item?.description === 'string' ? item.description : '',
  }));
};

const hasCustomSectionExperienceContent = (section: CustomSection): boolean =>
  normalizeCustomSectionItems(section.items).some((item) =>
    item.title.trim() || item.subtitle.trim() || item.startDate.trim() || item.endDate.trim() || item.description.trim(),
  );

// Register fonts (Helvetica is built-in to PDFKit, so we use that for a clean modern look)
Font.register({
  family: 'Helvetica-Custom',
  src: 'https://db.onlinewebfonts.com/t/32441506567156636049eb850b53f02a.ttf',
});

const BLUE = '#1a3c6e'; // Dark navy-blue matching the image

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    lineHeight: 1.4,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  // --- HEADER ---
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  photoContainer: {
    width: 75,
    height: 90,
    marginRight: 16,
    flexShrink: 0,
  },
  photo: {
    width: 75,
    height: 90,
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: 75,
    height: 90,
    backgroundColor: '#d0d8e8',
  },
  headerRight: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  contactLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    width: 52,
    color: '#1a1a1a',
  },
  contactValue: {
    fontSize: 10,
    flex: 1,
    color: '#1a1a1a',
  },

  // --- SECTION TITLES ---
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: BLUE,
  },

  // --- CONTENT ---
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },

  // --- BULLETS ---
  bulletPoint: {
    flexDirection: 'row',
    marginLeft: 10,
    marginBottom: 2,
  },
  bullet: {
    width: 10,
    fontSize: 14,
    marginTop: -2,
    color: '#1a1a1a',
  },
  bulletText: {
    flex: 1,
    textAlign: 'justify',
    color: '#1a1a1a',
  },

  // Summary text
  summaryText: {
    textAlign: 'justify',
    color: '#1a1a1a',
  },
});

const BulletList = ({ text }: { text: string }) => {
  if (!text?.trim()) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const items = lines.map((l) => l.replace(/^(•|-|\*)\s*/, '').trim()).filter((l) => l.length > 0);
  if (items.length === 0) items.push(text.trim());
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletPoint} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
};

const formatDateRange = (startDate?: string, endDate?: string, isCurrent?: boolean) => {
  const start = startDate?.trim();
  const end = endDate?.trim();
  if (isCurrent) return start ? `${start} - Present` : 'Present';
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

export const ModernCV = ({ data }: { data: CVData }) => {
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

  const contactFields = [
    data.personalInfo.address ? { label: 'Address:', value: data.personalInfo.address } : null,
    data.personalInfo.phone ? { label: 'Phone:', value: data.personalInfo.phone } : null,
    data.personalInfo.email ? { label: 'Email:', value: data.personalInfo.email } : null,
    displayLinkedin ? { label: 'LinkedIn:', value: displayLinkedin } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const sectionContent: Record<BaseSectionKey, React.ReactNode> = {
    summary: data.personalInfo.summary
      ? (
        <View key="summary">
          <Text style={styles.sectionTitle}>{data.sectionTitles?.summary || 'Summary'}</Text>
          <Text style={styles.summaryText}>{data.personalInfo.summary}</Text>
        </View>
      )
      : null,
    education: data.educations.length > 0
      ? (
        <View key="education">
          <Text style={styles.sectionTitle}>{data.sectionTitles?.education || 'Education'}</Text>
          {data.educations.map((edu) => (
            <View key={edu.id} style={{ marginBottom: 8 }}>
              <View style={styles.row}>
                <Text style={styles.bold}>{edu.school}</Text>
                <Text>{formatDateRange(edu.startDate, edu.endDate, edu.isCurrent)}</Text>
              </View>
              {(edu.major || edu.gpa) && (
                <View style={styles.row}>
                  <Text style={styles.italic}>
                    {edu.major}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                  </Text>
                </View>
              )}
              {edu.description ? (
                <BulletList text={edu.description} />
              ) : null}
            </View>
          ))}
        </View>
      )
      : null,
    experience: data.experiences.length > 0
      ? (
        <View key="experience">
          <Text style={styles.sectionTitle}>{data.sectionTitles?.experience || 'Experience'}</Text>
          {data.experiences.map((exp) => (
            <View key={exp.id} style={{ marginBottom: 8 }}>
              <View style={styles.row}>
                <Text style={styles.bold}>{exp.role} - {exp.company}</Text>
                <Text>{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</Text>
              </View>
              <BulletList text={exp.description} />
            </View>
          ))}
        </View>
      )
      : null,
    projects: data.projects.length > 0
      ? (
        <View key="projects">
          <Text style={styles.sectionTitle}>{data.sectionTitles?.projects || 'Projects'}</Text>
          {data.projects.map((proj) => (
            <View key={proj.id} style={{ marginBottom: 6 }}>
              <View style={styles.row}>
                <Text style={styles.bold}>{proj.name} | {proj.role}</Text>
                <Text>{formatDateRange(proj.startDate, proj.endDate)}</Text>
              </View>
              <BulletList text={proj.description} />
            </View>
          ))}
        </View>
      )
      : null,
    skills: (data.skills.hard || data.skills.soft)
      ? (
        <View key="skills">
          <Text style={styles.sectionTitle}>{data.sectionTitles?.skills || 'Skills'}</Text>
          {data.skills.hard && (
            <View style={styles.bulletPoint} wrap={false}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Hard Skills: </Text>{data.skills.hard}
              </Text>
            </View>
          )}
          {data.skills.soft && (
            <View style={styles.bulletPoint} wrap={false}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Soft Skills: </Text>{data.skills.soft}
              </Text>
            </View>
          )}
        </View>
      )
      : null,
    achievements: data.achievements.length > 0 && data.achievements[0].name !== ''
      ? (
        <View key="achievements">
          <Text style={styles.sectionTitle}>{data.sectionTitles?.achievements || 'Honors & Awards'}</Text>
          {data.achievements.map((ach) => (
            <View key={ach.id} style={styles.bulletPoint} wrap={false}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                {ach.name} {ach.year ? `(${ach.year})` : ''}
              </Text>
            </View>
          ))}
        </View>
      )
      : null,
  };

  const renderCustomSection = (section: CustomSection): React.ReactNode => {
    const mode: CustomSectionMode = section.mode === 'experience' ? 'experience' : 'simple';
    const entries = normalizeCustomSectionItems(section.items).filter((item) =>
      item.title.trim() || item.subtitle.trim() || item.startDate.trim() || item.endDate.trim() || item.description.trim(),
    );

    return (
      <View key={`custom-${section.id}`}>
        <Text style={styles.sectionTitle}>{section.title || 'Custom Section'}</Text>
        {mode === 'experience' && entries.length > 0
          ? entries.map((entry) => {
            const dateRange = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);
            const entryHeading = [entry.title.trim(), entry.subtitle.trim()].filter(Boolean).join(', ');
            return (
              <View key={`custom-entry-${section.id}-${entry.id}`} style={{ marginBottom: 6 }}>
                <View style={styles.row}>
                  <Text style={styles.bold}>{entryHeading || 'Entry'}</Text>
                  <Text>{dateRange}</Text>
                </View>
                <BulletList text={entry.description} />
              </View>
            );
          })
          : <BulletList text={section.content} />}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.header}>
          {/* Photo */}
          <View style={styles.photoContainer}>
            {data.profilePhoto ? (
              <Image src={data.profilePhoto} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder} />
            )}
          </View>

          {/* Name + Contact */}
          <View style={styles.headerRight}>
            <Text style={styles.name}>{data.personalInfo.fullName}</Text>
            {contactFields.map((field, i) => (
              <View key={i} style={styles.contactRow}>
                <Text style={styles.contactLabel}>{field.label}</Text>
                <Text style={styles.contactValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sections */}
        {orderedSections.map((sectionKey) => {
          if (isBaseSectionKey(sectionKey)) return sectionContent[sectionKey];
          const customId = getCustomSectionIdFromToken(sectionKey);
          if (!customId) return null;
          const customSection = customSectionsById.get(customId);
          return customSection ? renderCustomSection(customSection) : null;
        })}

      </Page>
    </Document>
  );
};
