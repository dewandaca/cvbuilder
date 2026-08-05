import type {
  BaseSectionKey,
  CustomSection,
  CustomSectionItem,
  CustomSectionMode,
  SectionOrderToken,
} from '@/types/cv';

// --- Constants ---
export const DEFAULT_SECTION_ORDER: BaseSectionKey[] = [
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'achievements',
];

export const SECTION_ORDER_LABELS: Record<BaseSectionKey, string> = {
  summary: 'Summary',
  education: 'Education',
  experience: 'Work Experience',
  projects: 'Projects',
  skills: 'Skills',
  achievements: 'Honors & Awards',
};

export const BASE_SECTION_LOOKUP = new Set<BaseSectionKey>(DEFAULT_SECTION_ORDER);
export const CUSTOM_SECTION_TOKEN_PREFIX = 'custom:';
export const LEGACY_CUSTOM_SECTION_TOKEN = 'custom';

// --- Section Order Helpers ---
export function isBaseSectionKey(token: string): token is BaseSectionKey {
  return BASE_SECTION_LOOKUP.has(token as BaseSectionKey);
}

export function getCustomSectionToken(id: number): `custom:${number}` {
  return `custom:${id}`;
}

export function getCustomSectionIdFromToken(token: string): number | null {
  if (!token.startsWith(CUSTOM_SECTION_TOKEN_PREFIX)) return null;

  const rawId = token.slice(CUSTOM_SECTION_TOKEN_PREFIX.length);
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function resolveSectionOrder(sectionOrder: string[] | undefined, customSections: CustomSection[]): SectionOrderToken[] {
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

export function getSectionOrderLabel(
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

// --- Date & Bullet Helpers ---
export const formatDateRangePreview = (startDate?: string, endDate?: string, isCurrent?: boolean) => {
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

export const parseBulletItemsPreview = (text: string) => {
  if (!text?.trim()) return [];

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items = lines
    .map((line) => line.replace(/^(•|-|\*|\d+\.)\s*/, '').trim())
    .filter((line) => line.length > 0);

  return items.length > 0 ? items : [text.trim()];
};

// --- Custom Section Item Helpers ---
export const createEmptyCustomSectionItem = (id: number): CustomSectionItem => ({
  id,
  title: '',
  subtitle: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
});

export const normalizeCustomSectionItems = (items?: CustomSectionItem[]): CustomSectionItem[] => {
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

export const normalizeCustomSections = (sections?: CustomSection[]): CustomSection[] => {
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

export const hasCustomSectionExperienceContent = (section: CustomSection): boolean =>
  normalizeCustomSectionItems(section.items).some((item) =>
    item.title.trim() ||
    item.subtitle.trim() ||
    item.startDate.trim() ||
    item.endDate.trim() ||
    item.description.trim(),
  );
