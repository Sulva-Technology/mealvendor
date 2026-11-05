import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/src/lib/server/auth-cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const proposalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('price_update'), menuItemId: z.string().min(1), priceKobo: z.number().int().min(0).max(10_000_000), reason: z.string().min(1).max(300) }),
  z.object({ type: z.literal('inventory_set'), inventoryId: z.string().min(1), quantityTotal: z.number().int().min(0).max(100_000), expectedVersion: z.number().int().min(0), reason: z.string().min(1).max(300) }),
  z.object({ type: z.literal('inventory_adjust'), inventoryId: z.string().min(1), adjustmentQuantity: z.number().int().min(-100_000).max(100_000).refine((value) => value !== 0), reason: z.string().min(1).max(200) }),
  z.object({ type: z.literal('menu_create'), categoryId: z.string().min(1), unitTypeId: z.string().min(1), name: z.string().min(2).max(100), description: z.string().max(500).optional(), priceKobo: z.number().int().min(0).max(10_000_000), requiresSoup: z.boolean().default(false), reason: z.string().min(1).max(300) }),
  z.object({ type: z.literal('menu_update'), menuItemId: z.string().min(1), name: z.string().min(2).max(100).optional(), description: z.string().max(500).optional(), categoryId: z.string().min(1).optional(), priceKobo: z.number().int().min(0).max(10_000_000).optional(), requiresSoup: z.boolean().optional(), reason: z.string().min(1).max(300) }).refine((proposal) => Object.keys(proposal).some((key) => !['type', 'menuItemId', 'reason'].includes(key)), 'menu_update must include at least one change'),
  z.object({ type: z.literal('menu_status'), menuItemId: z.string().min(1), active: z.boolean(), reason: z.string().min(1).max(300) }),
]);

const responseSchema = z.object({ summary: z.string().min(1).max(500), assumptions: z.array(z.string().max(240)).max(5).default([]), proposals: z.array(proposalSchema).max(12) });
const requestSchema = z.object({
  command: z.string().trim().min(2).max(1_500),
  context: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    menuItems: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(120), categoryId: z.string().nullable().optional(), categoryName: z.string().nullable().optional(), unitTypeId: z.string().min(1), unitCode: z.string().min(1).max(40), priceKobo: z.number().int().min(0), active: z.boolean(), requiresSoup: z.boolean() })).max(250),
    inventory: z.array(z.object({ id: z.string().min(1), menuItemId: z.string().min(1), menuItemName: z.string().min(1).max(120), deliverySlotName: z.string().min(1).max(100), quantityTotal: z.number().int().min(0), remainingQuantity: z.number().int(), version: z.number().int().min(0) })).max(500),
    categories: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(100) })).max(100),
    unitTypes: z.array(z.object({ id: z.string().min(1), code: z.string().min(1).max(40), displayName: z.string().min(1).max(100) })).max(100),
  }),
});

function isForeignOrigin(request: NextRequest): boolean { const origin = request.headers.get('origin'); if (!origin) return false; try { return new URL(origin).host !== request.nextUrl.host; } catch { return true; } }
function modelJson(content: string): unknown { return JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }

export async function POST(request: NextRequest) {
  if (isForeignOrigin(request)) return NextResponse.json({ error: { code: 'CSRF_REJECTED', message: 'Cross-origin request rejected.' } }, { status: 403 });
  if (!request.cookies.get(ACCESS_COOKIE)?.value && !request.cookies.get(REFRESH_COOKIE)?.value) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in before using the assistant.' } }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Provide a short request and valid menu context.' } }, { status: 400 });
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: { code: 'AI_NOT_CONFIGURED', message: 'The AI assistant is not configured. Add OPENROUTER_API_KEY on the server and restart the app.' } }, { status: 503 });

  const system = `You are Meal Direct Vendor Assistant. Convert the vendor request to a safe review plan. Return ONLY valid JSON: {"summary":"string","assumptions":["string"],"proposals":[...]}. Supported proposal types: price_update, inventory_set, inventory_adjust, menu_create, menu_update, menu_status. Use only IDs from context. New items must use supplied categoryId and unitTypeId. Prices are kobo (100 kobo = ₦1). If an essential detail is missing or ambiguous, put a question in assumptions and return no proposals. Never invent IDs, stock values, or sales claims. The vendor separately approves every proposal.`;
  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 'X-Title': 'Meal Direct Vendor Portal' }, body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini', temperature: 0.15, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(parsed.data) }] }), cache: 'no-store' });
    if (!upstream.ok) { console.error('OpenRouter request failed', upstream.status, await upstream.text()); return NextResponse.json({ error: { code: 'AI_PROVIDER_ERROR', message: 'The AI provider could not process that request. Please try again.' } }, { status: 502 }); }
    const payload = await upstream.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('No assistant content');
    return NextResponse.json({ data: responseSchema.parse(modelJson(content)) });
  } catch (error) { console.error('Vendor assistant response validation failed', error); return NextResponse.json({ error: { code: 'AI_RESPONSE_INVALID', message: 'The assistant returned an unusable plan. Please rephrase your request and try again.' } }, { status: 502 }); }
}
