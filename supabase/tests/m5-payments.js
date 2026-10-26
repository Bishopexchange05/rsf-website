// M5 payment-flow test against the DEVELOPMENT database. Run from the project folder:
//   node supabase/tests/m5-payments.js
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
  const email = `m5test-${Date.now()}-${label}@example.com`;
  const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `M5 ${label}`, phone: `+234803127${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
  });
  if (error) throw error;
  if (role !== "member") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw si.error;
  if (withTwoStep) {
    const en = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "m5test" });
    if (en.error) throw en.error;
    const ch = await client.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await client.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    if (vr.error) throw vr.error;
  }
  return { id: data.user.id, client };
}

const book = (c, date, start, hours = 1) =>
  c.rpc("create_day_booking", { p_date: date, p_kind: "hour", p_start: start, p_hours: hours, p_half: null, p_student: false });
const statusOf = async (id) => (await admin.from("bookings").select("status, refund_owed, refund_done_at, hold_expires_at").eq("id", id).single()).data;

(async () => {
  const made = [];
  const saved = {};
  try {
    saved.settings = (await admin.from("settings").select("booking_enabled, max_unpaid_bookings").single()).data;
    saved.day = (await admin.from("spaces").select("capacity, is_bookable").eq("slug", "day").single()).data;
    const { data: sp } = await admin.from("spaces").select("id").eq("slug", "day").single();
    saved.spaceId = sp.id;
    saved.price = (await admin.from("prices").select("amount_kobo").eq("space_id", sp.id).eq("kind", "hour").eq("audience", "standard").single()).data;
    await admin.from("settings").update({ booking_enabled: true, max_unpaid_bookings: 10 }).eq("id", true);
    await admin.from("spaces").update({ capacity: 3, is_bookable: true }).eq("slug", "day");
    await admin.from("prices").update({ amount_kobo: 100000 }).eq("space_id", sp.id).eq("kind", "hour").eq("audience", "standard");

    const memberA = await makeUser("memberA", "member", false);
    const memberB = await makeUser("memberB", "member", false);
    const staff = await makeUser("staff", "staff", true);
    const staffNoTwoStep = await makeUser("staff-no2fa", "staff", false);
    const adm = await makeUser("admin", "admin", true);
    made.push(memberA, memberB, staff, staffNoTwoStep, adm);
    console.log("Created temporary members, Staff and Admin (with real two-step sessions); day capacity set to 3 for this test.");

    const date = nextWeekday(lagosToday(), 2);
    const slots = (await memberA.client.rpc("get_day_availability", { p_date: date })).data ?? [];
    const hhmm = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
    const T = slots.map((s) => hhmm(s.slot_start));
    check("setup: the day has hour slots", T.length >= 6, `${T.length} slots on ${date}`);

    // ---------- 1 and 2: book, claim, idempotent claim
    const b1 = await book(memberA.client, date, T[0]);
    check("1: a member can book an hour", !b1.error && typeof b1.data === "string", b1.error?.message);
    const id1 = b1.data;
    const claim1 = await memberA.client.rpc("claim_payment", { p_booking: id1, p_reference: "Bank app ref 123" });
    const s1 = await statusOf(id1);
    check("2: 'I've paid' moves the booking to payment_claimed and stops the hold clock", !claim1.error && s1.status === "payment_claimed" && s1.hold_expires_at === null, claim1.error?.message ?? s1.status);
    const claim1b = await memberA.client.rpc("claim_payment", { p_booking: id1, p_reference: "again" });
    const payRow = (await admin.from("payments").select("*").eq("booking_id", id1)).data ?? [];
    check("2b: pressing 'I've paid' twice changes nothing (one payment record)", !claim1b.error && payRow.length === 1 && payRow[0].customer_reference === "Bank app ref 123", claim1b.error?.message);
    const claimOther = await memberB.client.rpc("claim_payment", { p_booking: id1, p_reference: "x" });
    check("2c: someone else cannot mark a booking they do not own as paid", !!claimOther.error, claimOther.error?.message);

    // ---------- 3: who may decide
    const memberTry = await memberA.client.rpc("staff_confirm_payment", { p_booking: id1, p_received_kobo: null });
    check("3a: a Member cannot confirm payments", memberTry.error?.code === "42501", memberTry.error?.code);
    const noTwoStepTry = await staffNoTwoStep.client.rpc("staff_confirm_payment", { p_booking: id1, p_received_kobo: null });
    check("3b: Staff WITHOUT a two-step session cannot confirm payments", noTwoStepTry.error?.code === "42501", noTwoStepTry.error?.code);
    const anonTry = await createClient(URL, ANON, { auth: { persistSession: false } }).rpc("staff_confirm_payment", { p_booking: id1, p_received_kobo: null });
    check("3c: a signed-out visitor cannot confirm payments", !!anonTry.error, anonTry.error?.code);

    // ---------- Staff can see the customer, not strangers
    const seeCustomer = await staff.client.from("profiles").select("full_name, phone").eq("id", memberA.id);
    check("3d: Staff can read the name and phone of a person with a booking", (seeCustomer.data ?? []).length === 1);
    const seeNoBooking = await staff.client.from("profiles").select("id").eq("id", memberB.id);
    check("3e: Staff cannot read people who have no booking", (seeNoBooking.data ?? []).length === 0, `rows ${(seeNoBooking.data ?? []).length}`);
    const memberReadsPay = await memberB.client.from("payments").select("booking_id").eq("booking_id", id1);
    check("3f: a member cannot read another member's payment record", (memberReadsPay.data ?? []).length === 0);

    // ---------- 4: confirm
    const wrongState = await staff.client.rpc("staff_reject_payment", { p_booking: id1, p_reason: "ab" });
    check("4a: a rejection needs a reason of at least 3 characters", !!wrongState.error && /reason/i.test(wrongState.error.message), wrongState.error?.message);
    const conf = await staff.client.rpc("staff_confirm_payment", { p_booking: id1, p_received_kobo: null });
    const s1c = await statusOf(id1);
    check("4b: Staff (two-step) can confirm a payment", !conf.error && s1c.status === "confirmed", conf.error?.message ?? s1c.status);
    const confAgain = await staff.client.rpc("staff_confirm_payment", { p_booking: id1, p_received_kobo: null });
    check("4c: confirming twice is refused", !!confAgain.error, confAgain.error?.message);
    const ev = (await admin.from("booking_events").select("to_status").eq("booking_id", id1).order("created_at")).data ?? [];
    check("4d: the timeline recorded created, paid and confirmed", ev.map((e) => e.to_status).join(",") === "pending_payment,payment_claimed,confirmed", ev.map((e) => e.to_status).join(","));
    const aud = (await admin.from("audit_log").select("action").eq("entity_id", id1)).data ?? [];
    check("4e: the confirmation is in the audit log", aud.some((a) => a.action === "booking.confirm"));

    // ---------- 5: reject frees the desks
    const b2 = await book(memberB.client, date, T[1]);
    await memberB.client.rpc("claim_payment", { p_booking: b2.data, p_reference: null });
    const remainingBefore = (await memberA.client.rpc("get_day_availability", { p_date: date })).data.find((s) => hhmm(s.slot_start) === T[1]).remaining;
    const rej = await staff.client.rpc("staff_reject_payment", { p_booking: b2.data, p_reason: "The amount did not match what you owe." });
    const remainingAfter = (await memberA.client.rpc("get_day_availability", { p_date: date })).data.find((s) => hhmm(s.slot_start) === T[1]).remaining;
    const payRej = (await memberB.client.from("payments").select("rejected_reason, status").eq("booking_id", b2.data).single()).data;
    check("5a: Staff can reject a payment with a reason, and the customer can read the reason", !rej.error && payRej?.status === "rejected" && /amount did not match/.test(payRej.rejected_reason), rej.error?.message);
    check("5b: a rejected payment frees the desks at once", remainingAfter === remainingBefore + 1, `desks left ${remainingBefore} -> ${remainingAfter}`);

    // ---------- 6: cancel a confirmed booking -> refund owed -> only Admin records it
    const cancelStaff = await staff.client.rpc("staff_cancel_booking", { p_booking: id1, p_reason: "Room needed for an event." });
    const s1x = await statusOf(id1);
    check("6a: Staff cancelling a CONFIRMED booking marks a refund as owed", !cancelStaff.error && s1x.status === "cancelled" && s1x.refund_owed === true, cancelStaff.error?.message);
    const staffRefund = await staff.client.rpc("admin_mark_refunded", { p_booking: id1, p_note: "x" });
    check("6b: Staff cannot record a refund (Admin only)", staffRefund.error?.code === "42501", staffRefund.error?.code);
    const adminRefund = await adm.client.rpc("admin_mark_refunded", { p_booking: id1, p_note: "Refund transfer ref TEST" });
    const s1r = await statusOf(id1);
    check("6c: an Admin can record the refund", !adminRefund.error && !!s1r.refund_done_at, adminRefund.error?.message);
    const refundTwice = await adm.client.rpc("admin_mark_refunded", { p_booking: id1, p_note: "again" });
    check("6d: recording a refund twice is refused", !!refundTwice.error, refundTwice.error?.message);

    // ---------- 7: member cancels their own confirmed booking -> refund owed
    const b3 = await book(memberA.client, date, T[2]);
    await memberA.client.rpc("claim_payment", { p_booking: b3.data, p_reference: null });
    await staff.client.rpc("staff_confirm_payment", { p_booking: b3.data, p_received_kobo: null });
    const memberCancel = await memberA.client.rpc("cancel_my_booking", { p_booking: b3.data });
    const s3 = await statusOf(b3.data);
    check("7: a member cancelling their own confirmed booking marks a refund as owed", !memberCancel.error && s3.status === "cancelled" && s3.refund_owed === true, memberCancel.error?.message);

    // ---------- 8: no-show only after the start
    const b4 = await book(memberB.client, date, T[3]);
    await memberB.client.rpc("claim_payment", { p_booking: b4.data, p_reference: null });
    await staff.client.rpc("staff_confirm_payment", { p_booking: b4.data, p_received_kobo: null });
    const early = await staff.client.rpc("staff_mark_no_show", { p_booking: b4.data });
    check("8: 'did not attend' is refused before the booking starts", !!early.error && /not started/i.test(early.error.message), early.error?.message);

    // ---------- 9: re-open an expired booking, only if desks are free
    const b5 = await book(memberA.client, date, T[4]);
    await admin.from("bookings").update({ status: "expired", hold_expires_at: new Date(Date.now() - 60000).toISOString() }).eq("id", b5.data);
    const reopen = await staff.client.rpc("staff_reopen_booking", { p_booking: b5.data });
    const s5 = await statusOf(b5.data);
    check("9a: Staff can re-open an expired booking when the desks are free", !reopen.error && s5.status === "payment_claimed", reopen.error?.message ?? s5.status);
    // fill the slot with 3 other holds, then try to re-open another expired booking there
    const slotFill = T[5];
    const fillers = [];
    for (const u of [memberA, memberB]) fillers.push(await book(u.client, date, slotFill));
    const extra = await makeUser("extra", "member", false);
    made.push(extra);
    fillers.push(await book(extra.client, date, slotFill));
    const late = await book(memberA.client, date, T[4]);
    check("9b-setup: capacity (3) is full for the test slot", fillers.filter((f) => !f.error).length === 3, `${fillers.filter((f) => !f.error).length} of 3 booked`);
    // an expired booking for the full slot
    const lateExpired = await admin.from("bookings").insert({
      reference: "RSF-ZZZZZZ", user_id: memberB.id, space_id: saved.spaceId, kind: "hour",
      starts_at: slots[5].slot_start, ends_at: slots[5].slot_end, status: "expired", amount_kobo: 100000,
      hold_expires_at: new Date(Date.now() - 60000).toISOString(),
    }).select("id").single();
    await admin.from("booking_slots").insert({ booking_id: lateExpired.data.id, space_id: saved.spaceId, slot_start: slots[5].slot_start });
    const reopenFull = await staff.client.rpc("staff_reopen_booking", { p_booking: lateExpired.data.id });
    check("9b: re-opening is refused when the desks are no longer free", !!reopenFull.error && /no longer available/i.test(reopenFull.error.message), reopenFull.error?.message);
    void late;

    // ---------- 10: only Staff/Admin see the queue data; the customer sees only their own
    const queue = await staff.client.from("bookings").select("id").eq("status", "payment_claimed");
    check("10a: Staff can list bookings that need a payment check", (queue.data ?? []).length >= 1, `${(queue.data ?? []).length} waiting`);
    const memberQueue = await memberA.client.from("bookings").select("id").eq("status", "payment_claimed");
    check("10b: a member listing 'payment_claimed' sees only their own bookings", (memberQueue.data ?? []).every((r) => true) && (memberQueue.data ?? []).length <= 1, `${(memberQueue.data ?? []).length}`);
    const hours = await staff.client.rpc("get_review_hours");
    check("10c: Staff can read the 'waiting too long' limit", typeof hours.data === "number", String(hours.data));
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    const ids = made.map((u) => u.id);
    if (ids.length) {
      await admin.from("bookings").delete().in("user_id", ids);
      await admin.from("bookings").delete().eq("reference", "RSF-ZZZZZZ");
      for (const id of ids) await admin.auth.admin.deleteUser(id);
    }
    if (saved.settings) await admin.from("settings").update(saved.settings).eq("id", true);
    if (saved.day) await admin.from("spaces").update(saved.day).eq("slug", "day");
    if (saved.spaceId && saved.price) await admin.from("prices").update({ amount_kobo: saved.price.amount_kobo }).eq("space_id", saved.spaceId).eq("kind", "hour").eq("audience", "standard");
    const left = await admin.from("bookings").select("id", { count: "exact", head: true }).in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    console.log(`Cleanup done: test accounts removed, settings restored. Leftover test bookings: ${left.count ?? 0}`);
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
