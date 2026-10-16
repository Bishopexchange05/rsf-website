import type { FormDef } from "@/lib/form-types";

export const meta = {
  title: "Get Involved",
  description:
    "Help young people become who they want to be. Volunteer your time, partner with us, or help us reach students.",
};

export const hero = {
  label: "Join us",
  heading: "Get involved",
  text: "Help young people become who they want to be. Volunteer your time, partner with us, or help us reach students.",
};

export const media = {
  hero: { src: "/media/hero-poster.jpg", alt: "" }, // decorative background
};

export const cards = [
  {
    icon: "heart",
    title: "Volunteer",
    text: "Give your skills and time to RSF events, mentoring, content and young people's programmes. Tell us what you're good at and we'll find a place for you.",
    cta: "Volunteer with us",
    form: "volunteer",
    defaults: {},
  },
  {
    icon: "link",
    title: "Partner with us",
    text: "Schools, businesses, media, churches and community groups can work with us to open doors for young people. Tell us about your organisation and how you'd like to help.",
    cta: "Partner with us",
    form: "partner",
    defaults: {},
  },
  {
    icon: "book",
    title: "Be a Campus Contact",
    text: "Do you know students in a school or university? As a Campus Contact you help us find talented, under-supported students and tell them about RSF opportunities. You recommend candidates. You don't choose them.",
    cta: "Become a Campus Contact",
    form: "volunteer",
    defaults: { interest: "Campus Contact" },
  },
] as const;

export const notSure = {
  text: "Not sure where you fit? Message us on WhatsApp or use our Contact page.",
  whatsapp: "Chat on WhatsApp",
  contact: { label: "Contact page", href: "/contact" },
};

// ---- Forms -----------------------------------------------------------------

export const volunteerForm: FormDef = {
  title: "Volunteer with us",
  intro: "Tell us what you're good at and we'll find a place for you.",
  submitLabel: "Send",
  successTitle: "Thank you for offering to help.",
  successText: "We'll be in touch soon.",
  emailSubject: "New volunteer request",
  consentLabel: "I'm 18 or older.",
  consentEmailLine: "Confirmed 18 or older: yes",
  fields: [
    { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
    { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
    {
      name: "interest",
      label: "Area of interest",
      type: "select",
      required: true,
      options: [
        "Events and logistics",
        "Photography and video",
        "Social media and content",
        "Mentoring and guidance",
        "Teaching tech skills",
        "Campus Contact",
        "Other",
      ],
    },
    {
      name: "organisation",
      label: "School or organisation (optional)",
      type: "text",
      required: false,
      maxLength: 150,
    },
    { name: "message", label: "Message (optional)", type: "textarea", required: false, maxLength: 800 },
  ],
};

export const partnerForm: FormDef = {
  title: "Partner with us",
  intro: "Tell us about your organisation and how you'd like to help.",
  submitLabel: "Send",
  successTitle: "Thank you for reaching out.",
  successText: "We'll be in touch soon.",
  emailSubject: "New partnership request",
  // No tick box on this form: it is filled in by an organisation's contact person.
  requireConsent: false,
  fields: [
    { name: "organisation", label: "Organisation name", type: "text", required: true, maxLength: 150 },
    { name: "contactPerson", label: "Contact person", type: "text", required: true, maxLength: 100 },
    { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
    {
      name: "partnershipType",
      label: "Type of partnership",
      type: "select",
      required: true,
      options: [
        "Sponsor or donor",
        "School or institution",
        "Media partner",
        "Business or professional services",
        "Other",
      ],
    },
    { name: "message", label: "Message (optional)", type: "textarea", required: false, maxLength: 1000 },
  ],
};
