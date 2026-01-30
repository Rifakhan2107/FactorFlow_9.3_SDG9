/**
 * Google Gemini API integration for generating ACVA-format verification reports
 * from seller-uploaded project data.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-1.5-flash";

export interface ProjectDataForReport {
  name: string;
  description: string;
  type: string;
  country: string;
  region: string;
  volumeTCO2e: number;
  startDate: string;
  monitoringPlan: string;
  complianceStatus?: string;
}

const ACVA_TEMPLATE_INTRO = `
You are an expert carbon project verifier. Generate a structured verification report in ACVA (carbon credit verification) format based on the following project data.
Output ONLY the report content, no preamble. Use clear section headers and bullet points.
Sections to include:
1. PROJECT OVERVIEW (name, type, location, volume tCO2e, vintage/period)
2. METHODOLOGY & MONITORING (monitoring plan summary)
3. COMPLIANCE & DOCUMENTATION (compliance status, documents referenced)
4. VERIFICATION STATEMENT (summary attestation of project eligibility for carbon credits)
5. RECOMMENDATIONS (if any)
Keep the tone professional and suitable for third-party verification submission.
`;

export async function generateACVAReport(projectData: ProjectDataForReport): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not set. Add your Gemini API key in .env");
  }

  const prompt = `${ACVA_TEMPLATE_INTRO}\n\nProject data:\n${JSON.stringify(projectData, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(data.error.message || "Gemini API error");
  }

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return text;
}
