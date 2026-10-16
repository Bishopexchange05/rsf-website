import { addressLong, spaceName } from "./site";
import type { FormDef } from "@/lib/form-types";

export const meta = {
  title: "Contact",
  description: `Questions about RSF, the launch, scholarships, or ${spaceName.replace(/ /g, " ")}? Send us a message and we'll reply as soon as we can.`,
};

export const hero = {
  label: "Contact",
  heading: "Get in touch",
  text: `Questions about RSF, the launch, scholarships, or ${spaceName}? Send us a message and we'll reply as soon as we can.`,
};

export const details = {
  heading: "Find us",
  addressLabel: "Address",
  address: `${addressLong}.`,
  phoneLabel: "Phone",
  emailLabel: "Email",
  whatsappLabel: "WhatsApp",
  whatsappButton: "Chat on WhatsApp",
};

export const formIntro = {
  heading: "Send us a message",
};

export const contactForm: FormDef = {
  title: "Send us a message",
  intro: "Tell us how we can help.",
  submitLabel: "Send message",
  successTitle: "Thank you, we have your message.",
  successText: "We'll reply as soon as we can.",
  emailSubject: "Website contact message",
  consentLabel: "I'm 18 or older, or a parent or guardian knows I'm contacting RSF.",
  consentEmailLine: "Confirmed 18 or older, or a parent or guardian knows: yes",
  fields: [
    { name: "name", label: "Full name", type: "text", required: true, maxLength: 100 },
    { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "0803 123 4567" },
    { name: "message", label: "Message", type: "textarea", required: true, maxLength: 1000 },
  ],
};
