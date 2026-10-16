# RSF Foundation Website — Build Blueprint (Part 1)

This covers both halves of the site: the **Foundation** (mission, scholarships, competitions, impact) and the **RSF Tech and Space** section nested inside it (registrations, bookings, courses, announcements).

**Brand status:** the official identity is the existing green plant-and-hand circular logo and the blue/purple/green palette from your current flyer — confirmed. The teal/amber door-and-path concept from earlier is retired. Section 3 below uses real colors extracted directly from your logo and flyer files.

---

## 1. Sitemap

```
Home ................................................... [Phase 1]
├── About RSF ........................................... [Phase 1]
│   ├── Our Story & Mission ............................. [Phase 1]
│   └── Impact (scholarships & competitions to date) .... [Phase 1 — placeholder stats/stories]
├── RSF Tech and Space
│   ├── Overview (what it is, the vision) ............... [Phase 1]
│   ├── Workspace
│   │   ├── Day Workspace (info + Request form) ......... [Phase 1 — static request form, not live calendar]
│   │   └── Overnight Workspace (info + Request form) .... [Phase 1 — static request form]
│   ├── Media Room (info + Request form) ................ [Phase 1 — static request form]
│   ├── Learning Hub
│   │   ├── Course Catalog (browsable) ................... [Phase 1 — display only, placeholder pricing]
│   │   ├── Course Detail Page (curriculum, trainer) ..... [Phase 1 — "Enroll" button shows "Coming Soon"]
│   │   │                                                    [Phase 2 — Enroll becomes live, payment-connected]
│   │   └── My Learning (dashboard: progress, quizzes, certificates) [Phase 2 — requires auth]
│   ├── Consulting Services
│   │   ├── Career & Course Guidance .................... [Phase 1 — inquiry form only]
│   │   ├── Scholarships & Study Abroad .................. [Phase 1 — inquiry form only]
│   │   ├── Visa Guidance ................................ [Phase 1 — inquiry form only]
│   │   └── Project/Research Writing Support ............. [Phase 1 — inquiry form only]
│   └── Media Agency & Contract Services ................. [Phase 1 — inquiry form only]
├── Announcements/News .................................. [Phase 1 — static, admin-editable in Phase 2]
├── Events (launch day + future events) ................. [Phase 1]
├── Get Involved
│   ├── Apply for Scholarship/Competition ................ [Phase 1 — form submission, manual follow-up]
│   ├── Partner With Us .................................. [Phase 1]
│   └── Volunteer ......................................... [Phase 1]
├── Contact ............................................... [Phase 1]
├── (Auth) Login / Register .............................. [Phase 2]
└── (Auth) Dashboard ...................................... [Phase 2]
    ├── My Bookings ........................................ [Phase 2]
    ├── My Courses (progress, quizzes, certificates, streaks) [Phase 2]
    └── My Applications (scholarship/consulting) ........... [Phase 2]
```

**The Phase 1 pattern, in one sentence:** every page exists and looks finished, but anywhere that would normally require an account or a live calendar (booking, enrollment, dashboards) instead collects a simple form submission that lands in your inbox/admin queue for manual follow-up — so visitors never hit a broken or missing feature, they just get a slightly more manual process until Phase 2 goes live.

**Removed per your instructions:** Leadership/Team, "Why Abakaliki" as a standalone section, and Profile/Documents (no ID uploads on the site — that happens in person, see the Overnight Workspace flow below).

**Note on the FETHA digitization service:** keep this off the public nav entirely, as your meeting minutes specify — if it needs a page at all, make it an unlisted URL you share directly with that client, not something discoverable through site navigation or search.

---

## 2. Page-by-Page UX Flow

### Home
- **Hero:** a short looping background video or slideshow of real photos (people working in the space, a training session, a scholarship recipient) with the RSF logo and a one-line mission statement overlaid. Two clear CTAs: "Explore Tech & Space" and "Support Our Mission."
- **Impact counters:** Animated number counters (students supported, scholarships awarded, courses run) — a pattern used by essentially every serious foundation site because it builds credibility in the first 3 seconds.
- **Rotating "Did You Know" facts:** short one-line facts about RSF's impact that cycle automatically.
- **Three-pillar intro:** Education Support / Tech & Space / Community Impact — three cards linking to their respective sections.
- **"What We're Up To":** 3-4 cards pulling from your Announcements/Events feed automatically.
- **Testimonials carousel:** past scholarship recipients, competition winners, or early workspace users (once you have them) — auto-rotating quote cards.
- **Newsletter signup + social footer.**

### About / Timeline of Achievements
- A **vertical scrolling timeline** (year-by-year or milestone-by-milestone) is the standard way foundations show history: founding year → first competition → first scholarship batch → number of beneficiaries → the decision to launch RSF Tech and Space. Each milestone gets a small photo, a date, and 1-2 sentences, animating in on scroll.
- Below the timeline: a "What's Next" section previewing the Tech and Space launch.

### RSF Tech and Space Overview
- Full-width hero image of the actual physical space (placeholder for now).
- Icon-based service grid (6-8 tiles: Workspace, Overnight Workspace, Media Room, Learning Hub, Career Consulting, Scholarships/Visas, Research Support, Media Agency) — each tile links deeper.

### Booking Flow (Workspace & Media Room)
1. Select space type (Day Workspace / Overnight Workspace / Media Room)
2. Select date & time slot (calendar picker)
3. **If Overnight Workspace:** the website's role stops at information and interest — display the requirement clearly ("This space requires in-person ID verification at our office before access is granted"), then let them submit a simple "Request Access" form (name, phone, preferred visit time). No ID upload happens on the site at all; vetting and confirmation happen when they visit the office in person.
4. **For Day Workspace & Media Room:** continue straight to contact/account details, then a confirmation screen + email/SMS confirmation

### Learning Hub
- Filterable course grid (filter by: category, format — physical/virtual/hybrid, skill level)
- Course detail page: what they'll learn, trainer bio, duration, format selector with live price update, Enroll button
- Once enrolled: courses appear in the dashboard with video lessons organized by module, a progress tracker, quizzes, streaks, and certificates — full detail in the companion spec document (Part 2, Section 3)

### Consulting Services
- Each service (career guidance, scholarships, visa, research writing) gets its own short landing page explaining the process, then a simple inquiry/application form — collecting relevant details upfront (e.g., for career guidance: current level — pre-university, university, or postgraduate — and subjects/field of interest) saves back-and-forth.

---

## 3. Visual Direction, Images & Animation

### The real, extracted brand palette

I pulled these directly from your actual logo and flyer files (not estimated from memory), so they're accurate to what's already printed:

| Color | Hex | Where it comes from / primary use |
|---|---|---|
| **Deep Navy Blue** | `#143BA2` | Flyer background gradient (top), logo ring family — primary brand color: nav bar, headers, primary buttons |
| **Royal Purple** | `#59329C` | Flyer background gradient (bottom), panel backgrounds — secondary brand color: section backgrounds, gradient partner with navy |
| **Brand Green** | `#3FC890` | "Space" text on flyer, hand/leaf in logo — core accent: icons, highlights, success states |
| **Amber/Orange** | `#FEAE23` | "Grand Opening" badge — primary CTA color: buttons, "Enroll Now," "Book Now" |
| **Accent Red** | `#D02020` | Flyer triangle accent — sparing use only: urgent tags, limited-slot indicators, error states |
| **Accent Bright Blue** | `#3B60F7` | Flyer diamond accent — sparing use: small decorative shapes, link hover states |
| **Slate Navy (text)** | `#26374A` | Logo wordmark color — body text on light backgrounds, more readable than pure black |
| **Cream/Off-White** | `#EFF1F0` | Flyer's bottom info section — light-mode background base |

**Full extraction detail, dark-mode adaptation, and usage ratios are in the companion document (Part 2, Section 2)** — the short version: navy and purple do the heavy lifting as backgrounds/headers (roughly 60-70% of the palette's visual weight), green and amber carry the accents and CTAs (25-30%), and red/bright blue stay rare and deliberate (under 10%, reserved for things that genuinely need to stand out).

**Image treatment:**
- Apply a subtle **navy-to-purple duotone gradient overlay** on hero photos — this echoes the flyer's own gradient and is what will make photos feel branded rather than stock.
- Use **real photos wherever possible** once available; until then, use clearly-marked placeholder images (see Part 2 for what to shoot and provide).
- For a recurring visual motif — since the plant/leaf is the core logo symbol, consider a **subtle leaf-vein line graphic** as a section divider or scroll accent, echoing the logo without repeating it outright. This gives the site a signature detail the way the path motif would have, but drawn from the identity you're actually keeping.

**Animation (keep it purposeful, not decorative):**
- Scroll-reveal (fade + slight upward slide) on section entry — Framer Motion if using React
- Animated counters on stats (count up from 0 when scrolled into view)
- Hover states on service cards: slight lift + shadow, icon color shift from navy to amber
- Sticky/transforming navbar: transparent over the hero, solid navy background once scrolled
- Avoid: parallax overload, auto-playing carousels with no pause control, and animations that block content from loading — these hurt both the "not AI-generated" goal and mobile performance on Nigerian networks.

**Typography:** the logo's wordmark uses a bold, slightly rounded chunky letterform. The closest well-supported free matches are **Baloo 2 ExtraBold** or **Poppins Black** for headings, paired with **Inter** for body text/UI — both free, both install cleanly, and both read as intentional rather than default.

**Light/dark mode:** covered in full in Part 2, Section 2 — respects system preference by default with a manual toggle in the header.

---

## 4. Admin Panel

Four functional areas — plan for role-based access (Super Admin, Content Editor, Bookings Manager) since Chinyere, Faith, and you will likely need different levels of access, with you holding full access:

**1. Content & Media Management**
- Create/edit/delete Announcements and Events (with image upload, publish/unpublish toggle)
- Edit static page content (About, Impact stats) without touching code
- Manage the Timeline/Achievements entries
- **Photo library:** upload, replace, or remove images used across the site (hero banners, About photos, course thumbnails) directly from the admin panel — no developer needed once this is built, which covers your request to swap placeholder images for real ones yourself

**2. Course/Learning Management**
- Create courses (title, description, category, format options + per-format pricing, trainer)
- Upload course materials (videos, PDFs, slides) organized by module
- Build/edit quiz question banks per module
- View enrolled students per course, their quiz results, and certificate status
- Mark courses as active/archived

**3. Bookings & Space Management**
- Calendar view of all Day Workspace, Overnight Workspace, and Media Room bookings
- **Overnight Workspace request queue:** a dedicated view of "Request Access" submissions with a status field (New → Contacted → Verified In-Person → Approved/Rejected) and a notes field — no ID documents are stored here, since that verification happens entirely at the office
- Manual booking creation (for walk-ins or phone bookings)

**4. Applications & Inquiries**
- View submissions from Consulting Service forms with status tracking (New → In Progress → Resolved)
- Export to CSV for offline follow-up

---

## 5. Design References

I pulled the actual structure of the Tony Elumelu Foundation's homepage as one real example, since it's a well-established African philanthropy site: it opens with a hero video, moves into animated impact counters, a rotating "Did You Know" facts strip, a three/four-pillar "What We Do" grid, an auto-updating news feed, a testimonial carousel, and closes with a newsletter signup and social footer — that overall skeleton (hero → stats → pillars → news → testimonials → newsletter) is a solid, proven structure worth following, adapted entirely to RSF's own content, photos, and the extracted palette above rather than copied.

For layout/interaction inspiration, browse (as structural reference only, never to clone):
- **Webflow's "Nonprofit" and "Coworking Space" template categories**
- **ThemeForest's "NGO/Charity" and "Coworking" categories**
- **Andela's and other African tech-hub sites** — worth a look for how they present "workspace + training + talent" as one coherent brand

---

## 6. Suggested Tech Stack for Vibe Coding

- **Frontend:** Next.js + Tailwind CSS (well-represented in AI-coding tools' training data, easy to theme with your exact hex codes, good performance)
- **Animation:** Framer Motion
- **Backend/Auth/Database:** Supabase (Postgres + built-in auth + file storage — handles user accounts, course enrollment data, booking records, quiz banks, and certificates in one platform)
- **Payments:** both **Paystack and Flutterwave/bank transfer** — Paystack for cards, plus a manual bank-transfer option with proof-of-payment upload and admin confirmation, since you want both available
- **Hosting:** Vercel (pairs natively with Next.js, generous free tier, fast in Nigeria via their CDN)

---

## 7. Claude Code — Plan & Timeline

**Plan recommendation:** Claude Code is included in all paid Claude plans (Pro, Max, Team) — no separate purchase. Given the scope here (auth, branching bookings, a full LMS with quizzes/certificates/gamification, multi-role admin, dual payment integration, SEO/analytics/security work) and your timeline, I'd recommend starting on **Max 5x ($100/month)** rather than Pro ($20/month) — a project this size worked on for several hours a day will likely hit Pro's limits repeatedly, costing you time before Oct 16. Drop back to Pro afterward if your usage turns out lighter.

**Timeline — an honest assessment:** the full scope (auth, branching bookings, LMS with randomized quizzes/certificates/gamification, multi-role admin, dual payment gateways, SEO/analytics/security, plus content population) is realistically **4-6 weeks of focused, near-daily work**, even AI-assisted — the bottleneck is testing booking edge cases and payment flows end-to-end, not typing speed.

**Confirmed plan — two phases:**
- **Phase 1, by Oct 16:** Foundation pages, Tech & Space overview, browsable course catalog (enrollment/payment can go live slightly after if needed), announcements, and a simple booking/request form
- **Phase 2, weeks 3-6 post-launch:** full auth, automated booking calendar, complete LMS with quizzes/certificates/gamification, dual payment integration, full admin panel

---

## 8. What You Might Be Missing

- **Privacy Policy, Terms of Service, and a Safeguarding/Child Protection Policy** — the last one matters specifically since RSF works with secondary/pre-university students; full drafts covered in Part 2
- **NDPR compliance note** (Nigeria Data Protection Regulation) — a short data-handling statement protects both RSF and your users
- **Mobile-first design** — most visitors, especially students, will be on phones
- **Basic SEO setup** — page titles, meta descriptions, sitemap.xml (detailed checklist in Part 2)
- **Analytics with error tracking** — recommended tools and setup in Part 2
- **Accessibility basics** — alt text on images, sufficient color contrast, keyboard-navigable forms; helps SEO too
- **A staging/preview environment** — so Faith or Chinyere editing content doesn't risk breaking the live public site
- **Custom 404 and error pages** styled to match the brand, rather than a default blank error
- **A shared content calendar/process** — since multiple people will touch the admin panel, a quick shared doc on who posts what avoids duplicate or conflicting announcements
- **Domain email** (e.g., `info@yourdomain.org`) once your domain is confirmed
- **A free uptime monitor** (e.g., UptimeRobot) that alerts you by email/SMS if the site goes down

---

## 9. Pricing — What to Charge

Based on current Nigerian market rates for a project of this scope (2026 data): a purely informational brochure site typically runs ₦250,000–₦500,000, while a custom web application with user accounts, dashboards, bookings, and an LMS — which is what this actually is — runs ₦1,500,000–₦10,000,000 through an agency, or roughly ₦400,000–₦1,200,000+ for a solo freelancer, scaling with scope and experience level.

**A reasonable approach:**
- **Phase 1 (Foundation site + Tech & Space marketing pages, catalog browsing):** treat this as a ₦350,000–₦600,000 scope — enough to launch publicly by Oct 16
- **Phase 2 (Auth, bookings, full Learning Hub, admin panel, payments):** a separate ₦600,000–₦1,500,000 scope, built and billed after launch

This split also matches your actual timeline — shipping the full booking/LMS/admin system before Oct 16 alongside everything else on the launch checklist isn't realistic, so a phased build is both the safer engineering choice and the more defensible pricing structure.

---

## 10. Pushing Phase 2 Without Glitches

The risk with a two-phase build isn't building Phase 2 — it's that the moment you deploy it, you could break the Phase 1 site that's already live and indexed by Google, with real visitors using it. Here's how to avoid that:

### 10.1 Build Phase 2 in a separate branch, not on top of live code
Create a new Git branch (e.g., `phase-2`) off your live `main` branch. All auth, booking, LMS, and admin work happens there. Your live site keeps running untouched from `main` the entire time you're building — nothing you do in the `phase-2` branch can accidentally affect what visitors see.

### 10.2 Use Vercel's preview deployments to test before anyone else sees it
Every push to the `phase-2` branch gets its own automatic preview URL from Vercel (something like `rsf-git-phase-2-yourteam.vercel.app`) — a fully working, real version of the site that only you (and anyone you share the link with) can see. Test everything here: create a test account, run through a booking, enroll in a test course, attempt a quiz, generate a certificate, try a payment with Paystack's test mode. This is where you catch problems while they cost nothing.

### 10.3 Design the database so Phase 2 only adds, never changes, Phase 1 data
This is the part most likely to cause a real glitch if skipped: Phase 2 introduces new tables (`enrollments`, `quiz_attempts`, `bookings`, etc.) and new columns. As long as these are **additive** — new tables and new optional columns — rather than changing or removing anything Phase 1 already relies on (like renaming a field the Announcements page reads from), Phase 1 keeps working exactly as it did even after the Phase 2 database changes are applied. Run any database migration in staging first, confirm the live Phase 1 pages still load correctly against the updated schema, and only then apply it to production.

### 10.4 Convert the Phase 1 "request forms" into real flows in place, one at a time
Rather than replacing the whole site at once, swap each Phase 1 placeholder individually:
1. Day Workspace booking form → live calendar booking (test for a few days)
2. Course enrollment "Coming Soon" → live enroll + payment (test with Paystack test mode, then real small transactions)
3. Login/Register → live auth
4. Dashboard → live, once accounts exist to populate it

Each swap is its own small, low-risk deploy rather than one giant cutover — if something's wrong with the booking calendar specifically, you'll know immediately and can roll back just that piece, rather than untangling a problem inside one massive release.

### 10.5 Soft-launch to a small group first
Before announcing Phase 2 publicly, share the live (not preview) booking/enrollment flow with a handful of real people — Chinyere, Faith, maybe a few students — and have them actually try to book a session or enroll in a course. This catches real-world issues (a confusing form field, a payment edge case) that testing alone tends to miss, before it's in front of your full audience.

### 10.6 Have a rollback plan
Vercel keeps every previous deployment live and instantly reachable — if Phase 2 goes out and something's seriously wrong, you can revert to the last working deployment in a couple of clicks while you fix the issue, rather than the site being broken while you debug live. Know where this button is before you need it, not after.

### 10.7 Timing
Don't deploy Phase 2 changes during a period you expect traffic (e.g., right when you've just posted a new announcement or course). Early morning or late evening Nigeria time, when traffic is naturally lower, gives you a quieter window to catch and fix anything unexpected before most visitors arrive.

---

**See the companion document (Part 2) for:** the full color extraction and dark-mode spec, the complete LMS build guide (quizzes, certificates, gamification), footer/legal content, the photo checklist, Impact page guidance, and the technical/SEO/security checklist.
