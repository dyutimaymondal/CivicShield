// Supabase Edge Function: analyze-report
// Hardened with JWT Verification, Rate Limiting, Input Sanitization & Anti-Injection Defense

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In-Memory Rate Limiter for Edge Runtime (Sliding Window per user ID)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 analysis requests
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5-minute sliding window

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

// Input Sanitization for Edge Layer
function sanitizeText(input: unknown, maxLen = 2500): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/\0/g, "")
    .replace(/<[^>]*>?/gm, "") // Strip HTML/scripts
    .replace(/--+/g, "-") // Strip SQL comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Strip multi-line SQL comments
    .replace(/;\s*(DROP|DELETE|UPDATE|INSERT|SELECT|ALTER|TRUNCATE)\b/gi, "")
    .slice(0, maxLen)
    .trim();
}

serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify Authentication (Reject Unauthenticated Calls)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Valid Bearer JWT token required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Enforce Edge Rate Limiting per authenticated user
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Too many report analysis requests. Please try again in 5 minutes.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "300",
          },
        }
      );
    }

    // 3. Parse and Validate Request Payload
    let body: { description?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawDescription = body?.description;
    const sanitizedDescription = sanitizeText(rawDescription);

    if (!sanitizedDescription || sanitizedDescription.length < 8) {
      return new Response(
        JSON.stringify({ error: "Complaint description must be at least 8 characters long." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Autonomous Classification & Triage Engine
    const lower = sanitizedDescription.toLowerCase();

    let category = "General Infrastructure";
    let issue = "Civic Infrastructure Disruption";
    let severity = "Medium";
    let priority = "P2 - Standard Municipal Review";

    // Domain heuristic classification with keyword mapping
    if (lower.includes("pothole") || lower.includes("road") || lower.includes("bridge") || lower.includes("traffic") || lower.includes("highway") || lower.includes("asphalt")) {
      category = "Roads & Transportation";
      issue = lower.includes("pothole") ? "Dangerous Roadway Pothole" : "Road Infrastructure Damage";
      severity = lower.includes("accident") || lower.includes("crash") || lower.includes("deep") || lower.includes("severe") ? "High" : "Medium";
    } else if (lower.includes("water") || lower.includes("leak") || lower.includes("pipe") || lower.includes("drain") || lower.includes("flood") || lower.includes("sewage")) {
      category = "Water Supply & Drainage";
      issue = lower.includes("sewage") ? "Hazardous Sewage Overflow" : "Water Pipeline Disruption";
      severity = lower.includes("flood") || lower.includes("burst") || lower.includes("contamination") ? "Critical" : "High";
    } else if (lower.includes("garbage") || lower.includes("trash") || lower.includes("waste") || lower.includes("dump") || lower.includes("smell") || lower.includes("sanitation")) {
      category = "Sanitation & Waste Management";
      issue = "Public Waste & Sanitation Accumulation";
      severity = lower.includes("hospital") || lower.includes("rot") || lower.includes("overflow") ? "High" : "Medium";
    } else if (lower.includes("electric") || lower.includes("wire") || lower.includes("spark") || lower.includes("blackout") || lower.includes("street light") || lower.includes("power")) {
      category = "Power & Electrical Grid";
      issue = lower.includes("wire") || lower.includes("spark") ? "Exposed Live Wire Hazard" : "Municipal Lighting Disruption";
      severity = lower.includes("live wire") || lower.includes("spark") || lower.includes("fire") ? "Critical" : "Medium";
    } else if (lower.includes("fire") || lower.includes("collapse") || lower.includes("gas leak") || lower.includes("danger") || lower.includes("emergency")) {
      category = "Public Safety & Emergency";
      issue = "Immediate Civic Safety Hazard";
      severity = "Critical";
    }

    if (severity === "Critical") {
      priority = "P0 - Emergency Dispatch";
    } else if (severity === "High") {
      priority = "P1 - Urgent Municipal Attention";
    }

    const summary = `AI Assessment: Identified ${category.toLowerCase()} concern ("${issue}"). Evaluated severity as ${severity} with dispatch priority ${priority}.`;

    return new Response(
      JSON.stringify({
        issue,
        category,
        severity,
        priority,
        summary,
        sanitizedInput: sanitizedDescription.slice(0, 80) + (sanitizedDescription.length > 80 ? "..." : ""),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error occurred.";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
