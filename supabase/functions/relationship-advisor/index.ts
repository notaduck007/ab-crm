import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelationshipData {
  companyName: string;
  marketSector: string;
  stage: string;
  strength: string;
  lastInteractionDate: string | null;
  daysSinceContact: number;
  estimatedValue: number;
  recentInteractions: Array<{
    type: string;
    notes: string | null;
    date: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { relationships } = await req.json() as { relationships: RelationshipData[] };

    if (!relationships || relationships.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert business development advisor for Architecture, Engineering, and Construction (AEC) firms. 
Your role is to analyze client relationships and provide actionable recommendations to help maintain and grow these relationships.

Focus on:
- Re-engagement strategies for cold relationships
- Progression tactics based on relationship stage
- Industry-specific networking opportunities
- Timing considerations for public sector procurement cycles

Be concise, specific, and actionable. Each suggestion should be immediately implementable.`;

    const userPrompt = `Analyze these at-risk client relationships and provide specific next actions for each:

${relationships.map((r, i) => `
${i + 1}. ${r.companyName}
   - Market Sector: ${r.marketSector}
   - Relationship Stage: ${r.stage}
   - Strength: ${r.strength}
   - Days Since Last Contact: ${r.daysSinceContact}
   - Estimated Pursuit Value: $${r.estimatedValue.toLocaleString()}
   - Recent Interactions: ${r.recentInteractions.length > 0 
     ? r.recentInteractions.map(int => `${int.type}: ${int.notes || 'No notes'}`).join('; ')
     : 'None recorded'}
`).join('\n')}

For each relationship, provide:
1. A specific recommended action (1-2 sentences)
2. The urgency level (high/medium/low)
3. A brief rationale (1 sentence)

Format your response as JSON array with objects containing: companyName, action, urgency, rationale`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    let suggestions = [];
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return the raw content if parsing fails
      suggestions = [{ 
        companyName: "Analysis", 
        action: content, 
        urgency: "medium", 
        rationale: "AI-generated recommendation" 
      }];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Relationship advisor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
