# FanForge Technical Requirements

## Architecture Overview

FanForge is a **Next 14 / React 18 / TypeScript 5** web application deployed on Vercel with static exports for public pages.

The runtime stack is organised into four layers:

### 1 · Edge & Routing

- Vercel Edge Network serves static assets and SSR pages.
- `middleware.ts` resolves Supabase‑Auth JWT cookies and injects `{ userId, role }` into `request.nextUrl` for route guards.

### 2 · Frontend App

- Next.js App Router pages are grouped under `(auth)`, `(brand)`, and `(creator)` segments.
- Tailwind 3 + shadcn/ui components and Lucide icons drive UI.
- Forms use React Hook Form 7 with Zod 3 resolvers for schema‑driven validation.
- **Framer Motion 11** powers page‑level transitions, staggered element reveals, and interactive canvas effects. Shared animation variants live in `/lib/animation.ts` and respect user "prefers‑reduced‑motion".

### 3 · API & Services

- Next.js Route Handlers in `app/api/**` act as thin controllers.
- Domain logic lives in `/lib/services/*` and uses Drizzle ORM for Postgres access.
- Supabase Storage issues presigned URLs for asset uploads; Vercel Cron jobs handle email, cleanup, and metrics.

### 4 · Data & Auth

- Supabase Postgres 15 with Row‑Level Security.
- Drizzle ORM + drizzle‑kit manage schema & type‑safe SQL, following Supabase‑Drizzle guides.
- Supabase Auth issues JWT‑backed sessions (email/password & OAuth); cookies are `Secure`, `HttpOnly`, and auto‑rotated.

Cross‑cutting concerns—logging via Logflare, monitoring through Vercel Analytics, and immutable audit trails—are wired into the service layer.

## User Types and Permissions

| Role              | Scope  | Permissions                                                                                                |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| **Creator**       | Self   | View campaigns; create/edit own submissions; delete drafts; view personal analytics                        |
| **BrandAdmin**    | Brand  | CRUD campaigns & asset kits; invite BrandReviewer; review/approve/reject submissions; view brand analytics |
| **BrandReviewer** | Brand  | Review/approve/reject submissions only                                                                     |
| **PlatformAdmin** | Global | Full system access; manage users/brands; feature flags                                                     |

### Implementation Notes

- Roles are data‑driven (`roles`, `user_roles` join table)
- Permission slugs (e.g. `"campaign:create"`) allow new roles (Moderator, CreatorPro) without code changes
- Both API layer (`assertPermission()`) and Postgres RLS enforce the same matrix

## Database Design

Primary datastore: **Supabase Postgres** with Drizzle schema definitions and SQL migrations.

```typescript
// db/schema.ts (excerpt)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").unique(),
})

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").references(() => users.id),
  roleId: integer("role_id").references(() => roles.id),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .nullable(),
})
```

### Database Notes

- Other core tables (`brands`, `campaigns`, `asset_kits`, `submissions`, `audit_logs`) follow similar patterns
- Large binaries are stored in Supabase Storage
- `drizzle-kit generate` produces SQL migration files under `drizzle/migrations/`, applied by CI with `supabase db push`
- Indexed columns on `(campaign_id, status)` and TSVector fields back campaign discovery & search

## Technology Stack

### Runtime & Frameworks

| Layer        | Package                                          | Version                |
| ------------ | ------------------------------------------------ | ---------------------- |
| React        | `react`, `react-dom`                             | 18.2.0                 |
| Next.js      | `next`                                           | 14.0.0                 |
| TypeScript   | `typescript`                                     | 5.0.0 (5.2.0 rec.)     |
| Node.js      | —                                                | ≥18.17.0 (20.9.0 rec.) |
| Styling      | `tailwindcss` 3.3 + `tailwindcss-animate`        | —                      |
| UI Kit       | `shadcn/ui`                                      | latest                 |
| Icons        | `lucide-react`                                   | 0.294.0                |
| Forms        | `react-hook-form` 7.47.0 + `@hookform/resolvers` | —                      |
| Validation   | `zod` 3.22.0                                     | —                      |
| Animations   | `framer-motion`                                  | 11.x                   |
| ORM          | `drizzle-orm` 0.44.2 + `drizzle-kit` 0.31.1      | —                      |
| DB Driver    | `postgres` 3.4.7                                 | —                      |
| Supabase SSR | `@supabase/ssr` 0.6.1                            | —                      |

### Tooling & Quality

ESLint 8.52 · Prettier 3 · Husky 8 · Jest 29 · TypeScript‑ESLint 6.

### Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "export": "next export",
  "type-check": "tsc --noEmit",
  "lint": "next lint",
  "test": "jest"
}
```

## Development Workflow

### 1. Bootstrap

```bash
npx create-next-app fanforge --ts
cd fanforge && npm install framer-motion
```

### 2. Configure Supabase & Drizzle

- Add `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` to `.env.local`
- Create `drizzle.config.ts`; run `npx drizzle-kit introspect`
- Push migrations with `supabase db push`

### 3. Daily Work

- `npm run dev` for local server with HMR
- Pre‑commit hooks (Husky) run `lint` and `type-check`
- PRs must pass Jest tests and Drizzle migration diff in CI

### 4. Deploy

- Vercel Git integration. `next build && next export` emit static assets + serverless API routes
- Environment variables managed via Vercel Secrets

### 5. Version Targets

See Architecture Overview section above.

## Technical Constraints

- **Performance Budgets:** FCP <1.5 s, LCP <2.5 s, CLS <0.1, FID <100 ms
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Responsive Breakpoints:** 320–767 px (mobile), 768–1023 px (tablet), ≥1024 px (desktop)
- **Accessibility:** WCAG 2.1 AA; all interactive elements keyboard‑navigable; ARIA roles & labels mandatory; Framer Motion respects reduced‑motion

## File Structure

```
.
├── app
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (brand)/campaigns/[id]/{campaign-detail-client.tsx,page.tsx}
│   ├── (brand)/dashboard/page.tsx
│   ├── (brand)/submissions/page.tsx
│   ├── (creator)/create/page.tsx
│   ├── (creator)/discover/[id]/{campaign-discover-client.tsx,page.tsx}
│   ├── (creator)/portfolio/page.tsx
│   ├── api/{auth,campaigns,submissions}/…
│   ├── globals.css
│   └── layout.tsx
├── components
│   ├── canvas/creation-canvas.tsx
│   ├── shared/navigation.tsx
│   ├── ui/{badge.tsx,button.tsx,card.tsx,input.tsx}
│   └── motion/{fade.tsx,stagger.tsx}   // Framer Motion helpers
├── db/{schema.ts,index.ts}
├── drizzle.config.ts
├── lib/{mock-data.ts,utils.ts,validations.ts}
├── utils/supabase/{client.ts,middleware.ts,server.ts}
└── …
```

## Environment Configuration

### Environment Variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
DATABASE_URL=postgres://...
NODE_ENV=development
```

### Next.js Configuration

```javascript
// next.config.js
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {unoptimized: true},
}
module.exports = nextConfig
```

## Security and Performance Optimization

### Authentication & RBAC

- Supabase Auth issues JWTs; cookies: `Secure`, `HttpOnly`, `SameSite=Lax`
- Postgres RLS mirrors API checks for least‑privilege access

### Validation & Sanitisation

- Zod validates all inputs; file uploads limited to ≤25 MB & verified MIME types

### Content Security

- CSP headers via `@supabase/ssr`: `script-src 'self' supabase.co vercel.app`; `object-src 'none'`
- CSRF tokens on all mutating forms

### Performance

- Route‑level code splitting via App Router; heavy components `dynamic()`‑imported
- Next.js `Image` optimises responsive media; Tailwind purges unused CSS
- `Cache-Control: s-maxage=0, stale-while-revalidate=60` on API responses

### Monitoring & Logging

- Vercel Web Vitals, Supabase Logflare, and `audit_logs` table feed observability dashboards

## Key Decisions and Rationale

Adding **Framer Motion** delivers polished transitions with minimal bundle overhead (tree‑shakeable, SSR‑compatible). LazyMotion and feature flags respect reduced‑motion for accessibility.

Drizzle + Supabase stays for type‑safe SQL & native Postgres features.

Next 14 App Router + static export keeps hosting predictable while serverless API routes serve dynamic needs.

Data‑driven RBAC + Postgres RLS & audit logs satisfy brand/creator legal obligations.

Strict tooling (ESLint, Prettier, Husky, Jest) ensures code health and guards migrations.

Overall, the architecture remains **secure, performant, accessible, and visually engaging**, with room for future extensions (on‑chain licensing, payments, AI asset tools) without rework.
