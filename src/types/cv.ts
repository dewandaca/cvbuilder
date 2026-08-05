// --- Type Definitions ---
export type Education = { id: number; school: string; major: string; gpa: string; startDate: string; endDate: string; isCurrent: boolean; description: string; };
export type Experience = { id: number; role: string; company: string; startDate: string; endDate: string; isCurrent: boolean; description: string; };
export type Project = { id: number; name: string; role: string; startDate: string; endDate: string; description: string; };
export type Achievement = { id: number; name: string; year: string; };
export type CustomSectionMode = 'simple' | 'experience';
export type CustomSectionItem = {
  id: number;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};
export type CustomSection = {
  id: number;
  title: string;
  content: string;
  mode?: CustomSectionMode;
  items?: CustomSectionItem[];
};
export type BaseSectionKey = 'summary' | 'education' | 'experience' | 'projects' | 'skills' | 'achievements';
export type SectionOrderToken = BaseSectionKey | `custom:${number}`;
export type CVData = {
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
