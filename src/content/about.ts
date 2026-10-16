import { orgName, spaceName, spaceShort } from "./site";

// Vision/Mission cards, the four goals and the closing section are shared with
// the Home page: see `visionMission`, `workingTowards` and `closing` in home.ts.

const heroText = `${orgName} is a charity that supports young people through education, career guidance and practical skills.`;

export const meta = {
  title: "About",
  description: `${heroText} Learn why we started and what we look for in the young people we support.`,
};

// Placeholder images live in /public/media/. Replace with real photos using the
// same names, then update the alt text here.
export const media = {
  hero: { src: "/media/about-hero.jpg", alt: "" }, // decorative background
  story: {
    src: "/media/about-story.jpg",
    alt: "Two students in red tartan school uniforms smile as they listen to a talk at an event.",
  },
};

export const hero = {
  label: "About us",
  heading: "Young people are the reason we exist.",
  text: heroText,
};

export const story = {
  heading: "Why we started",
  paragraphs: [
    `${orgName} began with a simple belief: talent is everywhere, but opportunity is not. Many young people have the ability to succeed but lack guidance, opportunity or financial support.`,
    `Through scholarships and competitions, we have backed students in their education. Now, with ${spaceName} in Abakaliki, we are building a permanent place where young people can learn, work and get honest guidance.`,
  ],
};

export const theme = {
  line: "Helping people become who they want to be.",
  payForward: "Pay it forward.",
  sub: "Every young person we help becomes part of the reason the next one can be helped.",
};

export const whatWeDo = {
  heading: "What we do",
  blocks: [
    {
      id: "education",
      title: "Educational Support",
      text: "We back young people who have ability and vision but need support to start, stay in and succeed in their education. We help them find and apply for scholarships, including opportunities abroad, and guide them through the process.",
    },
    {
      id: "guidance",
      title: "Career Guidance & Counselling",
      text: "Many young people are unsure about their course or career path. We offer a safe space for honest conversation about choosing a course, understanding the options and planning a career, so that decisions are made with clarity and not pressure.",
    },
    {
      id: "skills",
      title: "Skills",
      text: `At ${spaceName} we teach digital skills such as Python, graphic design, video editing, UI/UX design, data analysis, virtual assistance and AI, including how to use it and build with it.`,
    },
  ],
};

export const whatWeLookFor = {
  heading: "What we look for",
  text: "We look for vision and direction. Grades matter, but we want to know who a young person hopes to become and how they plan to get there.",
};

export const techSpace = {
  heading: spaceName,
  text: `${spaceName} is where our work happens in person: a calm place to work or study with free WiFi, learn digital skills, create content and get career guidance. It is also a meeting point for the young people we support.`,
  cta: { label: `Visit ${spaceShort}`, href: "/tech-and-space" },
};
