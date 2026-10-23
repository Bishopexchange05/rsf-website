// M4 concurrency and rules test against the DEVELOPMENT database.
// Creates temporary test members, fires many simultaneous booking requests, reports
// the results, then removes everything it created and restores the settings it
// touched. Prints no keys, passwords or real email addresses.
const fs = require("fs");
const root = process.cwd(); // run from the project folder: node supabase/tests/m4-concurrency.js
const env = {};
for (const line of fs.readFileSync(root + "/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const { createClient } = require(root + "/node_modules/@supabase/supabase-js");
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};

function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(d, n) {
  const x = new Date(d + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function nextWeekday(from) {
  let d = addDays(from, 1);
  while ([0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay())) d = addDays(d, 1);
  return d;
}

const book = (client, date, start, hours = 1, student = false) =>
  client.rpc("create_day_booking", { p_date: date, p_kind: "hour", p_start: start, p_hours: hours, p_half: null, p_student: student });

(async () => {
  const N = 12;
  const stamp = Date.now();
  const users = [];
  const saved = {};
  try {
    // ---- remember what we are about to change
    saved.settings = (await admin.from("settings").select("booking_enabled, max_unpaid_bookings, hold_minutes").single()).data;
    saved.day = (await admin.from("spaces").select("capacity, is_bookable").eq("slug", "day").single()).data;
    const { data: spaceRow } = await admin.from("spaces").select("id").eq("slug", "day").single();
    saved.spaceId = spaceRow.id;
    saved.price = (await admin.from("prices").select("amount_kobo").eq("space_id", spaceRow.id).eq("kind", "hour").eq("audience", "standard").single()).data;

    // ---- temporary setup
    await admin.from("settings").update({ booking_enabled: true, max_unpaid_bookings: 3, hold_minutes: 120 }).eq("id", true);
    await admin.from("spaces").update({ capacity: 5, is_bookable: true }).eq("slug", "day");
    await admin.from("prices").update({ amount_kobo: 100000 }).eq("space_id", spaceRow.id).eq("kind", "hour").eq("audience", "standard");

    // ---- test members
    for (let i = 1; i <= N; i++) {
      const email = `m4test-${stamp}-${i}@example.com`;
      const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `M4 Test ${i}`, phone: `+234803123${String(i).padStart(4, "0")}`, terms_accepted: true },
      });
      if (error) throw new Error("createUser failed: " + error.message);
      const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: se } = await client.auth.signInWithPassword({ email, password });
      if (se) throw new Error("signIn failed: " + se.message);
      users.push({ id: data.user.id, client });
    }
    console.log(`Created ${N} temporary test members (capacity set to 5 for this test).`);

    const date = nextWeekday(lagosToday());
    const avail = await users[0].client.rpc("get_day_availability", { p_date: date });
    const slots = avail.data ?? [];
    const hhmm = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
    check("availability loads for a weekday", slots.length >= 7, `${slots.length} hour slots on ${date}`);
    const slotTimes = slots.map((s) => hhmm(s.slot_start));
    const S = slotTimes[2]; // a mid-morning slot for the capacity tests

    // ---- A: 10 people, one slot, 5 desks: exactly 5 succeed
    const racers = users.slice(0, N - 2);
    const A = await Promise.all(racers.map((u) => book(u.client, date, S)));
    const aOk = A.filter((r) => !r.error).length;
    const aFull = A.filter((r) => r.error && /no longer available/i.test(r.error.message)).length;
    check(`A: ${racers.length} simultaneous requests for a slot with 5 desks -> exactly 5 succeed`, aOk === 5 && aFull === racers.length - 5, `succeeded ${aOk}, "no longer available" ${aFull}, other errors ${racers.length - aOk - aFull}`);

    // ---- B: the LAST desk: free exactly one desk, then everyone else races for it
    const winners = racers.filter((_, i) => !A[i].error);
    const losers = racers.filter((_, i) => A[i].error);
    const cancelled = await winners[0].client.rpc("cancel_my_booking", { p_booking: A[racers.indexOf(winners[0])].data });
    check("B0: a member can cancel their own unpaid booking", !cancelled.error, cancelled.error?.message);
    const B = await Promise.all(losers.map((u) => book(u.client, date, S)));
    const bOk = B.filter((r) => !r.error).length;
    check(`B: the last desk - ${losers.length} people race for 1 free desk -> exactly 1 succeeds`, bOk === 1, `succeeded ${bOk} of ${losers.length}`);

    // ---- C: one person double-clicks (5 identical simultaneous requests)
    const other = slotTimes[3];
    const solo = users[N - 1];
    const C = await Promise.all(Array.from({ length: 5 }, () => book(solo.client, date, other)));
    const cOk = C.filter((r) => !r.error).length;
    check("C: one person sending the same booking 5 times at once -> exactly 1 booking", cOk === 1, `succeeded ${cOk}`);

    // ---- D: unpaid limit of 3 across 6 different slots, simultaneously
    const dUser = users[N - 2];
    const dSlots = slotTimes.slice(4, 10);
    const D = await Promise.all(dSlots.map((t) => book(dUser.client, date, t)));
    const dOk = D.filter((r) => !r.error).length;
    const dLimit = D.filter((r) => r.error && /unpaid bookings/i.test(r.error.message)).length;
    check("D: limit of 3 unpaid bookings holds under simultaneous requests", dOk === 3 && dLimit === dSlots.length - 3, `succeeded ${dOk}, refused for the limit ${dLimit}`);

    // ---- E: an unpaid hold that has run out stops counting at once (no cron needed)
    const before = (await users[0].client.rpc("get_day_availability", { p_date: date })).data.find((s) => hhmm(s.slot_start) === S)?.remaining;
    const target = (await admin.from("bookings").select("id").eq("status", "pending_payment").eq("starts_at", slots[2].slot_start).limit(1)).data?.[0]?.id;
    await admin.from("bookings").update({ hold_expires_at: new Date(Date.now() - 60000).toISOString() }).eq("id", target);
    const after = (await users[0].client.rpc("get_day_availability", { p_date: date })).data.find((s) => hhmm(s.slot_start) === S)?.remaining;
    check("E: an expired hold frees its desk immediately, before any clean-up job", after === before + 1, `desks left ${before} -> ${after}`);

    // ---- F: privacy and permissions
    const own = await users[1].client.from("bookings").select("id");
    const allCount = (await admin.from("bookings").select("id", { count: "exact", head: true })).count;
    check("F1: a member sees only their own bookings", (own.data ?? []).length <= 3 && (own.data ?? []).length < allCount, `member sees ${(own.data ?? []).length} of ${allCount}`);
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const anonTry = await anon.rpc("create_day_booking", { p_date: date, p_kind: "hour", p_start: S, p_hours: 1, p_half: null, p_student: false });
    check("F2: a signed-out visitor cannot book", !!anonTry.error, anonTry.error?.code);
    const slotRead = await users[1].client.from("booking_slots").select("booking_id").limit(1);
    check("F3: a member cannot read the raw slot table", (slotRead.data ?? []).length === 0, slotRead.error?.code ?? "no rows");

    // ---- G: rules
    const sunday = (() => { let d = lagosToday(); while (new Date(d + "T12:00:00Z").getUTCDay() !== 0) d = addDays(d, 1); return d; })();
    const g1 = await book(users[2].client, sunday, "09:00");
    check("G1: booking on a closed day (Sunday) is refused", !!g1.error, g1.error?.message);
    const g2 = await book(users[2].client, addDays(lagosToday(), 90), "09:00");
    check("G2: booking beyond the booking window is refused", !!g2.error && /window/i.test(g2.error.message), g2.error?.message);
    const g3 = await book(users[2].client, date, "09:30");
    check("G3: a start time that is not on the hour is refused", !!g3.error, g3.error?.message);
    const g4 = await book(users[2].client, date, slotTimes[0], 11);
    check("G4: more hours than the maximum is refused", !!g4.error, g4.error?.message);
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push({ name: "test run", ok: false });
  } finally {
    // ---- clean up everything this test created, and restore settings
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await admin.from("bookings").delete().in("user_id", ids);
      for (const id of ids) await admin.auth.admin.deleteUser(id);
    }
    if (saved.settings) await admin.from("settings").update(saved.settings).eq("id", true);
    if (saved.day) await admin.from("spaces").update(saved.day).eq("slug", "day");
    if (saved.spaceId && saved.price) await admin.from("prices").update({ amount_kobo: saved.price.amount_kobo }).eq("space_id", saved.spaceId).eq("kind", "hour").eq("audience", "standard");
    const left = await admin.from("bookings").select("id", { count: "exact", head: true }).in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    console.log(`Cleanup done: test members removed, settings restored. Leftover test bookings: ${left.count ?? 0}`);
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
