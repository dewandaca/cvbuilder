'use server'

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type PDFParserInstance = {
  on(event: 'pdfParser_dataError', callback: (error: unknown) => void): void;
  on(event: 'pdfParser_dataReady', callback: () => void): void;
  parseBuffer(buffer: Buffer): void;
  getRawTextContent(): string;
};

type PDFParserConstructor = new (context?: unknown, verbosity?: number) => PDFParserInstance;

type BuilderEducation = {
  id: number;
  school: string;
  major: string;
  gpa: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type BuilderExperience = {
  id: number;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type BuilderProject = {
  id: number;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

type BuilderAchievement = {
  id: number;
  name: string;
  year: string;
};

type BuilderCustomSection = {
  id: number;
  title: string;
  content: string;
};

type BuilderCvPayload = {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    summary: string;
  };
  educations: BuilderEducation[];
  experiences: BuilderExperience[];
  projects: BuilderProject[];
  achievements: BuilderAchievement[];
  customSections: BuilderCustomSection[];
  skills: {
    hard: string;
    soft: string;
  };
};

const DEBUG_PDF_EXTRACTION = process.env.DEBUG_PDF_EXTRACTION === 'true';

const SUMMARY_MAX_CHARS = 1100;
const DATE_RANGE_SEPARATORS = [' - ', ' to ', ' until ', ' s/d ', ' sd '];
const CURRENT_DATE_MARKERS = ['present', 'current', 'now', 'sekarang'];

function isWhitespaceChar(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === '\f' || char === '\v';
}

function isDigitChar(char: string): boolean {
  return char >= '0' && char <= '9';
}

function cleanInlineText(value: string): string {
  let result = '';
  let previousWasWhitespace = false;

  for (const char of value) {
    if (isWhitespaceChar(char)) {
      if (!previousWasWhitespace) {
        result += ' ';
        previousWasWhitespace = true;
      }
      continue;
    }

    result += char;
    previousWasWhitespace = false;
  }

  return result.trim();
}

function logDebugPreview(label: string, value: string) {
  if (!DEBUG_PDF_EXTRACTION || !value) return;

  const compact = cleanInlineText(value);
  console.log(`[DEBUG] ${label} length:`, value.length);
  console.log(`[DEBUG] ${label} preview:`, compact);
}

function normalizeCvTextForLLM(text: string): string {
  const lines = text.replaceAll('\r', '').split('\n');
  const normalizedLines: string[] = [];
  let previousWasBlank = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!previousWasBlank && normalizedLines.length > 0) {
        normalizedLines.push('');
      }
      previousWasBlank = true;
      continue;
    }

    normalizedLines.push(trimmed);
    previousWasBlank = false;
  }

  return normalizedLines.join('\n').trim();
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const lines = trimmed.split('\n');
  if (lines.length >= 2 && lines[0].startsWith('```') && lines[lines.length - 1].startsWith('```')) {
    return lines.slice(1, -1).join('\n').trim();
  }

  return trimmed.split('```').join('').trim();
}

function parseJsonObject(content: string | null | undefined): Record<string, unknown> | null {
  if (!content) return null;

  const candidates = [
    content,
    stripCodeFence(content),
  ];

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore and try next candidate
    }
  }

  return null;
}

async function parsePdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdf2jsonModule = (await import('pdf2json')) as unknown as {
    default: PDFParserConstructor;
  };
  const PDFParser = pdf2jsonModule.default;

  return new Promise<string>((resolve, reject) => {
    const pdfParser = new PDFParser(undefined, 1);
    pdfParser.on('pdfParser_dataError', () => reject(new Error('Gagal parsing PDF')));
    pdfParser.on('pdfParser_dataReady', () => resolve(pdfParser.getRawTextContent()));
    pdfParser.parseBuffer(buffer);
  });
}

function extractFirstParagraph(normalizedCvText: string): string {
  const paragraphs = normalizedCvText
    .split('\n\n')
    .map(part => cleanInlineText(part))
    .filter(Boolean);

  return paragraphs[0] || '';
}

function buildSourceSnippetsFallback(normalizedCvText: string, maxItems = 12): string[] {
  const uniqueLines: string[] = [];

  for (const line of normalizedCvText.split('\n')) {
    const cleaned = cleanInlineText(line);
    if (!cleaned || cleaned.length < 20) continue;
    if (uniqueLines.includes(cleaned)) continue;

    uniqueLines.push(cleaned);
    if (uniqueLines.length >= maxItems) break;
  }

  return uniqueLines;
}

function applyStructuredCvFallbacks(
  structuredCv: Record<string, unknown>,
  normalizedCvText: string,
): Record<string, unknown> {
  const patched: Record<string, unknown> = { ...structuredCv };

  const currentSummary = typeof patched.summary === 'string' ? cleanInlineText(patched.summary) : '';
  if (currentSummary) {
    patched.summary = currentSummary.slice(0, SUMMARY_MAX_CHARS);
  } else {
    const firstParagraph = extractFirstParagraph(normalizedCvText);
    if (firstParagraph) {
      patched.summary = firstParagraph.slice(0, SUMMARY_MAX_CHARS);
    }
  }

  const currentSnippets = asStringArray(patched.source_snippets);
  if (!currentSnippets.length) {
    const fallbackSnippets = buildSourceSnippetsFallback(normalizedCvText);
    if (fallbackSnippets.length) {
      patched.source_snippets = fallbackSnippets;
    }
  }

  return patched;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
}

function readString(obj: Record<string, unknown> | null, key: string): string {
  if (!obj) return '';
  const value = obj[key];
  return typeof value === 'string' ? value.trim() : '';
}

function splitDateRangeBySeparator(value: string): string[] {
  const lower = value.toLowerCase();

  for (const separator of DATE_RANGE_SEPARATORS) {
    const index = lower.indexOf(separator);
    if (index === -1) continue;

    const start = value.slice(0, index).trim();
    const end = value.slice(index + separator.length).trim();
    return [start, end].filter(Boolean);
  }

  return [value];
}

function containsCurrentMarker(value: string): boolean {
  const lower = cleanInlineText(value).toLowerCase();
  if (!lower) return false;

  for (const marker of CURRENT_DATE_MARKERS) {
    if (lower === marker) return true;
    if (lower.startsWith(`${marker} `)) return true;
    if (lower.endsWith(` ${marker}`)) return true;
    if (lower.includes(` ${marker} `)) return true;
  }

  return false;
}

function removeCurrentMarker(value: string): string {
  let result = cleanInlineText(value);

  for (const marker of CURRENT_DATE_MARKERS) {
    result = result.split(` ${marker} `).join(' ');
    if (result.toLowerCase().startsWith(`${marker} `)) {
      result = result.slice(marker.length + 1).trim();
    }
    if (result.toLowerCase().endsWith(` ${marker}`)) {
      result = result.slice(0, result.length - marker.length - 1).trim();
    }
  }

  if (result.endsWith('-')) {
    result = result.slice(0, -1).trim();
  }

  return result;
}

function parseDateRange(period: string): { startDate: string; endDate: string; isCurrent: boolean } {
  const normalized = cleanInlineText(period);
  if (!normalized) return { startDate: '', endDate: '', isCurrent: false };

  const parts = splitDateRangeBySeparator(normalized);

  const rawEnd = parts.length >= 2 ? parts[parts.length - 1] : '';
  const isCurrent = containsCurrentMarker(rawEnd) || containsCurrentMarker(normalized);

  if (parts.length >= 2) {
    return {
      startDate: parts[0],
      endDate: isCurrent ? '' : rawEnd,
      isCurrent,
    };
  }

  if (isCurrent) {
    return {
      startDate: removeCurrentMarker(normalized),
      endDate: '',
      isCurrent: true,
    };
  }

  return { startDate: normalized, endDate: '', isCurrent: false };
}

function extractYear(value: string): string {
  for (let index = 0; index <= value.length - 4; index++) {
    const candidate = value.slice(index, index + 4);
    if (!candidate.split('').every(isDigitChar)) continue;

    const year = Number(candidate);
    if (year >= 1900 && year <= 2099) {
      return candidate;
    }
  }

  return '';
}

function mapStructuredCvToBuilderPayload(structuredCv: Record<string, unknown>): BuilderCvPayload {
  const profile = asObject(structuredCv.profile);
  const profilePhone = asObject(profile?.phone);
  const profileLinks = asStringArray(profile?.links);
  const skillsObj = asObject(structuredCv.skills);

  const hardSkills = [
    ...asStringArray(skillsObj?.hard_skills),
    ...asStringArray(skillsObj?.tools),
  ];
  const softSkills = asStringArray(skillsObj?.soft_skills);
  const domainKnowledge = asStringArray(skillsObj?.domain_knowledge);

  const educations: BuilderEducation[] = asObjectArray(structuredCv.education)
    .map((item, index) => {
      const period = readString(item, 'period');
      const range = parseDateRange(period);
      const details = asStringArray(item.details);

      return {
        id: index + 1,
        school: readString(item, 'institution'),
        major: readString(item, 'degree'),
        gpa: readString(item, 'gpa'),
        startDate: range.startDate,
        endDate: range.endDate,
        isCurrent: range.isCurrent,
        description: details.join('\n'),
      };
    })
    .filter((item) => item.school || item.major || item.description || item.startDate || item.endDate);

  const experiences: BuilderExperience[] = asObjectArray(structuredCv.experience)
    .map((item, index) => {
      const period = readString(item, 'period');
      const range = parseDateRange(period);
      const achievements = asStringArray(item.achievements);
      const description = achievements.length > 0 ? achievements.join('\n') : asStringArray(item.description).join('\n');

      return {
        id: index + 1,
        role: readString(item, 'role'),
        company: readString(item, 'company'),
        startDate: range.startDate,
        endDate: range.endDate,
        isCurrent: range.isCurrent,
        description,
      };
    })
    .filter((item) => item.role || item.company || item.description || item.startDate || item.endDate);

  const projects: BuilderProject[] = asObjectArray(structuredCv.projects)
    .map((item, index) => {
      const period = readString(item, 'period');
      const range = parseDateRange(period);
      const descriptionItems = asStringArray(item.description);

      return {
        id: index + 1,
        name: readString(item, 'name'),
        role: readString(item, 'role'),
        startDate: range.startDate,
        endDate: range.isCurrent ? 'Present' : range.endDate,
        description: descriptionItems.join('\n'),
      };
    })
    .filter((item) => item.name || item.role || item.description || item.startDate || item.endDate);

  const achievements: BuilderAchievement[] = asStringArray(structuredCv.achievements)
    .map((item, index) => ({
      id: index + 1,
      name: item,
      year: extractYear(item),
    }));

  const languageItems = asObjectArray(structuredCv.languages)
    .map((item) => {
      const language = readString(item, 'language');
      const proficiency = readString(item, 'proficiency');
      if (!language) return '';
      return proficiency ? `${language} (${proficiency})` : language;
    })
    .filter(Boolean);

  const certificationItems = asStringArray(structuredCv.certifications);

  const customSections: BuilderCustomSection[] = [];
  let customId = 1;

  if (languageItems.length > 0) {
    customSections.push({
      id: customId++,
      title: 'Languages',
      content: languageItems.join('\n'),
    });
  }

  if (certificationItems.length > 0) {
    customSections.push({
      id: customId++,
      title: 'Certifications',
      content: certificationItems.join('\n'),
    });
  }

  if (domainKnowledge.length > 0) {
    customSections.push({
      id: customId++,
      title: 'Domain Knowledge',
      content: domainKnowledge.join('\n'),
    });
  }

  const linkedin = profileLinks.find((link) => link.toLowerCase().includes('linkedin.com')) || profileLinks[0] || '';
  const phone = readString(profilePhone, 'normalized') || readString(profilePhone, 'raw') || readString(profile, 'phone');

  return {
    personalInfo: {
      fullName: readString(profile, 'full_name'),
      email: readString(profile, 'email'),
      phone,
      linkedin,
      summary: typeof structuredCv.summary === 'string' ? structuredCv.summary.trim() : '',
    },
    educations,
    experiences,
    projects,
    achievements,
    customSections,
    skills: {
      hard: Array.from(new Set(hardSkills)).join(', '),
      soft: Array.from(new Set(softSkills)).join(', '),
    },
  };
}

function stringifyPromptJson(data: Record<string, unknown>, maxChars = 12000): string {
  const json = JSON.stringify(data, null, 2);
  if (json.length <= maxChars) return json;

  return `${json.slice(0, maxChars)}\n[TRUNCATED]`;
}

async function extractStructuredCvData(normalizedCvText: string): Promise<Record<string, unknown> | null> {
  const systemPrompt = `You are a CV Data Structuring Engine.
Your job is to convert raw CV text into clean, recruiter-friendly JSON that can be consumed by another AI.

Return strict JSON object only (no markdown, no explanation).

Extraction rules:
- Extract only information explicitly present in the CV. Never hallucinate.
- Keep original language for evidence text and sentence fragments.
- Omit keys or fields that are not present in the CV.
- Use arrays for repeated entities (experience, project, skills, education, etc).
- Normalize keys using snake_case.
- Preserve chronology and dates exactly as written when possible.
- Do NOT paraphrase or shorten existing candidate text.
- summary must only come from explicit summary/profile/about me/objective section.
- summary must keep the full original paragraph from that summary section (verbatim), not an abbreviated version.
- if no explicit summary section is present, omit the summary key.
- never concatenate other sections (experience, education, skills, projects, etc) into summary.
- For experience.achievements and projects.description, keep complete original bullets/sentences (verbatim) from CV when available.

Expected structure guideline (adapt dynamically to available data):
{
  "detected_cv_language": "id|en|mixed|other",
  "profile": {
    "full_name": "string",
    "email": "string",
    "phone": {
      "raw": "string",
      "normalized": "string"
    },
    "location": "string",
    "links": ["string"]
  },
  "summary": "string",
  "experience": [
    {
      "role": "string",
      "company": "string",
      "period": "string",
      "achievements": ["string"],
      "technologies": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "role": "string",
      "period": "string",
      "description": ["string"],
      "technologies": ["string"]
    }
  ],
  "skills": {
    "hard_skills": ["string"],
    "tools": ["string"],
    "soft_skills": ["string"],
    "domain_knowledge": ["string"]
  },
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "period": "string",
      "details": ["string"]
    }
  ],
  "certifications": ["string"],
  "languages": [
    {
      "language": "string",
      "proficiency": "string"
    }
  ],
  "achievements": ["string"],
  "source_snippets": ["string"]
}

Important:
- Keep detected_cv_language and source_snippets whenever possible.
- source_snippets should contain 8-20 short verbatim lines/sentences from CV as evidence.
- If profile is partially missing, include only available fields.
- Never return null, undefined, or comments in JSON.`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: normalizedCvText.substring(0, 20000) },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  return parseJsonObject(chatCompletion.choices[0]?.message?.content);
}

async function buildStructuredCvFromFile(file: File): Promise<Record<string, unknown> | null> {
  const cvText = await parsePdfText(file);
  logDebugPreview('buildStructuredCvFromFile.cvText (raw extraction)', cvText);

  if (!cvText || cvText.trim().length < 50) {
    return null;
  }

  const normalizedCvText = normalizeCvTextForLLM(cvText);
  logDebugPreview('buildStructuredCvFromFile.normalizedCvText (for structuring)', normalizedCvText);

  const structuredCv = await extractStructuredCvData(normalizedCvText);
  if (!structuredCv) {
    return null;
  }

  const patchedStructuredCv = applyStructuredCvFallbacks(structuredCv, normalizedCvText);

  logDebugPreview(
    'buildStructuredCvFromFile.structuredCvJson (for downstream AI)',
    stringifyPromptJson(patchedStructuredCv, 2500),
  );

  return patchedStructuredCv;
}

export async function extractCvToBuilderData(formData: FormData): Promise<BuilderCvPayload | null> {
  const file = formData.get('file') as File;

  if (!file) {
    throw new Error('No file uploaded');
  }

  try {
    const structuredCv = await buildStructuredCvFromFile(file);
    if (!structuredCv) return null;

    return mapStructuredCvToBuilderPayload(structuredCv);
  } catch (error) {
    console.error('Error extracting builder data from CV:', error);
    return null;
  }
}

// --- FUNGSI: POLISH TEXT ---
export async function polishText(
  text: string,
  type: 'summary' | 'bullet',
  mode: 'enhance' | 'translate' = 'enhance'
) {
  if (!text) return '';

  const systemPrompt =
    mode === 'enhance'
      ? type === 'summary'
        ? "You are a professional Resume Writer (Harvard Style). Improve the user's professional summary to be clearer, more impactful, and ATS-friendly while preserving the original language. Keep it concise (max 3-4 sentences), use active voice, and avoid adding unsupported claims. Return ONLY the rewritten summary text, no conversational filler."
        : "You are a professional Resume Writer. Improve the user's work/project/education description into strong, ATS-friendly bullet points with action verbs and measurable impact where possible. Preserve the original language of the user's input. Return ONLY bullet lines separated by newlines. DO NOT use markdown bullets like '-' or '*'. No conversational filler."
      : type === 'summary'
        ? "You are a professional Resume Writer (Harvard Style). Translate and rewrite the user's summary into polished Professional English for an international CV. Keep it concise (max 3-4 sentences), use active voice, and keep the meaning faithful to the original text. Return ONLY the final summary text, no conversational filler."
        : "You are a professional Resume Writer. Translate and rewrite the user's description into polished Professional English bullet points for an international CV. Use strong action verbs and measurable impact when possible while preserving meaning. Return ONLY bullet lines separated by newlines. DO NOT use markdown bullets like '-' or '*'. No conversational filler.";

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
    });

    return chatCompletion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error polishing text:', error);
    return 'Error generating text. Please try again.';
  }
}
