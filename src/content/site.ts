// The organisation's first name lives here and nowhere else.
// Change this one line to rename it everywhere on the site.
export const ORG_FIRST_NAME = "Rafael";

export const orgName = `${ORG_FIRST_NAME} Support Foundation`;
// The physical space is always written this way in visible text. Every space
// is a non-breaking space (\u00A0) so the name never splits across lines.
const NBSP = "\u00A0";
export const spaceName = `RSF${NBSP}Tech${NBSP}&${NBSP}Space`;
// Short form used in button labels, also unbreakable.
export const spaceShort = `Tech${NBSP}&${NBSP}Space`;

// The address lives here and nowhere else. Short version: footer, banner and
// Visit section. Long version: structured data and the Contact page.
const ADDRESS = {
  floor: "First floor",
  building: "Dreamlink Concepts",
  area: "Mile 50",
  city: "Abakaliki",
  state: "Ebonyi State",
  country: "Nigeria",
};
export const addressShort = `${ADDRESS.building}, ${ADDRESS.area}, ${ADDRESS.city}`;
export const addressLong = `${ADDRESS.floor}, ${ADDRESS.building}, ${ADDRESS.area}, ${ADDRESS.city}, ${ADDRESS.state}, ${ADDRESS.country}`;
// Parts for schema.org PostalAddress.
export const addressStructured = {
  streetAddress: `${ADDRESS.floor}, ${ADDRESS.building}, ${ADDRESS.area}`,
  addressLocality: ADDRESS.city,
  addressRegion: ADDRESS.state,
  addressCountry: "NG",
};

// Public contact email, set per environment. Empty means: show no email anywhere.
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();

// Date shown on the legal pages.
export const LAST_UPDATED = "13 October 2026";

// How the legal pages refer to the person who handles safeguarding concerns.
// Change this one line when a named person is appointed.
export const SAFEGUARDING_CONTACT_LABEL = "our safeguarding contact";

// Social links. A link shows in the footer only when it has a real URL.
// Leave a constant empty ("") until the real account exists: no placeholders.
export const INSTAGRAM_URL = "https://www.instagram.com/rafaelsupportfoundation.123";
export const FACEBOOK_URL = "";

export const site = {
  name: orgName,
  shortName: "RSF",
  domain: "rafaelsupportfoundation.org",
  url: "https://rafaelsupportfoundation.org",
  tagline: "Supporting young people through education, opportunity and community.",
  address: addressShort,
  addressLong,
  email: CONTACT_EMAIL,
  // The organisation's phone line (display text and tel: link).
  phone: "+234 708 196 5663",
  phoneHref: "tel:+2347081965663",
  phoneE164: "+2347081965663",
  // Set NEXT_PUBLIC_WHATSAPP_NUMBER (digits with country code, e.g. 2348012345678).
  whatsapp: `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2340000000000"}`,
  logo: "/images/logo.png",
  copyright: `© 2026 ${orgName}. All Rights Reserved.`,
  socials: [
    { id: "instagram", label: "RSF on Instagram", href: INSTAGRAM_URL },
    { id: "facebook", label: "RSF on Facebook", href: FACEBOOK_URL },
  ].filter((s) => s.href.length > 0),
};

export const nav = [
  { label: "About", href: "/about" },
  { label: spaceName, href: "/tech-and-space" },
  { label: "Events", href: "/events" },
  { label: "Get Involved", href: "/get-involved" },
  { label: "Contact", href: "/contact" },
];

export const footerColumns = [
  {
    title: `About RSF`,
    links: [
      { label: "Our Story & Mission", href: "/about" },
      { label: "Get Involved", href: "/get-involved" },
      { label: `${spaceName} Overview`, href: "/tech-and-space" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Workspace", href: "/tech-and-space#workspace" },
      { label: "Learning Hub", href: "/tech-and-space#learn" },
      { label: "Consulting", href: "/tech-and-space#consulting" },
      { label: "Digital Marketing", href: "/tech-and-space#digital-marketing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Safeguarding Policy", href: "/safeguarding" },
      { label: "Data Protection", href: "/data-protection" },
    ],
  },
];
