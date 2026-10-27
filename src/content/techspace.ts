import { addressShort, orgName, spaceName } from "./site";
import type { FormDef, FormType } from "@/lib/form-types";
import { rsvpForm } from "./events";
import { contactForm } from "./contact";
import { partnerForm, volunteerForm } from "./get-involved";

// Placeholder images live in /public/media/. Replace with real photos using the
// same names, then update the alt text here.
export const media = {
  hero: { src: "/media/hero-poster.jpg", alt: "" }, // decorative background
  day: {
    src: "/media/techspace-02.jpg",
    alt: "An empty, well-lit workspace with orange and green desk booths, wooden tables and a projector screen under a colourful ceiling.",
    soon: false,
  },
  overnight: {
    // No overnight photo anywhere on the site: that location stays private.
    src: "",
    alt: "Overnight workspace photo coming soon",
    soon: true,
  },
  mediaRoom: {
    src: "/media/techspace-03.jpg",
    alt: "Placeholder photo: a room set up with equipment for recording and content creation.",
    // Real photo not supplied yet: shows a "Photo coming soon" panel. Set to false
    // when /media/techspace-03.jpg is a real photo.
    soon: true,
  },
  learn: {
    poster: "/media/techspace-tour-poster.jpg",
  },
  consulting: {
    src: "/media/pillar-guidance.jpg",
    alt: "Two young women sit facing each other across a wooden table with a laptop between them, smiling as they talk one to one.",
  },
};

export const meta = {
  title: spaceName.replace(/ /g, " "),
  description: `${spaceName} is where ${orgName}'s work happens in person: a calm place to work or study, learn digital skills, create content and get honest career guidance.`,
};

export const hero = {
  label: spaceName,
  heading: "A place to work, learn and be guided.",
  text: `${spaceName} is where ${orgName}'s work happens in person: a calm place to work or study, learn digital skills, create content and get honest career guidance.`,
  primaryCta: { label: "Request a Space", href: "#workspace" },
  secondaryCta: { label: "See Our Courses", href: "#learn" },
  badges: ["Free WiFi", "Steady power", "Conducive environment"],
  banner: {
    title: "Grand Opening: 16 October 2026, 10:00 AM.",
    place: `${addressShort}.`,
  },
};

export const whatYouGet = {
  heading: "What you get",
  cards: [
    {
      icon: "wifi",
      title: "Free WiFi",
      text: "Fast, free internet for study, work and learning.",
    },
    {
      icon: "bolt",
      title: "Steady power",
      text: "Work without worrying about power cuts.",
    },
    {
      icon: "shield",
      title: "A conducive environment",
      text: "A calm, safe place to focus.",
    },
  ],
} as const;

export const workspace = {
  heading: "Workspace for day and night",
  intro:
    "Come to work, study, hold a meeting or carry out a project in a calm space with free WiFi and steady power.",
  cards: [
    {
      form: "day-space",
      title: "Day workspace",
      text: "Open to students, freelancers and young professionals. Send a request with the day you'd like to come, and we'll confirm.",
      cta: "Request day space",
      // When booking is open on the site: choose a day and pay by bank transfer.
      booking: {
        text: "Open to students, freelancers and young professionals. Choose the day and hours you need, then pay by bank transfer. We hold your desk while you pay.",
        cta: "Book a day desk",
        href: "/book",
      },
      image: media.day,
    },
    {
      form: "overnight-access",
      title: "Overnight workspace",
      text: "For people who need to work or study through the night. Overnight access is approved in person. Send a request, and we'll invite you to our office to meet the team and complete a short verification. Bring valid ID to that visit. Once your booking is confirmed, we'll share the overnight location and how access works.",
      note: "We never collect ID documents through this website.",
      cta: "Request overnight access",
      // When overnight requests are open on the site: an account request, then payment.
      booking: {
        text: "For people aged 18 or over who need to work or study through the night. Send a request, and we'll invite you to our office to meet the team. We check your ID there, in person, and approve your request. Then you pay by bank transfer. Once your booking is confirmed, we'll share the overnight location and how access works.",
        cta: "Request an overnight desk",
        href: "/book/overnight",
      },
      image: media.overnight,
    },
  ],
} as const;

export const mediaRoom = {
  heading: "Media room",
  text: "A room set up for podcast recording, photography and content creation. Tell us what you want to make and when.",
  cta: "Request the media room",
  form: "media-room",
  image: media.mediaRoom,
} as const;

export const courses = [
  { name: "Python" },
  { name: "Graphic design" },
  { name: "Video editing" },
  { name: "UI/UX design" },
  { name: "Virtual assistance" },
  { name: "Data analysis" },
  {
    name: "AI proficiency",
    details: [
      "AI automation",
      "AI content creation",
      "AI assistants",
      "Vibe coding",
      "Building AI solutions",
    ],
  },
] as const;

export const learn = {
  heading: "Learn skills that open doors",
  text: "Practical, hands-on training, taught in person, online or a mix of both.",
  cta: "Register interest",
  note: "Choose Physical, Virtual or Hybrid. Course fees will be shared soon. Register your interest and you'll hear first.",
  videoHeading: "Take a look inside",
};

export const consulting = {
  heading: "Honest guidance for your next step",
  text: "We support students at pre-university, university and postgraduate level with choosing a school or course, career planning, scholarships at home and abroad, study-abroad options, visa applications, project topic selection and project writing support.",
  smallPrint: "We guide and support. Decisions and outcomes remain yours.",
  cta: "Send a guidance enquiry",
  form: "guidance",
  image: media.consulting,
} as const;

export const digitalMarketing = {
  heading: "Digital marketing and content",
  text: "Need help telling your business's story online? Tell us what you need, and our team will get back to you.",
  cta: "Send an enquiry",
  form: "digital-marketing",
} as const;

export const visit = {
  heading: "Visit us",
  address: `${addressShort}.`,
  cta: "Chat on WhatsApp",
};

export const closing = {
  heading: "Pay it forward.",
  cta: { label: "Get Involved", href: "/get-involved" },
};

// ---- Request forms -------------------------------------------------------

export const formsCommon = {
  consent:
    "I agree to be contacted about this request. If I am under 18, my parent or guardian knows I am sending it.",
  consentRequired: "Please tick the box to continue.",
  required: "This field is required.",
  invalidPhone: "Enter a valid Nigerian phone number, for example 0803 123 4567.",
  invalidDate: "Choose a valid date.",
  invalidChoice: "Choose one of the options.",
  tooLong: "That is too long.",
  sending: "Sending…",
  successTitle: "Thank you, we have your request.",
  successText: "Our team will get back to you soon.",
  close: "Close",
  genericError: "Something went wrong. Please try again in a moment.",
  rateLimited: "Too many requests from this connection. Please wait a few minutes and try again.",
  fixFields: "Please check the highlighted fields.",
  timeout: "This is taking longer than expected. Please try again, or chat with us on WhatsApp.",
  emailFailed: "We couldn't send your request. Please try again, or chat with us on WhatsApp.",
  tryAgain: "Try again",
  privacyLead: "We use your details only to reply to you.",
  privacySee: "See our",
  privacyLinkLabel: "Privacy Policy",
  privacyHref: "/privacy",
  whatsappButton: "Chat on WhatsApp",
  notConfigured: "Sending requests is not available right now. Please try again later.",
  phoneHint: "We'll use this to reach you.",
};

const levels = ["Pre-university", "University", "Postgraduate"] as const;
const formats = ["Physical", "Virtual", "Hybrid"] as const;

export const forms: Record<FormType, FormDef> = {
  "event-rsvp": rsvpForm,
  contact: contactForm,
  volunteer: volunteerForm,
  partner: partnerForm,
  "day-space": {
    title: "Request day space",
    intro: `Tell us the day you'd like to come to ${spaceName}, and we'll confirm.`,
    submitLabel: "Send request",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
      { name: "preferredDay", label: "Preferred day", type: "date", required: true },
      { name: "message", label: "Message (optional)", type: "textarea", required: false, maxLength: 1000 },
    ],
  },
  "overnight-access": {
    title: "Request overnight access",
    intro:
      "We'll invite you to our office to meet the team and complete a short verification. Bring valid ID to that visit. We never collect ID documents through this website.",
    submitLabel: "Send request",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
      {
        name: "preferredVisitTime",
        label: "Preferred time to visit our office",
        type: "datetime-local",
        required: true,
      },
    ],
  },
  "media-room": {
    title: "Request the media room",
    intro: "Tell us what you want to make and when.",
    submitLabel: "Send request",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
      { name: "project", label: "What do you want to make?", type: "textarea", required: true, maxLength: 1000 },
      { name: "preferredDate", label: "Preferred date", type: "date", required: true },
    ],
  },
  "course-interest": {
    title: "Register your interest",
    intro: "Course fees will be shared soon. Register your interest and you'll hear first.",
    submitLabel: "Register interest",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
      { name: "course", label: "Course", type: "select", required: true, options: courses.map((c) => c.name) },
      { name: "format", label: "Format", type: "radio", required: true, options: formats },
    ],
  },
  guidance: {
    title: "Send a guidance enquiry",
    intro: "We guide and support. Decisions and outcomes remain yours.",
    submitLabel: "Send enquiry",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
      { name: "level", label: "Your level", type: "select", required: true, options: levels },
      { name: "topic", label: "Topic", type: "text", required: true, maxLength: 150 },
      { name: "message", label: "Message", type: "textarea", required: true, maxLength: 1000 },
    ],
  },
  "digital-marketing": {
    title: "Send an enquiry",
    intro: "Tell us what you need, and our team will get back to you.",
    submitLabel: "Send enquiry",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
      { name: "businessName", label: "Business name", type: "text", required: true, maxLength: 150 },
      { name: "need", label: "What do you need?", type: "textarea", required: true, maxLength: 1000 },
    ],
  },
};

