# Sitemap and SEO audit

Written 28 October 2026 on `phase-2`. Compares (1) the planned sitemap and UX flow
(`docs/PLANNING-SITEMAP.md`), (2) the pages and routes that exist in the code, and (3) the live
`sitemap.xml` (10 pages, fetched today from rafaelsupportfoundation.org). Page checks were run on a
production build of `phase-2` with accounts switched off (the staged-launch state), plus the live site.

## 1. Planned versus built

| Planned page or feature | Status | Notes |
| --- | --- | --- |
| Home: hero with video | **Built** | Background video with poster and navy-purple overlay. |
| Home: impact counters | **Not built** (component exists, unused) | A `Counter` component is in the code but is not on any page. Needs real numbers from you. |
| Home: "Did you know" facts | **Not built** | Content from you. |
| Home: three pillars | **Built** | |
| Home: "What We're Up To" feed | **Not built** | Needs News and Events as data (see `docs/CONTENT-PLAN.md`). |
| Home: testimonials | **Not built** | Needs real testimonials with written consent. |
| Home: newsletter signup | **Built but not shown** | The form component and its `/api/newsletter` route exist; the form is not placed on any page. Quick win. |
| About: story and mission | **Built** | |
| About: timeline of achievements | **Not built** | Content from you (dates and milestones). |
| About: Impact page (stats, stories) | **Not built** | No route. Stays a placeholder until real data. |
| Tech & Space overview | **Built** | One page with sections (Workspace, Media Room, Learning, Consulting, Digital Marketing). |
| Day workspace booking | **Built in Phase 2** (hidden behind the booking switch) | Public page keeps the request form until booking is on. |
| Overnight workspace | **Built in Phase 2** (hidden) | Request, in-person approval, payment, private address. |
| Media Room booking | **Request form only** | No calendar or account booking. Gap if you want it to match the day desk. |
| Learning Hub: filterable catalog | **Not built** | Today it is a short list of course names with a "Register interest" form. No filters. |
| Learning Hub: course detail pages | **Not built** | No routes. |
| Learning Hub: Enroll | **Not built** | Phase 1 shows "Register interest". |
| My Learning (progress, quizzes, certificates) | **Not built** | The LMS in `RSF-Website-Spec-Part2.md` section 3. |
| Consulting: a landing page per service | **Not built** | One section with a request form, not four pages. |
| Media agency and contract services | **Built** | One section with a request form (digital marketing). |
| Announcements and News | **Not built** | Planned as admin-editable. See `docs/CONTENT-PLAN.md`. |
| Events | **Built** | One event (the launch), with Event structured data and a calendar file. |
| Get Involved: partner, volunteer | **Built** | Request forms. |
| Get Involved: apply for scholarship or competition | **Not built** | There is no scholarship or competition application form. |
| Contact | **Built** | |
| Login and Register | **Built in Phase 2** | Plus verify email, reset password, two-step login. |
| Dashboard: My Bookings | **Built in Phase 2** | |
| Dashboard: My Courses, My Applications | **Not built** | |
| Legal: Privacy, Terms, Safeguarding, Data Protection | **Built** | Text pre-dates booking (see `docs/LEGAL-REVIEW.md`). |
| Leadership, Why Abakaliki, Profile and documents | Removed on purpose | |

## 2. Sitemap and robots

**Live `sitemap.xml` (10 URLs):** home, about, tech-and-space, events, get-involved, contact, privacy,
terms, safeguarding, data-protection. The code that produces it is a fixed list, so it matches.

- **Exists but not in the sitemap:** nothing public is missing. (`/events/grand-opening.ics` is a calendar
  file, not a page, and correctly omitted.)
- **In the sitemap but should not be:** none. Every private page is absent from the list.
- **`lastModified` is wrong:** every page is stamped with the moment of each request, which tells search
  engines every page changed today. Quick win: use fixed dates that you update when a page really changes.
- **Not yet in the sitemap because they do not exist:** news posts, impact stories, course pages. They
  should join the sitemap automatically when M9 adds them.

**Private pages.** Required: `noindex`, out of the sitemap, and sensibly blocked in `robots.txt`.

| Path | `noindex` | In sitemap | Blocked in `robots.txt` (phase-2 file) |
| --- | --- | --- | --- |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | yes (set on each page) | no | yes |
| `/two-factor`, `/two-factor/*` | yes | no | yes |
| `/auth/*` (email confirmation) | yes | no | yes |
| `/account`, `/account/*` | yes (`noindex, nofollow`) | no | yes |
| `/admin`, `/admin/*` | yes (`noindex, nofollow`) | no | yes |
| `/book`, `/book/overnight` | yes (`noindex, nofollow`) | no | yes (`/book` covers both) |
| `/api/*` | n/a | no | yes |

The live site is still Phase 1: its `robots.txt` blocks only `/api/` and none of the private pages exist
there (the live `/login` returns 404), which is correct for Phase 1.

**One nuance for you to decide.** A page that is blocked in `robots.txt` cannot be read by Google, so it
cannot see that page's `noindex`; if another site links to `/login`, Google may list the bare address.
For `/login`, `/register`, `/forgot-password`, `/reset-password` and `/verify-email` (which are linked from
the site header) the usual advice is `noindex` and **allow** crawling. Keep blocking `/admin`, `/account`,
`/api`, `/auth`, `/two-factor` and `/book`. My recommendation is to make that small change before launch.

**A real problem found today.** With accounts switched off (the staged-launch state), `/book`, `/account`
and `/admin` answer with status **200** and an empty "Page not found" view, not a true 404. (They carry
`noindex`, so Google should not list them, but a 200 "soft 404" is untidy and tells the world those
addresses exist.) `/login` is correct (404). Fix: have the middleware answer a real 404 for all account
paths while accounts are off. **Fixed on `phase-2` and verified on a production build:** every account path now
returns a true 404 while accounts are off (this also needed the `/book/overnight` path added to the middleware
matcher, which the first attempt missed).

**FETHA digitization service.** It must stay off the nav, sitemap and search. Checked: no route, page,
component, link or content file mentions it; the only mentions are in `CLAUDE.md` and the planning
documents. Nothing links to it. If it ever needs a page, it should be an unlisted address with `noindex`,
not in the sitemap, shared directly with the client. Not built.

## 3. Page-level SEO (measured on the production build)

| Page | Title | Description | Canonical | Notes |
| --- | --- | --- | --- | --- |
| `/` | Helping people become who they want to be \| Rafael Support Foundation | 177 chars | **missing** | NGO structured data |
| `/about` | About \| Rafael Support Foundation | 196 | missing | Title is generic. Description is long (Google shows about 155). |
| `/tech-and-space` | RSF Tech & Space \| ... | 186 | missing | No structured data. |
| `/events` | Events \| ... | **95** | missing | Event structured data. |
| `/get-involved` | Get Involved \| ... | 110 | missing | |
| `/contact` | Contact \| ... | 129 | missing | |
| `/privacy`, `/terms`, `/safeguarding`, `/data-protection` | page name \| ... | 117, **58**, 116, 119 | missing | `/terms` description is very short. |

- **Titles:** present, unique, and under 60 characters. The About title could say what it is
  ("About Rafael Support Foundation: our story and mission").
- **Descriptions:** present on all. Some are over 160 characters (will be cut off in results) and `/terms`
  and `/events` are short. Quick copy fixes.
- **Canonical URLs: missing on every page.** Quick win: add one per page. With the `www` to apex redirect
  already in place this is a safety net, and it will matter once there are query-string URLs.
- **Open Graph and Twitter cards:** present, with a large image. But every page shares the **site-wide**
  title, description and `og:url` (the home page's), so a shared link to `/events` previews as the home page.
  Quick win: set a per-page `openGraph` title, description and url.
- **Structured data:** NGO on the home page (with address) and Event on `/events`. Missing and worth adding:
  `Organization` or `LocalBusiness` for Tech & Space with opening hours (hours are in the database only
  when booking is on, so add them from there), `WebSite`, breadcrumbs, and `Article` for news posts once
  they exist.
- **Headings and images:** one `h1` on every public page; no images without alt text.
- **404 and redirects (live):** a missing page returns a true 404 with `noindex` and a helpful page.
  `www` redirects (308) to the apex domain, and `http` redirects (308) to `https`.

## 4. Recommendation for the Learning Hub in Phase 2 (not built)

Your original plan says Enroll becomes "payment-connected", but Phase 2 is **bank transfer only, with no
payment gateway**. Recommendation: build the Learning Hub in the same style as bookings, not as a card
payment:
1. **Catalog and detail pages first, display only**, with fees "shared soon" until real prices exist
   (this follows the current no-prices rule). These are SEO pages and can come before any account feature.
2. **Enroll = a request**, then bank transfer: the learner picks the course and format, gets a reference,
   transfers, presses "I've paid", and staff confirm (the same flow as desks). Confirmed enrollment
   unlocks the lessons. No card gateway.
3. **Everything after that** (progress, quizzes with randomised questions, certificates with a
   verification page, streaks and badges) follows the build order in the LMS spec and needs trainers to
   write the question banks.
This keeps one payment method, one confirmation screen for staff, and no new payment risk.

## 5. Gap list in priority order

**Quick wins (code only, I can do them):**
1. True 404 for account pages while accounts are off (**done** on `phase-2`).
2. Canonical URL on every page.
3. Per-page Open Graph titles, descriptions and URLs.
4. Fixed `lastModified` dates in the sitemap.
5. `noindex` without `Disallow` for the five publicly linked auth pages (your decision).
6. Place the newsletter form (it already exists) in the footer or on the home page.
7. Tidy over-long and too-short meta descriptions (copy changes, you approve the wording).
8. Add Tech & Space structured data and a `WebSite` entry.

**Needs content or decisions from you:**
9. Impact numbers, "Did you know" facts, the timeline of achievements, testimonials with written consent.
10. A scholarship or competition application form: tell me the questions you want.
11. News and the "What We're Up To" feed: the content manager (`docs/CONTENT-PLAN.md`).
12. Course catalog, detail pages and trainers: real course content, fees and trainer bios.
13. One landing page per consulting service: short descriptions of each process.
14. Media Room booking: do you want it to use the same account booking as the day desk?
