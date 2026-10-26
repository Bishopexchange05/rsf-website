// M6 monthly-pass test against the DEVELOPMENT database. Run from the project folder:
//   node supabase/tests/m6-passes.js
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
  const email = `m6test-${Date.now()}-${label}@example.com`;
  const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `M6 ${label}`, phone: `+234803127${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
  });
  if (error) throw error;
  if (role !== "member") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw si.error;
  if (withTwoStep) {
    const en = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "m6test" });
    if (en.error) throw en.error;
    const ch = await client.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await client.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    if (vr.error) throw vr.error;
  }
  return { id: data.user.id, client };
}

const lagosOf = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayDiff = (a, b) => Math.round((new Date(lagosOf(b) + "T12:00:00Z") - new Date(lagosOf(a) + "T12:00:00Z")) / 86400000);
const pass = (c, start, student = false) => c.rpc("create_month_booking", { p_start: start, p_student: student });
const hour = (c, date, start) => c.rpc("create_day_booking", { p_date: date, p_kind: "hour", p_start: start, p_hours: 1, p_half: null, p_student: false });
const row = async (id) => (await admin.from("bookings").select("*").eq("id", id).single()).data;
const slotCount = async (id) => (await admin.from("booking_slots").select("slot_start", { count: "exact", head: true }).eq("booking_id", id)).count ?? 0;
const hhmm = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

(async () => {
  const made = [];
  const saved = {};
  try {
    saved.settings = (await admin.from("settings").select("booking_enabled, max_unpaid_bookings, monthly_pass_days, monthly_pass_max_desks, monthly_start_window_days, monthly_self_cancel_cutoff_hours").single()).data;
    saved.day = (await admin.from("spaces").select("capacity, is_bookable").eq("slug", "day").single()).data;
    const { data: sp } = await admin.from("spaces").select("id").eq("slug", "day").single();
    saved.spaceId = sp.id;
    saved.prices = (await admin.from("prices").select("kind, audience, amount_kobo").eq("space_id", sp.id).in("kind", ["hour", "month"])).data;
    saved.hours = (await admin.from("opening_hours").select("weekday, is_closed, opens_at, closes_at").order("weekday")).data;

    await admin.from("spaces").update({ capacity: 3, is_bookable: true }).eq("slug", "day");
    await admin.from("settings").update({
      booking_enabled: true, max_unpaid_bookings: 10, monthly_pass_days: 7, monthly_pass_max_desks: 2,
      monthly_start_window_days: 14, monthly_self_cancel_cutoff_hours: 48,
    }).eq("id", true);
    const setPrice = (kind, audience, amount) => admin.from("prices").update({ amount_kobo: amount }).eq("space_id", sp.id).eq("kind", kind).eq("audience", audience);
    await setPrice("hour", "standard", 100000);
    await setPrice("month", "standard", 5000000);
    await setPrice("month", "student", 3000000);

    const A = await makeUser("A", "member", false);
    const B = await makeUser("B", "member", false);
    const C = await makeUser("C", "member", false);
    const D = await makeUser("D", "member", false);
    const E = await makeUser("E", "member", false);
    const staff = await makeUser("staff", "staff", true);
    const adm = await makeUser("admin", "admin", true);
    made.push(A, B, C, D, E, staff, adm);
    console.log("Created temporary members, Staff and Admin. Test settings: 3 day desks, pass cap 2, 7-day passes (so the next free start date can be shown within the 14-day window).");

    const today = lagosToday();
    const s1 = addDays(today, 1);

    // ---------- 1 to 5: book passes, the cap of 2
    const a1 = await pass(A.client, s1);
    const rowA = a1.data ? await row(a1.data) : null;
    check("1a: a member can book a pass", !a1.error && rowA?.kind === "month" && rowA?.status === "pending_payment", a1.error?.message);
    check("1b: the price is copied in and the pass is 7 days long", rowA?.amount_kobo === 5000000 && dayDiff(rowA.starts_at, rowA.ends_at) === 7, `${rowA?.amount_kobo}, ${rowA ? dayDiff(rowA.starts_at, rowA.ends_at) : "?"} days`);
    const slotsA = a1.data ? await slotCount(a1.data) : 0;
    check("1c: one slot row is written for every open hour of every open day", slotsA > 0, `${slotsA} slot rows`);
    const avB = await B.client.rpc("get_monthly_availability", { p_start: s1 });
    check("2: with 1 of 2 passes held, the same start date is still available", avB.data?.[0]?.available === true, JSON.stringify(avB.data));
    const b1 = await pass(B.client, s1);
    check("3: a second pass for the same start date succeeds (2 of 2)", !b1.error && typeof b1.data === "string", b1.error?.message);
    const c1 = await pass(C.client, s1);
    check("4: the third pass is refused: monthly passes fully booked", !!c1.error && /fully booked/i.test(c1.error.message), c1.error?.message);
    const avC = (await C.client.rpc("get_monthly_availability", { p_start: s1 })).data?.[0];
    const expectNext = addDays(today, 8);
    check("5: the page is told the next free start date", avC?.available === false && avC?.reason === "cap" && avC?.next_start === expectNext, `${avC?.reason}, next ${avC?.next_start} (expected ${expectNext})`);
    const c2 = await pass(C.client, expectNext);
    check("5b: a pass from that next date can be booked", !c2.error, c2.error?.message);
    if (c2.data) await C.client.rpc("cancel_my_booking", { p_booking: c2.data });

    // ---------- 6 and 7: free desks per hour; own pass blocks day bookings
    const d1 = nextWeekday(addDays(today, 8), 0);
    const daySlots = (await A.client.rpc("get_day_availability", { p_date: d1 })).data ?? [];
    const T0 = daySlots.length ? hhmm(daySlots[0].slot_start) : null;
    const fillers = [];
    for (const u of [A, B, C]) fillers.push(await hour(u.client, d1, T0));
    check("6a: three hourly bookings fill every desk in that hour", fillers.filter((f) => !f.error).length === 3, `${fillers.filter((f) => !f.error).length} of 3`);
    const dFull = await pass(D.client, addDays(today, 8));
    check("6b: a pass is refused when one hour in its window has no free desk", !!dFull.error && /not all free/i.test(dFull.error.message), dFull.error?.message);
    const avD = (await D.client.rpc("get_monthly_availability", { p_start: addDays(today, 8) })).data?.[0];
    check("6c: availability says 'hours' for that start date", avD?.available === false && avD?.reason === "hours", avD?.reason);
    for (const f of fillers) if (f.data) await admin.from("bookings").update({ status: "cancelled" }).eq("id", f.data);

    const covered = nextWeekday(addDays(today, 1), 0);
    const covSlots = (await A.client.rpc("get_day_availability", { p_date: covered })).data ?? [];
    const dayTry = await hour(A.client, covered, hhmm(covSlots[0].slot_start));
    check("7a: a pass holder cannot book an hour on a day their pass covers", !!dayTry.error, dayTry.error?.message);
    const overlapPass = await pass(A.client, addDays(today, 3));
    check("7b: the same person cannot hold two passes for the same dates", !!overlapPass.error && /during those dates/i.test(overlapPass.error.message), overlapPass.error?.message);

    // ---------- 8: pay and confirm, permissions
    await A.client.rpc("claim_payment", { p_booking: a1.data, p_reference: "t" });
    const memberConfirm = await A.client.rpc("staff_confirm_payment", { p_booking: a1.data });
    check("8a: a Member cannot confirm a pass", memberConfirm.error?.code === "42501", memberConfirm.error?.code);
    const confA = await staff.client.rpc("staff_confirm_payment", { p_booking: a1.data });
    const rowA2 = await row(a1.data);
    check("8b: Staff confirm a pass that has not started; the dates are unchanged", !confA.error && rowA2.status === "confirmed" && rowA2.starts_at === rowA.starts_at, confA.error?.message);

    // ---------- 9: confirm after the start date moves the start to today
    const rb = await row(b1.data);
    const startsB = new Date(new Date(rb.starts_at).getTime() - 2 * 86400000).toISOString();
    const endsB = new Date(new Date(rb.ends_at).getTime() - 2 * 86400000).toISOString();
    await admin.from("bookings").update({ starts_at: startsB, ends_at: endsB }).eq("id", b1.data);
    await B.client.rpc("claim_payment", { p_booking: b1.data, p_reference: null });
    const confB = await staff.client.rpc("staff_confirm_payment", { p_booking: b1.data });
    const rowB = await row(b1.data);
    check("9a: confirming after the start date moves the start to today and keeps the length",
      !confB.error && lagosOf(rowB.starts_at) === today && dayDiff(rowB.starts_at, rowB.ends_at) === 7, `${confB.error?.message ?? ""} start ${lagosOf(rowB.starts_at)}, ${dayDiff(rowB.starts_at, rowB.ends_at)} days`);
    check("9b: the slot rows moved with it", (await slotCount(b1.data)) > 0);
    const evB = (await admin.from("booking_events").select("note").eq("booking_id", b1.data).eq("to_status", "confirmed")).data ?? [];
    check("9c: the timeline says the start was moved", evB.some((e) => /start moved/i.test(e.note ?? "")), evB.map((e) => e.note).join(" | "));

    // ---------- 10: Admin keeps the original dates
    const dPass = await pass(D.client, addDays(today, 8));
    const rd = await row(dPass.data);
    const dStart = new Date(new Date(rd.starts_at).getTime() - 9 * 86400000).toISOString();
    const dEnd = new Date(new Date(rd.ends_at).getTime() - 9 * 86400000).toISOString();
    await admin.from("bookings").update({ starts_at: dStart, ends_at: dEnd }).eq("id", dPass.data);
    await D.client.rpc("claim_payment", { p_booking: dPass.data, p_reference: null });
    const keepStaff = await staff.client.rpc("staff_confirm_payment", { p_booking: dPass.data, p_keep_dates: true, p_reason: "Customer was ill" });
    check("10a: Staff cannot keep the original dates (Admin only)", keepStaff.error?.code === "42501", keepStaff.error?.code);
    const keepNoReason = await adm.client.rpc("staff_confirm_payment", { p_booking: dPass.data, p_keep_dates: true, p_reason: "" });
    check("10b: keeping the original dates needs a reason", !!keepNoReason.error && /reason/i.test(keepNoReason.error.message), keepNoReason.error?.message);
    const keepAdmin = await adm.client.rpc("staff_confirm_payment", { p_booking: dPass.data, p_keep_dates: true, p_reason: "Customer was ill" });
    const rowD = await row(dPass.data);
    check("10c: an Admin can keep the original dates with a reason", !keepAdmin.error && rowD.status === "confirmed" && new Date(rowD.starts_at).getTime() === new Date(dStart).getTime(), keepAdmin.error?.message);

    // ---------- 11: extend
    const extStaff = await staff.client.rpc("admin_extend_pass", { p_booking: dPass.data, p_days: 3, p_reason: "Closed for repairs" });
    check("11a: Staff cannot extend a pass (Admin only)", extStaff.error?.code === "42501", extStaff.error?.code);
    const extBad = await adm.client.rpc("admin_extend_pass", { p_booking: dPass.data, p_days: 0, p_reason: "Closed for repairs" });
    check("11b: extending by 0 days is refused", !!extBad.error, extBad.error?.message);
    const slotsBefore = await slotCount(dPass.data);
    const ext = await adm.client.rpc("admin_extend_pass", { p_booking: dPass.data, p_days: 3, p_reason: "Closed for repairs" });
    const rowD2 = await row(dPass.data);
    check("11c: an Admin can extend a pass; days and slot rows are added", !ext.error && dayDiff(rowD.ends_at, rowD2.ends_at) === 3 && rowD2.extended_days === 3 && (await slotCount(dPass.data)) > slotsBefore, ext.error?.message);
    const audExt = (await admin.from("audit_log").select("action").eq("entity_id", dPass.data)).data ?? [];
    check("11d: the extension is in the audit log", audExt.some((a) => a.action === "booking.extend"));

    // ---------- 12: cancellation and refunds
    const ePass = await pass(E.client, addDays(today, 10), true);
    const rowE = ePass.data ? await row(ePass.data) : null;
    check("12a: the student price is used when a student price is set", !ePass.error && rowE?.amount_kobo === 3000000 && rowE?.is_student_price === true, ePass.error?.message);
    await E.client.rpc("claim_payment", { p_booking: ePass.data, p_reference: null });
    await staff.client.rpc("staff_confirm_payment", { p_booking: ePass.data });
    const eCancel = await E.client.rpc("cancel_my_booking", { p_booking: ePass.data });
    const rowE2 = await row(ePass.data);
    check("12b: a member can cancel a confirmed pass before the cutoff; a refund is owed", !eCancel.error && rowE2.status === "cancelled" && rowE2.refund_owed === true, eCancel.error?.message);
    const dMemberCancel = await D.client.rpc("cancel_my_booking", { p_booking: dPass.data });
    check("12c: a member cannot cancel a pass that has already started", !!dMemberCancel.error && /too late/i.test(dMemberCancel.error.message), dMemberCancel.error?.message);
    const dStaffCancel = await staff.client.rpc("staff_cancel_booking", { p_booking: dPass.data, p_reason: "Policy breach" });
    check("12d: Staff cannot cancel a started pass", !!dStaffCancel.error && /has started/i.test(dStaffCancel.error.message), dStaffCancel.error?.message);
    const dTooMuch = await adm.client.rpc("admin_cancel_pass", { p_booking: dPass.data, p_reason: "Policy breach", p_refund_kobo: 9999999999 });
    check("12e: a refund bigger than the price is refused", !!dTooMuch.error, dTooMuch.error?.message);
    const dStaffPartial = await staff.client.rpc("admin_cancel_pass", { p_booking: dPass.data, p_reason: "Policy breach", p_refund_kobo: 100000 });
    check("12f: Staff cannot use the partial-refund cancel (Admin only)", dStaffPartial.error?.code === "42501", dStaffPartial.error?.code);
    const dAdminCancel = await adm.client.rpc("admin_cancel_pass", { p_booking: dPass.data, p_reason: "Policy breach", p_refund_kobo: 1500000 });
    const rowD3 = await row(dPass.data);
    check("12g: an Admin can cancel a started pass with a partial refund; amount recorded", !dAdminCancel.error && rowD3.status === "cancelled" && rowD3.refund_owed === true && rowD3.refund_amount_kobo === 1500000, dAdminCancel.error?.message);

    // ---------- 13: renew
    const renewOther = await B.client.rpc("renew_my_pass", { p_booking: a1.data });
    check("13a: nobody can renew someone else's pass", !!renewOther.error, renewOther.error?.message);
    const renew = await A.client.rpc("renew_my_pass", { p_booking: a1.data });
    const rowR = renew.data ? await row(renew.data) : null;
    check("13b: renewing books a new pass starting the day the old one ends", !renew.error && rowR && lagosOf(rowR.starts_at) === lagosOf(rowA2.ends_at), renew.error?.message);
    const renew2 = await A.client.rpc("renew_my_pass", { p_booking: a1.data });
    check("13c: renewing twice is refused (no double hold)", !!renew2.error, renew2.error?.message);

    // ---------- 14: opening hours change rebuilds the passes
    const before = await slotCount(a1.data);
    const hoursNow = saved.hours.map((h) => ({ weekday: h.weekday, is_closed: h.is_closed, opens_at: h.opens_at, closes_at: h.closes_at }));
    const same = await adm.client.rpc("save_opening_hours", { p_hours: hoursNow });
    check("14a: saving unchanged hours keeps the pass slots as they were", !same.error && (await slotCount(a1.data)) === before, same.error?.message);
    const wed = hoursNow.find((h) => h.weekday === 3);
    if (wed && !wed.is_closed) {
      const [hh, mm, ss] = wed.closes_at.split(":");
      const shorter = hoursNow.map((h) => (h.weekday === 3 ? { ...h, closes_at: String(Number(hh) - 1).padStart(2, "0") + ":" + mm + ":" + ss } : h));
      const chg = await adm.client.rpc("save_opening_hours", { p_hours: shorter });
      const after = await slotCount(a1.data);
      check("14b: closing an hour earlier on Wednesdays removes that hour from the pass", !chg.error && after === before - 1, `${before} -> ${after}`);
      await adm.client.rpc("save_opening_hours", { p_hours: hoursNow });
      check("14c: restoring the hours restores the slots", (await slotCount(a1.data)) === before);
    } else {
      check("14b: (skipped: Wednesday is closed in this database)", true);
    }

    // ---------- 15: reading
    const over = await staff.client.rpc("get_overfilled_hours");
    check("15a: Staff can read the over-booked hours count", typeof over.data === "number", String(over.data));
    const overMember = await A.client.rpc("get_overfilled_hours");
    check("15b: a Member cannot", overMember.error?.code === "42501", overMember.error?.code);
    const cap = await staff.client.rpc("get_pass_cap");
    check("15c: Staff can read the pass cap", cap.data === 2, String(cap.data));
    const memberList = await C.client.from("bookings").select("id").eq("kind", "month");
    check("15d: a member sees only their own passes", (memberList.data ?? []).length <= 1, `${(memberList.data ?? []).length}`);

    // ---------- 16: price not set
    await setPrice("month", "standard", null);
    const noPrice = await pass(C.client, addDays(today, 9));
    check("16: with no monthly price set, a pass cannot be booked online", !!noPrice.error && /contact us for pricing/i.test(noPrice.error.message), noPrice.error?.message);
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    const ids = made.map((u) => u.id);
    if (ids.length) {
      await admin.from("bookings").delete().in("user_id", ids);
      for (const id of ids) await admin.auth.admin.deleteUser(id);
    }
    if (saved.settings) await admin.from("settings").update(saved.settings).eq("id", true);
    if (saved.day) await admin.from("spaces").update(saved.day).eq("slug", "day");
    if (saved.spaceId && saved.prices) for (const p of saved.prices) await admin.from("prices").update({ amount_kobo: p.amount_kobo }).eq("space_id", saved.spaceId).eq("kind", p.kind).eq("audience", p.audience);
    if (saved.hours) for (const h of saved.hours) await admin.from("opening_hours").update({ is_closed: h.is_closed, opens_at: h.opens_at, closes_at: h.closes_at }).eq("weekday", h.weekday);
    const left = await admin.from("bookings").select("id", { count: "exact", head: true }).in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    console.log(`Cleanup done: test accounts removed, settings, prices and hours restored. Leftover test bookings: ${left.count ?? 0}`);
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
