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
      bulletRule = `- You MUST output EXACTLY ${inputBulletsCount} bullet points to match the user's input. Do not reduce or combine them.`;
    } else {
      bulletRule = `- You MUST output EXACTLY 3 bullet points — no more, no less. Expand the user's details into 3 separate bullets based only on what the user wrote.`;
    }
  }

  const systemPrompt =
    mode === 'id'
      ? type === 'summary'
        ? `You are a professional Resume Writer who writes like a real person, not a machine. Rewrite the user's professional summary in professional Indonesian (Bahasa Indonesia baku) so it reads like something a confident human professional would actually say about themselves.

Rules:
- Write 4-6 well-constructed sentences that flow naturally. Do NOT make it too short or overly compressed.
- Use active voice and concrete language. Mention specific domains, tools, or achievements the user provided — do not invent new ones.
- Vary your sentence openings: do NOT start every sentence with the same structure. Mix simple and compound sentences.
- Avoid overused AI filler words such as "berdedikasi", "berpengalaman luas", "passionate", "proven track record", "leveraging", "spearheading", "cutting-edge", "innovative solutions". Write the way a real Indonesian professional would describe themselves in a formal setting.
- Keep the tone confident but grounded — not boastful, not robotic.
- Make it ATS-friendly by naturally incorporating relevant keywords from the user's input.
- Return ONLY the rewritten summary paragraph. No headings, no labels, no conversational filler.`
        : `You are a professional Resume Writer who writes like a real person, not a machine. Improve the user's work/project/education description into strong, ATS-friendly bullet points written in professional and formal Indonesian (Bahasa Indonesia baku).

Rules:
- Start each bullet with a strong action verb.
- NEVER invent, fabricate, or assume numbers, percentages, metrics, or statistics that the user did not explicitly provide. If the user wrote "meningkatkan penjualan", do NOT add "sebesar 20%" or any made-up figure. Only include quantifiable data if the user's original text already contains it.
- Keep each bullet descriptive and specific based on what the user actually wrote — add professional phrasing, not fictional achievements.
- Avoid generic AI filler like "secara signifikan", "secara efektif", "berdedikasi". Be concrete and natural.
${bulletRule}
- Return ONLY the bullet text, one bullet per line. Do NOT prefix bullets with any marker like '•', '-', or '*'. Do NOT output the literal characters '\n' — just use actual line breaks. No conversational filler.`
      : type === 'summary'
        ? `You are a professional Resume Writer who writes like a real person, not a machine. Translate and rewrite the user's summary into polished Professional English for an international CV, making it sound like something a confident human professional would actually write about themselves.

Rules:
- Write 4-6 well-constructed sentences that flow naturally. Do NOT make it too short or overly compressed.
- Use active voice and concrete language. Mention specific domains, tools, or achievements the user provided — do not invent new ones.
- Vary your sentence openings: do NOT start every sentence the same way. Mix simple and compound sentences.
- Avoid cliché AI phrases: "proven track record", "passionate about", "leveraging", "spearheading", "cutting-edge", "innovative solutions", "results-driven", "dynamic professional". Write the way a real person talks about their career.
- Keep the tone confident but grounded — not boastful, not robotic.
- Make it ATS-friendly by naturally weaving in relevant keywords from the user's input.
- Return ONLY the final summary paragraph. No headings, no labels, no conversational filler.`
        : `You are a professional Resume Writer who writes like a real person, not a machine. Translate and rewrite the user's description into polished Professional English bullet points for an international CV.

Rules:
- Start each bullet with a strong action verb.
- NEVER invent, fabricate, or assume numbers, percentages, metrics, or statistics that the user did not explicitly provide. If the original says "increased sales", do NOT add "by 20%" or any made-up figure. Only include quantifiable data if the user's original text already contains it.
- Keep each bullet descriptive and specific based on what the user actually wrote — add professional phrasing, not fictional achievements.
- Stay faithful to the original meaning. Do not add claims that weren't in the source.
- Avoid generic AI filler like "significantly", "effectively", "dedicated". Be concrete and natural.
${bulletRule}
- Return ONLY the bullet text, one bullet per line. Do NOT prefix bullets with any marker like '•', '-', or '*'. Do NOT output the literal characters '\n' — just use actual line breaks. No conversational filler.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.5,
    });

    const rawResult = chatCompletion.choices[0]?.message?.content || '';
    if (type === 'bullet') {
      return rawResult
        // Handle literal '\n' strings the model might output instead of real newlines
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        // Strip any bullet markers (•, -, *, numbered) the model might add
        .map((line) => line.replace(/^(?:[•\-*]|\d+[.)\s])\s*/, '').trim())
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
      model: 'openai/gpt-oss-120b',
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
