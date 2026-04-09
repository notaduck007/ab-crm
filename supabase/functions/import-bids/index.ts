import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = values[i] ?? ""));
    return obj;
  });
}

const VALID_TIERS = ["A", "B", "AE"];
const VALID_SECTORS = ["ISD", "Higher Education", "City", "County", "Charter School", "Private Education", "Other"];
const VALID_DELIVERY = ["GC", "CMAR", "Design-Build", "RFQ/Pre-qual", "Architect-Engineer Lead", "Other"];

function normalizeBid(raw: Record<string, string>) {
  const bid_number = raw.bid_number?.trim();
  if (!bid_number) return null;

  const tier = VALID_TIERS.includes(raw.tier) ? raw.tier : "B";
  const sector = VALID_SECTORS.includes(raw.sector) ? raw.sector : "Other";
  const delivery_method = VALID_DELIVERY.includes(raw.delivery_method) ? raw.delivery_method : "Other";
  const estimated_value = raw.estimated_value ? parseInt(raw.estimated_value, 10) || null : null;

  return {
    bid_number,
    agency: raw.agency?.trim() || "Unknown",
    project_name: raw.project_name?.trim() || "Untitled",
    sector,
    delivery_method,
    estimated_value,
    issue_date: raw.issue_date || null,
    due_date: raw.due_date || new Date().toISOString().slice(0, 10),
    tier,
    status: "New",
    contact_name: raw.contact_name?.trim() || null,
    contact_email: raw.contact_email?.trim() || null,
    source_portal: raw.source_portal?.trim() || null,
    bid_url: raw.bid_url?.trim() || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("IMPORT_API_KEY");
  if (!expectedKey || !authHeader || authHeader.replace("Bearer ", "") !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentType = req.headers.get("Content-Type") || "";
    const bodyText = await req.text();
    let records: Record<string, string>[];

    if (contentType.includes("text/csv")) {
      records = parseCSV(bodyText);
    } else {
      const parsed = JSON.parse(bodyText);
      records = Array.isArray(parsed) ? parsed : [parsed];
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get existing bid_numbers
    const incomingNumbers = records.map((r) => r.bid_number?.trim()).filter(Boolean);
    const { data: existing } = await supabase
      .from("bids")
      .select("bid_number")
      .in("bid_number", incomingNumbers);
    const existingSet = new Set((existing || []).map((r) => r.bid_number));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of records) {
      const bid = normalizeBid(raw);
      if (!bid) {
        errors.push(`Missing bid_number in record`);
        continue;
      }
      if (existingSet.has(bid.bid_number)) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("bids").insert(bid);
      if (error) {
        errors.push(`${bid.bid_number}: ${error.message}`);
      } else {
        imported++;
        existingSet.add(bid.bid_number);
      }
    }

    return new Response(JSON.stringify({ imported, skipped, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
