# Working Memory

## Problem Summary
- Add an OpenRouter-powered vendor assistant that turns plain-language menu, price, and inventory requests into reviewable proposals, available globally as a floating chat launcher.

## Product Goal
- Vendors can safely prepare menu, price, and inventory changes in plain language, then explicitly apply each action.

## Stack And Runtime Assumptions
- Next.js App Router, TypeScript, React Query.
- Vendor API uses JWT bearer auth through `fetchApi`.
- OpenRouter is called only from a Next.js server route using a server-only API key.

## Confirmed Facts
- Existing client APIs cover menu create/update/activate/deactivate and inventory set/adjust.
- `POST /api/ai/vendor-assistant` validates a bounded context and validates the model output before returning it to the browser.
- The assistant only generates proposals; existing authenticated vendor APIs perform the actual mutations after the vendor clicks Apply.

## Unknowns
- An OpenRouter key and supported model must be configured at deployment time.

## Active Files
- `src/app/api/ai/vendor-assistant/route.ts`
- `src/app/(dashboard)/assistant/page.tsx`
- `src/components/shared/FloatingVendorAssistant.tsx`
- `src/components/shared/VendorAppShell.tsx`
- `src/config/navigation.ts`
- `.env.example`

## Decisions
- Keep the OpenRouter key server-only; no `NEXT_PUBLIC_` prefix.
- Treat model output as untrusted: parse/validate it with Zod and never perform automatic mutations.
- Send only the current menu, inventory, categories, and unit types necessary to map natural language to existing IDs.
- Mount the launcher in the dashboard shell and fetch assistant context only after the vendor opens it.

## API Contracts
- `POST /api/ai/vendor-assistant`
- Request: `{ command, context: { date, menuItems, inventory, categories, unitTypes } }`
- Response: `{ summary, assumptions, proposals }` where every proposal matches a supported vendor mutation.

## Remaining Risks
- The assistant uses client-provided snapshots for planning; actual mutation authorization and concurrency remain enforced by existing backend APIs.
