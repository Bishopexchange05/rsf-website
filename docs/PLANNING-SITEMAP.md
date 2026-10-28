# Planning sitemap and UX flow (source of truth for the site audit and content plan)

This is the owner's original planning sitemap and page-by-page UX flow. It is the same
text as sections 1 and 2 of `RSF-Website-Blueprint.md`, saved here so it sits with the
Phase 2 documents. The UX flow ends at Consulting Services by design. The companion
spec it refers to ("Part 2, Section 3", the Learning Management System) is
`RSF-Website-Spec-Part2.md` in the project root, so nothing is missing.

Note for Phase 2: the original plan says course Enroll becomes "payment-connected". Phase 2
is bank transfer only with no payment gateway, so any Enroll flow must use the same
"I've paid" and staff confirmation steps as bookings. See `docs/SITE-AUDIT.md`.

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

