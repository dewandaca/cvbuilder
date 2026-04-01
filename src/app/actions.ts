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
    .replace(/-\n(?=[a-zA-Z])/g, '')
    .replace(/([^\n])\n(?=[a-zA-Z0-9(])/g, '$1 ')
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
    const cvText = await parsePdfText(file);
    logDebugPreview('reviewCV.cvText (sent to AI)', cvText);

    const normalizedCvText = normalizeCvTextForLLM(cvText);
    logDebugPreview('reviewCV.normalizedCvText (sent to AI)', normalizedCvText);

    if (!cvText || cvText.trim().length < 50) {
      return null;
    }

    const systemPrompt = `You are a Senior Technical Recruiter + Resume Coach.
Analyze CV text deeply with ATS + recruiter lens and produce highly practical recommendations.

Evaluation framework:
- Impact-driven writing (action verbs, metrics, business outcome)
- Role alignment and keyword coverage
- Clarity, structure, chronology consistency, and scanability
- Evidence quality (tools, scope, ownership, results)
- Seniority signals (decision making, complexity handled, leadership)

You MUST return valid JSON with this EXACT structure:
{
  "score": 0, // 0-100 based on Harvard Standard
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
- Provide exactly 3 magic_rewrites when possible; minimum 2.
- For magic_rewrites.original, quote one complete sentence/bullet from CV. Do not truncate at comma or halfway through a sentence.
- If source sentence is split by PDF line breaks, reconstruct it into one continuous full sentence while keeping the original wording.
- If a section does not exist in the CV, set its score low and explain in section_audit.
- Be concrete: never give generic advice like "perbaiki deskripsi" without a specific example.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: normalizedCvText },
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
    const cvText = await parsePdfText(file);
    logDebugPreview('matchRole.cvText (raw extraction)', cvText);

    if (!cvText || cvText.trim().length < 50) return null;

    const systemPrompt = `You are a Hiring Manager + Career Strategist.
Compare the Candidate CV with the Job Description (JD) in a practical, recruiter-grade way.

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

=== CANDIDATE CV ===
${cvText.substring(0, 7000)}`;

  logDebugPreview('matchRole.userContent (sent to AI)', userContent);

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
export async function generateInterviewReport(messages: any[], context: { mode: string, jobTitle: string }) {
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
