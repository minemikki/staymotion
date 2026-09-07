# StayMotion pivot — Premium Web Design & Digital Experiences

## 1. Audit — what exists and what we keep

| Area | Today | Decision |
|---|---|---|
| Hosting / functions | Static HTML + Vercel serverless (`api/*.js`, ESM) | **Keep.** Fast, proven, zero migration risk. |
| Storage | Vercel Blob (`orders/`, `leads/`) | **Keep.** Leads CRM (`lib/leads.js`) becomes the sales pipeline; orders become projects. |
| Payments | Stripe Checkout + PaymentIntent + webhook, Vipps (test) | **Keep for deposits** (50/50 or 40/30/30 via payment links from admin). Web projects are sold intake → proposal → deposit, not instant checkout. |
| Email | Resend (`lib/email.js`, branded template) | **Keep.** Used for intake notifications + client updates. |
| Auth / portal | Signed order tokens (`lib/token.js`), magic links, ref+email login | **Keep.** Portal becomes the client project portal. |
| Admin | `admin.html` — pipeline board, tabbed cards, Leads CRM | **Keep + relabel** to web-project states. |
| MCP server | `lib/mcp-core.js` (order tools) | Keep (ops automation); video-only tools left unreferenced. |
| Video pipeline | `api/reel.js`, `lib/production.js`, `lib/reel.js`, Higgsfield docs | **Removed from the public site.** Backend left in place, unreferenced, as a possible media upsell. |
| Marketing site | `index.html` (video positioning), `bestill.html` (video packages) | **Rebuilt.** `bestill.html` redirects to the new intake. |
| Identity | Graphite/obsidian, cyan/petrol accent, champagne, Inter Tight | **Evolved**, not replaced ("Nordic digital atelier"). |

Architecture call: the brief prefers Next.js/Tailwind/Framer. A framework migration would rebuild every working
integration before the studio has a site again. The static stack delivers the same premium result with better
performance; motion is CSS + IntersectionObserver + small vanilla JS. Revisit Next.js only if a CMS becomes necessary.

## 2. Offer ladder (lib/packages.js)

| Offer | From | Delivery |
|---|---|---|
| Launch | 19 900 kr | 7–14 dager |
| Growth (mest valgt) | 34 900 kr | 2–4 uker |
| Signature | 59 900 kr | 4–8 uker |
| Care | 2 990 kr/mnd | løpende |

Payment: Launch 50/50 · Growth/Signature 40/30/30 · Care monthly. No work before deposit.

## 3. Build order (this session)

1. `index.html` — new homepage: hero (interactive browser/phone showcase), trust bar, problem (before/after), selected
   work (6 concept redesigns, labelled), services, why, process, pricing, ROI calculator, proof (honest), FAQ, final CTA.
2. Mobile designed on purpose: sticky CTA, large type, horizontal work gallery, compact pricing.
3. `start.html` — 7-step premium project intake → `api/project-intake.js` (saves lead, emails owner + prospect).
4. `lib/packages.js` — new offers. `bestill.html` → redirect to `/start.html`.
5. `admin.html` — sales pipeline states (Lead funnet → … → Care), intake fields on lead cards.
6. `ordre.html` — client project portal copy: Strategi → Retning → Design → Bygg → Lansering → Vekst.
7. Sitemap / metadata / OG updated. Video messaging removed from all public pages.

## 4. Sales system

Outbound: 10–20 researched prospects/day, personalised "I noticed an opportunity" opener with a hero redesign concept
(before/after), never a full free site. Pipeline tracked in the Leads CRM. Inbound: the site itself + intake flow.

## 5. Non-negotiables honoured
No fake clients, logos, reviews or statistics. Portfolio pieces are labelled **Konseptdesign** until real work exists.
Pricing supports a serious studio. Every page has one conversion goal: **Start prosjekt**.
