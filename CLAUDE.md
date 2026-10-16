# RSF Website — Project Context

## What this is
The official website of Rafael Support Foundation (RSF), an NGO and
charity supporting youth education through scholarships and
competitions. The site presents the Foundation's mission, impact and
programmes, including "RSF Tech and Space" (workspace, media room,
Learning Hub, consulting, media agency), which is run under the
Foundation. Launch target: Oct 16. Built in two phases. Read
PHASE_STATUS before implementing anything.

## Tone
Warm, credible, mission-led. Write copy and design as a charity
would: impact first, community and opportunity for young people.
Avoid commercial or sales language ("grow your business", "best
deals"). Tech and Space services can be priced, but the framing
stays "supporting young people", not "selling services".

## Project facts
- Domain is rafaelsupportfoundation.org
- Source docs are in the project root (same folder as this file):
  `RSF-Website-Blueprint.md` (sitemap, UX flow, admin, stack) and
  `RSF-Website-Spec-Part2.md` (palette, dark mode, LMS, legal, technical
  checklist). Consult them for detail; don't duplicate here.
- Phase 1 forms send email notifications using Resend, with no Supabase.
- Phase 1 includes sitemap.xml, robots.txt, Open Graph tags, a favicon made
  from logo.png, and Organization structured data.
- The "Support Our Mission" button links to the Get Involved page. There are
  no online donations in Phase 1.

## PHASE_STATUS: Phase 1 (current)
Every page exists and looks finished, but nothing needing an account or a live
calendar is real yet. Booking, enrollment and consulting UI submit to a simple
form endpoint that sends an email notification via Resend (no Supabase) for
manual follow-up.

**Phase 2 features must NOT be built yet:**
- Auth (login/register), user dashboard (My Bookings / My Courses / My Applications)
- Payments (Paystack, bank transfer, webhooks)
- Live booking calendar / availability logic
- Quiz and certificate system (also the rest of the LMS backend: progress
  tracking, enrollments, gamification, `/verify-certificate`)
- Admin panel, Supabase RLS policies, role-based access, 2FA, audit log
- Transactional email/SMS flows beyond a basic form notification

Course "Enroll" buttons show "Coming Soon". Course catalog/detail is display-only
with no prices. If a task seems to require a Phase 2 feature, stop and
ask. Phase 2 is built later on a separate `phase-2` branch.

## Logo
The logo file is at `/public/images/logo.png` and must be used as-is: no
recoloring, redrawing, cropping, stretching or re-exporting. In dark mode, if
needed, ask the user for a light-outline variant rather than altering it.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Framer Motion for animation
- Hosted on Vercel
- Phase 2 only: Supabase (Postgres + Auth + Storage), Paystack + manual bank transfer

## Brand colors (use these exact hex values, never approximate)
- Deep Navy: #143BA2 — nav, headers, primary surfaces
- Royal Purple: #59329C — gradient partner with navy
- Brand Green: #3FC890 — icons, highlights, success states
- Amber/Orange: #FEAE23 — primary CTAs only ("Book Now", "Enroll Now"); amber always
  means clickable, never decorative
- Accent Red: #D02020 — sparing (urgent tags, errors)
- Accent Bright Blue: #3B60F7 — sparing (small shapes, hover)
- Slate Navy text: #26374A
- Cream background: #EFF1F0
- Also available: Dark Panel Purple #3A2270, Bright Green #2EEF80
Usage ratio: ~60% neutral base, ~30% navy/purple, ~10% green/amber accents.

Dark mode: respects `prefers-color-scheme`, plus a header toggle persisted in
local storage. Tokens are defined in `tailwind.config.ts` under `colors.dark.*`
(bg #0B1230, card #151C3D, text #EDEFF5, green #4FE3A6, links #7DD8E8). Never
hardcode a dark-mode color inline; reference the token.

## Design direction
- Navy-to-purple duotone gradient overlay on hero photos
- Subtle leaf-vein line graphic as section divider (echoes the logo)
- Alternate section backgrounds (white → navy → cream → purple gradient); use
  asymmetry (e.g. 60/40 hero splits); avoid uniform spacing everywhere
- Fonts: Baloo 2 ExtraBold or Poppins Black for headings, Inter for body
- Animation: scroll-reveal (fade + slight upward slide), count-up stats,
  card hover lift, navbar transparent over hero then solid navy on scroll.
  No parallax overload, no auto-playing carousels without pause control,
  nothing that blocks content load
- Mobile-first; most visitors are on phones on Nigerian networks

## Code style
- Functional components only, no class components
- Tailwind utility classes only — no inline styles, no separate CSS files
- Use existing Button/Card/Section components rather than writing new ones —
  check /components first
- All copy/text comes from /content/*.ts files, not hardcoded in components,
  since Chinyere/Faith will edit it via an admin panel in Phase 2
- Accessibility: alt text on all images, sufficient contrast (re-check in dark
  mode), keyboard-navigable forms

## Content rules
- No ID uploads anywhere on the site. The Overnight Workspace flow is a
  "Request Access" form only (name, phone, preferred visit time) with the note
  that in-person ID verification happens at the office
- FETHA digitization service stays off the public nav and sitemap entirely
- No Leadership/Team page, no standalone "Why Abakaliki" section, no Profile/Documents
- There are NO prices anywhere on the site until real fees are confirmed. Course
  cards say fees will be shared soon and offer "Register interest" instead
- The overnight workspace location/address is never shown on the site. It is
  shared in person after approval
- The address is defined once in `/content/site.ts` (short and long versions);
  use those constants, never retype it
- Impact stats, testimonials and stories are placeholders until real data arrives
- Footer: 4 columns (About, Services, Contact incl. WhatsApp link, Legal); legal
  pages: Privacy, Terms, Safeguarding/Child Protection, NDPR statement;
  copyright "© 2026 Rafael Support Foundation. All Rights Reserved."
- Public forms use no CAPTCHA. Protection is a honeypot field, a 2-second time check, a rate limit (5 per IP per 10 minutes) and server-side validation/sanitization

## Workflow
- Build one page or feature at a time; stay in scope of the request
- Run `npm run lint` and `npm run build` after any non-trivial change and fix
  errors before considering a task done
- Placeholder images go in /public/placeholders/ with descriptive names
  (e.g., workspace-day-placeholder.jpg) so they're easy to find and swap later
- Never commit .env.local or any API key; secrets live in Vercel env settings
- Never change database tables in a way that alters or removes what Phase 1
  reads; Phase 2 schema changes must be additive only
