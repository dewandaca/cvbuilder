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

type InterviewMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

function logDebugPreview(label: string, value: string) {
  if (!DEBUG_PDF_EXTRACTION || !value) return;

  const compact = value.replace(/\s+/g, ' ').trim();
  console.log(`[DEBUG] ${label} length:`, value.length);
  console.log(`[DEBUG] ${label} preview:`, compact);
}

function normalizeCvTextForLLM(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/-\n\s*(?=[a-zA-Z])/g, '')
    .replace(/([^\n])\n\s*(?=[a-zA-Z0-9(])/g, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseJsonObject(content: string | null | undefined): Record<string, unknown> | null {
  if (!content) return null;

  const candidates = [
    content,
    content.replace(/```json|```/gi, '').trim(),
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

const SUMMARY_HEADING_LINE_PATTERN = /^(?:professional\s+summary|summary|profile|about\s+me|objective|career\s+objective|ringkasan\s+profil|ringkasan|profil|tentang\s+saya|tujuan\s+karier)\s*[:\-]?$/i;
const SUMMARY_HEADING_INLINE_PATTERN = /^(?:professional\s+summary|summary|profile|about\s+me|objective|career\s+objective|ringkasan\s+profil|ringkasan|profil|tentang\s+saya|tujuan\s+karier)\s*[:\-]\s*(.+)$/i;
const GENERIC_SECTION_HEADING_PATTERN = /^(?:work\s+experience|experience|employment\s+history|projects?|education|skills?|certifications?|languages?|achievements?|awards?|organizations?|internships?|contact|riwayat\s+pekerjaan|pengalaman\s+kerja|proyek|pendidikan|keahlian|sertifikasi|bahasa|pencapaian|kontak)\s*[:\-]?$/i;
const SUMMARY_SECTION_MARKER_PATTERN = /\b(?:experience|education|skills?|projects?|certifications?|languages?|achievements?|awards?|organizations?|internships?|contact|pengalaman|pendidikan|keahlian|proyek|sertifikasi|bahasa|pencapaian|kontak)\b/gi;
const SUMMARY_MAX_CHARS = 1100;
const SUMMARY_MIN_CHARS = 60;

function cleanInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isLikelySectionHeading(line: string): boolean {
  const normalized = line.trim();
  if (!normalized) return false;
  return SUMMARY_HEADING_LINE_PATTERN.test(normalized) || GENERIC_SECTION_HEADING_PATTERN.test(normalized);
}

function isLikelyContactParagraph(paragraph: string): boolean {
  const lower = paragraph.toLowerCase();
  const hasContactHint =
    lower.includes('@') ||
    lower.includes('linkedin') ||
    lower.includes('github') ||
    lower.includes('portfolio') ||
    lower.includes('phone') ||
    lower.includes('tel') ||
    lower.includes('email');

  return hasContactHint && paragraph.split(/\s+/).length <= 40;
}

function extractSummaryFromHeading(normalizedCvText: string): string | null {
  const lines = normalizedCvText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  let collecting = false;
  const collected: string[] = [];

  for (const line of lines) {
    const inlineMatch = line.match(SUMMARY_HEADING_INLINE_PATTERN);
    if (inlineMatch) {
      collecting = true;
      const inlineContent = cleanInlineText(inlineMatch[1] || '');
      if (inlineContent) collected.push(inlineContent);
      continue;
    }

    if (!collecting) {
      if (SUMMARY_HEADING_LINE_PATTERN.test(line)) {
        collecting = true;
      }
      continue;
    }

    if (isLikelySectionHeading(line) && !SUMMARY_HEADING_LINE_PATTERN.test(line)) {
      break;
    }

    collected.push(line);
  }

  if (!collected.length) return null;

  const summary = cleanInlineText(collected.join(' '));
  if (summary.length < SUMMARY_MIN_CHARS || summary.length > SUMMARY_MAX_CHARS) return null;
  return summary;
}

function extractSummaryFromTopParagraph(normalizedCvText: string): string | null {
  const paragraphs = normalizedCvText
    .split(/\n{2,}/)
    .map(part => cleanInlineText(part))
    .filter(Boolean)
    .slice(0, 8);

  for (const paragraph of paragraphs) {
    if (paragraph.length < 120 || paragraph.length > SUMMARY_MAX_CHARS) continue;
    if (isLikelyContactParagraph(paragraph)) continue;
    if (isLikelySectionHeading(paragraph)) continue;

    const sentenceCount = paragraph.split(/[.!?](?:\s|$)/).filter(Boolean).length;
    const markerCount = (paragraph.match(SUMMARY_SECTION_MARKER_PATTERN) || []).length;
    if (sentenceCount >= 2 && sentenceCount <= 6 && markerCount <= 2) return paragraph;
  }

  return null;
}

function extractSummaryCandidate(normalizedCvText: string): string | null {
  return extractSummaryFromHeading(normalizedCvText) || extractSummaryFromTopParagraph(normalizedCvText);
}

function isSuspiciousSummary(summary: string): boolean {
  const normalized = cleanInlineText(summary);
  if (!normalized) return true;

  const sentenceCount = normalized.split(/[.!?](?:\s|$)/).filter(Boolean).length;
  const markerCount = (normalized.match(SUMMARY_SECTION_MARKER_PATTERN) || []).length;

  return normalized.length > SUMMARY_MAX_CHARS || sentenceCount > 8 || markerCount >= 4;
}

function takeFirstSentences(text: string, maxSentences = 5): string {
  const chunks = text.match(/[^.!?]+[.!?]?/g) || [text];
  return cleanInlineText(chunks.slice(0, maxSentences).join(' '));
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

function parseDateRange(period: string): { startDate: string; endDate: string; isCurrent: boolean } {
  const normalized = period.replace(/\s+/g, ' ').trim();
  if (!normalized) return { startDate: '', endDate: '', isCurrent: false };

  const parts = normalized
    .split(/\s*(?:-|–|—|to|until|s\/d|sd)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const rawEnd = parts.length >= 2 ? parts[parts.length - 1] : '';
  const isCurrent = /^(?:present|current|now|sekarang)$/i.test(rawEnd) || /\b(?:present|current|now|sekarang)\b/i.test(normalized);

  if (parts.length >= 2) {
    return {
      startDate: parts[0],
      endDate: isCurrent ? '' : rawEnd,
      isCurrent,
    };
  }

  if (isCurrent) {
    return {
      startDate: normalized.replace(/\b(?:present|current|now|sekarang)\b/gi, '').replace(/[-–—]\s*$/g, '').trim(),
      endDate: '',
      isCurrent: true,
    };
  }

  return { startDate: normalized, endDate: '', isCurrent: false };
}

function extractYear(value: string): string {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : '';
}

function buildSourceSnippetsFallback(normalizedCvText: string, maxItems = 12): string[] {
  const lines = normalizedCvText
    .split('\n')
    .map(line => cleanInlineText(line))
    .filter(line => line.length >= 25)
    .filter(line => !isLikelySectionHeading(line));

  return Array.from(new Set(lines)).slice(0, maxItems);
}

function applyStructuredCvFallbacks(
  structuredCv: Record<string, unknown>,
  normalizedCvText: string,
): Record<string, unknown> {
  const patched: Record<string, unknown> = { ...structuredCv };

  const summaryCandidate = extractSummaryCandidate(normalizedCvText);
  const currentSummary = typeof patched.summary === 'string' ? patched.summary.trim() : '';
  const hasSuspiciousCurrentSummary = !!currentSummary && isSuspiciousSummary(currentSummary);

  if (summaryCandidate && !isSuspiciousSummary(summaryCandidate)) {
    const isLikelyTruncated =
      !currentSummary ||
      currentSummary.length + 80 < summaryCandidate.length ||
      currentSummary.length < Math.floor(summaryCandidate.length * 0.75) ||
      hasSuspiciousCurrentSummary;

    if (isLikelyTruncated) {
      patched.summary = summaryCandidate;
    }
  } else if (hasSuspiciousCurrentSummary) {
    const shortened = takeFirstSentences(currentSummary, 5);
    if (shortened.length >= SUMMARY_MIN_CHARS && !isSuspiciousSummary(shortened)) {
      patched.summary = shortened;
    } else {
      delete patched.summary;
    }
  }

  const currentSnippets = asStringArray(patched.source_snippets);
  if (currentSnippets.length < 6) {
    const fallbackSnippets = buildSourceSnippetsFallback(normalizedCvText);
    if (fallbackSnippets.length) {
      patched.source_snippets = Array.from(new Set([...currentSnippets, ...fallbackSnippets])).slice(0, 12);
    }
  }

  return patched;
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

  const linkedin = profileLinks.find((link) => /linkedin\.com/i.test(link)) || profileLinks[0] || '';
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

// --- FUNGSI 1: POLISH TEXT ---
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

// --- FUNGSI 2: REVIEW CV (ADVANCED MODE) ---
export async function reviewCV(formData: FormData) {
  const file = formData.get('file') as File;

  if (!file) {
    throw new Error('No file uploaded');
  }

  try {
    const structuredCv = await buildStructuredCvFromFile(file);
    if (!structuredCv) {
      return null;
    }

    const structuredCvPrompt = stringifyPromptJson(structuredCv);
    const userContent = `=== STRUCTURED CANDIDATE CV JSON ===\n${structuredCvPrompt}`;
    logDebugPreview('reviewCV.userContent (structured CV sent to AI)', userContent);

    const systemPrompt = `You are a Senior Technical Recruiter + Resume Coach.
Analyze structured CV JSON deeply with ATS + recruiter lens and produce highly practical recommendations.

Evaluation framework:
- Impact-driven writing (action verbs, metrics, business outcome)
- Role alignment and keyword coverage
- Clarity, structure, chronology consistency, and scanability
- Evidence quality (tools, scope, ownership, results)
- Seniority signals (decision making, complexity handled, leadership)

You MUST return valid JSON with this EXACT structure:
{
  "executive_summary": "string (in Indonesian)",
  "ats_analysis": {
    "score": 0, // 0-100 based on keyword presence and relevance
    "missing_keywords": ["string"],
    "detected_role": "string"
  },
  "red_flags": ["string (in Indonesian)"],
  "section_audit": {
    "summary": "string (in Indonesian)",
    "experience": "string (in Indonesian)",
    "formatting": "string (in Indonesian)"
  },
  "section_scores": {
    "summary": 0, //score 0-100
    "experience": 0, //score 0-100
    "skills": 0, //score 0-100
    "education": 0, //score 0-100
    "formatting": 0 //score 0-100
  },
  "prioritized_actions": [
    {
      "title": "string (in Indonesian)",
      "impact": "High",
      "effort": "Low",
      "why": "string (in Indonesian)",
      "example": "string (MUST BE IN ORIGINAL CV LANGUAGE, DO NOT TRANSLATE)"
    }
  ],
  "magic_rewrites": [
    {
      "original": "string (MUST BE EXACT QUOTE FROM CV, DO NOT TRANSLATE)",
      "better": "string (MUST BE IN ORIGINAL CV LANGUAGE, DO NOT TRANSLATE TO INDONESIAN)",
      "reason": "string (in Indonesian)"
    }
  ],
  "target_role_suggestions": ["string"],
  "missing_evidence": ["string (in Indonesian)"],
  "keyword_booster": {
    "hard_skills": ["string"],
    "soft_skills": ["string"],
    "domain_terms": ["string"]
  }
}

Language policy:
- IMPORTANT: The language of the rewritten text ("better" and "example") MUST logically match the language of the CV itself!
- If the uploaded CV is in English, "magic_rewrites.better" and "prioritized_actions.example" MUST be written in English.
- If the uploaded CV is in Indonesian, they MUST be in Indonesian.
- ALL explanations ("executive_summary", "section_audit", "reason", "why", "red_flags", "missing_evidence") MUST ALWAYS be in Indonesian.
- Keep technical terms in English when natural.

Rules:
- Always include all keys even if data is limited.
- Provide exactly 5 prioritized_actions sorted from highest impact + lowest effort first.
- Provide magic_rewrites when possible; minimum 3.
- For magic_rewrites.original, quote one complete sentence/bullet from source_snippets or other evidence fields in the structured JSON.
- Keep magic_rewrites.original in the same wording/language as the candidate evidence.
- If a section does not exist in the CV, set its score low and explain in section_audit.
- Be concrete: never give generic advice like "perbaiki deskripsi" without a specific example.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = parseJsonObject(chatCompletion.choices[0]?.message?.content);
    return result || null;

  } catch (error) {
    console.error('Error reviewing CV:', error);
    return null;
  }
}

// --- FUNGSI 3: ROLE MATCHER (CV vs JOB DESC) ---
export async function matchRole(formData: FormData) {
  const file = formData.get('file') as File;
  const jobDescription = formData.get('jobDescription') as string;

  if (!file || !jobDescription) throw new Error('File atau Job Desc kurang!');

  try {
    const structuredCv = await buildStructuredCvFromFile(file);
    if (!structuredCv) return null;

    const structuredCvPrompt = stringifyPromptJson(structuredCv);

    const systemPrompt = `You are a Hiring Manager + Career Strategist.
Compare the structured Candidate CV JSON with the Job Description (JD) in a practical, recruiter-grade way.

Analysis principles:
- Prioritize hard skills, tools, domain exposure, and measurable achievements.
- Consider seniority alignment, scope ownership, and complexity of work.
- Distinguish mandatory requirements vs nice-to-have requirements.
- Do not assume skills that are not explicitly shown in the CV.

Output strict JSON:
{
  "match_percentage": 0,
  "match_status": "string",
  "missing_skills": ["string"],
  "matching_skills": ["string"],
  "interview_strategy": [
    {
      "missing_skill": "string",
      "diplomatic_answer": "string"
    }
  ],
  "quick_fix": ["string"],
  "requirement_breakdown": [
    {
      "requirement": "string",
      "importance": "Must Have",
      "cv_evidence": "string",
      "fit_score": 0 // 0-100
    }
  ],
  "cv_tailoring_bullets": ["string"],
  "keyword_gap": {
    "missing_hard_keywords": ["string"],
    "missing_domain_keywords": ["string"]
  }
}

Rules:
- Keep JSON keys in English, all content values in Indonesian.
- Always include all keys.
- Return 2-4 items for missing_skills and matching_skills.
- Return exactly 3 interview_strategy items mapped to top missing skills.
- quick_fix: short, high-impact, low-effort actions (max 4 items).
- cv_tailoring_bullets: concrete bullet points ready to paste directly into a CV.`;

    const userContent = `=== JOB DESCRIPTION ===
${jobDescription.substring(0, 7000)}

=== STRUCTURED CANDIDATE CV JSON ===
${structuredCvPrompt}`;

    logDebugPreview('matchRole.userContent (structured CV sent to AI)', userContent);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    return parseJsonObject(chatCompletion.choices[0]?.message?.content);

  } catch (error) {
    console.error('Error matching role:', error);
    return null;
  }
}

// --- FUNGSI 4: INTERVIEW SIMULATOR ---
export async function chatInterview(
  messages: InterviewMessage[],
  context: { mode: 'general' | 'technical', jobTitle?: string, jobDesc?: string }
) {
  let systemInstruction = '';
  const isFirstTurn = messages.length === 0;

  if (context.mode === 'general') {
    systemInstruction = `You are a Friendly but Professional HR Recruiter.
You are conducting a behavioral interview.
${isFirstTurn ? 'Start by asking "Ceritakan tentang diri Anda" in Indonesian.' : 'Do NOT restart the interview. Continue from the latest candidate answer.'}
Ask standard HR topics (Strengths, Weaknesses, Conflict resolution), but adapt to candidate context.
First acknowledge/refer to the candidate's latest answer in 1 short sentence, then ask exactly 1 next question.
Never repeat the exact same question that already appeared in history unless candidate clearly did not answer.
Keep responses short (max 2-3 sentences) to simulate a real conversation.
Decide yourself when the interview is complete. Usually complete after enough signal is gathered (around 5-8 candidate answers), but you may finish earlier/later based on answer quality.
If complete, provide a short closing sentence and do not ask a new question.
Language: Indonesian (Colloquial/Formal mix).

Return strict JSON only with this exact schema:
{
  "reply": "string",
  "should_finish": false
}`;
  } else {
    systemInstruction = `You are a Senior Technical Lead for the role: ${context.jobTitle}.
You are conducting a hard-skill technical interview based on this Job Desc: "${context.jobDesc?.substring(0, 500)}...".

${isFirstTurn ? 'Start with one technical opening question in Indonesian relevant to the role.' : 'Do NOT restart the interview. Continue from the latest candidate answer.'}
Ask specific technical questions and dig deep on the candidate's previous answer.
First evaluate/acknowledge the latest candidate answer in 1 short sentence (correct, partial, or needs improvement), then ask exactly 1 follow-up or next question.
Never repeat the exact same question that already appeared in history unless candidate clearly did not answer.
Keep questions short and direct.
Decide yourself when the interview is complete. Usually complete after enough signal is gathered (around 5-8 candidate answers), but you may finish earlier/later based on answer quality.
If complete, provide a short closing sentence and do not ask a new question.
Language: Indonesian.

Return strict JSON only with this exact schema:
{
  "reply": "string",
  "should_finish": false
}`;
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages,
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const parsed = parseJsonObject(chatCompletion.choices[0]?.message?.content) || {};
    const reply = typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply
      : 'Maaf, saya tidak mendengar. Bisa ulangi?';
    const shouldFinish = parsed.should_finish === true;

    return { reply, shouldFinish };
  } catch (error) {
    console.error('Error interview chat:', error);
    return { reply: 'Gangguan sinyal. Mari kita lanjut.', shouldFinish: false };
  }
}

// --- FUNGSI 5: GENERATE INTERVIEW REPORT ---
export async function generateInterviewReport(
  messages: InterviewMessage[],
  context: { mode: 'general' | 'technical', jobTitle: string },
) {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are a Senior Hiring Manager. You have just finished interviewing a candidate.
Analyze the following INTERVIEW TRANSCRIPT.

Context:
- Mode: ${context.mode}
- Role Applied: ${context.jobTitle || 'General Position'}

Evaluate the candidate based on:
1. Communication Clarity
2. Relevance of Answers
3. Technical/Behavioral Depth

Return strict JSON:
{
  "score": 0,
  "verdict": "string",
  "feedback_summary": "string",
  "strengths": ["string"],
  "areas_for_improvement": ["string"],
  "sample_better_answer": {
    "question": "string",
    "candidate_answer": "string",
    "better_answer": "string"
  }
}
Language: Indonesian.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    return parseJsonObject(chatCompletion.choices[0]?.message?.content);
  } catch (error) {
    console.error('Error generating report:', error);
    return null;
  }
}
