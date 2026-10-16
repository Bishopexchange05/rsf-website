"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          website: data.get("website"),
        }),
      });
      if (!res.ok) throw new Error("failed");
      form.reset();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="min-h-12 min-w-0 flex-1 rounded-full bg-white px-5 py-3 text-slate-navy placeholder:text-slate-navy/50"
      />
      {/* Honeypot: hidden from people, bots tend to fill it in. */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 rounded-full bg-amber px-7 py-3 font-heading text-base text-slate-navy transition hover:brightness-95 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Subscribe"}
      </button>
      <p role="status" className="text-sm sm:basis-full">
        {status === "done" && "Thank you! We'll be in touch."}
        {status === "error" && "Sorry, that didn't go through. Please try again later."}
      </p>
    </form>
  );
}
