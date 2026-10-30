// Group 2 test (reminder emails, failed-email retry, backup check) against the DEVELOPMENT database.
// Run from the project folder, with the website running locally (see below):
//   node supabase/tests/group2.js
// Needs: migration 0015 run, and the website started locally with CRON_SECRET (also given to this test as
// TEST_CRON_SECRET), EMAIL_PROVIDER=log (pretends to send) and NEXT_PUBLIC_ACCOUNTS_ENABLED=true.
// TEST_BASE is its address (default http://localhost:3010). Creates temporary members and bookings,
// reports each check, then removes what it created. Prints no keys or passwords.
const fs = require("fs");
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
const BASE = process.env.TEST_BASE || "http://localhost:3010";
const SECRET = process.env.TEST_CRON_SECRET || "";

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};

const lagosToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
// A moment in Lagos (UTC+1, no daylight saving): date "YYYY-MM-DD" and hour.
const lagos = (date, hour = 0) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+01:00`).toISOString();
const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ref = () => "RSF-" + Array.from({ length: 6 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");

(async () => {
  const made = [];
  const refs = [];
  try {
    const dayId = (await admin.from("spaces").select("id").eq("slug", "day").single()).data.id;
    const mk = async (label) => {
      const email = `g2test-${Date.now()}-${label}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email, password: "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!", email_confirm: true,
        user_metadata: { full_name: `G2 ${label}`, phone: `+234803126${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
      });
      if (error) throw error;
      made.push(data.user.id);
      return data.user.id;
    };
    const book = async (user, kind, status, starts, ends, extra = {}) => {
      const reference = ref();
      refs.push(reference);
      const { data, error } = await admin.from("bookings").insert({ reference, user_id: user, space_id: dayId, kind, amount_kobo: 100000, status, starts_at: starts, ends_at: ends, ...extra }).select("id").single();
      if (error) throw new Error(`insert ${kind}/${status}: ${error.message}`);
      return data.id;
    };

    const today = lagosToday();
    const tomorrow = addDays(today, 1);
    const U = {};
    for (const k of ["day-tomorrow", "day-later", "hold-soon", "hold-later", "pass-starts", "pass-ends", "pass-renewed", "pending-tomorrow"]) U[k] = await mk(k);

    const B = {};
    B.dayTomorrow = await book(U["day-tomorrow"], "day", "confirmed", lagos(tomorrow, 9), lagos(tomorrow, 17));
    B.dayLater = await book(U["day-later"], "day", "confirmed", lagos(addDays(today, 3), 9), lagos(addDays(today, 3), 17));
    B.pendingTomorrow = await book(U["pending-tomorrow"], "day", "pending_payment", lagos(tomorrow, 9), lagos(tomorrow, 17), { hold_expires_at: new Date(Date.now() + 3 * 3600000).toISOString() });
    B.holdSoon = await book(U["hold-soon"], "day", "pending_payment", lagos(addDays(today, 6), 9), lagos(addDays(today, 6), 12), { hold_expires_at: new Date(Date.now() + 20 * 60000).toISOString() });
    B.holdLater = await book(U["hold-later"], "day", "pending_payment", lagos(addDays(today, 6), 9), lagos(addDays(today, 6), 12), { hold_expires_at: new Date(Date.now() + 3 * 3600000).toISOString() });
    B.passStarts = await book(U["pass-starts"], "month", "confirmed", lagos(tomorrow, 0), lagos(addDays(tomorrow, 30), 0));
    // A pass whose LAST day is today + 5 (it ends at midnight at the start of today + 6).
    B.passEnds = await book(U["pass-ends"], "month", "confirmed", lagos(addDays(today, -24), 0), lagos(addDays(today, 6), 0));
    B.passRenewed = await book(U["pass-renewed"], "month", "confirmed", lagos(addDays(today, -24), 0), lagos(addDays(today, 6), 0));
    await book(U["pass-renewed"], "month", "pending_payment", lagos(addDays(today, 6), 0), lagos(addDays(today, 36), 0), { hold_expires_at: new Date(Date.now() + 3 * 3600000).toISOString() });

    // ---------- 1. who is due
    const due = async () => ((await admin.rpc("reminders_due")).data ?? []);
    const dueFor = (rows, id, kind) => rows.some((r) => r.booking_id === id && r.reminder === kind);
    let rows = await due();
    check("1a: a confirmed booking that starts tomorrow gets the day-before reminder", dueFor(rows, B.dayTomorrow, "day_before"));
    check("1b: a booking in 3 days does not", !rows.some((r) => r.booking_id === B.dayLater));
    check("1c: a booking still waiting for payment does not get the day-before reminder", !rows.some((r) => r.booking_id === B.pendingTomorrow && r.reminder === "day_before"));
    check("1d: a pass starting tomorrow gets the pass-starts reminder", dueFor(rows, B.passStarts, "pass_starts"));
    check("1e: a pass whose last day is in 5 days gets the pass-ends reminder", dueFor(rows, B.passEnds, "pass_ends"));
    check("1f: a pass that is already renewed does not", !rows.some((r) => r.booking_id === B.passRenewed && r.reminder === "pass_ends"));
    check("1g: a hold ending in 20 minutes gets the hold reminder; one ending in 3 hours does not", dueFor(rows, B.holdSoon, "hold_expiring") && !rows.some((r) => r.booking_id === B.holdLater));

    const asMember = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const denied = await asMember.rpc("reminders_due");
    check("1h: a visitor cannot call the reminder functions (server key only)", !!denied.error, denied.error?.code);

    // ---------- 2. marking as sent
    await admin.rpc("mark_reminder_sent", { p_booking: B.dayTomorrow, p_reminder: "day_before" });
    await admin.rpc("mark_reminder_sent", { p_booking: B.dayTomorrow, p_reminder: "day_before" });
    rows = await due();
    check("2a: once marked as sent (even twice) it is not due again", !dueFor(rows, B.dayTomorrow, "day_before"));
    const marks = (await admin.from("booking_reminders").select("booking_id").eq("booking_id", B.dayTomorrow)).data ?? [];
    check("2b: marking twice leaves one record", marks.length === 1);

    // ---------- 3. retry queue
    const old = await admin.from("email_retry").insert({ to_user_id: U["day-later"], template: "g2-old", subject: "old", body: "old", created_at: new Date(Date.now() - 4 * 86400000).toISOString() });
    const fresh = await admin.from("email_retry").insert({ to_user_id: U["day-later"], template: "g2-fresh", subject: "Test subject", body: "Test body" });
    check("3a: rows can be put in the retry queue (server key)", !old.error && !fresh.error, old.error?.message || fresh.error?.message);
    const denied2 = await asMember.from("email_retry").select("id").limit(1);
    check("3b: a visitor cannot read the retry queue", (denied2.data ?? []).length === 0);

    // ---------- 4. the daily job (the website route)
    if (!SECRET) {
      check("4: (skipped: no TEST_CRON_SECRET given, the website route was not tested)", false);
    } else {
      const noAuth = await fetch(BASE + "/api/cron/daily");
      const wrong = await fetch(BASE + "/api/cron/daily", { headers: { Authorization: "Bearer not-the-secret-not-the-secret" } });
      check("4a: the daily job refuses a request with no secret, or the wrong one", noAuth.status === 401 && wrong.status === 401, `${noAuth.status} / ${wrong.status}`);

      const go = await fetch(BASE + "/api/cron/daily", { headers: { Authorization: "Bearer " + SECRET } });
      const body = await go.json().catch(() => ({}));
      check("4b: with the secret it runs and reports every step", go.status === 200 && body.ok === true && body.reminders && body.retry && body.dormant && body.backup, `${go.status} ${JSON.stringify(body).slice(0, 200)}`);
      check("4c: no step crashed", ![body.reminders, body.retry, body.dormant, body.backup].some((s) => s && s.error));

      const sentNow = (await admin.from("booking_reminders").select("booking_id, reminder").in("booking_id", Object.values(B))).data ?? [];
      const has = (id, k) => sentNow.some((r) => r.booking_id === id && r.reminder === k);
      check("4d: the pass reminders (starts, ends) and the hold reminder were sent and recorded", has(B.passStarts, "pass_starts") && has(B.passEnds, "pass_ends") && has(B.holdSoon, "hold_expiring"));
      check("4e: the booking that does not need a reminder got none", !sentNow.some((r) => r.booking_id === B.dayLater || r.booking_id === B.holdLater || r.booking_id === B.passRenewed));

      const logs = (await admin.from("email_log").select("template, to_user_id").in("to_user_id", [U["pass-starts"], U["pass-ends"], U["hold-soon"]]).like("template", "reminder-%")).data ?? [];
      check("4f: the reminder emails are in the email log", ["reminder-pass_starts", "reminder-pass_ends", "reminder-hold_expiring"].every((t) => logs.some((l) => l.template === t)));

      const queue = (await admin.from("email_retry").select("template").in("template", ["g2-old", "g2-fresh"])).data ?? [];
      check("4g: the queued email was sent and removed, and the 4-day-old one was purged", queue.length === 0);
      const retried = (await admin.from("email_log").select("status").eq("template", "g2-fresh-retry").eq("to_user_id", U["day-later"])).data ?? [];
      check("4h: the retry is in the email log", retried.length === 1 && retried[0].status === "sent");

      const again = await (await fetch(BASE + "/api/cron/daily", { headers: { Authorization: "Bearer " + SECRET } })).json().catch(() => ({}));
      const sentAgain = (await admin.from("booking_reminders").select("booking_id").in("booking_id", Object.values(B))).data ?? [];
      check("4i: running the job again sends none of the same reminders twice", sentAgain.length === sentNow.length, `${sentNow.length} -> ${sentAgain.length}`);
      check("4j: the backup check says it is not set up here (no Healthchecks key on this computer)", again.backup?.status === "not-configured" || !!again.backup?.status, JSON.stringify(again.backup));
    }
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    await admin.from("email_retry").delete().in("template", ["g2-old", "g2-fresh"]);
    if (refs.length) await admin.from("bookings").delete().in("reference", refs);
    for (const id of made) await admin.auth.admin.deleteUser(id);
    console.log("Cleanup done: test accounts and test bookings removed. (A few small email-log rows remain on purpose.)");
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
