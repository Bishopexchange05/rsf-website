# M9 "content": a small content manager inside the admin (plan only, nothing built)

Written 28 October 2026. The goal: banners, news, events and impact posts can be changed by the team
without a code change or a deployment. It follows the shape of `docs/PLANNING-SITEMAP.md`.

## 1. What it would include

**1. Announcement banner (the first, smallest piece).** One banner at a time, with: on/off switch, text,
button label, link, **start date and end date**. When the end date passes the banner disappears by
itself, so the problem we just had (an expired launch banner) cannot happen again. A visitor can still
dismiss it, and a dismissed banner stays hidden for that visitor.

**2. Posts: News, Events and Impact stories.** One simple "post" with a type. The fields are: title, short
summary, body (plain text with paragraphs, bold and links; no raw web code), cover image with required alt
text, status (draft, published, archived) and publish date. Events also get a start and end time, venue
and an optional link. It feeds:
- the Home "What We're Up To" cards (the latest 3 or 4 published posts, automatically);
- a News page (list) and a page for each post;
- the Events page (upcoming and past), starting from the existing grand-opening event;
- the Impact page under About (stories and results), once you have real material.

**3. Image uploads (part of posts).** Rules built in:
- Only JPEG, PNG or WebP. No SVG, GIF or PDF.
- At most 5 MB; the server shrinks it to a sensible size and converts it to an efficient format, and
  **removes hidden data** (location and camera details) from the photo.
- **Alt text is required**, up to 140 characters, or the post cannot be published.
- File names are replaced with random ones; a person's name is never in a file name.
- Stored in a private-write, public-read Supabase Storage folder that only the content manager can write
  to. Images are delivered through the site's image optimiser (small, fast, correct size).
- A usage counter on the admin page, because the Free plan has 1 GB of storage.

**4. Testimonials and impact counters (small, optional).** Two tiny lists: testimonials (quote, first name
and role, "written consent given" tick, published or not) and impact numbers (label, number, order) that
drive the Home counters. Only if you want them: they are small. They stay placeholders until you give real
data. A testimonial cannot be published without the consent tick.

**Not included, on purpose:** editing every sentence on every page; the legal pages (they go through your
lawyer and stay in the code); course content (that belongs to the Learning Hub work); page layout.

## 2. Who may edit, and the record

| Action | Staff | Admin |
| --- | --- | --- |
| Edit the banner | yes | yes |
| Write and publish posts, upload images | yes | yes |
| Unpublish or archive a post | yes | yes |
| Delete a post or image permanently | no | yes |
| Testimonials and impact numbers | yes (consent tick required) | yes |

Staff and Admin both need the authenticator-app second step, as everywhere in the admin. **Every change is
written to the audit log** (who, when, what changed, with the before and after text; images are logged by
file reference, not content). Publishing a post or turning the banner on is logged as its own action.

## 3. How it fits the launch rule

The website must still look the same with accounts and booking switched **off** in production. So the content
manager has its own switch. When it is off, or if the database cannot be reached, the pages show today's
built-in text exactly as now. That keeps the staged launch safe: merging `phase-2` into `main` changes
nothing visible until you turn a switch on.

## 4. Order and timing

- **M9a, banner** (small): table, admin screen, the banner reads it. This is the one most likely to be
  wanted first. It needs the production database to exist before it can run live. Until then the hotfix on
  `main` has removed the expired banner.
- **M9b, posts, News, Events, Home feed** (medium).
- **M9c, images** (medium; needs the storage rules above).
- **M9d, testimonials and impact counters** (small, only if you want them).

**Can it be built while we wait for DNS and your lawyer? Yes.** It needs neither. It collects no new personal
data except testimonial names (with a consent tick), and it does not touch booking or email. It can run on
the development project while the launch-checklist items (verified email domain, lawyer review, production
project) are still open. I suggest this order: keep-alive and backups, then the remaining M8 code (reminders, email retry,
download and delete my data, retention), then M9a to M9c while those items are open, then the final checks.

## 5. What I need from you

1. A yes or no on each of the four pieces above, and on the roles table.
2. **Real content** (nothing is invented): at least one real news or impact story; real event details; real
   numbers for the impact counters; testimonials **with written permission**; photos you have the right to use.
3. **A rule for photos of young people** (safeguarding): I suggest no full names, no school names and no
   locations with a child's photo, and a signed parent or guardian consent held on file for anyone under 18.
   Please confirm, or tell your lawyer to decide.
4. The names of the people who will edit (so they get Staff accounts), for example Chinyere and Faith.
5. Whether posts need a second person to approve before publishing (simpler: Staff publish directly and an
   Admin can unpublish; safer: draft, then an Admin publishes).
