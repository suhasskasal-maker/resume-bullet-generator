import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobDescription, experience } = req.body;

  if (!jobDescription || !experience) {
    return res.status(400).json({ error: "jobDescription and experience are required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
  }

  const prompt = `You are an expert resume writer helping a candidate get the best possible shot at a specific role.

Follow these steps exactly:

STEP 1: Read the full job description. Extract the core underlying requirements — the actual skills, competencies, and capabilities the employer needs. Ignore surface-level details like specific years of experience, industry names, and filler language. Focus on what this person actually needs to be able to do in this role.

STEP 2: Analyze the user's experience in full — roles, projects, contributions, skills, tools, and outcomes. Understand what they have actually done regardless of which industry they did it in.

Important: The job description will reference a specific industry. The user's experience may come from a completely different industry. Do not treat the user's industry-specific terminology at face value. Extract their underlying skills, capabilities, and achievements in industry-neutral terms first. Then reframe those generic competencies against the specific requirements and language of the job description.

STEP 3: For each core requirement, find the closest experience the user has based on transferable skills, not industry match. Someone who managed stakeholders in healthcare can manage stakeholders in fintech. Someone who built dashboards for an EAP company can build dashboards for a SaaS company. Focus on the underlying capability, not the domain it happened in.

Reframe the user's experience into resume bullets that mirror the JD's language and keywords while drawing from what the user has actually done. Position transferable skills confidently. Do not fabricate experience, metrics, or achievements not mentioned or clearly implied by the user's input. If nothing in the user's experience maps to a core requirement even as a transferable skill, skip it silently.

Be less aggressive about skipping JD requirements. Only skip if the user's experience has absolutely zero relevance — not even a transferable skill. Most professional experience has some transferable overlap with most JD requirements. For example: someone who designed access control systems and compliance workflows has operated in regulated domains. Someone who presented to client leadership and trained internal teams demonstrates crisp communication with technical and non-technical stakeholders. Someone who created launch materials and edge-case documentation has supported go-to-market readiness. Look harder for these connections before skipping. When the connection is a transferable skill rather than a direct match, frame it confidently — do not hedge or qualify it.

BULLET WRITING INSTRUCTIONS:
When writing each bullet, mirror the exact language and phrasing from the JD requirement it maps to. If the JD says 'foundational layers' use 'foundational layers.' If the JD says 'break down ambiguous problem statements' use that exact framing. The bullet should read like a direct answer to the JD requirement — as if the candidate read the requirement and said 'here's proof I've done exactly this.'

Do not write general achievement summaries. Each bullet should clearly map to one specific JD requirement. A recruiter scanning the resume alongside the JD should be able to draw a line between each bullet and the requirement it addresses.

Structure each bullet as: [JD-mirrored framing of what was done] + [specific evidence from user's experience proving they did it] + [outcome or result if available].

Example of what NOT to do: 'Owned complete product lifecycle for platform transformation serving 350+ clients' — this is a generic achievement summary.

Example of what TO do: 'Owned foundational platform layers including onboarding flows, access control, and reporting infrastructure, redesigning the registration and onboarding system across 6 entry modes to resolve systematic data capture gaps resulting in 30% accuracy improvement' — this mirrors JD language and proves the skill with specifics.

CONCISENESS AND STRUCTURE RULES:
Keep each bullet concise — maximum 20-25 words. Structure: strong action verb + what was done + one key result or metric. Do not chain multiple achievements into a single bullet. If a JD requirement has multiple proof points, split them into separate bullets. Every word must earn its place — cut filler, cut adjectives, cut anything a recruiter would skip over.

Output one clean list of bullets. Each bullet should start with a strong action verb and be optimized for both ATS keyword scanning and human readability.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S EXPERIENCE:
${experience}

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
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text.trim();

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
    console.error("Anthropic API error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
