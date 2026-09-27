<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Project source of truth
Before implementing features, check the relevant project docs:
- Product requirements: `docs/PRD.md`
- Architecture: `docs/Tech.md`
- Database schema: `docs/DB.md`

Rules:
- Do not invent product requirements that are not in PRD/SoW.
- Follow the architecture docs before introducing new patterns.
- Follow the database schema before creating or changing tables.
- Follow the design system from cursor rules before building UI.

## Terminal / Shell
Ovo je Windows okruženje. Kada pokrećeš terminal komande preko npm/pnpm/npx,
uvek koristi .cmd ekstenziju (npm.cmd, pnpm.cmd, npx.cmd), jer se inače
komanda ne prepoznaje u ovom shell-u.

Primeri:
- `npm.cmd run dev` umesto `npm run dev`
- `pnpm.cmd install` umesto `pnpm install`
- `npx.cmd drizzle-kit push` umesto `npx drizzle-kit push`

Dev/build koriste **Webpack** (`--webpack`) jer Turbopack persistence keš na Windows-u lako korumpira `.next`. Za Turbopack: `pnpm.cmd run dev:turbo` (samo posle čistog `.next`, bez ručnih kopija u kešu).

**Zavisnosti:** ovaj repo je `pnpm`-only (`packageManager` u `package.json`). Za install/add uvek `corepack pnpm install` / `corepack pnpm add …`. **Ne pokreći `npm install`** — meša se sa pnpm `node_modules` (`.ignored_*` folderi), `pnpm install` pada na `Invalid Version` pri linkovanju binara, a paketi poput `recharts` ne budu linkovani → Next build: `Can't resolve 'recharts'`. Oporavak: obriši `node_modules` i pokreni `corepack pnpm install` (lockfile ostaje izvor istine).

Posle reinstalacije `node_modules` obriši i **`.next`** pre `dev`/`build`. Webpack keš pamti apsolutne putanje u `node_modules/.pnpm/…` (npr. `zustand@5.0.15_@types+react_<hash>`); kad se peer hash promeni, stari keš daje `ENOENT` na `…/zustand/esm/index.mjs` iako je paket ispravno instaliran.
