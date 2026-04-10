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

function sanitizeInterviewReply(reply: string): string {
  let sanitized = reply.trim();

  // Remove leading evaluative feedback so interviewer stays neutral.
  sanitized = sanitized.replace(
    /^(terima kasih,?\s*)?(jawaban\s+(anda|kamu)\s+(benar|tepat|bagus|sangat bagus|cukup baik|kurang tepat|kurang lengkap|salah)\b[^.!?]*[.!?]\s*)/i,
    '',
  );
  sanitized = sanitized.replace(/^(benar|betul|tepat)\s*,\s*/i, '');

  if (!sanitized) {
    return reply.trim();
  }

  const firstChar = sanitized[0];
  if (firstChar >= 'a' && firstChar <= 'z') {
    sanitized = firstChar.toUpperCase() + sanitized.slice(1);
  }

  return sanitized;
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

function normalizeReviewCvResult(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;

  const normalizedPayload: Record<string, unknown> = { ...payload };

  const strengths = asStringArray(normalizedPayload.strengths);
  const weaknesses = asStringArray(normalizedPayload.weaknesses);
  const redFlags = asStringArray(normalizedPayload.red_flags);

  if (strengths.length > 0) {
    normalizedPayload.strengths = strengths.slice(0, 5);
  } else {
    normalizedPayload.strengths = ['Struktur CV sudah cukup jelas dan mudah dibaca recruiter.'];
  }

  if (weaknesses.length > 0) {
    normalizedPayload.weaknesses = weaknesses.slice(0, 5);
  } else if (redFlags.length > 0) {
    normalizedPayload.weaknesses = redFlags.slice(0, 5);
  } else {
    normalizedPayload.weaknesses = ['Impact terukur dan keyword ATS masih perlu diperkuat.'];
  }

  const atsAnalysis = asObject(normalizedPayload.ats_analysis);
  if (!atsAnalysis) return normalizedPayload;

  const normalizedRoles = asObjectArray(atsAnalysis.detected_roles)
    .map((item) => {
      const role = readString(item, 'role');
      if (!role) return null;

      const fitScoreValue = item.fit_score;
      const fitScore =
        typeof fitScoreValue === 'number' && Number.isFinite(fitScoreValue)
          ? Math.max(0, Math.min(100, Math.round(fitScoreValue)))
          : undefined;

      const reason = readString(item, 'reason');

      return {
        role,
        ...(typeof fitScore === 'number' ? { fit_score: fitScore } : {}),
        ...(reason ? { reason } : {}),
      };
    })
    .filter((item): item is { role: string; fit_score?: number; reason?: string } => !!item);

  if (!normalizedRoles.length) {
    const fallbackRole = readString(atsAnalysis, 'detected_role');
    if (fallbackRole) {
      normalizedRoles.push({ role: fallbackRole });
    }
  }

  const dedupedRoles = normalizedRoles.filter((item, index, arr) =>
    arr.findIndex((candidate) => candidate.role.toLowerCase() === item.role.toLowerCase()) === index,
  );

  if (!dedupedRoles.length) return normalizedPayload;

  return {
    ...normalizedPayload,
    ats_analysis: {
      ...atsAnalysis,
      detected_role: readString(atsAnalysis, 'detected_role') || dedupedRoles[0].role,
      detected_roles: dedupedRoles.slice(0, 5),
    },
  };
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
    "score": 0, // 0-100 holistic ATS readiness score (writing quality, structure, role relevance, and keyword coverage)
    "missing_keywords": ["string"],
    "detected_role": "string", // primary best-fit role (must match detected_roles[0].role)
    "detected_roles": [
      {
        "role": "string",
        "fit_score": 0, // 0-100 based on CV evidence strength
        "reason": "string (in Indonesian)"
      }
    ]
  },
  "strengths": ["string (in Indonesian)"],
  "weaknesses": ["string (in Indonesian)"],
  "red_flags": ["string (in Indonesian)"],
  "section_audit": {
    "summary": "string (in Indonesian)",
    "experience": "string (in Indonesian)"
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
- ats_analysis.score must be calculated holistically, not keyword-only.
- Use weighted rubric for ats_analysis.score:
  - Writing clarity, impact, and bullet quality: 40%
  - Role alignment and keyword coverage: 30%
  - Evidence quality (scope, ownership, measurable outcomes): 20%
  - Structure, chronology consistency, and scanability: 10%
- detected_roles must contain 3-5 realistic role options sorted by fit_score descending.
- detected_role must be exactly the same as detected_roles[0].role.
- Each detected role must be inferred from evidence in CV (skills, projects, experience), not random generic titles.
- strengths must contain 3-5 concise points.
- weaknesses must contain 3-5 concise points.
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
    return normalizeReviewCvResult(result);

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
You are conducting a behavioral interview in Indonesian.
${isFirstTurn ? 'Open like an HR interviewer: greet the candidate briefly, then ask exactly 1 opening question "Ceritakan tentang diri Anda".' : 'Do NOT restart the interview. Continue from the latest candidate answer.'}
Ask standard HR topics (Strengths, Weaknesses, Conflict resolution), but adapt to candidate context.
For non-first turns: briefly refer to one specific point from the candidate\'s latest answer in neutral tone, then ask exactly 1 follow-up question.
Do NOT grade, validate, or correct the candidate\'s answer. Avoid evaluative phrases such as "Jawaban Anda benar", "jawaban kamu tepat", "benar sekali", or "kurang tepat".
Never repeat the exact same question that already appeared in history unless candidate clearly did not answer.
Keep responses short (max 2-3 sentences) to simulate a real conversation.
Decide yourself when the interview is complete. Usually complete after enough signal is gathered (around 5-8 candidate answers), but you may finish earlier/later based on answer quality.
If complete, provide a short HR-style closing: thank the candidate, say next step will be informed, and do not ask a new question.
Language: Indonesian (Colloquial/Formal mix).

Return strict JSON only with this exact schema:
{
  "reply": "string",
  "should_finish": false
}`;
  } else {
    systemInstruction = `You are a Professional Technical Interviewer for the role: ${context.jobTitle}.
You are conducting a hard-skill technical interview based on this Job Desc: "${context.jobDesc?.substring(0, 500)}...".

${isFirstTurn ? 'Open like an HR interviewer: greet briefly, state this is a technical session, then ask exactly 1 technical opening question in Indonesian relevant to the role.' : 'Do NOT restart the interview. Continue from the latest candidate answer.'}
Ask specific technical questions and dig deep on the candidate\'s previous answer.
For non-first turns: briefly refer to one concrete detail from the candidate\'s latest answer in neutral tone, then ask exactly 1 deeper technical follow-up question.
Do NOT grade, validate, or correct the candidate\'s answer. Avoid evaluative phrases such as "Jawaban Anda benar", "jawaban kamu tepat", "benar sekali", or "kurang tepat".
Never repeat the exact same question that already appeared in history unless candidate clearly did not answer.
Keep questions short and direct.
Decide yourself when the interview is complete. Usually complete after enough signal is gathered (around 5-8 candidate answers), but you may finish earlier/later based on answer quality.
If complete, provide a short HR-style closing: thank the candidate, say next step will be informed, and do not ask a new question.
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
      ? sanitizeInterviewReply(parsed.reply)
      : 'Maaf, saya tidak mendengar. Bisa ulangi?';
    const shouldFinish = parsed.should_finish === true;

    return { reply, shouldFinish };
  } catch (error) {
    console.error('Error interview chat:', error);
    return { reply: 'Gangguan sinyal. Mari kita lanjut.', shouldFinish: false };
  }
}

function normalizeInterviewReportResult(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;

  const normalizedPayload: Record<string, unknown> = { ...payload };
  const moments: Array<{ question: string; candidate_answer: string; better_answer: string }> = [];

  for (const item of asObjectArray(normalizedPayload.sample_better_answers)) {
    const question = readString(item, 'question');
    const candidateAnswer = readString(item, 'candidate_answer');
    const betterAnswer = readString(item, 'better_answer');

    if (!question || !candidateAnswer || !betterAnswer) continue;
    moments.push({
      question,
      candidate_answer: candidateAnswer,
      better_answer: betterAnswer,
    });
  }

  const legacyMoment = asObject(normalizedPayload.sample_better_answer);
  if (legacyMoment) {
    const question = readString(legacyMoment, 'question');
    const candidateAnswer = readString(legacyMoment, 'candidate_answer');
    const betterAnswer = readString(legacyMoment, 'better_answer');

    if (question && candidateAnswer && betterAnswer) {
      moments.push({
        question,
        candidate_answer: candidateAnswer,
        better_answer: betterAnswer,
      });
    }
  }

  const dedupedMoments = moments.filter((moment, index, arr) =>
    arr.findIndex((candidate) =>
      candidate.question === moment.question
      && candidate.candidate_answer === moment.candidate_answer
      && candidate.better_answer === moment.better_answer,
    ) === index,
  );

  normalizedPayload.sample_better_answers = dedupedMoments.slice(0, 3);
  delete normalizedPayload.sample_better_answer;

  return normalizedPayload;
}

// --- FUNGSI 5: GENERATE INTERVIEW REPORT ---
export async function generateInterviewReport(
  messages: InterviewMessage[],
  context: { mode: 'general' | 'technical', jobTitle: string },
) {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
    .join('\n');

  const weightedRubric = context.mode === 'technical'
    ? `- Communication Clarity: 20%
- Relevance of Answers to the question: 30%
- Technical Depth & Problem-Solving: 50%`
    : `- Communication Clarity: 35%
- Relevance of Answers to the question: 35%
- Behavioral Depth (ownership, reflection, decision quality): 30%`;

  const systemPrompt = `You are a Senior Hiring Manager writing a final interview debrief.
Analyze the following INTERVIEW TRANSCRIPT and produce a fair, evidence-based assessment.

Context:
- Mode: ${context.mode}
- Role Applied: ${context.jobTitle || 'General Position'}

Use this weighted rubric:
${weightedRubric}

Score calibration (0-100):
- 90-100: exceptional, consistent, high-confidence hire
- 75-89: strong, mostly solid with minor gaps
- 60-74: acceptable but uneven, notable gaps
- 40-59: weak signal, many important gaps
- 0-39: very weak, not ready for role

Rules:
- Base judgments only on evidence from candidate answers in transcript.
- Do not hallucinate achievements, tools, or experience not stated by candidate.
- If interview data is limited (few candidate answers), mention this limitation in feedback_summary and score conservatively.
- Keep feedback actionable and specific to role context.
- Tone: professional, direct, constructive, like real HR debrief.

Return strict JSON with this exact schema:
{
  "score": 0,
  "verdict": "string",
  "feedback_summary": "string",
  "strengths": ["string"],
  "areas_for_improvement": ["string"],
  "sample_better_answers": [
    {
      "question": "string",
      "candidate_answer": "string",
      "better_answer": "string"
    }
  ]
}

Output constraints:
- Keep JSON keys in English, all content values in Indonesian.
- score must be an integer from 0 to 100.
- verdict must be exactly one of: "Sangat Direkomendasikan", "Direkomendasikan", "Dipertimbangkan", "Belum Direkomendasikan".
- feedback_summary: 3-5 kalimat, ringkas tapi tajam.
- strengths: 3-5 poin, spesifik dan berbasis bukti.
- areas_for_improvement: 3-5 poin, prioritaskan gap paling penting.
- sample_better_answers must contain 2-3 items.
- Each sample_better_answers item.question and candidate_answer must correspond to one weak moment from transcript.
- Each sample_better_answers item.better_answer harus realistis, relevan role, dan menunjukkan kualitas jawaban yang lebih kuat.
- Do not include markdown, code fences, or any text outside JSON.`;

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

    return normalizeInterviewReportResult(parseJsonObject(chatCompletion.choices[0]?.message?.content));
  } catch (error) {
    console.error('Error generating report:', error);
    return null;
  }
}
