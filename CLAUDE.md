# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
npx vitest           # Run all tests
npx vitest run src/path/to/file.test.tsx  # Run a single test file
npx playwright test  # E2E tests
```

## Architecture Overview

**Stack**: React 18 + TypeScript + Vite, with Supabase as the backend (no custom REST API).

**Routing** (`src/App.tsx`): React Router v6 with ~70 routes. Public routes are open; protected routes are wrapped in `AuthGuard`. Feature-specific routes use `RequireFeature` to gate access by subscription plan.

**Auth** (`src/hooks/useAuth.tsx`): Supabase Auth (email/password + Google OAuth via pop-up). The `AuthProvider` context loads the user's role via a Supabase RPC call (`has_role`) and exposes `user`, `profile`, `userRole`, and `signOut`. Roles are: `super_admin`, `admin`, `agent`, `owner`. Multi-tenancy is managed via the `organization_members` table.

**Data layer**: Direct Supabase JS client — no intermediate API service layer. Use `useQuery` / `useMutation` from `@tanstack/react-query` v5 for all server state. Real-time subscriptions use `supabase.channel()`. The Supabase client is initialized at `src/integrations/supabase/client.ts` with localStorage session persistence.

**Types**: Supabase-generated types live in `src/integrations/supabase/types.ts` (auto-generated — do not edit manually). Domain-specific types are in `src/types/`.

**UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS. Custom brand colors are defined in `tailwind.config.ts` (`brand-blue`, `brand-purple`, `brand-teal`). The `@/` path alias maps to `src/`.

**State**: React Context + custom hooks. There are 65+ hooks in `src/hooks/` scoped to specific domains (e.g., `useProperties`, `useContacts`). Prefer this pattern for new features over introducing new state libraries.

**Forms**: React Hook Form + Zod for schema validation throughout.

**PWA** (`src/main.tsx`, `vite.config.ts`): Service Worker with NetworkFirst for Supabase calls (5-min cache), NetworkOnly for auth. Cache is cleared on startup to avoid stale SW state.

**Exports**: ExcelJS for Excel files, jsPDF + html2canvas for PDFs (with DOMPurify sanitization — see commit `c1cfc4d`), PapaParse for CSV.

**Payments**: Stripe SDK (`stripe` package) is included. Subscription gating is enforced via `RequireFeature`.

## Key Conventions

- Path alias `@/` → `src/`. Always use it for imports within `src/`.
- Components are organized by feature domain under `src/components/<domain>/`. Shared primitives go in `src/components/ui/` (shadcn) or `src/components/shared/`.
- `tsconfig.json` is intentionally lenient (no `strictNullChecks`, no unused-variable errors). Do not tighten these settings without coordinating with the team.
- Toast notifications use `sonner` via `useToast` hook.
- All CEP (Brazilian postal code) lookups go through `src/services/cepService.ts`.
