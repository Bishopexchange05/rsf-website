import { orgName, spaceName, spaceShort } from "./site";

export const meta = {
  title: "Helping people become who they want to be",
  description: `${orgName} supports young people through education, career guidance and practical skills, so that talent never goes to waste for lack of opportunity or direction.`,
};

// Media slots. Files live in /public/media/. Real photos and the tour video are
// in place. Still to come: the media room photo (shows a "Photo coming soon"
// panel; set `soon: false` once /media/techspace-03.jpg is a real photo) and the
// hero video (set `video` below once a real clip exists).
// Alt text is stored here, never in components.
export const media = {
  hero: {
    // Leave empty until a real hero video is ready, then set "/media/hero-video-01.mp4".
    // (The file in /public/media is still a grey placeholder; it would cover the photo.)
    video: "",
    poster: "/media/hero-poster.jpg",
    posterAlt: "", // decorative background
    videoLabel: "Background video",
    pauseLabel: "Pause background video",
    playLabel: "Play background video",
  },
  whyWeExist: {
    src: "/media/why-we-exist.jpg",
    alt: "Two young men smiling as they work side by side on laptops at a desk in a bright co-working room.",
  },
  pillars: {
    education: {
      src: "/media/pillar-education.jpg",
      alt: "Pupils in school uniforms and RSF team members stand and kneel together on a red carpet at an education event, some holding large prize cheques, in front of a projector screen.",
    },
    guidance: {
      src: "/media/pillar-guidance.jpg",
      alt: "Two young women sit facing each other across a wooden table with a laptop between them, smiling as they talk one to one.",
    },
    skills: {
      src: "/media/pillar-skills.jpg",
      alt: "A trainer points at a projector screen while a group of learners with laptops watch from wooden tables in a training room.",
    },
  },
  techSpace: {
    video: "/media/techspace-tour.mp4",
    // A frame from the video itself, so no photo repeats next to the gallery.
    poster: "/media/techspace-tour-poster.jpg",
    videoLabel: `A drone flight towards the building that houses ${spaceName}, showing its sign at the gate.`,
    playLabel: "Play video",
    pauseLabel: "Pause video",
    fullscreenLabel: "Full screen",
    comingSoon: "Photo coming soon",
    gallery: [
      { src: "/media/techspace-coworking.jpg", alt: "A meeting room with a long wooden table, black mesh office chairs and a desktop computer at the far end, in front of pink curtains and a marble-effect wall.", soon: false },
      { src: "/media/techspace-02.jpg", alt: "An empty, well-lit workspace with orange and green desk booths, wooden tables and a projector screen under a colourful ceiling.", soon: false },
      { src: "/media/techspace-03.jpg", alt: "Placeholder photo: the media room with recording equipment.", soon: true },
      { src: "/media/techspace-04.jpg", alt: "Learners sit at wooden desks in the training room, some with laptops and phones, looking towards the camera.", soon: false },
    ],
  },
  closing: {
    src: "/media/closing-banner.jpg",
    alt: "", // decorative background
  },
  og: {
    src: "/media/og-image.jpg",
    alt: `${orgName}: helping people become who they want to be.`,
  },
};

export const hero = {
  label: orgName,
  headline: "Helping people become who they want to be.",
  sub: `${orgName} supports young people through education, career guidance and practical skills, so that talent never goes to waste for lack of opportunity or direction.`,
  primaryCta: { label: `Explore ${spaceShort}`, href: "/tech-and-space" },
  secondaryCta: { label: "Support Our Mission", href: "/get-involved" },
};

export const whyWeExist = {
  heading: "Talent is everywhere. Opportunity isn't.",
  text: "Many young people have the ability to succeed but lack guidance, opportunity or financial support. We exist to find them, equip them and stand with them as they become who they were created to be.",
};

export const visionMission = [
  {
    label: "Vision",
    text: "A society where every young person has the opportunity, guidance and support to become who they were created to be.",
  },
  {
    label: "Mission",
    text: "To help young people become who they aspire to be through education, mentorship, career guidance, counselling and life-changing opportunities.",
  },
];

export const pillarsSection = {
  heading: "What we do",
  linkLabel: "Learn more →",
};

export const pillars = [
  {
    title: "Educational Support",
    text: "Help for young people to start, stay in and succeed in their education.",
    href: "/about#education",
    icon: "book",
  },
  {
    title: "Career Guidance & Counselling",
    text: "A safe space for honest guidance on choosing a course, finding direction and planning a career.",
    href: "/about#guidance",
    icon: "compass",
  },
  {
    title: "Skills",
    text: "Practical and digital skills that young people can use to earn and grow.",
    href: "/about#skills",
    icon: "laptop",
  },
] as const;

export const techAndSpace = {
  heading: "A place to work, learn and be guided.",
  text: `${spaceName} is where this work happens in person. Come to work or study in a calm environment with free WiFi, learn digital skills, create content, and get career guidance.`,
  cta: { label: `Visit ${spaceShort}`, href: "/tech-and-space" },
};

export const workingTowards = {
  heading: "What we're working towards",
  items: [
    `A network of young people trained at ${spaceName}`,
    "Hundreds of students supported",
    "A recognised career guidance programme",
    "A growing community of alumni",
  ],
};

export const closing = {
  heading: "Pay it forward.",
  text: "Every young person we help becomes part of the reason the next one can be helped. Join us.",
  cta: { label: "Get Involved", href: "/get-involved" },
};
