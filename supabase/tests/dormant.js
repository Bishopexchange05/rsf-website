// Dormant-account test (24-month deletion with a warning first) against the DEVELOPMENT database. Run from the project folder:
//   node supabase/tests/dormant.js
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
  const email = `dormtest-${Date.now()}-${label}@example.com`;
  const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `Dormant ${label}`, phone: `+234803127${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
  });
  if (error) throw error;
  if (role !== "member") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw si.error;
  if (withTwoStep) {
    const en = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "dormtest" });
    if (en.error) throw en.error;
    const ch = await client.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await client.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    if (vr.error) throw vr.error;
  }
  return { id: data.user.id, client };
}

// Needs the website running locally with: CRON_SECRET (also given here as TEST_CRON_SECRET),
// EMAIL_PROVIDER=log (pretends to send), NEXT_PUBLIC_ACCOUNTS_ENABLED=true. TEST_BASE is its address.
const BASE = process.env.TEST_BASE || "http://localhost:3010";
const SECRET = process.env.TEST_CRON_SECRET || "";
const MONTH = 30.44 * 86400000;
const ago = (months, extraDays = 0) => new Date(Date.now() - months * MONTH - extraDays * 86400000).toISOString();
const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ref = () => "RSF-" + Array.from({ length: 6 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");

(async () => {
  const made = [];
  const refs = [];
  try {
    const dayId = (await admin.from("spaces").select("id").eq("slug", "day").single()).data.id;
    const mk = async (label) => {
      const email = `dormant-${Date.now()}-${label}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email, password: "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!", email_confirm: true,
        user_metadata: { full_name: `Dormant ${label}`, phone: `+234803125${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
      });
      if (error) throw error;
      made.push({ id: data.user.id });
      return data.user.id;
    };
    const setProfile = (id, patch) => admin.from("profiles").update(patch).eq("id", id);
    const warnedAt = async (id) => (await admin.from("profiles").select("dormant_warned_at").eq("id", id).maybeSingle()).data?.dormant_warned_at ?? null;

    // The people
    const D1 = await mk("D1-warned-long-ago");   await setProfile(D1, { created_at: ago(26), dormant_warned_at: ago(0, 31) });
    const D2 = await mk("D2-due-warning");       await setProfile(D2, { created_at: ago(23, 15) });
    const D3 = await mk("D3-not-yet");           await setProfile(D3, { created_at: ago(22) });
    const D5 = await mk("D5-staff");             await setProfile(D5, { created_at: ago(30), role: "staff" });
    const D6 = await mk("D6-open-booking");      await setProfile(D6, { created_at: ago(26), dormant_warned_at: ago(0, 31) });
    const D7 = await mk("D7-warned-recently");   await setProfile(D7, { created_at: ago(26), dormant_warned_at: ago(0, 5) });
    const D4 = await makeUser("D4-came-back", "member", false); made.push(D4); // signs in now
    await setProfile(D4.id, { created_at: ago(30), dormant_warned_at: ago(0, 40) });
    const rb = ref(); refs.push(rb);
    await admin.from("bookings").insert({ reference: rb, user_id: D6, space_id: dayId, kind: "hour", amount_kobo: 100000, status: "confirmed", starts_at: new Date(Date.now() + 3 * 86400000).toISOString(), ends_at: new Date(Date.now() + 3.1 * 86400000).toISOString(), updated_at: ago(26) });

    // ---------- 1. who the database picks
    const warn = ((await admin.rpc("dormant_accounts_to_warn")).data ?? []).map((r) => r.user_id);
    const del = ((await admin.rpc("dormant_accounts_to_delete")).data ?? []).map((r) => r.user_id);
    check("1a: warning list: a member unused for 23+ months and not yet warned (D2)", warn.includes(D2), `${warn.length} listed`);
    check("1b: not on the warning list: recent, already warned, active, or Staff (D3, D1, D7, D4, D5)", ![D3, D1, D7, D4.id, D5].some((x) => warn.includes(x)));
    check("1c: deletion list: warned 30+ days ago and still unused (D1, and D6 which will be skipped later)", del.includes(D1) && del.includes(D6));
    check("1d: not on the deletion list: warned only 5 days ago, never warned, came back, or Staff (D7, D2, D4, D5)", ![D7, D2, D4.id, D5].some((x) => del.includes(x)));
    const memberCall = await D4.client.rpc("dormant_accounts_to_delete");
    check("1e: a member cannot call these functions (server key only)", !!memberCall.error, memberCall.error?.code);

    // ---------- 2. coming back clears the warning
    const ret = await admin.rpc("run_retention");
    check("2a: the daily retention run clears the warning of someone who came back (D4)", !ret.error && (await warnedAt(D4.id)) === null, ret.error?.message);
    check("2b: but not for people who did not (D1, D7)", (await warnedAt(D1)) !== null && (await warnedAt(D7)) !== null);

    // ---------- 3. the daily job (the website route)
    if (!SECRET) {
      check("3: (skipped: no TEST_CRON_SECRET given, the website route was not tested)", false);
    } else {
      const noAuth = await fetch(BASE + "/api/cron/daily");
      const wrong = await fetch(BASE + "/api/cron/daily", { headers: { Authorization: "Bearer not-the-secret-not-the-secret" } });
      check("3a: the daily job refuses a request with no secret, or the wrong one", noAuth.status === 401 && wrong.status === 401, `${noAuth.status} / ${wrong.status}`);
      const go = await fetch(BASE + "/api/cron/daily", { headers: { Authorization: "Bearer " + SECRET } });
      const body = await go.json().catch(() => ({}));
      check("3b: with the secret it runs and reports", go.status === 200 && body.ok === true && !!body.dormant, `${go.status} ${JSON.stringify(body).slice(0, 120)}`);
      const gone = (await admin.from("profiles").select("id").eq("id", D1)).data ?? [];
      const authGone = await admin.auth.admin.getUserById(D1);
      check("3c: D1 (warned 30+ days ago, still unused) was deleted: profile and login gone", gone.length === 0 && !authGone.data?.user, "");
      check("3d: D2 was warned and the date was recorded", (await warnedAt(D2)) !== null);
      const stillD6 = (await admin.from("profiles").select("id").eq("id", D6)).data ?? [];
      check("3e: D6 has a booking that is not finished, so it was SKIPPED, not deleted", stillD6.length === 1);
      check("3f: D7 (warned 5 days ago), D3 (not yet) and Staff D5 were left alone", (await warnedAt(D7)) !== null && (await warnedAt(D3)) === null && (await warnedAt(D5)) === null);
      const mail = (await admin.from("email_log").select("template, to_user_id").in("template", ["dormant-warning", "dormant-deleted"]).order("created_at", { ascending: false }).limit(10)).data ?? [];
      check("3g: a warning email was logged for D2, and the 'deleted' email is not linked to the deleted login", mail.some((m) => m.template === "dormant-warning" && m.to_user_id === D2) && mail.filter((m) => m.template === "dormant-deleted").every((m) => m.to_user_id === null));
      const aud = (await admin.from("audit_log").select("action, after").eq("action", "account.delete").eq("entity_id", D1)).data ?? [];
      check("3h: the deletion is in the audit log with the reason 'dormant'", aud.length === 1 && aud[0].after?.reason === "dormant");
    }
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    if (refs.length) await admin.from("bookings").delete().in("reference", refs);
    for (const u of made) await admin.auth.admin.deleteUser(u.id);
    console.log("Cleanup done: test accounts and test bookings removed. (A few small audit and email-log rows remain on purpose.)");
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
