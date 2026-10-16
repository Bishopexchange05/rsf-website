# Setting Up Claude Code for the RSF Website Build

This is a practical setup guide, not just theory — follow it in order and you'll have a working, credit-efficient Claude Code environment before you write your first prompt.

---

## 1. Install & Initialize

```bash
npm install -g @anthropic-ai/claude-code
```

Then, inside your project folder:

```bash
claude
```

Once you're in, run `/init` — this scans your project and generates a starter `CLAUDE.md` for you, which you'll then customize using Section 2 below.

**Plan:** as covered earlier, start on **Max 5x ($100/month)** given the scope and timeline. Claude Code is bundled into the plan — there's nothing extra to buy.

---

## 2. Your Starter CLAUDE.md

This file loads into every single session automatically — it's the single highest-leverage thing you can set up, and also the single easiest thing to accidentally waste tokens with if it's bloated. Keep it tight. Here's a draft built specifically around this project:

```markdown
# RSF Website — Project Context

## What this is
Rafael Support Foundation's website: a Foundation marketing site plus
a nested "RSF Tech and Space" section (bookings, courses, consulting).
Building in two phases — see PHASE_STATUS below before implementing
anything, and never build Phase 2 features while on a Phase 1 branch.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Framer Motion for animation
- Supabase (Postgres + Auth + Storage) for backend — Phase 2 only
- Paystack + manual bank transfer for payments — Phase 2 only
- Hosted on Vercel

## Brand colors (use these exact hex values, never approximate)
- Deep Navy: #143BA2
- Royal Purple: #59329C
- Brand Green: #3FC890
- Amber/Orange: #FEAE23
- Accent Red: #D02020 (sparing use only)
- Accent Bright Blue: #3B60F7 (sparing use only)
- Slate Navy text: #26374A
- Cream background: #EFF1F0
Dark mode tokens are defined in `tailwind.config.ts` under `colors.dark.*`
— never hardcode a dark-mode color inline, reference the token.

## PHASE_STATUS: Phase 1 (current)
No auth, no live booking calendar, no payments, no LMS backend.
Booking/enrollment UI exists but submits to a simple form endpoint
(email or a Supabase table with no auth attached), not a real
account system. Do not scaffold auth, Supabase RLS policies, or
payment code yet — that's Phase 2, done on a separate branch.

## Code style
- Functional components only, no class components
- Tailwind utility classes only — no inline styles, no separate CSS files
- Use the project's existing Button/Card/Section components rather than
  writing new ones — check /components first
- All copy/text content comes from /content/*.ts files, not hardcoded
  in components, since Chinyere/Faith will eventually edit this via
  an admin panel in Phase 2

## Workflow
- Run `npm run lint` and `npm run build` after any non-trivial change
  and fix errors before considering a task done
- Placeholder images go in /public/placeholders/ with descriptive
  names (e.g., workspace-day-placeholder.jpg) so they're easy to
  find and swap later
- No ID uploads anywhere on this site — the overnight workspace flow
  is a "Request Access" form only, never a document upload
- Never commit .env.local or any API key
```

Keep this under 200 lines total — if you add something, cut something that's no longer earning its place. A good test for each line: *"would removing this cause Claude to make a mistake?"* If not, cut it.

---

## 3. Permissions Setup (cuts interruptions, keeps you in flow)

Run `/permissions` and allowlist the commands you'll approve every time anyway — this is the single biggest thing that keeps a long build session from turning into constant "approve this?" prompts:

```
npm run dev
npm run build
npm run lint
git add
git commit
git status
git diff
```

Leave anything that touches payments, deletes files, or runs destructive database commands on manual approval — those are exactly the moments you want to actually look before Claude proceeds.

---

## 4. MCP Servers Worth Connecting

Run `claude mcp add` for each of these as you reach the stage that needs them — no need to connect everything on day one:

- **GitHub** (`gh` CLI, or the GitHub MCP) — for commits, PRs, and issue tracking once you're versioning the project properly
- **Supabase MCP** — lets Claude query your actual database schema and write migrations against real table structures instead of guessing, once you're in Phase 2
- **Vercel MCP** — lets Claude check deployment status and logs directly, useful when something fails on deploy and you want Claude to diagnose it without you copy-pasting error logs manually
- **A browser/screenshot tool** (Playwright MCP, or Claude Code's built-in Chrome integration) — this is what makes the "give Claude something to verify visually" pattern work: paste a design reference, have Claude build the page, then have it screenshot its own result and compare

---

## 5. Plugins & Skills

Run `/plugin` to browse the marketplace. Specifically worth adding for this stack:

- A **TypeScript/code intelligence plugin** — gives Claude precise symbol navigation and catches type errors immediately after edits, which matters a lot once the LMS data model (Section 3 of Part 2) has several connected tables referencing each other
- Nothing else is strictly necessary to start — resist installing a pile of plugins "just in case." Every connected MCP server and enabled plugin adds a small amount of permanent overhead to every session's context, so only add what you'll actually use this week.

**A custom skill worth building yourself:** a `.claude/skills/rsf-brand/SKILL.md` that documents the extracted palette, the format/pricing pattern (Section 3.2 of Part 2), and the "no ID uploads" rule — load-bearing project knowledge that doesn't need to sit in CLAUDE.md (which loads every session) but should be consistently available whenever you're touching anything brand- or booking-related.

---

## 6. How to Actually Build This Without Wasting Credits

This is the part that matters most, since you asked specifically about not wasting usage:

### Explore → Plan → Implement → Commit, every time
Don't jump straight to "build the homepage." Enter plan mode (`Shift+Tab` until you see `⏸ plan mode on`), have Claude read relevant files and ask it to propose an approach, review the plan, *then* let it implement. This single habit prevents the most expensive failure mode: Claude confidently building the wrong thing and you paying to have it redone.

### Use the Blueprint's own structure as your prompt sequence
You already have the build order from Part 2, Section 3.8 (for the LMS) and the Phase 1 sitemap (Blueprint Section 1) — follow that order literally. Don't ask for "the whole site" in one prompt; ask for one page or one feature at a time, matching the sequence you already have. Smaller, well-scoped prompts use less context per turn and are far easier to verify.

### `/clear` between unrelated pieces of work
This is the single biggest lever for reducing token usage. Finish the Hero section, confirm it looks right, then `/clear` before starting the Learning Hub page — carrying irrelevant finished work in context costs tokens on every subsequent message for no benefit. If you've corrected Claude more than twice on the same issue, that's also a `/clear` signal — a fresh session with a sharper prompt beats continuing a cluttered one.

### Use subagents for research, not your main session
When you need Claude to explore how something should work (e.g., "figure out how the Paystack webhook should update enrollment status"), ask it to use a subagent for that investigation. The research happens in a separate context and reports back a summary — your main session doesn't carry the weight of every file it had to read to figure that out.

### Give Claude a way to verify its own work
After any UI change: `npm run build` and `npm run lint`, and for visual work, a screenshot comparison against a reference. This closes the loop so Claude catches its own mistakes rather than you discovering them three prompts later — which is the expensive way to find bugs, both in your time and in the extra back-and-forth it costs.

### Reference files directly with `@`
`@components/Hero.tsx make the CTA button use the amber color token` costs far less than "update the hero section's button color" and making Claude search for the right file first.

### Track usage as you go
Run `/usage` periodically to see your session's token consumption, or set up a status line that shows it continuously — catching a context-heavy session early is cheaper than discovering you're near a limit mid-build.

---

## 7. Suggested First Session

Once CLAUDE.md is in place and permissions are set:

```
Read the attached RSF Website Blueprint and Part 2 documents.
Set up a Next.js + Tailwind + Framer Motion project matching the
stack in CLAUDE.md. Build the folder structure and the Home page
layout only — hero, impact counters (placeholder numbers), three-
pillar intro, and footer. Don't build other pages yet. Run the
build and lint after, and tell me what's left before this page
is complete.
```

Starting scoped like this — one page, explicit about what's out of scope — is what keeps the first session from sprawling into a half-finished attempt at the whole site.
