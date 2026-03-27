/**
 * PromoGrind — Parse Bet Slip Edge Function
 *
 * Accepts a bet slip image (base64 or URL) and uses Claude claude-haiku
 * to extract: bet type, stake, odds, book name.
 *
 * Secrets required:
 *   ANTHROPIC_API_KEY — get from console.anthropic.com
 *
 * Deploy:
 *   supabase functions deploy parse-bet-slip
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseResult {
  betType: 'bonus_bet' | 'profit_boost' | 'first_bet' | 'deposit_match' | 'insurance' | 'unknown';
  stake: number | null;
  odds: string | null;       // American format e.g. "+300" or "-110"
  hedgeOdds: string | null;  // Opposing side odds if detectable
  boostPct: number | null;   // For profit boosts: the percentage
  maxExtra: number | null;   // For profit boosts: the cap
  book: string | null;       // Sportsbook name
  promoName: string | null;  // Promo label if visible
  confidence: 'high' | 'medium' | 'low';
  rawText: string;           // Raw text extracted from image
}

const SYSTEM_PROMPT = `You are a sportsbook bet slip parser for PromoGrind, a sports betting calculator tool.

Your job is to extract structured data from screenshots of sportsbook bet slips and promotional offers.

Always respond with valid JSON only — no markdown, no explanation. Use exactly this schema:
{
  "betType": "bonus_bet" | "profit_boost" | "first_bet" | "deposit_match" | "insurance" | "unknown",
  "stake": number or null,
  "odds": string or null,
  "hedgeOdds": string or null,
  "boostPct": number or null,
  "maxExtra": number or null,
  "book": string or null,
  "promoName": string or null,
  "confidence": "high" | "medium" | "low",
  "rawText": string
}

Rules:
- odds must be American format (e.g. "+300", "-110"). Convert decimal or fractional odds.
- stake is a number (no $ sign)
- betType detection:
  - "bonus_bet": stake not returned, free bet, bonus bet credit
  - "profit_boost": % boost on winnings, profit boost token
  - "first_bet": first bet insurance, safety net, second chance
  - "deposit_match": deposit bonus, match bonus
  - "insurance": SGP insurance, parlay insurance
- If you cannot confidently determine a field, set it to null
- rawText: the verbatim text you can read from the image
- confidence: "high" if 3+ fields extracted, "medium" if 1-2, "low" if minimal`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType, imageUrl } = body;

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 or imageUrl required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new Anthropic({ apiKey });

    // Build the image content block
    const imageContent = imageBase64
      ? {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'url' as const,
            url: imageUrl,
          },
        };

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: 'Extract the bet slip data from this image. Return JSON only.',
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    let result: ParseResult;
    try {
      // Strip any accidental markdown code fences
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      result = {
        betType: 'unknown',
        stake: null,
        odds: null,
        hedgeOdds: null,
        boostPct: null,
        maxExtra: null,
        book: null,
        promoName: null,
        confidence: 'low',
        rawText: raw,
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[parse-bet-slip]', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
