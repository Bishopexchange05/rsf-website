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
  fixFields: "Please check the highlighted fields.",
};

export const headerLink = { label: "Log in", href: "/login" };

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
  textWithEmail: (email: string) =>
    `We have sent a link to ${email}. Open it to verify your email address. Then you can log in.`,
  textNoEmail: "Enter your email address and we will send you a new verification link.",
  spam: "Cannot see it? Check your spam or junk folder. Emails from us can take a few minutes to arrive.",
  resend: "Send the link again",
  resendCooldown: "You can ask for another email in a minute.",
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
  notices: {
    verified: "Your email is verified. Welcome.",
  } as Record<string, string>,
};

export const admin = {
  title: "Admin area",
  label: "Admin",
  heading: "Admin area",
  text: "This area is being set up. There is nothing to manage here yet.",
  signedInAs: (name: string, role: string) => `You are signed in as ${name} (${role}).`,
  back: { label: "Back to your account", href: "/account" },
};
