/* ============================================================
   BALI BEST MOTORCYCLE — booking flow shell, Stripe, confirmation
   ============================================================ */

const STRIPE_BASE = "https://buy.stripe.com/7sY3cu8nHfOc1lEeJD0ZW03";

/* ---------- Stripe redirect screen ---------- */
function StripePay({ t, lang, total, onDone }) {
  useEffect(() => { const id = setTimeout(onDone, 2200); return () => clearTimeout(id); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0A2540", display: "grid", placeItems: "center", color: "white" }} className="grain">
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 50% 0%, #635BFF55, transparent 60%)" }} />
      <div style={{ position: "relative", textAlign: "center", maxWidth: 420, padding: 24 }}>
        <div style={{ width: 64, height: 64, margin: "0 auto 26px", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #ffffff22", borderTopColor: "#635BFF", animation: "spin-slow 0.9s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#635BFF" }}>S</div>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24 }}>{t.processing}</div>
        <p style={{ marginTop: 12, color: "#ffffffaa", fontSize: 15 }}>
          {lang === "es" ? "Te llevamos al pago seguro para confirmar tu depósito de" : "Taking you to secure checkout to confirm your deposit of"} <strong style={{ color: "white" }}>{idrK(total)}</strong>.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 26, color: "#ffffff88", fontSize: 12.5 }}>
          <Ic.lock s={14} c="#ffffff88" /> <span className="mono">{t.bkSecure}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Confirmation ---------- */
function Confirmation({ booking, t, lang, onNew, onHome }) {
  const c = calc(booking);
  const ref = useRef("BBM-" + Math.random().toString(36).slice(2, 7).toUpperCase());
  const pick = BBM.LOCATIONS.find((l) => l.id === booking.pickLoc);
  return (
    <main style={{ minHeight: "100vh", background: "var(--night)", color: "var(--sand)", position: "relative", overflow: "hidden", display: "grid", placeItems: "center", padding: "100px 24px 60px" }} className="grain">
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 50% -10%, color-mix(in oklch, var(--sunset) 55%, transparent), transparent 55%), linear-gradient(180deg, var(--night), var(--ocean-deep))" }} />
      <SunBurst size={520} style={{ position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)", opacity: 0.4 }} />
      {/* confetti dots */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} style={{ position: "absolute", width: 9, height: 9, borderRadius: i % 3 ? "50%" : 2,
          background: [ "var(--sun)", "var(--coral)", "var(--ocean-bright)" ][i % 3],
          left: `${(i * 67) % 100}%`, top: `${(i * 37) % 80 + 5}%`,
          animation: `floaty ${3 + (i % 4)}s ease-in-out ${i * 0.2}s infinite`, opacity: 0.8 }} />
      ))}
      <div className="rise" style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 560, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, margin: "0 auto 24px", borderRadius: "50%", background: "var(--ocean)", display: "grid", placeItems: "center", boxShadow: "0 12px 40px oklch(0.66 0.118 205 / 0.5)", animation: "pop .6s both" }}>
          <Ic.check s={42} c="white" w={2.6} />
        </div>
        <h1 style={{ fontSize: "clamp(34px, 6vw, 52px)", color: "var(--sand)" }}>{t.confTitle}</h1>
        <p style={{ marginTop: 16, fontSize: 17, color: "color-mix(in oklch, var(--sand) 82%, transparent)" }}>{t.confSub}</p>

        <div className="card" style={{ marginTop: 30, padding: 24, textAlign: "left", color: "var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 18, borderBottom: "1px solid var(--sand-3)" }}>
            <div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{t.confRef}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 20, color: "var(--coral)" }}>{ref.current}</div>
            </div>
            <div style={{ width: 56, borderRadius: 10, overflow: "hidden" }}><BikeArt bike={c.bike} h={44} showLabel={false} /></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16, fontSize: 14.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-soft)" }}>{c.bike.brand} {c.bike.model}</span><span style={{ fontWeight: 700 }}>{c.qty} ×</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-soft)" }}>{fmtDate(booking.from, lang)} → {fmtDate(booking.to, lang)}</span><span style={{ fontWeight: 700 }}>{c.days} {c.days === 1 ? t.day : t.days}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-soft)" }}>{pick[lang]}</span><span style={{ fontWeight: 700, color: "var(--ocean-deep)" }}>{idrK(c.deposit)} {lang === "es" ? "pagado" : "paid"}</span></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 26, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn" style={{ background: "white", color: "var(--ink)" }} onClick={onNew}>{t.confNew}</button>
          <button className="btn btn-ghost" style={{ color: "var(--sand)", boxShadow: "inset 0 0 0 1.5px color-mix(in oklch, var(--sand) 40%, transparent)" }} onClick={onHome}>{t.confBack}</button>
        </div>
      </div>
    </main>
  );
}

/* ---------- Booking flow shell ---------- */
function BookingFlow({ booking, setBooking, t, lang, setLang, onExit, onPaid, initialStep = 0 }) {
  const [step, setStep] = useState(initialStep);
  const set = (patch) => setBooking((b) => ({ ...b, ...patch }));
  const c = calc(booking);
  const topRef = useRef(null);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const valid = [
    daysBetween(booking.from, booking.to) > 0,
    true,
  ];
  const next = () => { if (step < 1) setStep(step + 1); };
  const StepComp = [StepDates, StepReview][step];
  const titles = [
    [t.stepDates, lang === "es" ? "¿Cuándo y dónde empieza la aventura?" : "When and where does the adventure start?"],
    [t.bkReviewTitle, lang === "es" ? "Revisa tu reserva y paga directamente con Stripe." : "Review your booking and pay directly with Stripe."],
  ][step];

  return (
    <div ref={topRef} style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* header */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "color-mix(in oklch, var(--sand) 92%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--sand-3)" }}>
        <div className="wrap" style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div onClick={onExit} style={{ cursor: "pointer" }}><Logo /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LangSwitch lang={lang} setLang={setLang} />
            <button onClick={onExit} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sand-2)", display: "grid", placeItems: "center", color: "var(--ink-soft)" }} aria-label="close">
              <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
            </button>
          </div>
        </div>
        <div className="wrap" style={{ paddingBottom: 16 }}>
          <Stepper step={step} t={t} onJump={setStep} />
        </div>
      </header>

      {/* body */}
      <div className="wrap booking-grid" style={{ flex: 1, padding: "40px 28px 120px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 40, alignItems: "start" }}>
        <div className="rise" key={step}>
          <span className="mono" style={{ color: "var(--coral)", fontWeight: 700 }}>{`0${step + 1} / 02`}</span>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", marginTop: 10, marginBottom: 6 }}>{titles[0]}</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, marginBottom: 30 }}>{titles[1]}</p>
          <StepComp booking={booking} set={set} t={t} lang={lang} />

          {/* nav buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 36, alignItems: "center" }}>
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}><Ic.arrowL s={18} /> {t.bkBack}</button>}
            {step < 1
              ? <button className="btn btn-primary" disabled={!valid[step]} style={{ opacity: valid[step] ? 1 : 0.45, cursor: valid[step] ? "pointer" : "not-allowed", marginLeft: "auto" }} onClick={next}>{t.bkContinue} <Ic.arrow s={18} c="white" /></button>
              : <button className="btn btn-primary btn-lg" style={{ marginLeft: "auto" }} onClick={() => { window.location.href = STRIPE_BASE + "?prefilled_quantity=" + c.days; }}><Ic.lock s={18} c="white" /> {t.bkPay} · {idrK(c.total)}</button>}
          </div>
          {step === 1 && <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}><Ic.shield s={14} c="var(--ocean)" /> {t.bkSecure}</p>}
        </div>

        {/* sticky summary */}
        <aside className="booking-summary" style={{ position: "sticky", top: 150 }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <SummaryCard booking={booking} t={t} lang={lang} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, padding: "0 4px", color: "var(--ink-faint)", fontSize: 12.5 }}>
            <Ic.shield s={15} c="var(--ocean)" /> {lang === "es" ? "Cancelación gratis hasta 24h antes" : "Free cancellation up to 24h before"}
          </div>
        </aside>
      </div>

    </div>
  );
}

Object.assign(window, { StripePay, Confirmation, BookingFlow });
