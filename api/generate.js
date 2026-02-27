import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobDescription, experience } = req.body;

  if (!jobDescription || !experience) {
    return res.status(400).json({ error: "jobDescription and experience are required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  const prompt = `You are an expert resume writer. Your task is to generate tailored resume bullet points that match a candidate's experience to a specific job description.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S EXPERIENCE:
${experience}

Generate 5-7 resume bullet points that:
- Start with a strong, varied action verb (e.g. Engineered, Spearheaded, Optimized, Reduced, Delivered)
- Are tightly tailored to the keywords and responsibilities in the job description
- Incorporate quantified results wherever possible (percentages, dollar amounts, time saved, scale)
- Are concise — one to two lines each
- Follow the format: Action Verb + Task/Project + Result/Impact

Return ONLY a JSON object in this exact format, with no markdown, no code fences, no explanation:
{
  "bullets": [
    "Bullet point one.",
    "Bullet point two.",
    "Bullet point three.",
    "Bullet point four.",
    "Bullet point five."
  ]
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if the model wraps output anyway
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "Failed to parse model response", raw: cleaned });
    }

    if (!Array.isArray(parsed.bullets)) {
      return res.status(500).json({ error: "Unexpected response shape", raw: parsed });
    }

    return res.status(200).json({ bullets: parsed.bullets });
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
