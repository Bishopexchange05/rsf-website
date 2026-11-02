// Migration 0016 test (visit counter and Admin analytics) against the DEVELOPMENT database.
// Run from the project folder:  node supabase/tests/analytics.js
// Needs: migration 0016 run on development. Optional: the website running locally (TEST_BASE, default
// http://127.0.0.1:3002) to test the /api/pv address too. Creates a temporary member and a temporary
// Admin with two-step login, reports each check, then removes them and the test counts it made.
// Prints no keys or passwords.
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
const BASE = process.env.TEST_BASE || "http://127.0.0.1:3002";
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};
const b32 = (s) => { const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = ""; for (const c of s.replace(/=+$/, "").toUpperCase()) bits += a.indexOf(c).toString(2).padStart(5, "0"); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const totp = (secret) => { const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000))); const h = crypto.createHmac("sha1", b32(secret)).update(buf).digest(); const o = h[h.length - 1] & 0xf; return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, "0"); };
const lagosToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const TEST_PATH = `/zz-analytics-test-${Date.now()}`;

(async () => {
  const made = [];
  try {
    const mk = async (label, role) => {
      const email = `an-${label}-${Date.now()}@example.com`;
      const password = "An-" + crypto.randomBytes(10).toString("hex") + "-Aa1!";
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `AN ${label}`, phone: "+2348031239999", terms_accepted: true } });
      if (error) throw error;
      made.push(data.user.id);
      if (role) await admin.from("profiles").update({ role }).eq("id", data.user.id);
      const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
      const si = await c.auth.signInWithPassword({ email, password });
      if (si.error) throw si.error;
      return c;
    };
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const member = await mk("member");
    const adminNoCode = await mk("admin", "admin");
    // Second Admin client that passes two-step login.
    const adminOk = await mk("admin2", "admin");
    const en = await adminOk.auth.mfa.enroll({ factorType: "totp", friendlyName: "an" });
    const ch = await adminOk.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await adminOk.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    check("0: test Admin passed two-step login", !vr.error, vr.error?.message);

    const today = lagosToday();
    const from = addDays(today, -6);

    // ---------- 1. who may call what
    const a1 = await anon.rpc("record_site_visit", { p_path: TEST_PATH, p_new_visit: true });
    const a2 = await member.rpc("record_site_visit", { p_path: TEST_PATH, p_new_visit: true });
    check("1a: a visitor or member cannot record visits directly (server only)", !!a1.error && !!a2.error);
    const r1 = await anon.from("site_visits").select("day").limit(1);
    const r2 = await member.from("site_visits").select("day").limit(1);
    check("1b: a visitor or member cannot read the visit counts", (r1.data ?? []).length === 0 && (r2.data ?? []).length === 0);
    const s1 = await anon.rpc("admin_analytics", { p_from: from, p_to: today });
    const s2 = await member.rpc("admin_analytics", { p_from: from, p_to: today });
    const s3 = await adminNoCode.rpc("admin_analytics", { p_from: from, p_to: today });
    check("1c: the summary refuses a visitor, a member, and an Admin without the two-step code", !!s1.error && !!s2.error && !!s3.error, [s1.error?.code, s2.error?.code, s3.error?.code].join("/"));
    const s4 = await adminOk.rpc("admin_analytics", { p_from: from, p_to: today });
    check("1d: an Admin with two-step login gets the summary, one entry per day", !s4.error && Array.isArray(s4.data?.days) && s4.data.days.length === 7, s4.error?.message || `${s4.data?.days?.length} days`);
    check("1e: the summary includes the right-now totals", typeof s4.data?.now?.members === "number" && typeof s4.data?.now?.waiting_kobo === "number");
    const s5 = await adminOk.rpc("admin_analytics", { p_from: addDays(today, -500), p_to: today });
    check("1f: a range longer than about 13 months is refused", !!s5.error);

    // ---------- 2. counting
    await admin.rpc("record_site_visit", { p_path: TEST_PATH, p_new_visit: true });
    await admin.rpc("record_site_visit", { p_path: TEST_PATH, p_new_visit: false });
    await admin.rpc("record_site_visit", { p_path: TEST_PATH, p_new_visit: false });
    const row = (await admin.from("site_visits").select("views, visits, day").eq("path", TEST_PATH).maybeSingle()).data;
    check("2a: three views and one visit are counted on today's row", row?.views === 3 && row?.visits === 1 && row?.day === today, JSON.stringify(row));
    const s6 = await adminOk.rpc("admin_analytics", { p_from: today, p_to: today });
    const pageRow = (s6.data?.pages ?? []).find((p) => p.path === TEST_PATH);
    check("2b: the summary shows them", !!pageRow && pageRow.views === 3 && s6.data.days[0].visits >= 1);

    // ---------- 3. the website address (optional: needs the local site running)
    let up = false;
    try { up = (await fetch(BASE + "/", { method: "HEAD" })).ok; } catch { up = false; }
    if (!up) {
      console.log("SKIP  3: the website is not running locally, /api/pv not tested");
    } else {
      const post = (body, ua) => fetch(BASE + "/api/pv", { method: "POST", headers: { "Content-Type": "text/plain", "User-Agent": ua || "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile" }, body: JSON.stringify(body) });
      const p1 = await post({ p: TEST_PATH, n: true });
      await post({ p: TEST_PATH + "/x", n: false }, "Googlebot/2.1");
      await post({ p: "/admin", n: true });
      await post({ p: "/book", n: true });
      await post({ p: "/<script>", n: true });
      const after = (await admin.from("site_visits").select("path, views, visits").like("path", `${TEST_PATH}%`)).data ?? [];
      const main = after.find((x) => x.path === TEST_PATH);
      check("3a: the website address answers 204 and counts a normal visit", p1.status === 204 && main?.views === 4 && main?.visits === 2, `${p1.status} ${JSON.stringify(main)}`);
      check("3b: robots are not counted", !after.some((x) => x.path === TEST_PATH + "/x"));
      const priv = (await admin.from("site_visits").select("path").eq("day", today).in("path", ["/admin", "/book"])).data ?? [];
      check("3c: private pages (admin, booking) are not counted", priv.length === 0, JSON.stringify(priv));
    }
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    await admin.from("site_visits").delete().like("path", `${TEST_PATH}%`);
    for (const id of made) await admin.auth.admin.deleteUser(id);
    console.log("Cleanup done: test accounts and test counts removed.");
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
