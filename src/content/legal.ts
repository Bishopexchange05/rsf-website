import {
  addressShort,
  CONTACT_EMAIL,
  LAST_UPDATED,
  orgName,
  SAFEGUARDING_CONTACT_LABEL,
  site,
  spaceName,
} from "./site";
import {
  ACCOUNTS_ON,
  dataProtectionExtra,
  draftNotice,
  privacyAccounts,
  privacyLoginCookie,
  privacyNoSensitive,
  safeguardingYoung,
  termsBooking,
  termsDisputes,
  termsRequestsAndFees,
} from "./legal-defaults";

// Legal page text, from docs/RSF-Legal-Pages-Draft.md. The wording is the
// owner's draft: change it there first, not here. Inline markup in strings:
// **bold** and [label](/path). Placeholders are filled from ./site.

export type LegalBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type LegalPageData = {
  slug: string;
  title: string;
  description: string;
  heroText: string;
  lastUpdated: string;
  blocks: LegalBlock[];
};

export const legalCommon = {
  label: "Legal",
  lastUpdatedPrefix: "Last updated:",
};

const h2 = (text: string): LegalBlock => ({ type: "h2", text });
const p = (text: string): LegalBlock => ({ type: "p", text });
const ul = (...items: string[]): LegalBlock => ({ type: "ul", items });
const ol = (...items: string[]): LegalBlock => ({ type: "ol", items });

const PHONE = site.phone;
const emailLink = `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`;
const contactPage = "[Contact page](/contact)";
const hasEmail = CONTACT_EMAIL.length > 0;

// Capitalised, for the start of a sentence.
const SAFEGUARDING_CONTACT_SENTENCE =
  SAFEGUARDING_CONTACT_LABEL.charAt(0).toUpperCase() + SAFEGUARDING_CONTACT_LABEL.slice(1);

// ---- Privacy Policy --------------------------------------------------------

export const privacy: LegalPageData = {
  slug: "privacy",
  title: "Privacy Policy",
  description: `How ${orgName} collects, uses and protects personal information through this website, and your rights.`,
  heroText: "What we collect through this website, why, and what your rights are.",
  lastUpdated: LAST_UPDATED,
  blocks: [
    ...(ACCOUNTS_ON ? [draftNotice] : []),
    p(
      `${orgName} ("we", "us") is a charity that supports young people through education, career guidance and practical skills. This policy explains what personal information we collect through this website, why, and what your rights are. We follow the Nigeria Data Protection Act 2023.`,
    ),
    h2("Who we are"),
    p(
      hasEmail
        ? `${orgName}, ${addressShort}. Questions about your information: ${emailLink} or ${PHONE}.`
        : `${orgName}, ${addressShort}. Questions about your information: ${PHONE}, or through our ${contactPage}.`,
    ),
    h2("What we collect"),
    p("We only collect what you choose to send us through our forms:"),
    ul(
      "**Request and enquiry forms** (workspace, media room, course interest, guidance, digital marketing, general contact): your name, phone number, and the details of your request, such as a preferred date, a course, your level of study, a topic or a message.",
      "**Event registration**: your name, phone number, whether you are a student, parent, young professional or other, and the number of guests.",
      "**Overnight workspace requests**: your name, phone number and preferred time to visit our office. We do not collect identification documents through this website. Identity checks, where needed, happen in person at our office.",
    ),
    p(
      ACCOUNTS_ON
        ? privacyNoSensitive
        : "We do not ask for passwords, payment card details or sensitive information through this website. Please do not send any in your messages.",
    ),
    h2("Why we use it, and our legal basis"),
    ul(
      "To reply to your request and arrange what you asked for. Basis: your consent and taking steps at your request.",
      "To organise events and tell registered guests about them. Basis: your consent.",
      "To keep our services safe and prevent spam. Basis: our legitimate interest in running a secure website.",
      "To meet legal duties.",
    ),
    p("We do not sell your information. We do not use it for advertising."),
    h2("Young people under 18"),
    p(
      "Many of the people we support are young. If you are under 18, please make sure a parent or guardian knows you are contacting us. Each form asks you to confirm this. We keep information about young people to the minimum needed to respond, and we do not publish their personal details. See our [Safeguarding Policy](/safeguarding).",
    ),
    h2("Who receives your information"),
    p("We use trusted services to run this website and handle your requests:"),
    ul(
      "Hosting and delivery of the website (Vercel).",
      "Sending your request to our team by email (Resend), received in a Google Gmail inbox that our authorised team members can access.",
    ),
    p(
      "These providers process information for us and may store it outside Nigeria. We only use them to operate the website and receive requests, and we expect them to protect your information. We will share information with authorities only where the law requires it or to protect someone from harm.",
    ),
    h2("How long we keep it"),
    p(
      "We keep a request for up to 12 months after we have dealt with it, then delete it, unless the law or a safeguarding concern requires us to keep it longer.",
    ),
    ...(ACCOUNTS_ON ? privacyAccounts : []),
    h2("Cookies and similar technologies"),
    p("This website uses only what it needs to work:"),
    ul(
      "A small stored setting that remembers your light or dark display choice.",
      ...(ACCOUNTS_ON ? [privacyLoginCookie] : []),
    ),
    p(
      "We do not use advertising or tracking cookies. If we add website analytics in future, we will update this policy and ask for your consent where the law requires it.",
    ),
    h2("Your rights"),
    p(
      `You can ask us to: tell you what information we hold about you; correct it; delete it; stop using it; or give it back to you. You can also withdraw your consent at any time. ${
        hasEmail
          ? `Contact us at ${emailLink}.`
          : `Contact us through our ${contactPage} or on ${PHONE}.`
      } If you are unhappy with how we handle your information, you have the right to complain to the Nigeria Data Protection Commission.`,
    ),
    h2("Security"),
    p(
      "We limit who can see requests, use secure connections, and protect forms against spam and abuse. No online service is completely risk-free, so please share only what is needed.",
    ),
    h2("Changes"),
    p("We will update this page when our practices change and show the date at the top."),
  ],
};

// ---- Terms of Service ------------------------------------------------------

export const terms: LegalPageData = {
  slug: "terms",
  title: "Terms of Service",
  description: `The terms for using the ${orgName} website: what you can expect from us and what we ask of you.`,
  heroText: "The terms for using this website.",
  lastUpdated: LAST_UPDATED,
  blocks: [
    ...(ACCOUNTS_ON ? [draftNotice] : []),
    p("By using this website you agree to these terms. If you do not agree, please do not use it."),
    h2("About us"),
    p(
      `This website is run by ${orgName}, a charity based at ${addressShort}. ${spaceName} is one of our programmes.`,
    ),
    h2("Using this website"),
    p(
      "You may use this website for lawful, personal and non-commercial purposes. Please do not try to disrupt it, send false or harmful content through its forms, or use automated tools to submit forms.",
    ),
    ...(ACCOUNTS_ON
      ? termsRequestsAndFees
      : [
          h2("Requests are not bookings"),
          p(
            "Sending a request form is not a confirmed booking, registration or place on a course. We will contact you to confirm. Workspace, media room and overnight access depend on availability. Overnight access is approved in person at our office.",
          ),
        ]),
    h2("Guidance and support"),
    p(
      "Our career, school and course guidance, scholarship information, study-abroad information and visa guidance are given to help you make your own decisions. We do not guarantee any admission, scholarship, visa, job or other outcome. You are responsible for your own decisions and applications.",
    ),
    ...(ACCOUNTS_ON
      ? []
      : [
          h2("Fees"),
          p("This website does not take payments. If a service has a fee, we will tell you the fee before you commit to it."),
        ]),
    h2("Events"),
    p(
      "Attendance at our events is free unless we say otherwise. We may take photographs and video at events for our work and our social media. If you do not want to appear in them, tell a member of our team at the event. We will take extra care with young people. See our [Safeguarding Policy](/safeguarding).",
    ),
    ...(ACCOUNTS_ON ? termsBooking : []),
    h2("Our content"),
    p(
      `The text, logo, photographs and design of this website belong to ${orgName} or are used with permission. You may share links to our pages. Please do not copy or reuse our content, or our name and logo, without our written permission. Course materials, when offered, are for the enrolled learner's own use and may not be redistributed.`,
    ),
    h2("Links to other websites"),
    p(
      "This website may link to other websites. We are not responsible for their content or privacy practices.",
    ),
    h2("Limits of our responsibility"),
    p(
      "We work to keep this website accurate and available, but we do not promise it will always be error-free or uninterrupted. To the extent the law allows, we are not responsible for losses that come from using this website or relying on its information.",
    ),
    h2("Changes"),
    p(
      "We may update these terms and will show the date at the top. Continued use of the website means you accept the updated terms.",
    ),
    h2("Governing law"),
    p("These terms are governed by the laws of the Federal Republic of Nigeria."),
    ...(ACCOUNTS_ON ? termsDisputes : []),
    h2("Contact"),
    p(hasEmail ? `${emailLink} · ${PHONE}` : `${PHONE} · ${contactPage}`),
  ],
};

// ---- Safeguarding Policy ---------------------------------------------------

export const safeguarding: LegalPageData = {
  slug: "safeguarding",
  title: "Safeguarding Policy",
  description: `How ${orgName} keeps children and young people safe, and what to do if you are worried about someone.`,
  heroText: "How we keep children and young people safe.",
  lastUpdated: LAST_UPDATED,
  blocks: [
    ...(ACCOUNTS_ON ? [draftNotice] : []),
    h2("Our commitment"),
    p(
      `${orgName} works with children and young people. Everyone we work with has the right to be safe, respected and protected from harm, abuse and exploitation. Safeguarding is the responsibility of everyone who works or volunteers with us.`,
    ),
    h2("Who this applies to"),
    p(
      `This policy applies to all trustees, staff, volunteers, trainers, campus representatives, contractors and partners acting for ${orgName}, at ${spaceName}, at events and online. A "child" is anyone under 18.`,
    ),
    h2("Our principles"),
    ul(
      "The welfare of children and young people comes first.",
      "Everyone has the right to protection, whatever their background.",
      "Concerns are taken seriously and acted on quickly.",
      "We share information about concerns only with those who need to know.",
    ),
    h2("How we keep young people safe"),
    ul(
      "**Safer recruitment.** People who work or volunteer with young people are selected carefully, with references checked, and are briefed on this policy before they start.",
      "**Code of conduct.** Adults must treat young people with respect, must not harm, humiliate or exploit them, and must not form inappropriate relationships with them. Adults should avoid being alone with a young person in a closed or private space. Guidance and counselling sessions take place where others can see, or with a second adult nearby.",
      `**Our spaces.** The overnight workspace is for adults aged 18 and over only. Young people at ${spaceName} during the day are expected to follow its rules and may be asked to confirm that a parent or guardian knows they are there.`,
      "**Photographs and video.** We get permission before taking or publishing images of young people. For anyone under 18, we need a parent's or guardian's permission. We do not publish a young person's full name, school, home address or other identifying details with an image.",
      `**Online safety.** Staff and volunteers use only official ${orgName} accounts to contact young people about our programmes, and do not share young people's private details. Requests made on our website are handled only by authorised team members.`,
      "**Information.** Information about young people is kept private and only as long as needed. See our [Privacy Policy](/privacy).",
    ),
    ...(ACCOUNTS_ON ? safeguardingYoung : []),
    h2("If you are worried about someone"),
    p(
      `Tell us straight away. You can contact ${SAFEGUARDING_CONTACT_LABEL} ${
        hasEmail
          ? `at ${emailLink} or ${PHONE}`
          : `at ${PHONE}, or through our ${contactPage}`
      }. If a child is in immediate danger, contact the police or emergency services first.`,
    ),
    h2("How we respond to a concern"),
    ol(
      "Listen calmly and take it seriously. Do not promise to keep it secret.",
      "Write down what was said or seen, as soon as possible, using the person's own words.",
      `Report it to ${SAFEGUARDING_CONTACT_LABEL} the same day. Do not investigate it yourself or confront the person involved.`,
      `${SAFEGUARDING_CONTACT_SENTENCE} decides what to do, which may include protecting the young person, informing the parent or guardian where it is safe to do so, and reporting to the police or the state's child welfare authorities.`,
      "We support the young person and keep records securely.",
    ),
    p(
      `Concerns about the conduct of a member of our team, or about our safeguarding practice, can be reported to the same contact, or in writing to the leadership of ${orgName}.`,
    ),
    h2("Review"),
    p("We review this policy every year, and after any serious concern."),
  ],
};

// ---- Data Protection Statement ---------------------------------------------

export const dataProtection: LegalPageData = {
  slug: "data-protection",
  title: "Data Protection Statement",
  description: `How ${orgName} handles personal information under the Nigeria Data Protection Act 2023, and your rights.`,
  heroText: "How we handle personal information, and your rights.",
  lastUpdated: LAST_UPDATED,
  blocks: [
    ...(ACCOUNTS_ON ? [draftNotice] : []),
    p(
      `${orgName} respects your privacy and handles personal information in line with the Nigeria Data Protection Act 2023.`,
    ),
    h2("Our commitments"),
    ul(
      "We collect only the information we need, and tell you why.",
      "We use it only for the purposes we explained.",
      "We keep it accurate, secure and only for as long as needed.",
      "We do not sell it or use it for advertising.",
      "We take extra care with information about young people.",
      "We tell you your rights and make them easy to use.",
    ),
    h2("Your rights"),
    p(
      `You can ask to see, correct or delete your information, object to its use, or withdraw your consent. ${
        hasEmail
          ? `Email ${emailLink}`
          : `Contact us through our ${contactPage} or on ${PHONE}`
      } and we will respond as soon as we can.`,
    ),
    ...(ACCOUNTS_ON ? dataProtectionExtra : []),
    h2("Complaints"),
    p(
      "If you are not satisfied, contact us first. You also have the right to complain to the Nigeria Data Protection Commission (NDPC).",
    ),
    h2("More information"),
    p(
      "Read our [Privacy Policy](/privacy) for details of what we collect, who receives it and how long we keep it.",
    ),
  ],
};
