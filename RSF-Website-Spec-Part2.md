# RSF Website — Spec Part 2: Color Detail, LMS Build Guide, Content & Technical Checklist

---

## 1. Brand Decision — Resolved

Confirmed: the official identity is the existing green plant-and-hand circular logo and the blue/purple/green flyer palette. The teal/amber door-and-path concept is retired. The extracted, real hex codes below are pulled directly from your actual logo and flyer PNGs (sampled pixel-by-pixel, not estimated), so they're accurate to what's already printed and circulating.

---

## 2. Full Color Palette & Dark Mode Spec

### Extracted colors, with source

| Name | Hex | Sampled from |
|---|---|---|
| Deep Navy Blue | `#143BA2` | Flyer background, top-left corner of the gradient |
| Royal Purple | `#59329C` | Flyer background, gradient mid-tone |
| Dark Panel Purple | `#3A2270` | Flyer's rounded info panels ("Our Services" box) |
| Brand Green | `#3FC890` | "Space" text on flyer |
| Bright Green (highlight) | `#2EEF80` | The "&" circle accent on flyer |
| Amber/Orange | `#FEAE23` | "Grand Opening" badge |
| Accent Red | `#D02020` | Flyer's red triangle accent shape |
| Accent Bright Blue | `#3B60F7` | Flyer's blue diamond accent shape |
| Teal-Cyan (pill gradient) | `#5AC7DC` → `#9FD4E2` | ".Connect" pill |
| Mint (pill) | `#A5ECC4` | ".Grow" pill |
| Slate Navy (logo text/ring) | `#26374A` | Logo wordmark and outer ring |
| Sage Green (logo leaf) | `#BFDF9C` | Logo's leaf illustration |
| Medium Green (logo hand) | `#7FAB6C` | Logo's hand illustration |
| Cream/Off-White | `#EFF1F0` | Flyer's bottom info section background |

### How to use them (60-30-10, adapted)

- **~60% neutral base:** `#EFF1F0` (light mode) or a deep near-navy `#0B1230` (dark mode, derived by darkening the Deep Navy) — most backgrounds and whitespace
- **~30% primary brand:** `#143BA2` (navy) and `#59329C` (purple), used as a gradient pairing for hero sections, headers, and nav — this directly echoes the flyer
- **~10% accent:** `#3FC890` (green) and `#FEAE23` (amber) for buttons, icons, and highlights — amber specifically for primary CTAs ("Enroll Now," "Book Now"), green for success states and secondary highlights
- **Rare/deliberate only:** `#D02020` and `#3B60F7` — reserve these for things that must visually interrupt (a "2 slots left" tag, an error message, a small decorative shape) — using them more broadly would compete with the amber CTA color and dilute what "this is clickable" means on the site

### Dark mode

| Element | Light mode | Dark mode |
|---|---|---|
| Background | `#EFF1F0` | `#0B1230` (deep navy-black, not pure black) |
| Card/panel background | `#FFFFFF` | `#151C3D` |
| Primary text | `#26374A` | `#EDEFF5` |
| Header/nav background | `#143BA2` | `#0B1230` (same as page background, with a subtle border instead of a color block) |
| Primary buttons | `#FEAE23` on navy | `#FEAE23` (unchanged — amber already reads well on dark) |
| Brand green accents | `#3FC890` | `#4FE3A6` (slightly brightened so it doesn't look muddy against dark backgrounds) |
| Links | `#5AC7DC` | `#7DD8E8` (slightly brightened) |

- Respect system preference by default (`prefers-color-scheme: dark`), with a manual toggle in the header; store the manual override in local storage so it persists across visits
- Test the logo specifically in dark mode — the plant-and-hand mark's greens should hold up fine, but if the outer ring's slate-navy blends too closely into a dark background, keep a subtle white or light outline version of the logo on standby for dark-mode headers

### On "not looking AI-generated"
The tell isn't the colors themselves — it's uniform saturation and even spacing everywhere. Real designed sites use deliberate asymmetry (a hero split 60/40, not 50/50), alternating section backgrounds (white → navy → cream → purple-gradient, not the same background top to bottom), and color used functionally — amber always means "clickable," never used decoratively elsewhere. This gets built into the actual Claude Code implementation, not something you manage by hand afterward.

---

## 3. Learning Management System (LMS) — Full Build Guide

This is the most technically involved part of the site, so here's how each piece actually works, not just what it does.

### 3.1 Data model (the foundation everything else builds on)

Think of the LMS in five connected tables (using Supabase/Postgres):

- **`courses`** — id, title, description, category, trainer_id, status (draft/active/archived)
- **`course_formats`** — course_id, format (virtual/physical/hybrid), price — this lets one course have three different price points depending on format, which directly answers your format/pricing request
- **`modules`** — course_id, title, order_index — the sections within a course
- **`lessons`** — module_id, title, video_url (self-hosted or YouTube link), order_index, duration
- **`enrollments`** — user_id, course_id, format_chosen, payment_status, enrolled_at, progress_percent

This structure is what lets a course be "one thing" in the admin panel but "three purchasable options" on the public page.

### 3.2 Format selection & pricing (virtual / physical / hybrid)

On the Course Detail page:
1. Fetch all `course_formats` rows for that course
2. Render as a radio/segmented control: "Virtual — ₦X" / "Physical — ₦Y" / "Hybrid — ₦Z"
3. Selecting one updates the displayed price and the "Enroll" button's target price in real time (simple client-side state, no page reload)
4. On enrollment, the chosen format is saved to the `enrollments` row — this is what tells your admin panel and the student's dashboard whether they should expect physical attendance, a video link, or both

Use placeholder prices for now (e.g., ₦15,000 / ₦25,000 / ₦35,000 as dummy values) — these get edited later from the admin panel's course management screen, no code changes needed once that panel exists.

### 3.3 Video hosting: self-hosted + external links

- **Self-hosted videos:** upload to Supabase Storage (or, if videos are large/numerous, a dedicated video host like Mux or Cloudflare Stream is worth it later — Supabase Storage works fine for a moderate number of videos to start). Store the resulting URL in the lesson's `video_url` field.
- **External links (YouTube etc.):** store the YouTube URL the same way; the video player component just needs to detect whether a URL is a direct file or a YouTube link and render either a native `<video>` tag or an embedded YouTube iframe accordingly.
- Either way, the student's experience should look identical (same player frame, same "mark as complete" button below it) — they shouldn't be able to tell which lessons are self-hosted vs. linked out.

### 3.4 Quizzes & exams — no two students get the same questions

1. **Build a question bank per module**, not a single fixed quiz — if a module needs a 10-question quiz, write 20-25 questions into the bank. This is the trainer's job (more content up front), not something code can generate on its own — the questions need real subject-matter accuracy.
2. **On each quiz attempt:** the backend randomly selects the required number of questions from that module's bank, and separately randomizes the order of the answer options within each question
3. **Store the specific question set shown** to that student for that attempt (a `quiz_attempts` table with a list of question IDs used) — this matters so that if they review their results later, they see the exact questions they were actually asked, not a different random set
4. **Scoring:** compare submitted answers against the correct answer flagged in each question record, calculate percentage, store the result
5. **Passing threshold:** typically 70% is standard for course completion — configurable per course in the admin panel rather than hardcoded

### 3.5 Certificates

1. Once a student passes all required module quizzes at the passing threshold, mark the `enrollments` row as `completed`
2. Generate a PDF certificate on the fly (a library like `@react-pdf/renderer` or a server-side PDF generator works well with Next.js) populated with: student name, course name, completion date, and a unique verification code (e.g., a short random alphanumeric string stored against that enrollment)
3. The student can download this PDF from their dashboard
4. Build a simple public page — `/verify-certificate` — where anyone (an employer, for instance) can paste in that code and see a confirmation: "Valid — [Name] completed [Course] on [Date]." This is a small page but it's what makes the certificate actually worth something to an employer checking it.

### 3.6 Gamification: streaks, points, badges, leaderboards

- **Points:** award points for concrete actions — completing a lesson (+10), passing a quiz (+20 to +50 depending on score), finishing a course (+100). Store as a running total on the user's profile.
- **Streaks:** track a `last_activity_date` per user. Each day they complete at least one lesson or quiz attempt, increment a `streak_count`; if a day is missed, reset it — but build in a 1-day grace period (don't reset immediately at midnight, give until the following evening) since harsh resets are what causes students to give up on a broken streak entirely rather than restart it.
- **Badges:** a simple `badges` table (first_lesson, first_quiz_passed, course_complete, seven_day_streak, top_three_leaderboard, etc.) awarded automatically when the triggering condition is met, displayed on the student's dashboard/profile.
- **Leaderboards:** rank by points, **scoped per course** rather than site-wide (a Python beginner shouldn't be ranked against someone finishing AI Mastery — it's discouraging and not a meaningful comparison). Add an opt-out toggle in each student's settings for those who'd rather not appear publicly ranked.

### 3.7 Student dashboard ("My Courses")

Pulls together everything above into one view per enrolled course:
- Progress bar (lessons completed / total lessons)
- Current streak indicator
- Quiz history (attempts, scores, pass/fail)
- Certificate download button (once earned)
- Course-specific leaderboard position (if they haven't opted out)

### 3.8 Build order (so you're not trying to build all of this at once)
1. Courses + modules + lessons + enrollment (no payment yet) — get content displaying and playable first
2. Format selection + pricing display (still placeholder prices)
3. Progress tracking (mark lesson complete, calculate percent)
4. Quiz system (question bank, randomization, scoring)
5. Certificates + verification page
6. Gamification layer (points, streaks, badges, leaderboards) — genuinely the last thing to add, since it's the least critical to a student actually learning, and it's easiest to bolt on once the core progress-tracking data already exists
7. Payment integration tying into enrollment

This order means that even if you run out of time before Oct 16, whatever's built so far is still a working, usable product — nothing earlier in the list depends on something later in the list existing first.

---

## 4. Content You Need to Provide

### Photo checklist (using placeholders until these are ready)

| Photo type | What should be happening in it |
|---|---|
| Building exterior | The actual Dreamlink Concepts building/entrance, ideally with RSF signage visible once installed |
| Workspace (day) | People actually seated at desks working — candid, not posed |
| Overnight workspace | The space itself, well-lit, showing it's genuinely usable at night |
| Media/podcast room | Equipment set up, ideally mid-recording with someone at the mic |
| Training session | A trainer actively teaching, students engaged, laptops/screens visible |
| Consulting session | A one-on-one or small-group advisory moment |
| Team | Individual headshots (consistent background/lighting) plus one group shot |
| Launch event (from Oct 16) | Crowd shots, ribbon-cutting, speaker moments, booth interactions |
| Past NGO activities | Scholarship award ceremonies, competitions, past beneficiaries — critical for Impact page |
| Course thumbnails | A representative image or styled graphic per course category |

**Format tips:** shoot horizontally for hero banners, get vertical/square crops too for mobile and social reuse, prioritize good natural light over camera quality.

### What the Impact page should contain
- **Headline stats:** total students/beneficiaries supported, scholarships awarded (and total value if comfortable sharing), competitions held, years active
- **Timeline of milestones:** founding year, first competition, first scholarship cohort, key partnerships, the decision to launch Tech & Space
- **Beneficiary stories:** 2-4 short real profiles (photo + name + 2-3 sentences) — the single most persuasive content type on any NGO site
- **Partner/sponsor logos**, if any, as a simple logo strip
- **Optional:** a downloadable annual report or impact summary PDF

**What to provide:** actual numbers (even approximate, labeled as such), 2-4 real beneficiary stories with permission to publish, past event photos, founding-year/milestone dates.

---

## 5. Footer & Legal/Compliance Content

**Column 1 — About/Quick Links:** short mission line, links to About, Impact, Tech & Space Overview

**Column 2 — Services:** quick links to Workspace, Learning Hub, Consulting, Media Agency

**Column 3 — Contact:**
- Physical address (Dreamlink Concepts, Mile 50, Abakaliki)
- Real support email once your domain is confirmed
- Phone number
- **WhatsApp chat link** (`wa.me/234...`) or floating WhatsApp button — one of the highest-converting contact methods in Nigeria
- Social icons: Facebook, Instagram (and others if active)

**Column 4 — Legal:**
- Privacy Policy
- Terms of Service
- Cookie Consent banner (not just a buried link — required since you'll be using analytics/tracking)
- **Safeguarding/Child Protection Policy** — worth adding given RSF works with pre-university students; standard practice for youth-facing organizations, builds real trust with parents
- Data Protection statement referencing NDPR compliance
- Copyright/IP notice: "© 2026 Rafael Support Foundation. All Rights Reserved."

I can draft the actual Privacy Policy, Terms of Service, and Safeguarding Policy text whenever you're ready — just say the word.

---

## 6. Technical Checklist (Full)

Organized by category so you can treat each as a mini to-do list against the Phase 1 / Phase 2 split.

### 6.1 Infrastructure & Hosting
| Item | Needed? | Notes |
|---|---|---|
| Domain + DNS configured | Yes | Point the domain at Vercel once you have it; this is usually same-day once DNS propagates |
| HTTPS/SSL | Yes, automatic | Vercel provisions this automatically once DNS is connected — just confirm it shows as active afterward |
| Hosting (Vercel) | Yes | Covered in Section 6 of Part 1 |
| CDN | Yes, automatic | Included with Vercel — no separate setup |
| Staging/preview environment | Yes | Vercel auto-generates a preview URL for every change before it goes live — use this to review before publishing, especially once Chinyere/Faith are editing content |

### 6.2 Version Control & Deployment
| Item | Needed? | Notes |
|---|---|---|
| Git + GitHub repository | Yes | Needed regardless of Claude Code — gives you history and a way to undo mistakes |
| CI/CD (auto-deploy on push) | Yes, automatic | Vercel deploys automatically when you push to GitHub — no extra setup required |
| Environment variables for secrets | Yes | API keys (Paystack, Supabase, etc.) go in Vercel's environment variable settings, never hardcoded into the codebase |

### 6.3 SEO
| Item | Needed? | Notes |
|---|---|---|
| Google Search Console | Yes | Free, essential — submit sitemap, monitor indexing |
| Bing Webmaster Tools | Yes, low priority | Quick to add alongside GSC |
| Sitemap (sitemap.xml) | Yes | Auto-generated by Next.js; required for GSC/Bing |
| robots.txt | Yes | Tells search engines what to crawl; also auto-generatable in Next.js |
| Open Graph tags | Yes | Controls link previews on WhatsApp/Facebook/Instagram — important given your active social promotion |
| Structured data (schema.org markup) | Yes | Marks up Organization info and Events so Google can show rich results (e.g., your launch event showing up with a date directly in search) |
| IndexNow | Yes, nice-to-have | Speeds up Bing/Yandex picking up new pages like Announcements |
| Favicon + web app manifest | Yes | Use the Rafael Support Foundation logo; manifest allows "Add to Home Screen" on mobile, which matters for repeat visitors booking/checking courses |

### 6.4 Analytics & Monitoring
| Item | Needed? | Notes |
|---|---|---|
| Analytics w/ error reports | Yes — **PostHog** | Bundles analytics, session replay, and basic error tracking with a generous free tier |
| Sentry (error tracking) | Yes | Catches JS/backend errors in real time; free tier covers this site size |
| Uptime monitor | Yes | Free tier of UptimeRobot — alerts you by email/SMS if the site goes down, before a visitor has to tell you |

### 6.5 Security
| Item | Needed? | Notes |
|---|---|---|
| Rate limiting | Yes | Apply at: login/registration, booking and enrollment submission, contact/consulting forms, quiz submission, file upload endpoints, and public API routes generally |
| Password handling | Yes, automatic | Supabase Auth manages hashing/storage properly out of the box — never roll this by hand |
| Role-based access control (RBAC) | Yes | Test explicitly once built — confirm a Bookings Manager genuinely cannot reach Content Editor-only routes, etc. |
| Input validation & sanitization | Yes | On every form, to prevent injection attacks |
| Security headers (CSP, X-Frame-Options, HSTS) | Yes | One-time setup, typically a few lines of config |
| CAPTCHA / bot protection on public forms | Yes | Cloudflare Turnstile (free) on contact, consulting, and booking-request forms — prevents spam submissions clogging your admin queue |
| Two-factor authentication for admin accounts | Yes, by Phase 2 | Since admins will manage bookings, payments, and personal data, 2FA on admin logins specifically (not required for regular student accounts) is a meaningful extra layer |
| Admin action audit log | Yes, by Phase 2 | A simple log of who changed what and when in the admin panel — useful both for accountability across Chinyere/Faith/you and for catching mistakes |
| Dependency updates | Yes, ongoing | The most common real-world breach vector is outdated packages, not exotic attacks — worth a recurring monthly check |
| Secrets kept out of codebase | Yes | Covered in 6.2 |

**Realistic expectation:** no website is genuinely "impossible to hack." This checklist gets you to "genuinely hard to compromise, and you'll know quickly if something's wrong," which is the honest, achievable goal.

### 6.6 Performance
| Item | Needed? | Notes |
|---|---|---|
| Image optimization | Yes, automatic | Built into Next.js — matters more than raw server capacity for perceived speed on Nigerian mobile networks |
| Lazy loading | Yes | Especially the homepage hero video/images and anything below the fold |
| Compressed hero video | Yes | Keep file size lean; a heavy autoplay video is the single most common cause of a slow-feeling homepage |
| Caching strategy | Yes, mostly automatic | Vercel handles static asset caching by default; course video delivery is the one area worth revisiting if load times lag once there's real content |
| Handles traffic spikes | Yes, automatic | Vercel scales automatically — no manual provisioning needed for a post-launch traffic surge |

### 6.7 Communications (Phase 2)
| Item | Needed? | Notes |
|---|---|---|
| Transactional email service | Yes | Resend or SendGrid for booking confirmations, enrollment receipts, password resets — a free tier comfortably covers early-stage volume |
| SMS notifications (optional) | Nice-to-have | For booking/enrollment confirmations via a Nigerian SMS gateway (e.g., Termii) — useful given not everyone checks email promptly, but can wait until after core Phase 2 features |
| Domain email | Yes | `info@yourdomain.org` once the domain is confirmed — meaningfully improves professionalism in replies |

### 6.8 Payments (Phase 2)
| Item | Needed? | Notes |
|---|---|---|
| Paystack integration | Yes | Hosted checkout — card details never touch your own server, which keeps you out of PCI-compliance scope entirely |
| Bank transfer option | Yes | Manual flow: student uploads proof of payment, admin confirms in the Bookings/Applications queue |
| Webhook handling | Yes | Paystack sends a webhook confirming payment success — your backend needs to listen for this and update the enrollment/booking status automatically, rather than trusting the frontend alone |

### 6.9 Compliance
| Item | Needed? | Notes |
|---|---|---|
| NDPR compliance statement | Yes | Covered in Section 5 (footer/legal) |
| Cookie consent banner | Yes | Required since you'll be running PostHog/analytics — a lightweight banner library (e.g., `vanilla-cookieconsent`) is enough, doesn't need to be elaborate |
| Accessibility basics | Yes | Alt text on images, sufficient color contrast (worth re-checking once dark mode is built), keyboard-navigable forms — also helps SEO ranking |

### 6.10 Pre-Launch Testing
| Item | Needed? | Notes |
|---|---|---|
| Cross-browser testing | Yes | Chrome, Safari, and specifically Opera Mini/UC Browser given their real usage share on Nigerian mobile devices |
| Mobile responsiveness testing | Yes | On actual phones, not just a resized desktop browser window |
| Form testing end-to-end | Yes | Every form (contact, booking request, enrollment) submitted and verified to actually reach the admin panel before launch day |
| Broken link check | Yes | A quick automated crawl (e.g., a free tool like Screaming Frog's limited mode) before going live |
| Lighthouse performance audit | Yes | Run Chrome's built-in Lighthouse tool and aim for a performance score in the 80s+ before launch; it will also flag accessibility and SEO issues in one pass |

---

## Still Need From You
1. Real impact numbers, 2-4 beneficiary stories, and any existing event/activity photos (Section 4)
2. The domain, once you have it
3. Confirmation you're happy with placeholder pricing structure (virtual/physical/hybrid) shown in Section 3.2, or actual figures if you have them already
