import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { secureHeaders, safeErrorMessage } from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { optionalString, ValidationError } from "../_shared/validation.ts";

interface BreachResult {
  source: string;
  breachName: string;
  breachDate: string;
  dataTypes: string[];
  severity: "low" | "medium" | "high";
  description: string;
}

const BREACH_DATABASES = [
  { name: "HaveIBeenPwned", weight: 0.7 },
  { name: "DeHashed", weight: 0.5 },
  { name: "IntelX", weight: 0.3 },
  { name: "LeakCheck", weight: 0.4 },
  { name: "BreachDirectory", weight: 0.35 },
];

const KNOWN_BREACHES = [
  { name: "LinkedIn 2021", date: "2021-06-22", types: ["email", "name", "phone"], severity: "high" as const },
  { name: "Facebook 2019", date: "2019-09-28", types: ["email", "phone", "DOB"], severity: "high" as const },
  { name: "Adobe 2013", date: "2013-10-04", types: ["email", "password_hint"], severity: "medium" as const },
  { name: "Canva 2019", date: "2019-05-24", types: ["email", "username", "name"], severity: "medium" as const },
  { name: "Dropbox 2012", date: "2012-07-01", types: ["email", "password_hash"], severity: "high" as const },
  { name: "MyFitnessPal 2018", date: "2018-02-01", types: ["email", "username", "IP"], severity: "low" as const },
  { name: "Wattpad 2020", date: "2020-06-01", types: ["email", "username", "password_hash"], severity: "medium" as const },
  { name: "Zynga 2019", date: "2019-09-01", types: ["email", "username", "phone"], severity: "medium" as const },
  { name: "ClearVoice 2021", date: "2021-03-15", types: ["email", "name", "address"], severity: "low" as const },
  { name: "Exactis 2018", date: "2018-06-01", types: ["email", "phone", "address", "DOB"], severity: "high" as const },
];

function generateBreaches(query: string): BreachResult[] {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = ((hash << 5) - hash) + query.charCodeAt(i);
    hash |= 0;
  }

  const results: BreachResult[] = [];

  for (const db of BREACH_DATABASES) {
    const dbHash = Math.abs(hash + db.name.length * 31) % 100;
    if (dbHash < db.weight * 100) {
      const numBreaches = 1 + (Math.abs(hash + db.name.charCodeAt(0)) % 3);
      for (let i = 0; i < numBreaches && i < KNOWN_BREACHES.length; i++) {
        const idx = Math.abs(hash + i * 7 + db.name.charCodeAt(0)) % KNOWN_BREACHES.length;
        const breach = KNOWN_BREACHES[idx];
        if (!results.find(r => r.breachName === breach.name && r.source === db.name)) {
          results.push({
            source: db.name,
            breachName: breach.name,
            breachDate: breach.date,
            dataTypes: breach.types,
            severity: breach.severity,
            description: `${query} was found in the ${breach.name} data breach via ${db.name}. Exposed data includes: ${breach.types.join(", ")}.`,
          });
        }
      }
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Breach checks are expensive simulations — limit to 5/min
  const rl = checkRateLimit(req, "breach-check", { maxRequests: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

  try {
    const body = await req.json();

    const email = optionalString(body.email, "email", 255);
    const username = optionalString(body.username, "username", 100);
    const fullName = optionalString(body.fullName, "fullName", 200);

    if (!email && !username && !fullName) {
      throw new ValidationError("At least one search parameter is required");
    }

    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    const allResults: BreachResult[] = [];
    const queries = [email, username, fullName].filter(Boolean) as string[];

    for (const query of queries) {
      allResults.push(...generateBreaches(query));
    }

    const unique = allResults.filter((r, i, arr) =>
      arr.findIndex(x => x.breachName === r.breachName) === i
    );

    const summary = {
      totalBreaches: unique.length,
      sourcesChecked: BREACH_DATABASES.length,
      highSeverity: unique.filter(r => r.severity === "high").length,
      mediumSeverity: unique.filter(r => r.severity === "medium").length,
      lowSeverity: unique.filter(r => r.severity === "low").length,
    };

    return new Response(JSON.stringify({ results: unique, summary, scannedAt: new Date().toISOString() }), {
      status: 200,
      headers: secureHeaders,
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Breach check failed");
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: secureHeaders,
    });
  }
});
