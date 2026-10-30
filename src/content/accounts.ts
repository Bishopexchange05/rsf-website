// All wording for the account pages (Phase 2, M1). Components never hardcode copy.
import { orgName } from "./site";

export const common = {
  label: "Your account",
  contactHref: "/contact",
  contactLabel: "contact page",
  genericError: "Something went wrong. Please try again in a moment.",
  tooMany: "Too many attempts. Please wait a few minutes and try again.",
  show: "Show",
  hide: "Hide",
  sending: "Please wait…",
  saving: "Saving…",
  booking: "Booking…",
  cancelling: "Cancelling…",
  fixFields: "Please check the highlighted fields.",
};

export const headerLink = { label: "Log in", href: "/login" };
export const headerAccountLink = { label: "Account", href: "/account" };
export const headerAdminLink = { label: "Admin", href: "/admin" };

export const fields = {
  fullName: { label: "Full name", placeholder: "" },
  phone: { label: "Phone number", placeholder: "0803 123 4567", hint: "We use this to reach you about your bookings." },
  email: { label: "Email address", placeholder: "" },
  password: { label: "Password", hint: "At least 10 characters." },
  newPassword: { label: "New password", hint: "At least 10 characters." },
  confirmPassword: { label: "Repeat the password" },
  currentPassword: { label: "Password" },
};

export const errors = {
  required: "This field is required.",
  name: "Enter your name.",
  phone: "Enter a valid Nigerian phone number, for example 0803 123 4567.",
  email: "Enter a valid email address.",
  passwordShort: "Use at least 10 characters.",
  passwordLong: "That password is too long (72 characters at most).",
  passwordMismatch: "The two passwords do not match.",
  passwordSame: "Choose a password you have not used for this account before.",
  terms: "Please tick the box to continue.",
  adult: "Please tick the box to confirm you are 18 or over.",
  badLogin: "That email and password do not match. Please try again.",
  emailRate: "We have sent several emails already. Please wait a little and try again.",
  waitResend: "Please wait a minute before asking for another email.",
  linkExpired: "That link has expired or was already used.",
};

export const register = {
  title: "Create your account",
  heading: "Create your account",
  text: `Make an account to book a place at RSF Tech & Space. ${orgName} uses your details only to run your bookings.`,
  submit: "Create account",
  terms: "I agree to the Terms of use and I have read the Privacy Policy.",
  adult: "I am 18 or over.",
  adultHelp: "Accounts are for adults. We keep only the fact that you confirmed this, and when, not your age or date of birth. Under 18? Please ask a parent or guardian to book for you.",
  termsLinks: [
    { label: "Terms of use", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  haveAccount: "Already have an account?",
  haveAccountLink: { label: "Log in", href: "/login" },
};

export const login = {
  title: "Log in",
  heading: "Log in",
  text: "Welcome back. Log in to see your account.",
  submit: "Log in",
  forgot: { label: "Forgot your password?", href: "/forgot-password" },
  noAccount: "New here?",
  noAccountLink: { label: "Create an account", href: "/register" },
  notices: {
    "password-updated": "Your password has been changed. Please log in again.",
    "signed-out": "You have been signed out.",
  } as Record<string, string>,
};

export const verifyEmail = {
  title: "Check your email",
  heading: "Check your email",
  textWithEmail: (email: string) => `We've sent a verification link to ${email}.`,
  textNoEmail: "Enter your email address and we will send you a new verification link.",
  body: "Open the email and select Verify my email. If you can't find it in your inbox, check your spam or junk folder.",
  resend: "Send the link again",
  waiting: (seconds: number) => `Send the link again in ${seconds}s`,
  countdownNote: "You can request a new link when the countdown ends.",
  available: "You can now request a new link.",
  resent: "If that address is waiting to be verified, we have sent a new link.",
  help: "Still stuck? Please use our",
};

export const confirm = {
  title: "Confirm",
  heading: "One more step",
  verifyText: "Press the button to verify your email address.",
  verifyButton: "Verify my email",
  recoveryText: "Press the button to continue and choose a new password.",
  recoveryButton: "Choose a new password",
  invalidHeading: "This link does not work",
  invalidText: "It may have expired or already been used. You can ask for a new one.",
  newVerification: { label: "Send a new verification link", href: "/verify-email" },
  newReset: { label: "Send a new reset link", href: "/forgot-password" },
};

export const forgot = {
  title: "Reset your password",
  heading: "Reset your password",
  text: "Enter your email address and we will send you a link to choose a new password.",
  submit: "Send reset link",
  sent: "If there is an account for that address, we have sent a link to reset the password. Check your spam folder if it does not arrive.",
  resend: "Send the link again",
  countdownNote: "You can request a new link when the countdown ends.",
  back: { label: "Back to log in", href: "/login" },
};

export const reset = {
  title: "Choose a new password",
  heading: "Choose a new password",
  text: "Pick a password you have not used elsewhere.",
  submit: "Save new password",
  needLink: "To choose a new password, open the link in the email we sent you.",
};

export const account = {
  title: "Your account",
  heading: "Your account",
  text: "Your details and your password. Your bookings will appear here once booking opens.",
  detailsHeading: "Your details",
  emailLabel: "Email",
  roleLabel: "Account type",
  roles: { member: "Member", staff: "Staff", admin: "Admin" } as Record<string, string>,
  saveDetails: "Save details",
  detailsSaved: "Your details have been saved.",
  passwordHeading: "Change your password",
  savePassword: "Change password",
  passwordSaved: "Your password has been changed.",
  signOut: "Log out",
  adminLink: { label: "Open the admin area", href: "/admin" },
  bookingsLink: { label: "My bookings", href: "/account/bookings" },
  data: {
    heading: "Your information",
    text: "You can download a copy of everything we hold about you, or delete your account.",
    download: "Download my data",
    downloadHelp: "A file you can open in any text editor. It contains only your own information.",
    deleteLink: { label: "Delete my account", href: "/account/delete" },
    staffNote: "Staff and Admin accounts cannot be deleted here. Ask an Admin to change your account to Member first.",
  },
  notices: {
    verified: "Your email is verified. Welcome.",
  } as Record<string, string>,
};

export const admin = {
  title: "Admin area",
  label: "Admin",
  heading: "Admin area",
  text: "Manage people and keep an eye on what is happening on the site.",
  signedInAs: (name: string, role: string) => `You are signed in as ${name} (${role}).`,
  back: { label: "Back to your account", href: "/account" },
  staffNote: "Bookings and payments will appear here once booking opens.",
  links: [
    { label: "People", href: "/admin/users", text: "Make someone Staff, change roles, deactivate accounts, reset two-step verification." },
    { label: "Settings", href: "/admin/settings", text: "Opening hours, desks, prices, booking rules and bank details." },
    { label: "Audit log", href: "/admin/audit", text: "A permanent record of what Admins and Staff have done." },
    { label: "Email health", href: "/admin/email", text: "How many emails the site sent and whether any failed." },
  ],
};

export const twoFactor = {
  label: "Security",
  setup: {
    title: "Set up two-step verification",
    heading: "Set up two-step verification",
    text: "Staff and Admin accounts need an authenticator app, so a stolen password alone cannot open the admin area.",
    steps: [
      "Install an authenticator app on your phone, for example Google Authenticator, Microsoft Authenticator or Authy.",
      "Press Start, then scan the picture with the app. If you cannot scan, type the key into the app instead.",
      "Type the 6-digit code the app shows to finish.",
    ],
    start: "Start",
    notReady: "Two-step verification cannot be set up right now. Please tell the site owner.",
    alreadyOn: "Two-step verification is already on for your account.",
    alreadyOnLink: { label: "Go to your account", href: "/account" },
    scanAlt: "QR code to scan with your authenticator app",
    keyLabel: "Or type this key into the app",
    codeLabel: "6-digit code from the app",
    verify: "Finish setup",
    badCode: "That code did not work. Check the code in your app and try again.",
  },
  codes: {
    heading: "Save your recovery codes",
    text: "If you lose your phone, one of these codes lets you in so you can set up a new authenticator. Each code works once. Keep them somewhere safe, not on the phone you use for the app.",
    copy: "Copy the codes",
    copied: "Copied",
    download: "Download as a text file",
    saved: "I have saved these codes somewhere safe.",
    continue: "Continue",
    fileName: "rsf-recovery-codes.txt",
    fileHeader: "Rafael Support Foundation recovery codes. Each code works once.",
  },
  challenge: {
    title: "Enter your code",
    heading: "Enter your code",
    text: "Open your authenticator app and type the 6-digit code.",
    codeLabel: "6-digit code",
    submit: "Continue",
    badCode: "That code did not work. Check the code in your app and try again.",
    recoveryLink: { label: "Lost your phone? Use a recovery code", href: "/two-factor/recovery" },
    signOut: "Log out",
  },
  recovery: {
    title: "Use a recovery code",
    heading: "Use a recovery code",
    text: "Enter one of the recovery codes you saved. This removes your current authenticator so you can set up a new one. You will get new recovery codes after that.",
    codeLabel: "Recovery code",
    submit: "Use this code",
    bad: "That recovery code did not work. Check it and try again. Each code works once.",
    back: { label: "Back to the code page", href: "/two-factor" },
    notice: "Your old authenticator was removed. Set up a new one now.",
  },
  account: {
    heading: "Two-step verification",
    on: "On. Your account is protected with an authenticator app.",
    off: "Not set up yet.",
    setupLink: { label: "Set it up now", href: "/two-factor/setup" },
    codesLeft: (n: number) => `Recovery codes left: ${n}.`,
    regenerate: "Make new recovery codes",
    regenerateHelp: "This replaces all your old codes. The new ones are shown once.",
    needSignInAgain: "Please enter your authenticator code again before making new codes.",
  },
  email: {
    resetSubject: "Your two-step verification was reset",
    resetBody: (name: string, byName: string) =>
      `Hello ${name},\n\n${byName} reset the two-step verification on your Rafael Support Foundation account. Next time you open the admin area you will be asked to set up your authenticator app again.\n\nIf you did not expect this, please contact the Foundation straight away through the Contact page on our website.\n\nRafael Support Foundation`,
    recoverySubject: "A recovery code was used on your account",
    recoveryBody: (name: string) =>
      `Hello ${name},\n\nA recovery code was used to reset the two-step verification on your Rafael Support Foundation account, and your old authenticator was removed.\n\nIf this was you, no action is needed. If it was not you, please contact the Foundation straight away through the Contact page on our website and change your password.\n\nRafael Support Foundation`,
  },
};

export const adminUsers = {
  title: "People",
  heading: "People",
  text: "Everyone with an account. Only Admins can change roles.",
  searchLabel: "Search by name or email",
  searchButton: "Search",
  empty: "Nobody matches that search.",
  you: "You",
  roleLabel: "Role",
  saveRole: "Save role",
  roles: { member: "Member", staff: "Staff", admin: "Admin" } as Record<string, string>,
  active: "Active",
  inactive: "Deactivated",
  deactivate: "Deactivate",
  reactivate: "Reactivate",
  twoFactorOn: "2-step on",
  twoFactorOff: "2-step not set up",
  notVerified: "Email not verified",
  resetSummary: "Reset two-step verification",
  resetHelp: "Use this only when the person has lost their phone and their recovery codes. They will have to set it up again. Type their email address to confirm.",
  resetConfirmLabel: "Their email address",
  resetButton: "Reset two-step verification",
  next: "Next page",
  previous: "Previous page",
  notices: {
    "role-saved": "The role was saved.",
    "active-saved": "The account was updated.",
    "mfa-reset": "Two-step verification was reset. The person has been emailed.",
  } as Record<string, string>,
  errors: {
    forbidden: "You are not allowed to do that.",
    self: "You cannot do that to your own account.",
    "last-admin": "There must always be at least one active Admin.",
    "confirm-mismatch": "The email address you typed does not match.",
    "not-ready": "This feature is not set up on the server yet. Please tell the site owner.",
    "too-many": "Too many attempts. Please wait a few minutes.",
    failed: "That did not work. Please try again.",
  } as Record<string, string>,
};

export const auditLog = {
  title: "Audit log",
  heading: "Audit log",
  text: "A permanent record. Entries cannot be changed or deleted.",
  filterLabel: "Show only",
  filterAll: "Everything",
  filters: [
    { value: "role", label: "Role changes" },
    { value: "user", label: "Account changes" },
    { value: "mfa", label: "Two-step verification" },
    { value: "sessions", label: "Sessions ended" },
    { value: "settings", label: "Settings changes" },
  ],
  columns: { when: "When", who: "Who", what: "What", details: "Details" },
  empty: "Nothing recorded yet.",
  unknownPerson: "Unknown",
  system: "System",
  limitNote: "Showing the latest 200 entries.",
  actions: {
    "role.change": "Role changed",
    "user.deactivate": "Account deactivated",
    "user.reactivate": "Account reactivated",
    "mfa.enrolled": "Two-step verification set up",
    "mfa.reset": "Two-step verification reset by an Admin",
    "mfa.recovery_code_used": "Recovery code used",
    "sessions.ended": "Open sessions ended",
    "settings.hours": "Opening hours changed",
    "settings.capacity": "Day or overnight desks changed",
    "settings.prices": "Prices changed",
    "settings.rules": "Booking rules changed",
    "settings.overnight": "Overnight details changed",
    "settings.bank": "Bank details changed",
    "settings.booking_switch": "Booking switched on or off",
    "sessions.end_failed": "Could not end open sessions",
    "mfa.codes_regenerated": "Recovery codes replaced",
  } as Record<string, string>,
};

export const emailHealth = {
  title: "Email health",
  heading: "Email health",
  text: "Emails the site sent itself (account and booking emails). Login and verification emails sent by Supabase are not counted here.",
  provider: "Sending through",
  providers: { smtp: "Gmail or other SMTP", resend: "Resend" } as Record<string, string>,
  today: "Sent today",
  capLabel: (sent: number, cap: number, pct: number) => `${sent} of ${cap} (${pct}% of the daily limit)`,
  capWarning: "You are close to the daily sending limit. Emails may stop until tomorrow.",
  capNotSet: "No daily limit is set (EMAIL_DAILY_CAP).",
  failedHeading: "Recent failures",
  noFailures: "No failed emails in the last 14 days.",
  tableHeading: "Last 14 days",
  columns: { day: "Day", sent: "Sent", failed: "Failed" },
  empty: "No emails recorded yet.",
};

// Download and delete (NDPA rights). Wording for the account page, the delete page and the email.
export const deleteAccount = {
  title: "Delete your account",
  heading: "Delete your account",
  text: "This removes your login. It cannot be undone.",
  whatHappens: {
    heading: "What happens",
    list: [
      "Your login is removed straight away, and you are signed out.",
      "Your name, phone number and email are deleted from our system.",
      "Your past bookings stay only as anonymous figures (amounts, dates and references), because we must keep financial records. They are no longer linked to you.",
      "You can register again later, with the same email address, as a new account.",
    ],
  },
  blockers:
    "You cannot delete your account while you have an unfinished booking, a payment being checked, or a refund we still owe you. Cancel or finish those first, or contact us.",
  passwordLabel: "Your password (to confirm it is you)",
  confirmLabel: "I understand this cannot be undone.",
  button: "Delete my account",
  pending: "Deleting…",
  back: { label: "No, take me back to my account", href: "/account" },
  errors: {
    "bad-password": "That password is not right.",
    confirm: "Please tick the box to confirm.",
    "open-bookings": "You still have a booking or a refund that is not finished. Please finish or cancel it first, or contact us.",
    staff: "Staff and Admin accounts cannot be deleted here. Ask an Admin to change your account to Member first.",
    "too-many": "Too many attempts. Please wait a while and try again.",
    failed: "That did not work. Please try again, or contact us.",
  } as Record<string, string>,
  done: {
    title: "Your account has been deleted",
    heading: "Your account has been deleted",
    text: "Your login has been removed and your personal details deleted. Thank you for being part of RSF Tech & Space. You are always welcome to come back.",
    home: { label: "Back to the home page", href: "/" },
  },
  email: {
    subject: "Your RSF account has been deleted",
    body: (name: string) =>
      `Hello ${name},\n\nAs you asked, your account on the ${orgName} website has been deleted. Your login and personal details are gone, and your past bookings are kept only as anonymous figures for our financial records.\n\nIf you did not ask for this, please contact us straight away.\n\n${orgName}`,
  },
};
