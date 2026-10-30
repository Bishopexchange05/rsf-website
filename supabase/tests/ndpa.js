// NDPA personal-data test (18+ tick, download, delete, retention) against the DEVELOPMENT database. Run from the project folder:
//   node supabase/tests/ndpa.js
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
  const email = `ndpatest-${Date.now()}-${label}@example.com`;
  const password = "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `NDPA ${label}`, phone: `+234803127${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true },
  });
  if (error) throw error;
  if (role !== "member") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw si.error;
  if (withTwoStep) {
    const en = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "ndpatest" });
    if (en.error) throw en.error;
    const ch = await client.auth.mfa.challenge({ factorId: en.data.id });
    const vr = await client.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp(en.data.totp.secret) });
    if (vr.error) throw vr.error;
  }
  return { id: data.user.id, client };
}

const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ref = () => "RSF-" + Array.from({ length: 6 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

(async () => {
  const made = [];
  const refs = [];
  const rateKey = "ndpa-test-" + Date.now();
  try {
    const dayId = (await admin.from("spaces").select("id").eq("slug", "day").single()).data.id;
    const rawUser = async (label, meta = {}) => {
      const email = `ndpa-${Date.now()}-${label}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email, password: "Tmp-" + Math.random().toString(36).slice(2) + "-Aa1!", email_confirm: true,
        user_metadata: { full_name: `NDPA ${label}`, phone: `+234803125${String(Math.floor(Math.random() * 9000) + 1000)}`, terms_accepted: true, ...meta },
      });
      if (error) throw error;
      made.push({ id: data.user.id });
      return { id: data.user.id, email, name: `NDPA ${label}`, phone: data.user.user_metadata.phone };
    };
    const addBooking = async (userId, o) => {
      const reference = ref();
      refs.push(reference);
      const row = {
        reference, user_id: userId, space_id: dayId, kind: "hour", amount_kobo: o.amount ?? 150000,
        status: o.status ?? "confirmed", starts_at: o.starts, ends_at: o.ends, updated_at: o.updated ?? new Date().toISOString(),
        refund_owed: o.refund ?? false, hold_expires_at: o.hold ?? null,
      };
      const r = await admin.from("bookings").insert(row).select("id").single();
      if (r.error) throw new Error("booking insert: " + r.error.message);
      if (o.payRef !== undefined) {
        const p = await admin.from("payments").insert({ booking_id: r.data.id, expected_kobo: row.amount_kobo, customer_reference: o.payRef, status: "confirmed", received_kobo: row.amount_kobo });
        if (p.error) throw new Error("payment insert: " + p.error.message);
      }
      return { id: r.data.id, reference };
    };

    // ---------- 1. the 18+ confirmation at registration
    const adultUser = await rawUser("adult", { adult_confirmed: true });
    const plainUser = await rawUser("noadult");
    const pa = (await admin.from("profiles").select("adult_confirmed_at, terms_accepted_at").eq("id", adultUser.id).single()).data;
    const pn = (await admin.from("profiles").select("adult_confirmed_at").eq("id", plainUser.id).single()).data;
    check("1a: registering with the 18+ confirmation stores that it happened and when (the database's own clock)", !!pa.adult_confirmed_at && Math.abs(Date.now() - new Date(pa.adult_confirmed_at).getTime()) < 120000, String(pa.adult_confirmed_at));
    check("1b: without it, nothing is stored", pn.adult_confirmed_at === null);
    const cols = Object.keys((await admin.from("profiles").select("*").eq("id", adultUser.id).single()).data);
    check("1c: no date of birth or age is stored anywhere in the profile", !cols.some((c) => /birth|dob|age$|^age/i.test(c) && c !== "adult_confirmed_at"), cols.join(","));

    // ---------- 2. download my data: only my own
    const A = await makeUser("A", "member", false);
    const B = await makeUser("B", "member", false);
    const staff = await makeUser("staff", "staff", true);
    made.push(A, B, staff);
    const aOpen = await addBooking(A.id, { status: "confirmed", starts: iso(3), ends: iso(3.1), payRef: "Ada paid from GTB" });
    const aOld = await addBooking(A.id, { status: "cancelled", starts: iso(-40), ends: iso(-39.9), payRef: "Ada old ref", amount: 250000 });
    const bOne = await addBooking(B.id, { status: "confirmed", starts: iso(5), ends: iso(5.1), payRef: "Bola secret ref" });
    await admin.from("email_log").insert([{ to_user_id: A.id, template: "ndpa-test", status: "sent" }, { to_user_id: B.id, template: "ndpa-test", status: "sent" }]);

    const exp = await A.client.rpc("export_my_data");
    const text = JSON.stringify(exp.data ?? {});
    check("2a: a member can download their data", !exp.error && Array.isArray(exp.data?.bookings), exp.error?.message);
    check("2b: it contains their own bookings, payments note, email and sent-email list", text.includes(aOpen.reference) && text.includes(aOld.reference) && text.includes("Ada paid from GTB") && text.includes("ndpa-test") && /@example\.com/.test(text));
    const bUser = (await admin.from("profiles").select("full_name, phone").eq("id", B.id).single()).data;
    check("2c: it contains NOTHING about anyone else (no other member's reference, note, name or phone)", !text.includes(bOne.reference) && !text.includes("Bola secret ref") && !text.includes(bUser.full_name) && !text.includes(bUser.phone));
    check("2d: the amounts are shown in naira (2,500 for the 250000 kobo booking)", /"amount_naira":2500/.test(text), "");
    check("2e: it has no keys, no password and no overnight address", !/password|SECRET|location|service_role|eyJ/.test(text));
    const expStaffAnon = await createClient(URL, ANON, { auth: { persistSession: false } }).rpc("export_my_data");
    check("2f: a signed-out visitor cannot download anything", !!expStaffAnon.error, expStaffAnon.error?.code);
    const expAudit = (await admin.from("audit_log").select("action").eq("entity_id", A.id).eq("action", "account.export")).data ?? [];
    check("2g: the download is recorded in the audit log", expAudit.length >= 1);

    // ---------- 3. delete my account: the guards
    const memberCall = await A.client.rpc("anonymise_user_data", { p_user: A.id });
    check("3a: a member cannot call the data-removal function directly (only the website's server key can)", !!memberCall.error, memberCall.error?.code);
    const staffRow = await admin.from("profiles").select("role").eq("id", staff.id).single();
    const staffTry = await admin.rpc("anonymise_user_data", { p_user: staff.id });
    check("3b: a Staff or Admin account is refused", staffRow.data.role === "staff" && !!staffTry.error && /staff and admin/i.test(staffTry.error.message), staffTry.error?.message);
    const blocked = await admin.rpc("anonymise_user_data", { p_user: A.id });
    check("3c: refused while a confirmed booking in the future is still open", !!blocked.error && /not finished/i.test(blocked.error.message), blocked.error?.message);
    await admin.from("bookings").update({ refund_owed: true }).eq("id", aOld.id);
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", aOpen.id);
    const blockedRefund = await admin.rpc("anonymise_user_data", { p_user: A.id });
    check("3d: and while a refund is still owed", !!blockedRefund.error && /not finished/i.test(blockedRefund.error.message), blockedRefund.error?.message);
    await admin.from("bookings").update({ refund_owed: false }).eq("id", aOld.id);

    // ---------- 4. delete my account: what it does
    const anon = await admin.rpc("anonymise_user_data", { p_user: A.id });
    check("4a: with nothing open, the data is anonymised", !anon.error && anon.data?.bookings_unlinked === 2, anon.error?.message ?? JSON.stringify(anon.data));
    const aRows = (await admin.from("bookings").select("id, user_id, amount_kobo, reference").in("id", [aOpen.id, aOld.id])).data ?? [];
    check("4b: the bookings are no longer linked to anyone, but the amounts and references stay (accounting)", aRows.length === 2 && aRows.every((r) => r.user_id === null) && aRows.find((r) => r.id === aOld.id).amount_kobo === 250000);
    const aPays = (await admin.from("payments").select("customer_reference, expected_kobo").in("booking_id", [aOpen.id, aOld.id])).data ?? [];
    check("4c: what they typed (the transfer note) is erased, the money figures stay", aPays.length === 2 && aPays.every((p) => p.customer_reference === null && p.expected_kobo > 0));
    const aMail = (await admin.from("email_log").select("id").eq("to_user_id", A.id)).data ?? [];
    check("4d: the email log is no longer linked to them", aMail.length === 0);
    const delAudit = (await admin.from("audit_log").select("action, entity_id, after, detail").eq("action", "account.delete").eq("entity_id", A.id)).data ?? [];
    const delText = JSON.stringify(delAudit);
    check("4e: an audit entry was written, with no name, phone or email in it", delAudit.length === 1 && !delText.includes("NDPA A") && !delText.includes("@example.com"), delText.slice(0, 80));
    const del = await admin.auth.admin.deleteUser(A.id);
    const gone = (await admin.from("profiles").select("id").eq("id", A.id)).data ?? [];
    check("4f: deleting the login removes the profile (name, phone) too", !del.error && gone.length === 0, del.error?.message);
    const bStill = (await admin.from("bookings").select("user_id").eq("id", bOne.id).single()).data;
    const bPay = (await admin.from("payments").select("customer_reference").eq("booking_id", bOne.id).single()).data;
    check("4g: another member's booking and note are untouched", bStill.user_id === B.id && bPay.customer_reference === "Bola secret ref");

    // ---------- 5. retention (12 months)
    const R1 = await rawUser("inactive");           // never signed in
    const R3 = await makeUser("R3", "member", false); // signed in just now
    made.push(R3);
    const old = iso(-430), oldEnd = iso(-429.9);
    const r1Old = await addBooking(R1.id, { status: "confirmed", starts: old, ends: oldEnd, updated: old, payRef: "R1 typed note" });
    const r1Refund = await addBooking(R1.id, { status: "cancelled", starts: old, ends: oldEnd, updated: old, payRef: "R1 refund note", refund: true });
    const r3Old = await addBooking(R3.id, { status: "confirmed", starts: old, ends: oldEnd, updated: old, payRef: "R3 note" });
    const r1New = await addBooking(R1.id, { status: "confirmed", starts: iso(-20), ends: iso(-19.9), updated: iso(-1), payRef: "R1 new" });
    // R1 now has a recent booking, so it is ACTIVE. Move that booking to another dormant user to test cleanly.
    const R4 = await rawUser("dormant");
    const r4Old = await addBooking(R4.id, { status: "confirmed", starts: old, ends: oldEnd, updated: old, payRef: "R4 typed note" });
    await admin.from("bookings").update({ user_id: null }).eq("id", r1New.id);
    await admin.from("email_log").insert([
      { to_user_id: null, template: `ndpa-test-old-${rateKey}`, status: "sent", created_at: iso(-400) },
      { to_user_id: null, template: `ndpa-test-new-${rateKey}`, status: "sent", created_at: iso(-5) },
    ]);
    const oldAuditId = (await admin.from("audit_log").insert({ action: "ndpa.test.old", entity_type: "system", entity_id: "ndpa", created_at: iso(-500) }).select("id").single()).data.id;
    await admin.from("rate_events").insert([{ key: rateKey, action: "ndpa-test", created_at: iso(-10) }, { key: rateKey, action: "ndpa-test", created_at: new Date().toISOString() }]);

    const run = await admin.rpc("run_retention");
    check("5a: the retention job runs", !run.error && typeof run.data?.bookings_anonymised === "number", run.error?.message);
    const get = async (id) => (await admin.from("bookings").select("user_id, amount_kobo").eq("id", id).single()).data;
    const pay = async (id) => (await admin.from("payments").select("customer_reference").eq("booking_id", id).single()).data.customer_reference;
    const g4 = await get(r4Old.id);
    check("5b: a dormant person's old booking is anonymised (unlinked, note erased, amount kept)", g4.user_id === null && g4.amount_kobo === 150000 && (await pay(r4Old.id)) === null);
    const g1 = await get(r1Old.id);
    check("5c: so is the old booking of a person with no recent activity", g1.user_id === null && (await pay(r1Old.id)) === null);
    const g1r = await get(r1Refund.id);
    check("5d: a booking with a refund still owed is NOT anonymised", g1r.user_id === R1.id && (await pay(r1Refund.id)) === "R1 refund note");
    const g3 = await get(r3Old.id);
    check("5e: a person who signed in recently keeps their history", g3.user_id === R3.id && (await pay(r3Old.id)) === "R3 note");
    const mail = (await admin.from("email_log").select("template").in("template", [`ndpa-test-old-${rateKey}`, `ndpa-test-new-${rateKey}`])).data ?? [];
    check("5f: the email log is cleared after 12 months and kept before that", mail.length === 1 && mail[0].template === `ndpa-test-new-${rateKey}`, mail.map((m) => m.template).join(","));
    const auditKept = (await admin.from("audit_log").select("id").eq("id", oldAuditId)).data ?? [];
    check("5g: the audit log is never deleted", auditKept.length === 1);
    const rate = (await admin.from("rate_events").select("id").eq("key", rateKey)).data ?? [];
    check("5h: old rate-limit rows are cleared", rate.length === 1, String(rate.length));
    const retAudit = (await admin.from("audit_log").select("action").eq("action", "retention.run").order("created_at", { ascending: false }).limit(1)).data ?? [];
    check("5i: the run is in the audit log", retAudit.length === 1);
    const sched = await admin.rpc("run_retention"); // second run changes nothing and does not fail
    check("5j: running it twice is harmless", !sched.error && sched.data.bookings_anonymised === 0, sched.error?.message);
  } catch (e) {
    console.log("TEST ERROR:", e.message);
    results.push(false);
  } finally {
    const ids = made.map((u) => u.id);
    if (refs.length) await admin.from("bookings").delete().in("reference", refs);
    await admin.from("rate_events").delete().eq("key", rateKey);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    const left = await admin.from("bookings").select("id", { count: "exact", head: true }).in("reference", refs.length ? refs : ["x"]);
    console.log(`Cleanup done: test accounts and test bookings removed. Leftover test bookings: ${left.count ?? 0}. (A few small audit and email-log rows from the test remain on purpose: they cannot be deleted.)`);
    const failed = results.filter((r) => !r).length;
    console.log(`\nRESULT: ${results.length - failed} passed, ${failed} failed`);
  }
})();
