// M7 overnight test against the DEVELOPMENT database. Run from the project folder:
//   node supabase/tests/m7-overnight.js
// Creates temporary members, Staff and Admin (with real two-step sessions), runs the whole
// flow through the same database functions the website uses, reports each check, then removes
// everything it created and restores the settings it touched. Prints no keys or passwords.
// Needs migrations 0001 to 0017 run on development (section 11 tests the monthly overnight stay).
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
  const email = `m7test-${Date.now()}-${label}@example.com`;
  const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `M7 ${label}`, phone: `+234803127${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
  });
  if (error) throw error;
  if (role !== "member") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw si.error;
  if (withTwoStep) {
    const en = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "m7test" });
    if (en.error) throw en.error;
    const ch = await client.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await client.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    if (vr.error) throw vr.error;
  }
  return { id: data.user.id, client };
}

const SECRET_LOC = "SECRET-ADDRESS-7731-XYZ";
const SECRET_RULES = "SECRET-RULES-4410-XYZ";
const lagosOf = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const hhmm = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const request = (c, checkin, nights, age = true) => c.rpc("create_night_request", { p_checkin: checkin, p_nights: nights, p_age_confirmed: age });
const row = async (id) => (await admin.from("bookings").select("*").eq("id", id).single()).data;
const slotCount = async (id) => (await admin.from("booking_slots").select("slot_start", { count: "exact", head: true }).eq("booking_id", id)).count ?? 0;
const details = (c, id) => c.rpc("get_overnight_details", { p_booking: id });

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + "/" + f.name;
    if (f.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js)$/.test(f.name)) out.push(p);
  }
  return out;
}

(async () => {
  const made = [];
  const saved = {};
  try {
    saved.settings = (await admin.from("settings").select("booking_enabled, max_unpaid_bookings, overnight_max_nights, overnight_request_expiry_days, overnight_checkin, overnight_checkout, overnight_location_private, overnight_rules_text, hold_minutes, overnight_pay_hours").single()).data;
    saved.on = (await admin.from("spaces").select("capacity, is_bookable").eq("slug", "overnight").single()).data;
    const { data: sp } = await admin.from("spaces").select("id").eq("slug", "overnight").single();
    saved.spaceId = sp.id;
    saved.price = (await admin.from("prices").select("amount_kobo").eq("space_id", sp.id).eq("kind", "night").eq("audience", "standard").single()).data;
    saved.monthPrice = (await admin.from("prices").select("amount_kobo").eq("space_id", sp.id).eq("kind", "month").eq("audience", "standard").single()).data;
    await admin.from("prices").update({ amount_kobo: null }).eq("space_id", sp.id).eq("kind", "month").eq("audience", "standard");

    await admin.from("spaces").update({ capacity: 2, is_bookable: true }).eq("slug", "overnight");
    await admin.from("settings").update({
      booking_enabled: true, max_unpaid_bookings: 10, overnight_max_nights: 3, overnight_request_expiry_days: 3,
      overnight_checkin: "20:00", overnight_checkout: "07:00", overnight_location_private: SECRET_LOC, overnight_rules_text: SECRET_RULES, hold_minutes: 120, overnight_pay_hours: 24,
    }).eq("id", true);
    const setPrice = (amount) => admin.from("prices").update({ amount_kobo: amount }).eq("space_id", sp.id).eq("kind", "night").eq("audience", "standard");
    await setPrice(null);

    const A = await makeUser("A", "member", false);
    const B = await makeUser("B", "member", false);
    const C = await makeUser("C", "member", false);
    const D = await makeUser("D", "member", false);
    const staff = await makeUser("staff", "staff", true);
    const staffNo2fa = await makeUser("staff-no2fa", "staff", false);
    const adm = await makeUser("admin", "admin", true);
    const E = await makeUser("E", "member", false);
    const F = await makeUser("F", "member", false);
    const G = await makeUser("G", "member", false);
    made.push(A, B, C, D, E, F, G, staff, staffNo2fa, adm);
    console.log("Created temporary members, Staff and Admin. Test settings: 2 overnight desks, 3 nights at most, check-in 20:00, check-out 07:00, a fake address and fake house rules.");

    const today = lagosToday();
    const n0 = addDays(today, 10);

    // ---------- 1: refusals
    const noPrice = await request(A.client, n0, 2);
    check("1a: with no night price set, a request is refused (contact us for pricing)", !!noPrice.error && /contact us for pricing/i.test(noPrice.error.message), noPrice.error?.message);
    await setPrice(200000);
    const noAge = await request(A.client, n0, 2, false);
    check("1b: without the 18 or over tick, a request is refused", !!noAge.error && /18 or over/i.test(noAge.error.message), noAge.error?.message);
    const zero = await request(A.client, n0, 0);
    const tooMany = await request(A.client, n0, 4);
    check("1c: 0 nights and more than the longest stay are refused", !!zero.error && !!tooMany.error && /nights at a time/i.test(tooMany.error.message), `${zero.error?.message} / ${tooMany.error?.message}`);
    const past = await request(A.client, addDays(today, -1), 1);
    check("1d: a past date is refused", !!past.error, past.error?.message);
    const left0 = (await admin.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", A.id)).count;
    check("1e: none of the refused requests left a booking behind", left0 === 0, String(left0));

    // ---------- 2: a request
    const a1 = await request(A.client, n0, 2);
    const rowA = a1.data ? await row(a1.data) : null;
    check("2a: a member can request nights (pending_approval)", !a1.error && rowA?.kind === "night" && rowA?.status === "pending_approval", a1.error?.message);
    check("2b: the price is 2 nights and the 18+ tick is stored with the time", rowA?.amount_kobo === 400000 && !!rowA?.age_confirmed_at, `${rowA?.amount_kobo}`);
    check("2c: check-in 20:00 on the first night, check-out 07:00 on the morning after the last night", rowA && hhmm(rowA.starts_at) === "20:00" && lagosOf(rowA.starts_at) === n0 && hhmm(rowA.ends_at) === "07:00" && lagosOf(rowA.ends_at) === addDays(n0, 2), rowA ? `${lagosOf(rowA.starts_at)} ${hhmm(rowA.starts_at)} to ${lagosOf(rowA.ends_at)} ${hhmm(rowA.ends_at)}` : "");
    check("2d: a desk is held for each night", (await slotCount(a1.data)) === 2);
    const expiresIn = rowA ? (new Date(rowA.hold_expires_at).getTime() - Date.now()) / 86400000 : 0;
    check("2e: the request waits 3 days", expiresIn > 2.9 && expiresIn <= 3.01, expiresIn.toFixed(2) + " days");
    const a2 = await request(A.client, addDays(n0, 5), 1);
    check("2f: a second request while one is waiting is refused", !!a2.error && /waiting for approval/i.test(a2.error.message), a2.error?.message);

    // ---------- 3: capacity per night
    const b1 = await request(B.client, n0, 2);
    check("3a: a second person can request the same nights (2 of 2)", !b1.error, b1.error?.message);
    const c1 = await request(C.client, n0, 2);
    check("3b: the third request is refused: no longer available", !!c1.error && /no longer available/i.test(c1.error.message), c1.error?.message);
    const avC = (await C.client.rpc("get_overnight_availability", { p_checkin: n0, p_nights: 2 })).data?.[0];
    check("3c: availability says which night is full", avC?.available === false && avC?.reason === "full" && avC?.full_night === n0, JSON.stringify(avC));
    const overlap = (await C.client.rpc("get_overnight_availability", { p_checkin: addDays(n0, 1), p_nights: 2 })).data?.[0];
    check("3d: a stay that overlaps only the second night is also full", overlap?.available === false && overlap?.full_night === addDays(n0, 1), JSON.stringify(overlap));
    const free = (await C.client.rpc("get_overnight_availability", { p_checkin: addDays(n0, 2), p_nights: 1 })).data?.[0];
    check("3e: nights after the stay are free", free?.available === true, JSON.stringify(free));

    // ---------- 4: nothing leaks before payment is confirmed
    const leaks = [];
    for (const [who, c] of [["owner (waiting)", A.client], ["another member", C.client], ["staff", staff.client], ["admin", adm.client]]) {
      const r = await details(c, a1.data);
      if ((r.data ?? []).length) leaks.push(who);
    }
    check("4a: while the request is waiting nobody gets the address or rules from the details function", leaks.length === 0, leaks.join(", "));
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const anonDetails = await anon.rpc("get_overnight_details", { p_booking: a1.data });
    check("4b: a signed-out visitor is refused", !!anonDetails.error, anonDetails.error?.code);
    for (const [who, c] of [["member", A.client], ["staff", staff.client]]) {
      const s = await c.from("settings").select("overnight_location_private, overnight_rules_text");
      check(`4c: a ${who} cannot read the settings table directly`, (s.data ?? []).length === 0, String((s.data ?? []).length) + " rows");
    }
    const cfgText = JSON.stringify((await A.client.rpc("get_booking_config")).data);
    const pubText = JSON.stringify((await anon.rpc("get_public_settings")).data);
    check("4d: the booking config and the public settings never contain the address or the rules", !cfgText.includes(SECRET_LOC) && !cfgText.includes(SECRET_RULES) && !pubText.includes(SECRET_LOC) && !pubText.includes(SECRET_RULES));
    const bookingRow = JSON.stringify((await A.client.from("bookings").select("*").eq("id", a1.data)).data);
    check("4e: the member's own booking record does not contain them", !bookingRow.includes(SECRET_LOC) && !bookingRow.includes(SECRET_RULES));

    // ---------- 5: approve and reject
    const memberApprove = await A.client.rpc("staff_approve_request", { p_booking: a1.data });
    check("5a: a Member cannot approve", memberApprove.error?.code === "42501", memberApprove.error?.code);
    const noTwoStep = await staffNo2fa.client.rpc("staff_approve_request", { p_booking: a1.data });
    check("5b: Staff without a two-step session cannot approve", noTwoStep.error?.code === "42501", noTwoStep.error?.code);
    const rejNoReason = await staff.client.rpc("staff_reject_request", { p_booking: b1.data, p_reason: "x" });
    check("5c: a rejection needs a reason", !!rejNoReason.error && /reason/i.test(rejNoReason.error.message), rejNoReason.error?.message);
    const rej = await staff.client.rpc("staff_reject_request", { p_booking: b1.data, p_reason: "We could not verify your ID in person." });
    const rowB = await row(b1.data);
    check("5d: Staff can reject with a reason; the member can read it", !rej.error && rowB.status === "rejected" && /could not verify/.test(rowB.cancel_reason), rej.error?.message);
    const bSees = (await B.client.from("bookings").select("cancel_reason, status").eq("id", b1.data)).data?.[0];
    check("5e: the rejected member sees the reason on their own booking", /could not verify/.test(bSees?.cancel_reason ?? ""));
    const c2 = await request(C.client, n0, 2);
    check("5f: rejecting freed the desks: the third person can now request", !c2.error, c2.error?.message);
    const appr = await staff.client.rpc("staff_approve_request", { p_booking: a1.data });
    const rowA2 = await row(a1.data);
    check("5g: Staff (two-step) can approve; the booking moves to pending_payment with a hold", !appr.error && rowA2.status === "pending_payment" && !!rowA2.approved_at && new Date(rowA2.hold_expires_at).getTime() > Date.now(), appr.error?.message);
    const payHours = (new Date(rowA2.hold_expires_at).getTime() - Date.now()) / 3600000;
    check("5g2: an approved request gets the overnight pay window (24 hours), not the 2-hour hold", payHours > 23.5 && payHours <= 24.01, payHours.toFixed(2) + " hours");
    const apprAgain = await staff.client.rpc("staff_approve_request", { p_booking: a1.data });
    check("5h: approving twice is refused", !!apprAgain.error, apprAgain.error?.message);
    const aud = (await admin.from("audit_log").select("action").eq("entity_id", a1.data)).data ?? [];
    check("5i: the approval is in the audit log", aud.some((x) => x.action === "booking.approve"));

    // ---------- 6: pay, confirm, and only then the location
    const claim = await A.client.rpc("claim_payment", { p_booking: a1.data, p_reference: "t" });
    const afterClaim = await details(A.client, a1.data);
    check("6a: after 'I've paid' (not yet confirmed) the owner still gets nothing", !claim.error && (afterClaim.data ?? []).length === 0);
    const conf = await staff.client.rpc("staff_confirm_payment", { p_booking: a1.data });
    check("6b: Staff confirm the payment", !conf.error && (await row(a1.data)).status === "confirmed", conf.error?.message);
    const own = await details(A.client, a1.data);
    check("6c: now the owner gets the address and the rules", (own.data ?? []).length === 1 && own.data[0].location === SECRET_LOC && own.data[0].rules === SECRET_RULES, JSON.stringify(own.data)?.slice(0, 60));
    const others = [];
    for (const [who, c] of [["another member", C.client], ["staff", staff.client], ["signed out", anon]]) {
      const r = await details(c, a1.data);
      if ((r.data ?? []).length) others.push(who);
    }
    check("6d: nobody else gets them, even after confirmation", others.length === 0, others.join(", "));

    // ---------- 7: expiry and re-open
    const rowC2 = await row(c2.data);
    await admin.from("bookings").update({ hold_expires_at: new Date(Date.now() - 60000).toISOString() }).eq("id", c2.data);
    const dReq = await request(D.client, n0, 2);
    check("7a: an unanswered request that has run out frees its desks at once", !dReq.error, dReq.error?.message);
    const apprExpired = await staff.client.rpc("staff_approve_request", { p_booking: c2.data });
    check("7b: an expired request cannot be approved", !!apprExpired.error && /expired/i.test(apprExpired.error.message), apprExpired.error?.message);
    await admin.from("bookings").update({ status: "expired" }).eq("id", c2.data);
    const reopen = await staff.client.rpc("staff_reopen_booking", { p_booking: c2.data });
    check("7c: a request that was never approved cannot be re-opened to payment", !!reopen.error && /not approved/i.test(reopen.error.message), reopen.error?.message);
    void rowC2;

    // ---------- 8: withdraw and cancel
    const dCancel = await D.client.rpc("cancel_my_booking", { p_booking: dReq.data });
    check("8a: a member can withdraw a request that is waiting", !dCancel.error && (await row(dReq.data)).status === "cancelled", dCancel.error?.message);
    const aCancel = await A.client.rpc("cancel_my_booking", { p_booking: a1.data });
    const rowA3 = await row(a1.data);
    check("8b: cancelling a confirmed overnight booking before the cutoff makes a refund owed", !aCancel.error && rowA3.status === "cancelled" && rowA3.refund_owed === true, aCancel.error?.message);
    const afterCancel = await details(A.client, a1.data);
    check("8c: after cancelling, the address and rules are no longer given", (afterCancel.data ?? []).length === 0);

    // ---------- 8b: prices and public settings
    // 8d / 8e (changed in 0017): the overnight monthly price is now allowed, but stays hidden while it is empty
    const pub = (await anon.rpc("get_public_settings")).data;
    check("8d: with no overnight monthly price, the public settings and the booking config show no monthly overnight option", !(pub.prices ?? []).some((p) => p.space === "overnight" && p.kind === "month") && (JSON.parse(cfgText).overnight?.month_price ?? null) === null);
    check("8f: the public settings say overnight requests are open", pub.overnight_open === true, String(pub.overnight_open));
    await admin.from("spaces").update({ is_bookable: false }).eq("slug", "overnight");
    const pubClosed = (await anon.rpc("get_public_settings")).data;
    check("8g: when the overnight desks are not open for booking, the public settings say so", pubClosed.overnight_open === false, String(pubClosed.overnight_open));
    await admin.from("spaces").update({ is_bookable: true }).eq("slug", "overnight");

    // ---------- 11: monthly overnight stay (0017)
    const m0 = addDays(today, 40);
    const monthReq = (c, d, age = true) => c.rpc("create_night_month_request", { p_checkin: d, p_age_confirmed: age });
    const noMonthPrice = await monthReq(E.client, m0);
    check("11a: with no overnight monthly price set, a monthly request is refused (contact us for pricing)", !!noMonthPrice.error && /contact us for pricing/i.test(noMonthPrice.error.message), noMonthPrice.error?.message);

    const MONTH_KOBO = 6000000;
    const setByAdmin = await adm.client.rpc("save_prices", { p_prices: [{ space: "overnight", kind: "month", audience: "standard", amount_kobo: MONTH_KOBO }] });
    check("11b: an Admin can now set the overnight monthly price in Settings", !setByAdmin.error, setByAdmin.error?.message);
    const setByStaff = await staff.client.rpc("save_prices", { p_prices: [{ space: "overnight", kind: "month", audience: "standard", amount_kobo: 1 }] });
    check("11b2: Staff cannot set it", !!setByStaff.error);
    const cfg2 = (await E.client.rpc("get_booking_config")).data?.overnight;
    const pub2 = (await anon.rpc("get_public_settings")).data;
    check("11c: once set, the booking config offers 30 nights at that price and the public settings list it", cfg2?.month_price === MONTH_KOBO && cfg2?.month_nights === 30 && (pub2.prices ?? []).some((p) => p.space === "overnight" && p.kind === "month" && p.amount_kobo === MONTH_KOBO));

    const noAgeM = await monthReq(E.client, m0, false);
    check("11d: a monthly request without the 18 or over tick is refused", !!noAgeM.error && /18 or over/i.test(noAgeM.error.message), noAgeM.error?.message);
    const pastM = await monthReq(E.client, addDays(today, -1));
    check("11e: a monthly request that starts in the past is refused", !!pastM.error, pastM.error?.message);

    // nightly stays keep their longest-stay limit (set to 7 here, the site default)
    await admin.from("settings").update({ overnight_max_nights: 7 }).eq("id", true);
    const eight = await request(G.client, addDays(today, 100), 8);
    const seven = await request(G.client, addDays(today, 100), 7);
    check("11f: a nightly booking of 8 nights is still refused, 7 nights is allowed", !!eight.error && /nights at a time/i.test(eight.error.message) && !seven.error, eight.error?.message || seven.error?.message);
    if (seven.data) await admin.from("bookings").delete().eq("id", seven.data);
    const availM = (await E.client.rpc("get_overnight_month_availability", { p_checkin: m0 })).data?.[0];
    check("11g: the monthly availability check works for 30 nights even though nightly stays stop at 7", availM?.available === true, JSON.stringify(availM));

    const e1 = await monthReq(E.client, m0);
    const rowE = e1.data ? await row(e1.data) : null;
    check("11h: a member can request a monthly overnight stay (pending_approval, flagged, the monthly price, 18+ time stored)", !e1.error && rowE?.kind === "night" && rowE?.is_month_stay === true && rowE?.status === "pending_approval" && rowE?.amount_kobo === MONTH_KOBO && !!rowE?.age_confirmed_at, e1.error?.message);
    const slotsE = e1.data ? await slotCount(e1.data) : 0;
    check("11i: it is 30 consecutive nights: check-in 20:00 on the first night, check-out 07:00 on the morning after the 30th", !!rowE && slotsE === 30 && hhmm(rowE.starts_at) === "20:00" && lagosOf(rowE.starts_at) === m0 && hhmm(rowE.ends_at) === "07:00" && lagosOf(rowE.ends_at) === addDays(m0, 30), rowE ? `${lagosOf(rowE.starts_at)} to ${lagosOf(rowE.ends_at)}, ${slotsE} desks` : "");
    const nightlyRow = await request(F.client, addDays(today, 100), 2);
    const nightlyData = nightlyRow.data ? await row(nightlyRow.data) : null;
    check("11j: a nightly request is still a normal nightly booking (not flagged, price per night times nights)", !nightlyRow.error && nightlyData?.is_month_stay === false && nightlyData?.amount_kobo === 400000, nightlyRow.error?.message);
    if (nightlyRow.data) await admin.from("bookings").delete().eq("id", nightlyRow.data);

    const e2 = await monthReq(E.client, addDays(m0, 60));
    check("11k: a second request while one is waiting is refused", !!e2.error && /waiting for approval/i.test(e2.error.message), e2.error?.message);
    const f1 = await monthReq(F.client, m0);
    const g1 = await monthReq(G.client, m0);
    check("11l: capacity is counted for every one of the 30 nights: the third monthly request is refused", !f1.error && !!g1.error && /no longer available/i.test(g1.error.message), f1.error?.message || g1.error?.message);
    const leakE = await details(E.client, e1.data);
    check("11m: while waiting for approval the owner gets no address or rules", (leakE.data ?? []).length === 0);

    // the first night cannot start before the team has approved it
    const startE = rowE.starts_at;
    await admin.from("bookings").update({ starts_at: new Date(Date.now() - 3600000).toISOString() }).eq("id", e1.data);
    const lateAppr = await staff.client.rpc("staff_approve_request", { p_booking: e1.data });
    check("11n: a monthly request whose first night has already started cannot be approved", !!lateAppr.error && /first night/i.test(lateAppr.error.message), lateAppr.error?.message);
    await admin.from("bookings").update({ starts_at: startE }).eq("id", e1.data);

    const apprE = await staff.client.rpc("staff_approve_request", { p_booking: e1.data });
    const rowE2 = await row(e1.data);
    const payH = (new Date(rowE2.hold_expires_at).getTime() - Date.now()) / 3600000;
    check("11o: Staff approve it in person; it gets the overnight pay window (24 hours)", !apprE.error && rowE2.status === "pending_payment" && payH > 23.5 && payH <= 24.01, apprE.error?.message || payH.toFixed(2));
    const earlyDetails = await details(E.client, e1.data);
    await E.client.rpc("claim_payment", { p_booking: e1.data, p_reference: "t" });
    const claimedDetails = await details(E.client, e1.data);
    check("11p: before payment is confirmed the address and rules are not given, even after 'I've paid'", (earlyDetails.data ?? []).length === 0 && (claimedDetails.data ?? []).length === 0);
    const confE = await staff.client.rpc("staff_confirm_payment", { p_booking: e1.data });
    const ownE = await details(E.client, e1.data);
    const otherE = [];
    for (const [who, c] of [["another member", F.client], ["staff", staff.client], ["signed out", anon]]) if (((await details(c, e1.data)).data ?? []).length) otherE.push(who);
    check("11q: after payment is confirmed only the owner gets the address and rules", !confE.error && (ownE.data ?? []).length === 1 && ownE.data[0].location === SECRET_LOC && otherE.length === 0, confE.error?.message || otherE.join(", "));
    const renew = await E.client.rpc("renew_my_pass", { p_booking: e1.data });
    check("11r: a monthly overnight stay cannot be renewed: staying longer needs a new booking", !!renew.error, renew.error?.message);

    // refunds: full refund up to 48 hours before the first night
    const cancelE = await E.client.rpc("cancel_my_booking", { p_booking: e1.data });
    const rowE3 = await row(e1.data);
    check("11s: cancelling before the cutoff (48 hours before the first night) makes a full refund owed", !cancelE.error && rowE3.status === "cancelled" && rowE3.refund_owed === true, cancelE.error?.message);

    // after the first night has started: no automatic refund, an Admin decides by hand
    const fId = f1.data;
    await staff.client.rpc("staff_approve_request", { p_booking: fId });
    await F.client.rpc("claim_payment", { p_booking: fId, p_reference: "t" });
    await staff.client.rpc("staff_confirm_payment", { p_booking: fId });
    check("11t: the second monthly stay was approved, paid and confirmed", (await row(fId)).status === "confirmed");
    await admin.from("bookings").update({ starts_at: new Date(Date.now() - 86400000).toISOString() }).eq("id", fId);
    const tooLate = await F.client.rpc("cancel_my_booking", { p_booking: fId });
    check("11u: once the first night has started the member cannot cancel online (no automatic refund)", !!tooLate.error && /too late to cancel/i.test(tooLate.error.message) && (await row(fId)).status === "confirmed", tooLate.error?.message);
    const staffCancel = await staff.client.rpc("admin_cancel_pass", { p_booking: fId, p_reason: "test", p_refund_kobo: 1000 });
    check("11v: Staff cannot decide a refund by hand, only an Admin", !!staffCancel.error, staffCancel.error?.message);
    const admCancel = await adm.client.rpc("admin_cancel_pass", { p_booking: fId, p_reason: "Left after two weeks", p_refund_kobo: 3000000 });
    const rowF = await row(fId);
    check("11w: an Admin can cancel it and choose a partial refund by hand", !admCancel.error && rowF.status === "cancelled" && rowF.refund_amount_kobo === 3000000 && rowF.refund_owed === true, admCancel.error?.message);

    // ---------- 9: no ID upload anywhere
    const files = walk("src");
    const uploads = files.filter((f) => /type=["']file["']/.test(fs.readFileSync(f, "utf8")));
    check("9a: no file-upload field exists anywhere in the website code", uploads.length === 0, uploads.join(", "));
    const idTables = (await admin.from("profiles").select("*").limit(1)).data?.[0] ?? {};
    check("9b: profiles has no ID or document columns", !Object.keys(idTables).some((k) => /(^|_)(id_doc|document|passport|nin|id_number|id_photo)/i.test(k)), Object.keys(idTables).join(","));

    // ---------- 10: where the private fields are read in the code
    const readers = files.filter((f) => /overnight_location_private|overnight_rules_text/.test(fs.readFileSync(f, "utf8"))).map((f) => f.replace(/\\/g, "/")).sort();
    const allowed = ["src/app/admin/settings/overnight/page.tsx", "src/lib/payment-actions.ts"];
    check("10: only the Admin settings page and the confirmed-payment email read the address and rules", JSON.stringify(readers) === JSON.stringify(allowed), readers.join(", "));
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
    if (saved.on) await admin.from("spaces").update(saved.on).eq("slug", "overnight");
    if (saved.spaceId && saved.price) await admin.from("prices").update({ amount_kobo: saved.price.amount_kobo }).eq("space_id", saved.spaceId).eq("kind", "night").eq("audience", "standard");
    if (saved.spaceId && saved.monthPrice) await admin.from("prices").update({ amount_kobo: saved.monthPrice.amount_kobo }).eq("space_id", saved.spaceId).eq("kind", "month").eq("audience", "standard");
    const left = await admin.from("bookings").select("id", { count: "exact", head: true }).in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    console.log(`Cleanup done: test accounts removed, settings, prices and the private address restored. Leftover test bookings: ${left.count ?? 0}`);
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
