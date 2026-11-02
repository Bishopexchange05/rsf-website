"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/settings-validation";

// Small, dependency-free charts for the Admin analytics page. Each one is an SVG with thin marks,
// hairline grid, a hover/keyboard read-out drawn inside the SVG, and an accessible name. Every chart
// on the page also has a "See the numbers" table next to it, so nothing relies on colour alone.

export type Point = { label: string; tip: string; value: number };
type Unit = "count" | "naira";

// The chart is drawn at the width it really has on screen, so its labels stay a readable size on a
// phone instead of shrinking with the whole picture.
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const fmt = (v: number, unit: Unit) => (unit === "naira" ? formatNaira(v) : Math.round(v).toLocaleString("en-NG"));

// A round axis top: 1, 2 or 5 times a power of ten, at or above the largest value.
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function Tooltip({ x, y, lines, width, height }: { x: number; y: number; lines: string[]; width: number; height: number }) {
  const w = Math.max(...lines.map((l) => l.length)) * 7.2 + 20;
  const h = lines.length * 18 + 12;
  const left = Math.min(Math.max(x - w / 2, 4), width - w - 4);
  const top = y - h - 12 < 4 ? Math.min(y + 12, height - h - 4) : y - h - 12;
  return (
    <g transform={`translate(${left} ${top})`} pointerEvents="none">
      <rect width={w} height={h} rx="8" className="fill-slate-navy dark:fill-dark-text" />
      {lines.map((l, i) => (
        <text key={i} x="10" y={22 + i * 18 - 4} className={cn("text-[12px] fill-white dark:fill-dark-bg", i === 0 ? "font-semibold" : "")}>
          {l}
        </text>
      ))}
    </g>
  );
}

// One series over time. Line plus a faint area, crosshair and read-out on hover or arrow keys.
export function LineChart({ points, unit, label }: { points: Point[]; unit: Unit; label: string }) {
  const [at, setAt] = useState<number | null>(null);
  const [box, W] = useWidth(640);
  const H = W < 480 ? 200 : 230, L = 52, R = 12, T = 14, B = 30;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const x = (i: number) => L + (points.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H - B} L${x(0).toFixed(1)} ${H - B} Z`;
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(W / 90))));

  function pick(clientX: number, rect: DOMRect) {
    const sx = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((sx - L) / (W - L - R)) * (points.length - 1));
    setAt(Math.max(0, Math.min(points.length - 1, i)));
  }

  return (
    <div ref={box}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full touch-none select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-dark-green"
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => setAt(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setAt((a) => Math.min(points.length - 1, (a ?? -1) + 1));
        if (e.key === "ArrowLeft") setAt((a) => Math.max(0, (a ?? points.length) - 1));
        if (e.key === "Escape") setAt(null);
      }}
      onBlur={() => setAt(null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-navy/10 dark:stroke-white/10" strokeWidth="1" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-navy/60 text-[11px] tabular-nums dark:fill-white/60">
            {unit === "naira" && t >= 1000_00 ? `₦${Math.round(t / 1000_00)}k` : fmt(t, unit)}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        i % every === 0 || i === points.length - 1 ? (
          <text key={p.label + i} x={x(i)} y={H - 10} textAnchor="middle" className="fill-slate-navy/60 text-[11px] dark:fill-white/60">
            {p.label}
          </text>
        ) : null,
      )}
      <path d={area} className="fill-navy/[0.07] dark:fill-dark-green/10" />
      <path d={line} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="stroke-navy dark:stroke-dark-green" />
      {at !== null && (
        <>
          <line x1={x(at)} x2={x(at)} y1={T} y2={H - B} className="stroke-slate-navy/30 dark:stroke-white/30" strokeWidth="1" />
          <circle cx={x(at)} cy={y(points[at].value)} r="5" strokeWidth="2" className="fill-navy stroke-white dark:fill-dark-green dark:stroke-dark-card" />
          <Tooltip x={x(at)} y={y(points[at].value)} lines={[points[at].tip, fmt(points[at].value, unit)]} width={W} height={H} />
        </>
      )}
    </svg>
    </div>
  );
}

// Bars for a fixed set of categories (days of the week, hours). The largest is highlighted and
// the rest are quieter, so the busiest one stands out.
export function BarChart({ bars, label }: { bars: Point[]; label: string }) {
  const [at, setAt] = useState<number | null>(null);
  const [box, W] = useWidth(640);
  const H = W < 480 ? 180 : 210, L = 8, R = 8, T = 16, B = 28;
  const max = niceMax(Math.max(...bars.map((b) => b.value), 0));
  const top = Math.max(...bars.map((b) => b.value));
  const slot = (W - L - R) / bars.length;
  const bw = Math.min(44, slot - 6);
  return (
    <div ref={box}>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label={label} onPointerLeave={() => setAt(null)}>
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="stroke-slate-navy/15 dark:stroke-white/15" strokeWidth="1" />
      {bars.map((b, i) => {
        const h = ((H - T - B) * b.value) / max;
        const cx = L + slot * i + slot / 2;
        const isTop = b.value > 0 && b.value === top;
        return (
          <g key={b.label} onPointerEnter={() => setAt(i)}>
            <rect x={cx - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" />
            {b.value > 0 && (
              <rect
                x={cx - bw / 2}
                y={H - B - h}
                width={bw}
                height={h}
                rx="4"
                className={isTop ? "fill-navy dark:fill-dark-green" : "fill-navy/30 dark:fill-dark-green/35"}
              />
            )}
            {(slot >= 34 || i % 2 === 0) && <text x={cx} y={H - 9} textAnchor="middle" className={cn("text-[11px] fill-slate-navy/70 dark:fill-white/70", isTop && "font-semibold fill-slate-navy dark:fill-dark-text")}>
              {b.label}
            </text>}
          </g>
        );
      })}
      {at !== null && (
        <Tooltip x={L + slot * at + slot / 2} y={H - B - ((H - T - B) * bars[at].value) / max} lines={[bars[at].tip, `${bars[at].value.toLocaleString("en-NG")}`]} width={W} height={H} />
      )}
    </svg>
    </div>
  );
}

// Part of a whole, at most four parts. Each part has a fixed colour (light and dark mode tokens,
// checked for colour-blind separation), a 2px gap, and a legend with the number and share.
const RING = [
  "stroke-navy dark:stroke-accent-blue",
  "stroke-brand-green dark:stroke-dark-green",
  "stroke-purple dark:stroke-purple",
  "stroke-accent-blue dark:stroke-dark-link",
];
const SWATCH = ["bg-navy dark:bg-accent-blue", "bg-brand-green dark:bg-dark-green", "bg-purple dark:bg-purple", "bg-accent-blue dark:bg-dark-link"];

export function RingChart({ parts, label, totalLabel }: { parts: { label: string; value: number }[]; label: string; totalLabel: string }) {
  const [at, setAt] = useState<number | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const r = 70, c = 2 * Math.PI * r, gap = total > 0 && parts.filter((p) => p.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  const shown = at !== null ? parts[at] : null;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center lg:flex-col">
      <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0" role="img" aria-label={label}>
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="18" className="stroke-slate-navy/10 dark:stroke-white/10" />
        {parts.map((p, i) => {
          if (!p.value) return null;
          const len = (p.value / total) * c;
          const el = (
            <circle
              key={p.label}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              strokeWidth={at === i ? 22 : 18}
              strokeDasharray={`${Math.max(len - gap, 0.1)} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
              className={cn(RING[i], "transition-[stroke-width]")}
              onPointerEnter={() => setAt(i)}
              onPointerLeave={() => setAt(null)}
            />
          );
          offset += len;
          return el;
        })}
        <g>
          <text x="90" y="86" textAnchor="middle" className="fill-slate-navy font-heading text-[26px] tabular-nums dark:fill-dark-text">
            {(shown ? shown.value : total).toLocaleString("en-NG")}
          </text>
          <text x="90" y="106" textAnchor="middle" className="fill-slate-navy/70 text-[11px] dark:fill-white/70">
            {shown ? shown.label : totalLabel}
          </text>
        </g>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-3" onPointerEnter={() => setAt(i)} onPointerLeave={() => setAt(null)}>
            <span aria-hidden="true" className={cn("h-3 w-3 shrink-0 rounded-sm", SWATCH[i])} />
            <span className="flex-1">{p.label}</span>
            <span className="font-semibold tabular-nums">{p.value.toLocaleString("en-NG")}</span>
            <span className="w-12 text-right tabular-nums opacity-70">{total ? Math.round((p.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
