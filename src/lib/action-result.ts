// What a form action tells the page, without leaving the page: a short code for a
// "saved" notice, or for an error. The form turns the code into wording from the
// content files. (No redirect to the same page: that made the page go blank for a moment.)
export type ActionResult = { notice?: string; error?: string };
