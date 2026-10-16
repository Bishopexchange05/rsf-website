import { addressShort, orgName, spaceName } from "./site";
import type { FormDef } from "@/lib/form-types";

// ---- The event -------------------------------------------------------------

// 10:00 AM on Friday 16 October 2026 in Lagos (WAT, UTC+1, no daylight saving).
export const EVENT_START_ISO = "2026-10-16T10:00:00+01:00";
// The announcement bar is shown until the end of 16 October 2026 (Africa/Lagos).
export const EVENT_BAR_END_ISO = "2026-10-17T00:00:00+01:00";
export const EVENT_TIME_ZONE = "Africa/Lagos";

export const event = {
  title: `Grand Opening of ${spaceName}`,
  // Plain-text version for calendar files and structured data.
  titlePlain: "Grand Opening of RSF Tech & Space",
  date: "Friday 16 October 2026, 10:00 AM (prompt)",
  place: `${addressShort} (first floor)`,
  freeLine: "Attendance is free.",
  description: `Join ${orgName} for the opening of RSF Tech & Space, a place for young people to work, learn and be guided. Attendance is free and everyone is welcome.`,
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=Dreamlink+Concepts+Mile+50+Abakaliki",
};

export const meta = {
  title: "Events",
  description: `Join us as we open ${spaceName.replace(/ /g, " ")}, a place for young people to work, learn and be guided.`,
};

export const media = {
  hero: { src: "/media/hero-poster.jpg", alt: "" }, // decorative background
};

export const hero = {
  label: "Events",
  heading: "Our Grand Opening",
  text: `Join us as we open ${spaceName}, a place for young people to work, learn and be guided.`,
};

// "Moments from RSF" photo gallery. Images are 800x600 (4:3), so there is no layout shift.
export const moments = {
  heading: "Moments from RSF",
  width: 800,
  height: 600,
  items: [
    { src: "/media/moments-01.jpg", alt: "Students in red and green tartan uniforms sit in a row at an RSF event, one of them writing notes on a sheet of paper." },
    { src: "/media/moments-02.jpg", alt: "A large group of pupils in school uniforms and RSF team members pose together on a red carpet, some holding oversized prize cheques, in front of a projector screen." },
    { src: "/media/moments-03.jpg", alt: "Three pupils in blue school uniforms sit close together at an event, two of them leaning in to talk quietly." },
    { src: "/media/moments-04.jpg", alt: `A bright training room at ${spaceName} with orange desk booths, long wooden tables, a projector screen and a banner listing its services.` },
    { src: "/media/moments-05.jpg", alt: "A meeting room with a long wooden table, black office chairs, a desktop computer at the far end and pink curtains beside a marble-effect wall." },
    { src: "/media/moments-07.jpg", alt: "A trainer in a maroon T-shirt and black cap speaks to a class in front of a projector screen, beside a banner of words like innovate, create and evolve." },
    { src: "/media/moments-06.jpg", alt: "The same meeting room from the end of the table, with rows of black chairs leading to a desktop computer and pink curtains." },
  ],
};

export const card = {
  register: "Register to attend",
  calendar: "Add to calendar",
  directions: "Get directions",
  calendarHref: "/events/grand-opening.ics",
  dateLabel: "When",
  placeLabel: "Where",
};

export const countdown = {
  heading: "Counting down to the opening",
  units: { days: "Days", hours: "Hours", minutes: "Minutes" },
  after: {
    title: "Thank you for joining us.",
    text: "Photos and highlights are coming soon.",
  },
};

export const whatToExpect = {
  heading: "What to expect",
  items: [
    `An introduction to ${orgName} and its vision for young people.`,
    "The digital skills we teach, from Python and design to AI.",
    "Our education and career guidance services, including scholarships and study abroad.",
    "A first look at the workspace: free WiFi, steady power and a calm place to focus.",
  ],
  note: "The full programme will be shared soon.",
};

export const whoShouldCome = {
  heading: "Who should come",
  text: "Attendance is free and everyone is welcome. Students, parents, graduates, freelancers, creators and anyone who wants to learn something new.",
};

export const closing = {
  heading: "Pay it forward.",
  cta: { label: "Get Involved", href: "/get-involved" },
};

// ---- Announcement bar ------------------------------------------------------

export const announcement = {
  lead: "Grand Opening: 16 October 2026, 10:00 AM. Free to attend.",
  shortLead: "Grand Opening: 16 Oct, 10:00 AM. Free.",
  cta: "Register",
  href: "/events",
  dismiss: "Dismiss announcement",
};

// ---- Registration form -----------------------------------------------------

export const rsvpForm: FormDef = {
  title: "Register to attend",
  intro: `Attendance is free. Tell us who is coming to the Grand Opening of ${spaceName}.`,
  submitLabel: "Register",
  successTitle: "You're registered.",
  successText: "We'll send details to your phone before the day.",
  emailSubject: "Grand Opening registration",
  fields: [
    { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
    { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
    {
      name: "role",
      label: "I am a…",
      type: "select",
      required: true,
      options: [
        "Student",
        "Parent or guardian",
        "Young professional",
        "Representing an organisation",
        "Other",
      ],
    },
    {
      name: "guests",
      label: "Number of guests, including you (optional)",
      type: "select",
      required: false,
      options: ["1", "2", "3", "4", "5"],
    },
  ],
};
