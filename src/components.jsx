/* ============================================================
   BALI BEST MOTORCYCLE — shared components + helpers
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---------- helpers ---------- */
function idrK(n) { return "Rp " + n + "k"; }
function usdApprox(kIDR) { return "$" + Math.round((kIDR * 1000) / 16000); }
function daysBetween(a, b) {
  if (!a || !b) return 0;
  const d = (new Date(b) - new Date(a)) / 86400000;
  return d > 0 ? Math.round(d) : 0;
}
function fmtDate(s, lang) {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short" });
}
function todayISO(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/* ---------- icons (simple, line-based) ---------- */
const Ic = {
  base: (p, path) => (
    <svg width={p.s || 22} height={p.s || 22} viewBox="0 0 24 24" fill="none"
      stroke={p.c || "currentColor"} strokeWidth={p.w || 1.9} strokeLinecap="round" strokeLinejoin="round"
      style={p.style}>{path}</svg>
  ),
  arrow: (p={}) => Ic.base(p, <><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></>),
  arrowL: (p={}) => Ic.base(p, <><path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/></>),
  cal: (p={}) => Ic.base(p, <><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></>),
  pin: (p={}) => Ic.base(p, <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></>),
  check: (p={}) => Ic.base(p, <path d="M4 12.5l5 5 11-11"/>),
  star: (p={}) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill={p.c || "currentColor"} style={p.style}>
      <path d="M12 2.5l2.9 6 6.6.7-4.9 4.5 1.4 6.5L12 17.8 6 20.2l1.4-6.5L2.5 9.2l6.6-.7z"/></svg>
  ),
  shield: (p={}) => Ic.base(p, <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></>),
  helmet: (p={}) => Ic.base(p, <><path d="M3.5 13a8.5 8.5 0 0 1 17 0v1.5a2 2 0 0 1-2 2H10l-4.5 2 .8-3.2A8.4 8.4 0 0 1 3.5 13z"/><path d="M9.5 13.5h11"/></>),
  box: (p={}) => Ic.base(p, <><path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></>),
  phone: (p={}) => Ic.base(p, <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></>),
  user: (p={}) => Ic.base(p, <><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></>),
  bolt: (p={}) => Ic.base(p, <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13z"/>),
  road: (p={}) => Ic.base(p, <><path d="M5 21L8 3M19 21L16 3M12 5v2M12 11v2M12 17v2"/></>),
  globe: (p={}) => Ic.base(p, <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>),
  speedo: (p={}) => Ic.base(p, <><path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-4.5"/><circle cx="12" cy="16" r="1.3" fill="currentColor"/></>),
  gear: (p={}) => Ic.base(p, <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>),
  weight: (p={}) => Ic.base(p, <><path d="M7 8h10l2 12H5z"/><circle cx="12" cy="5" r="2.5"/></>),
  lock: (p={}) => Ic.base(p, <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></>),
  drop: (p={}) => Ic.base(p, <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>),
  sun: (p={}) => Ic.base(p, <><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></>),
};

/* ---------- Logo ---------- */
function Logo({ dark, s = 1 }) {
  const col = dark ? "var(--sand)" : "var(--ink)";
  return (
    <a href="#top" style={{ display: "flex", alignItems: "center", gap: 11 * s, lineHeight: 1 }}>
      <span style={{
        width: 40 * s, height: 40 * s, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 38%, var(--sun), var(--coral) 78%)",
        display: "grid", placeItems: "center", flexShrink: 0,
        boxShadow: "0 4px 14px oklch(0.62 0.16 33 / 0.35)",
      }}>
        <span style={{
          width: 18 * s, height: 18 * s, borderRadius: "50%",
          border: "2.5px solid var(--shell)",
        }} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", color: col }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 * s, letterSpacing: "-0.02em", lineHeight: 0.95 }}>
          Bali&nbsp;Best
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5 * s, letterSpacing: "0.22em", opacity: 0.7, textTransform: "uppercase", marginTop: 2 }}>
          Motorcycle&nbsp;Co.
        </span>
      </span>
    </a>
  );
}

/* ---------- Sun / rays motif ---------- */
function SunBurst({ size = 360, style }) {
  const rays = Array.from({ length: 40 });
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={style} aria-hidden="true">
      <g style={{ transformOrigin: "100px 100px", animation: "spin-slow 90s linear infinite" }}>
        {rays.map((_, i) => (
          <rect key={i} x="99.2" y="2" width="1.6" height="42"
            fill="var(--sun)" opacity={i % 2 ? 0.35 : 0.6}
            transform={`rotate(${i * 9} 100 100)`} />
        ))}
      </g>
    </svg>
  );
}

/* ---------- Wave divider ---------- */
function Waves({ flip, color = "var(--sand)", style }) {
  return (
    <svg viewBox="0 0 1440 90" preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: 70, transform: flip ? "scaleY(-1)" : "none", ...style }}>
      <path d="M0 50 C 180 90 360 10 540 40 C 720 70 900 20 1080 45 C 1260 70 1380 35 1440 45 L1440 90 L0 90 Z" fill={color}/>
    </svg>
  );
}

/* ---------- Bike visual placeholder ---------- */
const CAT_GRAD = {
  scooter:   ["var(--ocean-bright)", "var(--ocean)"],
  trail:     ["var(--sun)", "var(--sunset)"],
  adventure: ["var(--sunset)", "var(--coral)"],
  sport:     ["var(--ocean)", "var(--ocean-deep)"],
};
function BikeArt({ bike, h = 200, showLabel = true }) {
  const [c1, c2] = CAT_GRAD[bike.cat] || CAT_GRAD.adventure;
  return (
    <div style={{
      position: "relative", height: h, width: "100%", overflow: "hidden",
      background: `linear-gradient(150deg, color-mix(in oklch, ${c1} 60%, var(--sand)), color-mix(in oklch, ${c2} 55%, var(--sand)))`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* stripes */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.18,
        backgroundImage: "repeating-linear-gradient(125deg, var(--ink) 0 1.5px, transparent 1.5px 14px)",
      }} />
      {/* ghost model number */}
      <span style={{
        position: "absolute", fontFamily: "var(--font-display)", fontWeight: 800,
        fontSize: h * 0.62, color: "var(--shell)", opacity: 0.32, lineHeight: 0.8,
        letterSpacing: "-0.04em", whiteSpace: "nowrap",
      }}>{bike.cc}</span>
      {/* two-wheel mark */}
      <svg width={h * 0.9} height={h * 0.42} viewBox="0 0 120 56" style={{ position: "relative", opacity: 0.92 }}>
        <circle cx="24" cy="40" r="13" fill="none" stroke="var(--shell)" strokeWidth="3.2"/>
        <circle cx="96" cy="40" r="13" fill="none" stroke="var(--shell)" strokeWidth="3.2"/>
        <path d="M24 40 L46 22 L78 22 M55 22 L70 40 H96 M46 22 L40 40" fill="none" stroke="var(--shell)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M78 22 q8 -4 13 2" fill="none" stroke="var(--shell)" strokeWidth="3.2" strokeLinecap="round"/>
      </svg>
      {showLabel && (
        <span style={{
          position: "absolute", bottom: 10, left: 10,
          fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--ink)",
          background: "color-mix(in oklch, var(--sand) 78%, transparent)",
          padding: "4px 8px", borderRadius: 6, backdropFilter: "blur(3px)",
        }}>photo · {bike.model}</span>
      )}
    </div>
  );
}

/* ---------- Star rating row ---------- */
function Stars({ n = 5, s = 14 }) {
  return <span style={{ display: "inline-flex", gap: 1.5, color: "var(--sunset)" }}>
    {Array.from({ length: n }).map((_, i) => <Ic.star key={i} s={s} />)}
  </span>;
}

/* ---------- export ---------- */
Object.assign(window, {
  idrK, usdApprox, daysBetween, fmtDate, todayISO,
  Ic, Logo, SunBurst, Waves, BikeArt, Stars,
});
