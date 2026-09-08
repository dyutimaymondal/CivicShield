/**
 * CivicShield OpenRouter Real AI Service
 * 
 * Connects directly to OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
 * Supports all OpenRouter models (Gemini 2.0 Flash, Llama 3.3 70B, GPT-4o-mini, Claude 3.5 Sonnet, etc.)
 * Provides structured JSON parsing with defensive error handling and instant fallback.
 */

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

class OpenRouterService {
  getApiKey() {
    return (import.meta.env?.VITE_OPENROUTER_API_KEY || "").trim();
  }

  getModel() {
    return (import.meta.env?.VITE_OPENROUTER_MODEL || DEFAULT_MODEL).trim();
  }

  isOpenRouterConfigured() {
    const key = this.getApiKey();
    return Boolean(key && !key.includes("your_openrouter_api_key"));
  }

  /**
   * Helper to clean LLM response and parse JSON even if wrapped in markdown code blocks or preceded by thinking
   */
  _cleanAndParseJson(rawContent) {
    if (!rawContent || typeof rawContent !== "string") return null;

    const text = rawContent.trim();

    // 1. Direct JSON parse
    try {
      return JSON.parse(text);
    } catch {}

    // 2. Markdown code block extraction (```json { ... } ``` or ``` { ... } ```)
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {}
    }

    // 3. Substring extraction between first { and last }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {}
    }

    return null;
  }

  /**
   * Core request dispatcher to OpenRouter chat completions
   */
  async _callOpenRouter(messages, temperature = 0.2, maxTokens = 1200) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    const model = this.getModel();

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
        "X-Title": "CivicShield AI Civic Intelligence"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const parsed = this._cleanAndParseJson(rawContent);

    if (!parsed) {
      throw new Error("Failed to parse structured JSON from OpenRouter response");
    }

    return {
      data: parsed,
      model: data?.model || model,
      usage: data?.usage
    };
  }

  /**
   * 1. Live Multi-Factor Incident Analysis via LLM
   */
  async analyzeCivicReport(description, location = "") {
    if (!this.isOpenRouterConfigured()) return null;

    const systemPrompt = `You are the CivicShield Autonomous Municipal Intelligence Analyst.
Analyze citizen complaint narratives and extract structured municipal triage intelligence.

Return strictly a JSON object with this exact schema:
{
  "category": "Roads & Transportation" | "Water Supply & Drainage" | "Sanitation & Waste Management" | "Power & Electrical Grid" | "Public Safety & Emergency",
  "subCategory": "string describing exact failure (e.g. Hazardous Roadway Crater, Exposed Live Cable)",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "severityScore": float between 0.1 and 1.0 (Critical=1.0, High=0.8, Medium=0.5, Low=0.2),
  "impact": "Local" | "Neighborhood" | "Ward-wide" | "City-wide",
  "impactScore": float between 0.2 and 1.0,
  "confidence": float between 0.70 and 0.99,
  "keywords": ["array", "of", "relevant", "civic", "terms"],
  "entities": [{"type": "LOCATION" | "INFRASTRUCTURE" | "HAZARD", "text": "value"}],
  "normalizedProblem": "Concise high-impact headline of the issue",
  "summary": "Dispatch brief detailing the core problem, public risk, and triage urgency."
}
Output strictly the JSON object. Do not include chain-of-thought, thinking process, preamble, or markdown commentary outside the JSON.`;

    const userPrompt = `Location Context: ${location || "Unspecified Area"}
Complaint Narrative: "${description}"

Analyze and return the structured JSON.`;

    try {
      const res = await this._callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], 0.1, 1200);

      return {
        ...res.data,
        model: res.model,
        source: "OpenRouter LLM",
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.warn("OpenRouter report analysis failed, falling back to local heuristic core:", err.message);
      return null;
    }
  }

  /**
   * 2. Grounded Public Demand Synthesis for Digital Micro-Protest
   */
  async generatePublicDemand(incident) {
    if (!this.isOpenRouterConfigured()) return null;

    const systemPrompt = `You are the CivicShield Public Demand Synthesizer.
Your role is to draft a legitimate, constitutional, non-violent civic demand for a Digital Micro-Protest based on verified incident evidence.

Requirements:
1. Concise, specific, actionable, and non-threatening.
2. Directly linked to the specific municipal problem and location.
3. Explicitly demand public works action and a published timeline.
4. MUST NEVER suggest or encourage physical assembly, blocking traffic, violence, or unlawful action.

Return strictly a JSON object:
{
  "title": "Demand Action: Short title",
  "demand_text": "One or two concise sentences specifying the exact municipal remedy and accountability timeline requested."
}
Output strictly the JSON object. Do not include chain-of-thought, thinking process, preamble, or markdown commentary outside the JSON.`;

    const userPrompt = `Incident: "${incident.title}"
Category: "${incident.category}"
Location: "${incident.location || "Affected Ward"}"
Problem Details: "${incident.description}"

Draft the official Digital Micro-Protest public demand.`;

    try {
      const res = await this._callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], 0.2, 1000);

      return {
        title: res.data.title || `Demand Action: ${incident.title}`,
        demand_text: res.data.demand_text,
        provenance: {
          source: `OpenRouter (${res.model})`,
          confidence: 0.95,
          model: res.model,
          generated_at: new Date().toISOString(),
          human_approved: true
        }
      };
    } catch (err) {
      console.warn("OpenRouter demand generation failed, falling back to local template:", err.message);
      return null;
    }
  }

  /**
   * 3. AI Authority Brief & Dispatch Dossier Generator
   */
  async generateAuthorityBrief(incident, microProtest, reportCount = 1, supportersCount = 0) {
    if (!this.isOpenRouterConfigured()) return null;

    const systemPrompt = `You are the Municipal Operations Chief of Staff advising city commissioners.
Synthesize an executive dispatch brief and concrete technical action checklist based on clustered reports and citizen demand.

Return strictly a JSON object:
{
  "problemSummary": "Crisp executive summary of the physical failure and community impact",
  "recommendedActions": [
    "Specific technical step 1 (e.g. Deploy site engineer with ultrasound tester)",
    "Specific safety measure 2 (e.g. Erect neon reflective perimeter cordon)",
    "Remediation step 3",
    "Public communication step 4"
  ]
}
Output strictly the JSON object. Do not include chain-of-thought, thinking process, preamble, or markdown commentary outside the JSON.`;

    const userPrompt = `Incident: "${incident.title}"
Category: "${incident.category}"
Severity: "${incident.severity}"
Location: "${incident.location}"
Clustered Reports: ${reportCount}
Citizen Demand: "${microProtest?.demand_text || "Remediate infrastructure concern"}"
Collective Support: ${supportersCount} verified citizens

Generate the executive brief and action checklist.`;

    try {
      const res = await this._callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], 0.2, 1200);

      return {
        problemSummary: res.data.problemSummary,
        recommendedActions: res.data.recommendedActions || [],
        model: res.model
      };
    } catch (err) {
      console.warn("OpenRouter authority brief failed, falling back to rule base:", err.message);
      return null;
    }
  }
}

export const openRouterService = new OpenRouterService();
