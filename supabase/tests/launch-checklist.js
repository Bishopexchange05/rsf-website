// Launch checklist and booking switch test against the DEVELOPMENT database. Run from the project folder:
//   node supabase/tests/launch-checklist.js
// Creates temporary members, Staff and Admin (with real two-step sessions), runs the whole
// flow through the same database functions the website uses, reports each check, then removes
// everything it created and restores the settings it touched. Prints no keys or passwords.
const fs = require("fs");
const crypto = require("crypto");
const root = process.cwd();
const env = {};
for (const line of fs.readFileSync(root + "/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const { createClient } = require(root + "/node_modules/@supabase/supabase-js");
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function b32decode(s) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += a.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totp(secret) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, "0");
}

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};

const lagosToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const nextWeekday = (from, skip = 1) => { let d = addDays(from, skip); while ([0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay())) d = addDays(d, 1); return d; };

async function makeUser(label, role, withTwoStep) {
  const email = `m8test-${Date.now()}-${label}@example.com`;
  const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `M8 ${label}`, phone: `+234803127${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
  });
  if (error) throw error;
  if (role !== "member") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw si.error;
  if (withTwoStep) {
    const en = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "m8test" });
    if (en.error) throw en.error;
    const ch = await client.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await client.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    if (vr.error) throw vr.error;
  }
  return { id: data.user.id, client };
}

(async () => {
  const made = [];
  const saved = {};
  try {
    saved.settings = (await admin.from("settings").select("booking_enabled, legal_review_done_at, legal_review_marked_by").single()).data;
    saved.bank = (await admin.from("bank_details").select("bank_name, account_number, account_name, note").single()).data;

    const member = await makeUser("member", "member", false);
    const staff = await makeUser("staff", "staff", true);
    const adm = await makeUser("admin", "admin", true);
    made.push(member, staff, adm);
    console.log("Created temporary Member, Staff and Admin (with real two-step sessions).");

    // ---------- the lawyer-review mark (advisory)
    const markStaff = await staff.client.rpc("set_legal_review_done", { p_done: true });
    check("1a: Staff cannot mark the lawyer review", markStaff.error?.code === "42501", markStaff.error?.code);
    const markMember = await member.client.rpc("set_legal_review_done", { p_done: true });
    check("1b: a Member cannot", markMember.error?.code === "42501", markMember.error?.code);
    const markAnon = await createClient(URL, ANON, { auth: { persistSession: false } }).rpc("set_legal_review_done", { p_done: true });
    check("1c: a signed-out visitor cannot", !!markAnon.error, markAnon.error?.code);
    const markAdmin = await adm.client.rpc("set_legal_review_done", { p_done: true });
    const afterMark = (await admin.from("settings").select("legal_review_done_at, legal_review_marked_by").single()).data;
    check("1d: an Admin can mark it, and who and when are recorded", !markAdmin.error && !!afterMark.legal_review_done_at && afterMark.legal_review_marked_by === adm.id, markAdmin.error?.message);
    const audit = (await admin.from("audit_log").select("action").eq("action", "settings.legal_review").order("created_at", { ascending: false }).limit(1)).data ?? [];
    check("1e: the mark is in the audit log", audit.length === 1);
    const unmark = await adm.client.rpc("set_legal_review_done", { p_done: false });
    const afterUnmark = (await admin.from("settings").select("legal_review_done_at").single()).data;
    check("1f: an Admin can remove the mark", !unmark.error && afterUnmark.legal_review_done_at === null, unmark.error?.message);

    // ---------- the booking switch: Admin only, the ONLY rule is bank details
    await admin.from("bank_details").update({ bank_name: "Test Bank", account_number: "0123456789", account_name: "Test Account" }).eq("id", true);
    await admin.from("settings").update({ booking_enabled: false, legal_review_done_at: null }).eq("id", true);

    const staffOn = await staff.client.rpc("set_booking_enabled", { p_enabled: true });
    check("2a: Staff cannot switch booking on", staffOn.error?.code === "42501", staffOn.error?.code);
    const memberOn = await member.client.rpc("set_booking_enabled", { p_enabled: true });
    check("2b: a Member cannot", memberOn.error?.code === "42501", memberOn.error?.code);

    const advisory = await adm.client.rpc("set_booking_enabled", { p_enabled: true });
    const stateOn = (await admin.from("settings").select("booking_enabled, legal_review_done_at").single()).data;
    check("2c: an Admin CAN switch booking on with the lawyer review NOT marked (advice only, nothing blocks)", !advisory.error && stateOn.booking_enabled === true && stateOn.legal_review_done_at === null, advisory.error?.message);
    const off = await adm.client.rpc("set_booking_enabled", { p_enabled: false });
    check("2d: and switch it off again", !off.error && (await admin.from("settings").select("booking_enabled").single()).data.booking_enabled === false, off.error?.message);

    await admin.from("bank_details").update({ bank_name: null, account_number: null, account_name: null }).eq("id", true);
    const noBank = await adm.client.rpc("set_booking_enabled", { p_enabled: true });
    check("3: the one remaining rule still holds: no bank details, no switching on", !!noBank.error && /bank details/i.test(noBank.error.message) && (await admin.from("settings").select("booking_enabled").single()).data.booking_enabled === false, noBank.error?.message);
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    const ids = made.map((u) => u.id);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    if (saved.settings) await admin.from("settings").update(saved.settings).eq("id", true);
    if (saved.bank) await admin.from("bank_details").update(saved.bank).eq("id", true);
    console.log("Cleanup done: test accounts removed, booking switch, bank details and the lawyer mark restored.");
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
