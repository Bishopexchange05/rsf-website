"use client";

import { useState } from "react";
import type { FormType } from "@/lib/form-types";
import { RequestForm } from "./RequestForm";

// A request form shown directly on a page (not in a modal). After a successful
// send, "Close" gives the visitor a fresh, empty form.
export function InlineForm({ type }: { type: FormType }) {
  const [round, setRound] = useState(0);
  return <RequestForm key={round} type={type} lazyCheck onClose={() => setRound((n) => n + 1)} />;
}
