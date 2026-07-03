# Working Memory

## Problem Summary
- Implement vendor menu item image upload with backend signed URL flow.

## Product Goal
- Vendors can upload/replace an image for an existing menu item, with local validation and visible backend errors.

## Stack And Runtime Assumptions
- Next.js App Router, TypeScript, React Query.
- Vendor API uses JWT bearer auth through `fetchApi`.
- Signed storage upload uses direct `PUT` to returned Supabase Storage URL.

## Confirmed Facts
- Existing vendor logo upload already follows signed target -> raw binary upload -> confirm pattern.
- Menu items expose `imageUrl`, which is a short-lived signed URL from backend responses.

## Unknowns
- Backend exact storage error strings are unknown; UI surfaces returned API/error messages as-is.

## Active Files
- `src/lib/api/types.ts`
- `src/lib/api/vendor.ts`
- `src/app/(dashboard)/menu/page.tsx`
- `src/app/(dashboard)/menu/[itemId]/edit/page.tsx`

## Decisions
- Use raw HTTP `PUT` to `uploadUrl` instead of adding Supabase client dependency.
- Validate MIME and 5 MB limit client-side before requesting upload URL; backend confirm remains final authority.
- Render the confirmed `imageUrl` from fresh item response and update React Query cache immediately.

## API Contracts
- `POST /v1/vendor/menu-items/{itemId}/image/upload-url`
- Body: `{ contentType, sizeBytes }`
- Response: `{ uploadUrl, token, key }` unwrapped by `fetchApi`.
- `POST /v1/vendor/menu-items/{itemId}/image/confirm`
- Body: `{ key }`
- Response: updated menu item.

## Remaining Risks
- `uploadUrl` is assumed to support direct `PUT`, matching current logo flow and user contract.
