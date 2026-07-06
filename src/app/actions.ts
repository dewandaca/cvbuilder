'use server'

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- FUNGSI: POLISH TEXT ---
export async function polishText(
  text: string,
  type: 'summary' | 'bullet',
  mode: 'id' | 'en' = 'id'
) {
  if (!text) return '';

  let bulletRule = '';
  if (type === 'bullet') {
    const inputBulletsCount = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^(•|-|\*)\s*/, '').trim())
      .filter((line) => line.length > 0).length;

    if (inputBulletsCount > 3) {
      bulletRule = ` The user has provided ${inputBulletsCount} bullet points. You are allowed to generate more than 3 bullet points (up to ${inputBulletsCount}) to adjust to and preserve the user's details, but do not exceed ${inputBulletsCount} bullet points.`;
    } else {
      bulletRule = ` The user has provided 3 or fewer bullet points. You MUST limit the output to a maximum of 3 bullet points.`;
    }
  }

  const systemPrompt =
    mode === 'id'
      ? type === 'summary'
        ? "You are a professional Resume Writer (Harvard Style). Improve the user's professional summary to be clearer, more impactful, and ATS-friendly, written in professional and formal Indonesian (Bahasa Indonesia baku). Keep it concise (max 3-4 sentences), use active voice, and avoid adding unsupported claims. Return ONLY the rewritten summary text, no conversational filler."
        : `You are a professional Resume Writer. Improve the user's work/project/education description into strong, ATS-friendly bullet points with action verbs and measurable impact where possible, written in professional and formal Indonesian (Bahasa Indonesia baku).${bulletRule} Return ONLY bullet lines, with each bullet point on its own line directly following the previous one (use single newline character '\\n' as separator, without empty lines/blank rows between them). DO NOT use markdown bullets like '-' or '*'. No conversational filler.`
      : type === 'summary'
        ? "You are a professional Resume Writer (Harvard Style). Translate and rewrite the user's summary into polished Professional English for an international CV. Keep it concise (max 3-4 sentences), use active voice, and keep the meaning faithful to the original text. Return ONLY the final summary text, no conversational filler."
        : `You are a professional Resume Writer. Translate and rewrite the user's description into polished Professional English bullet points for an international CV. Use strong action verbs and measurable impact when possible while preserving meaning.${bulletRule} Return ONLY bullet lines, with each bullet point on its own line directly following the previous one (use single newline character '\\n' as separator, without empty lines/blank rows between them). DO NOT use markdown bullets like '-' or '*'. No conversational filler.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
    });

    const rawResult = chatCompletion.choices[0]?.message?.content || '';
    if (type === 'bullet') {
      return rawResult
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');
    }
    return rawResult;
  } catch (error) {
    console.error('Error polishing text:', error);
    return 'Error generating text. Please try again.';
  }
}

// --- FUNGSI: PARSE CV FROM TEXT ---
export async function parseCvFromText(text: string): Promise<string> {
  const systemPrompt = `You are an expert CV/Resume parser. Extract all information from the provided CV text and return it as a valid JSON object.

The JSON must follow this exact schema:
{
  "personalInfo": {
    "fullName": "string",
    "address": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "summary": "string"
  },
  "educations": [
    {
      "school": "string",
      "major": "string",
      "gpa": "string",
      "startDate": "string",
      "endDate": "string",
      "isCurrent": false,
      "description": "string"
    }
  ],
  "experiences": [
    {
      "role": "string",
      "company": "string",
      "startDate": "string",
      "endDate": "string",
      "isCurrent": false,
      "description": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "role": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string"
    }
  ],
  "achievements": [
    {
      "name": "string",
      "year": "string"
    }
  ],
  "skills": {
    "hard": "string",
    "soft": "string"
  },
  "customSections": [
    {
      "title": "string (section heading as it appears in the CV)",
      "mode": "simple or experience",
      "content": "string (for simple mode: all text content joined with newlines)",
      "items": [
        {
          "title": "string (item heading/name)",
          "subtitle": "string (secondary info e.g. issuer, institution, location)",
          "startDate": "string",
          "endDate": "string",
          "isCurrent": false,
          "description": "string (bullet points or details, joined with newlines)"
        }
      ]
    }
  ],
  "sectionOrder": ["string"]
}

Rules:
- Extract ALL information present in the CV
- For descriptions: if the original CV uses bullet points (•, -, *, numbers, or any list markers) for that section's content, format EACH bullet as a separate line starting with "• " (bullet + space). If the original is a paragraph with no bullets, keep it as a plain paragraph. Do NOT convert paragraphs into bullets or vice versa. Join multiple lines with newline characters (\n).
- For skills: separate hard skills (technical) from soft skills (interpersonal) as comma-separated strings
- For dates: keep as-is from the CV (e.g. "Jan 2022", "2020", "March 2021 - Present")
- If a field is not found, use empty string "" or empty array []
- Set isCurrent to true if the position says "Present", "Current", "Now", "Sekarang", etc.
- IMPORTANT — Standard section mapping. The following section names (and common variants/translations) MUST be mapped to their corresponding standard field and NEVER placed in "customSections":
  - "summary", "profile", "objective", "about", "about me", "professional summary", "ringkasan", "profil" → "personalInfo.summary"
  - "education", "academic", "educational background", "pendidikan", "riwayat pendidikan" → "educations"
  - "experience", "work experience", "employment", "career", "work history", "professional experience", "pengalaman", "pengalaman kerja" → "experiences"
  - "projects", "project", "portfolio", "proyek", "hasil karya" → "projects"
  - "skills", "technical skills", "competencies", "keahlian", "kemampuan" → "skills"
  - "honors", "awards", "honors & awards", "honors and awards", "achievements", "accomplishments", "penghargaan", "prestasi" → "achievements"
- For "customSections": include ONLY sections that are NOT covered by the standard mapping above (e.g. Certifications, Languages, Volunteer, Publications, References, Interests, Courses, Extracurricular, Organizations, etc.)
  - Use mode "experience" if the section contains entries with a title, date range, and/or description (e.g. certifications with issue dates, volunteer work, organizations)
  - Use mode "simple" for plain lists or short paragraphs (e.g. languages, interests, references)
  - For "simple" mode: put all text in "content" and leave "items" as []
  - For "experience" mode: put each entry as an item in "items" and leave "content" as ""
- For "sectionOrder": list the section keys in the EXACT ORDER they appear in the CV from top to bottom. Use these exact key names: "summary", "education", "experience", "projects", "skills", "achievements". For custom sections, use "custom:<title>" where <title> is the exact section title string (e.g. "custom:Certifications", "custom:Languages"). Only include sections that are present in the CV.
- Return ONLY the JSON object, no markdown, no explanation, no code fences`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this CV:\n\n${text}` },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = chatCompletion.choices[0]?.message?.content || '{}';
    // Strip any accidental markdown code fences
    return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  } catch (error) {
    console.error('Error parsing CV:', error);
    throw new Error('Gagal memproses CV. Silakan coba lagi.');
  }
}
