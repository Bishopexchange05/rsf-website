# Performance, SEO and mobile report

Measured 28 October 2026 on a production build (`npm run build` then `next start`) of `phase-2`, with
Lighthouse 12 in mobile mode, plus responsive checks in a real browser. Target: mobile performance 99.

## 1. How to read the numbers (important)

- **This computer is slow for Lighthouse.** Lighthouse itself warned that "the tested device appears to have a
  slower CPU than Lighthouse expects" (its speed index was about 350 to 580, where it expects about 1,000 or
  more). With its normal 4x slowdown on top, even a plain legal page scored 55 to 70 with 2 to 3 seconds of
  blocking time. Those uncalibrated numbers say more about this PC than about the website.
- **So I calibrated** (slowdown multiplier 1) and, more importantly, **measured the live site's code
  (`main`) on the same machine in the same way** to see whether Phase 2 made anything worse.
- **Google's own PageSpeed Insights could not be used from here** (it refused unauthenticated requests with
  HTTP 429). The 99 you saw on the live site is Google's measurement and remains the reference. Please
  re-run PageSpeed Insights on the Vercel preview, or on the live site after each merge.
- Scores vary by about 3 points from run to run, and the first request after a restart is slower while the
  image optimiser builds its cache (one run showed 64 for that reason and 95 to 97 on repeat).
- **I cannot test your Samsung Galaxy S21 Ultra on Airtel 5G.** A phone test has to be done by you; the
  steps are in section 5.

## 2. Public pages: Phase 2 code (accounts off, as at the staged launch) against the live code

| Page | Phase 2, performance | Live code (`main`), performance | Accessibility, best practice, SEO (both) |
| --- | --- | --- | --- |
| Home | 95 | 90 | 100, 100, 100 |
| About | 95 | 93 | 100, 100, 100 |
| Tech & Space | 96 | 96 | 100, 100, 100 |
| Events | 97 | 96 | 100, 100, 100 |
| Get Involved | 97 | 97 | 100, 100, 100 |
| Contact | 94 | 96 | 100, 100, 100 |
| Privacy | 97 | 98 | 100, 100, 100 |
| Terms | 98 | 98 | 100, 100, 100 |
| Safeguarding | 98 | 98 | 100, 100, 100 |
| Data Protection | 97 | 93 | 100, 100, 100 |

**Result: no regression.** Phase 2 equals or beats the live code on 8 of 10 pages; the other two (Contact,
Privacy) are within run-to-run noise. The shared JavaScript is still **103 kB** for both. Layout shift is
0.007 or lower everywhere.

**Why it is not 99 in this local test:** the remaining gap is the **largest contentful paint, about 2.3 to
2.9 seconds** (first paint is 1.4 to 1.5 seconds; blocking time is 30 to 80 ms). The largest item on almost
every page is the big hero photo. I tried marking it high priority and it made no measurable difference, so I
reverted it. Likely real gains (not yet done, each needs a before and after on the preview): smaller or
better-cropped hero photos, and checking the images are served in AVIF. Google's measurement of the live site
was 99, so this local gap may be partly this computer and the missing CDN of a local server.

## 3. Phase 2 pages (accounts on)

| Page | Performance | Accessibility | Best practice | SEO | Note |
| --- | --- | --- | --- | --- | --- |
| Log in | 91 to 94 | 100 (was 98) | 100 | 58 | SEO is low on purpose: the page is `noindex`. |
| Register | 94 | 98 (before the footer fix, not re-measured) | 100 | 58 | same |
| Forgot password | 97 | 100 | 100 | 66 | same |
| Book a desk (signed in) | 87 | 100 | 100 | 58 | server answer 1.25 s (was 1.9 s) |
| Request overnight desk | 95 | 100 | 100 | 58 | |
| My bookings | 91 to 93 | 100 (was 98) | 100 | 58 | |

The low SEO scores are correct: private pages carry `noindex` so search engines skip them.

**The one real finding: the booking page waits for the database.** Each database call from this computer to
Supabase takes about 300 to 900 ms (one measurement stalled for 80 seconds and never repeated). The Book page
makes several one after another, so the server needed 1.9 seconds to answer. I changed it to run the three
independent lookups at the same time, and it now answers in 1.25 seconds. The bigger fix is in the setup,
not the code: **put the production Supabase project in the region closest to your visitors and set the
Vercel function region to the same place**, so each call takes milliseconds instead of hundreds of
milliseconds. I will give the exact setting when the production project exists.

## 4. Responsive layout (phone 375, tablet 768, laptop 1280 pixels)

Checked 16 pages at 3 widths (48 loads), including the signed-in booking pages.
- **No horizontal scrolling** on any page at any width.
- **No text smaller than about 13.5 px**, and **no oversized images** (none larger than 3 times the size shown).
- **Tap targets:** most are fine. Found and fixed on `phase-2`: small standalone text links (the Forgot
  password, Back to log in, My bookings, Contact us for pricing and Back links were only 17 to 19 px tall)
  now have a full-size tap area. Not changed on purpose: links inside a sentence (the usual exception),
  and the small checkbox squares (their whole label is tappable).
- **Accessibility:** the footer column headings skipped a heading level on pages without sub-headings; fixed
  (they are now level 2 headings), which lifted Log in, Forgot password and My bookings to 100.

## 5. What you can do on your own phone (Samsung Galaxy S21 Ultra, Airtel 5G)

1. Open the Vercel preview link on the phone, on mobile data (not Wi-Fi).
2. Open PageSpeed Insights (pagespeed.web.dev), paste the preview or live address and choose Mobile.
3. For a real feel test: log in, open Book a desk, pick an hour, and note how long each screen takes.
4. Tell me if anything feels slow, and which screen. Note that Vercel's preview is behind a Vercel login, so
   PageSpeed Insights can only test the live site or a preview with protection switched off.

## 6. Changes made on `phase-2` for this report

- The middleware now returns a **true 404** for every account page (login, register, book, account, admin,
  two-factor and so on) while accounts are off. Before, `/book`, `/account` and `/admin` answered 200 with an
  empty not-found view. Verified on a production build: all of them return 404 with accounts off.
- The Book page runs its three database lookups together.
- Footer headings are level 2; small standalone links have a full-size tap area.

Nothing here changes the live site until `phase-2` is merged, which needs your approval.

## 6. Large images (checked 31 October 2026, M8 group 4): no change needed

Measured on a production build with a phone-sized screen (412 px wide, 2x sharpness, like a Galaxy S21 Ultra):
- The photos on disk are modest: the biggest is 287 kB (`closing-banner.jpg`); the logo file is 237 kB.
- The site never sends those files as they are. Every photo goes through the image optimiser, which sends AVIF or WebP
  at the screen's size. On the phone, the hero photo was 14 to 22 kB, the About photos 18 to 42 kB, the logo 4 kB.
  All the pictures on the home page together were about 40 kB. On a large desktop screen the biggest photo was 77 kB.
- Every picture below the first screen loads only when scrolled to, and every image has a `sizes` setting that matches its layout.
- The only large file is the 3.4 MB Tech & Space tour video. It is not loaded at all until a visitor presses Play
  (`preload="none"`). The background hero video on the home page is only 51 kB, is added after the page has loaded, and
  is skipped on slow connections, data saver and reduced-motion settings.
So there is nothing to shrink that would change what a visitor downloads. Shrinking the source files would only save disk space.
Optional, not done: re-encode the tour video to a smaller size (needs your original clip and a video tool); it would only help visitors who press Play.
