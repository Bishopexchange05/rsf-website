import { spaceName } from "./site";

export const notFound = {
  label: "Page not found",
  heading: "We couldn't find that page.",
  text: "The page may have moved, or the link may be mistyped. Here are some good places to start instead.",
  links: [
    { label: "Home", href: "/" },
    { label: "Events", href: "/events" },
    { label: spaceName, href: "/tech-and-space" },
    { label: "Contact", href: "/contact" },
  ],
};
