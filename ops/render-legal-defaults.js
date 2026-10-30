// Writes docs/LEGAL-DEFAULTS.md from src/content/legal-defaults.ts, the single source of the
// booking-era legal wording and numbers. Run from the project folder:
//   node ops/render-legal-defaults.js
// Edit the TypeScript file, then run this again, so the document and the website never drift apart.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require(path.join(process.cwd(), "node_modules", "typescript"));

const dir = path.join(process.cwd(), "src", "content");
process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED = "true";
const cache = {};
function load(name) {
  if (cache[name]) return cache[name].exports;
  const src = fs.readFileSync(path.join(dir, name + ".ts"), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  cache[name] = mod;
  const req = (p) => (p.startsWith("./") ? load(p.slice(2)) : require(p));
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, process, console }, { filename: name });
  return mod.exports;
}

const d = load("legal-defaults");

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const blocksToMd = (blocks) =>
  blocks
    .map((b) => {
      if (b.type === "h2") return `\n#### ${b.text}\n`;
      if (b.type === "p") return `${b.text}\n`;
      if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n") + "\n";
      if (b.type === "ol") return b.items.map((i, n) => `${n + 1}. ${i}`).join("\n") + "\n";
      return "";
    })
    .join("\n");

let md = `# Legal defaults (draft wording, not legal advice)

**What this is.** Every default I chose for the parts of the legal pages that were still blank: refunds, house
rules, liability, under-18 and safeguarding wording, data protection under the Nigeria Data Protection Act 2023
(NDPA), and the answers to the ten questions in \`docs/LEGAL-REVIEW.md\`. They are conservative, plain-language
defaults for a small Nigerian workspace that takes bank-transfer bookings. They have **not** had a final legal
review. On the website they are marked "(draft wording)".

**Status.** The owner's lawyer has seen the review pack and asked for sensible defaults to be set, to be edited
later if needed. The lawyer-review mark in Admin, Settings has **not** been pressed. The owner presses it
after the lawyer has seen the final text.

**How to change a default.** Edit \`src/content/legal-defaults.ts\` (the numbers are in \`values\`, the sentences are
below them), then run \`node ops/render-legal-defaults.js\` to refresh this file. The website pages and this document
come from that one file.

**Keep in step with Settings.** The hold time, the cancellation cut-offs, the pass length and the overnight request
wait are also editable in Admin, Settings, Booking rules. If an Admin changes them, change the matching number here.

**Shown on the site only when accounts are on.** While accounts are off, the legal pages keep their original text,
which describes a site with no accounts or bookings.

---

## 1. Every default

| # | Topic | Default chosen | Why | Lawyer's eyes | Where on the site |
| --- | --- | --- | --- | --- | --- |
`;
for (const e of d.defaultsList) md += `| ${e.id} | ${cell(e.topic)} | ${cell(e.value)} | ${cell(e.why)} | **${e.lawyer}** | ${cell(e.where)} |\n`;

md += `
## 2. The ones that most need your lawyer's eyes ("High")

`;
for (const e of d.defaultsList.filter((x) => x.lawyer === "High")) md += `- **${e.id}. ${e.topic}.** ${e.value}\n`;

md += `
## 3. The ten questions, with the default answer used

| # | Question | Default answer |
| --- | --- | --- |
`;
for (const q of d.questionAnswers) md += `| ${q.n} | ${cell(q.question)} | ${cell(q.answer)} |\n`;

md += `
## 4. The numbers

| Number | Value | Also set in Admin, Settings? |
| --- | --- | --- |
| Minimum age for an account and the overnight desk | ${d.values.accountMinAge} | no (rule, not a setting) |
| Hold before payment (hours) | ${d.values.holdHours} | yes, Booking rules: Hold time |
| Pay window after an overnight approval (hours) | ${d.values.overnightPayHours} | yes, Booking rules |
| Overnight request waits (days) | ${d.values.requestDays} | yes, Booking rules |
| Cancel a desk booking until (hours before) | ${d.values.cancelHours} | yes, Booking rules |
| Cancel a monthly pass until (hours before the start) | ${d.values.passCancelHours} | yes, Booking rules |
| Monthly pass length (days) | ${d.values.passDays} | yes, Booking rules |
| Refund paid within (working days) | ${d.values.refundWorkingDays} | no |
| Reply to a data request within (days) | ${d.values.rightsReplyDays} | no |
| Tell the data commission of a breach within (hours) | ${d.values.breachHours} | no |
| Keep accounts and bookings after last activity (months) | ${d.values.retentionMonths} | no (owner's decision) |
| Keep the email log (months) | ${d.values.emailLogMonths} | no (owner's decision) |
| Keep accounting records (years) | ${d.values.accountingYears} | no |
| Keep the record of team actions (years) | ${d.values.auditYears} | no |
| Liability limit for one booking | ${d.values.liabilityCap} | no |
| Courts | ${d.values.courts} | no |

## 5. Overnight house rules: starter text

This text is **private**. It is not on any public page. Paste it into Admin, Settings, Overnight details, in the
"House rules" box. It is then shown only to a member whose overnight booking is confirmed. Change it freely.

`;
for (const r of d.overnightHouseRulesStarter) md += `- ${r}\n`;

md += `
## 6. The wording that appears on the website (when accounts are on)

### Terms of Service
`;
md += blocksToMd(d.termsRequestsAndFees) + "\n" + blocksToMd(d.termsBooking) + "\n" + blocksToMd(d.termsDisputes);
md += `
### Privacy Policy
`;
md += `${d.privacyNoSensitive}\n\n` + blocksToMd(d.privacyAccounts) + `\n- (cookie list) ${d.privacyLoginCookie}\n`;
md += `
### Safeguarding Policy
`;
md += blocksToMd(d.safeguardingYoung);
md += `
### Data Protection Statement
`;
md += blocksToMd(d.dataProtectionExtra);

fs.writeFileSync(path.join(process.cwd(), "docs", "LEGAL-DEFAULTS.md"), md);
console.log("docs/LEGAL-DEFAULTS.md written:", d.defaultsList.length, "defaults,", d.questionAnswers.length, "answers,", md.length, "characters");
