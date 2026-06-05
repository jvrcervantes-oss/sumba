/* ============================================================
   BALI BEST MOTORCYCLE — Home / landing
   ============================================================ */

/* ---------------- Quick search widget ---------------- */
function QuickSearch({ t, lang, locations, onSearch, floating }) {
  const [from, setFrom] = useState(todayISO(1));
  const [to, setTo] = useState(todayISO(5));
  const [loc, setLoc] = useState("canggu");
  const d = daysBetween(from, to);
  const field = {
    display: "flex", flexDirection: "column", gap: 5, padding: "12px 16px",
    flex: 1, minWidth: 140, position: "relative",
  };
  const labelS = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 6 };
  const inputS = { border: "none", background: "transparent", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16, color: "var(--ink)", padding: 0, width: "100%", cursor: "pointer" };
  return (
    <div className="card" style={{
      display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 0,
      padding: 8, background: "var(--shell)",
      boxShadow: floating ? "var(--sh-lg)" : "var(--sh)",
    }}>
      <div style={field}>
        <span style={labelS}><Ic.cal s={13} c="var(--ocean)" />{t.searchFrom}</span>
        <input type="date" value={from} min={todayISO(0)} onChange={(e) => {
          const nf = e.target.value;
          setFrom(nf);
          if (nf >= to) {
            const d = new Date(nf + "T00:00:00");
            d.setDate(d.getDate() + 4);
            setTo(d.toISOString().slice(0, 10));
          }
        }} style={inputS} />
      </div>
      <div style={{ width: 1, background: "var(--sand-3)", margin: "10px 0" }} />
      <div style={field}>
        <span style={labelS}><Ic.cal s={13} c="var(--ocean)" />{t.searchTo}</span>
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={inputS} />
      </div>
      <div style={{ width: 1, background: "var(--sand-3)", margin: "10px 0" }} />
      <div style={{ ...field, flex: 1.4 }}>
        <span style={labelS}><Ic.pin s={13} c="var(--ocean)" />{t.searchWhere}</span>
        <select value={loc} onChange={(e) => setLoc(e.target.value)} style={{ ...inputS, appearance: "none" }}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l[lang]}</option>)}
        </select>
      </div>
      <button className="btn btn-primary" style={{ margin: 4, flexShrink: 0 }}
        onClick={() => onSearch({ from, to, loc })}>
        <Ic.speedo s={20} c="white" /> {t.searchGo}
        {d > 0 && <span style={{ opacity: 0.8, fontWeight: 600 }}>· {d} {d === 1 ? t.day : t.days}</span>}
      </button>
    </div>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ t, lang, locations, onSearch, layout }) {
  const center = layout === "center";
  return (
    <section id="top" style={{ position: "relative", overflow: "hidden", background: "var(--night)" }} className="grain">
      {/* atmosphere */}
      <div style={{ position: "absolute", inset: 0, background:
        "radial-gradient(120% 90% at 78% 8%, color-mix(in oklch, var(--sunset) 70%, transparent), transparent 55%)," +
        "radial-gradient(100% 80% at 12% 0%, color-mix(in oklch, var(--coral) 45%, transparent), transparent 50%)," +
        "linear-gradient(180deg, var(--night) 0%, var(--night-2) 55%, color-mix(in oklch, var(--ocean-deep) 55%, var(--night-2)) 100%)" }} />
      <SunBurst size={620} style={{ position: "absolute", top: -180, right: center ? "50%" : -120, transform: center ? "translateX(50%)" : "none", opacity: 0.5 }} />

      <div className="wrap" style={{ position: "relative", zIndex: 2, paddingTop: 132, paddingBottom: 150 }}>
        <div style={{
          display: "grid", gap: 48, alignItems: "center",
          gridTemplateColumns: center ? "1fr" : "1.05fr 0.95fr",
          textAlign: center ? "center" : "left",
          justifyItems: center ? "center" : "stretch",
        }} className="hero-grid">
          <div style={{ maxWidth: center ? 760 : "none" }}>
            <span className="pill rise" style={{ background: "color-mix(in oklch, var(--sand) 14%, transparent)", color: "var(--sun)", animationDelay: ".05s", border: "1px solid color-mix(in oklch, var(--sun) 40%, transparent)", whiteSpace: "nowrap" }}>
              <Ic.sun s={14} c="var(--sun)" /> {t.heroKicker}
            </span>
            <h1 className="rise" style={{ fontSize: "clamp(46px, 6.6vw, 88px)", lineHeight: 1.02, color: "var(--sand)", marginTop: 22, animationDelay: ".12s" }}>
              {t.heroTitle1}<br />
              <span style={{ background: "linear-gradient(100deg, var(--sun), var(--coral))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{t.heroTitle2}</span>
            </h1>
            <p className="rise" style={{ marginTop: 28, fontSize: "clamp(16px, 1.6vw, 20px)", color: "color-mix(in oklch, var(--sand) 80%, transparent)", maxWidth: 520, marginLeft: center ? "auto" : 0, marginRight: center ? "auto" : 0, animationDelay: ".2s" }}>
              {t.heroSub}
            </p>
            <div className="rise" style={{ display: "flex", gap: 22, marginTop: 30, flexWrap: "wrap", justifyContent: center ? "center" : "flex-start", alignItems: "center", animationDelay: ".28s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Stars n={5} s={16} />
                <span style={{ color: "var(--sand)", fontWeight: 700, fontSize: 14.5 }}>{t.trusted}</span>
              </div>
            </div>
          </div>

          {!center && (
            <div style={{ position: "relative", animation: "floaty 6s ease-in-out infinite" }}>
              <div className="card" style={{ overflow: "hidden", padding: 0, transform: "rotate(-2deg)", boxShadow: "var(--sh-lg)" }}>
                <BikeArt bike={BBM.FLEET[2]} h={300} showLabel />
                <div style={{ padding: "16px 20px", background: "var(--shell)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19 }}>Honda CRF 250 Rally</div>
                    <div style={{ fontSize: 13, color: "var(--ink-faint)" }} className="mono">{lang === "es" ? "Lista para rally-raid" : "Rally-raid ready"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--coral)" }}>{idrK(450)}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }} className="mono">{t.perDay}</div>
                  </div>
                </div>
              </div>
              <div className="pill" style={{ position: "absolute", top: -16, left: -16, background: "var(--ocean)", color: "white", boxShadow: "var(--sh)", animation: "pop .5s .6s both" }}>
                <Ic.bolt s={14} c="white" /> {lang === "es" ? "Entrega gratis hoy" : "Free delivery today"}
              </div>
            </div>
          )}
        </div>

        {/* quick search */}
        <div className="rise" style={{ marginTop: 56, maxWidth: 900, marginLeft: center ? "auto" : 0, marginRight: center ? "auto" : 0, animationDelay: ".4s" }}>
          <QuickSearch t={t} lang={lang} locations={locations} onSearch={onSearch} floating />
        </div>
      </div>
      <Waves color="var(--sand)" style={{ height: 80, position: "relative", zIndex: 2, marginBottom: -1 }} />
    </section>
  );
}

/* ---------------- Fleet card ---------------- */
function FleetCard({ bike, t, lang, onReserve, onDetails, i }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="card rise" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ overflow: "hidden", display: "flex", flexDirection: "column", animationDelay: `${0.05 * i}s`,
        transform: hover ? "translateY(-6px)" : "none", transition: "transform .3s cubic-bezier(.2,.8,.3,1.1), box-shadow .3s",
        boxShadow: hover ? "var(--sh-lg)" : "var(--sh)" }}>
      <div style={{ position: "relative" }}>
        <BikeArt bike={bike} h={186} />
        {bike.popular && (
          <span className="pill" style={{ position: "absolute", top: 12, left: 12, background: "var(--sun)", color: "var(--ink)" }}>
            <Ic.bolt s={13} c="var(--ink)" /> {lang === "es" ? "Popular" : "Popular"}
          </span>
        )}
        <span className="pill" style={{ position: "absolute", top: 12, right: 12, background: "color-mix(in oklch, var(--night) 70%, transparent)", color: "var(--sand)", backdropFilter: "blur(4px)", textTransform: "capitalize" }}>
          {BBM.CATS.find((c) => c.id === bike.cat)[lang]}
        </span>
      </div>
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div>
            <div className="mono" style={{ color: "var(--ink-faint)", fontSize: 11 }}>{bike.brand}</div>
            <h3 style={{ fontSize: 22, marginTop: 2 }}>{bike.model}</h3>
          </div>
        </div>
        <p style={{ marginTop: 9, fontSize: 13.5, color: "var(--ink-soft)", flex: 1 }}>{lang === "es" ? bike.blurbEs : bike.blurbEn}</p>
        <div style={{ display: "flex", gap: 14, marginTop: 14, color: "var(--ink-soft)", fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Ic.speedo s={15} c="var(--ocean)" />{bike.cc}cc</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Ic.gear s={15} c="var(--ocean)" />{bike.trans === "Automatic" ? (lang === "es" ? "Auto" : "Auto") : (lang === "es" ? "Manual" : "Manual")}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Ic.user s={15} c="var(--ocean)" />{bike.seats}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--sand-3)" }}>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase" }}>{t.from}</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "var(--ink)" }}>{idrK(bike.price)}</span>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>≈{usdApprox(bike.price)} {t.perDay}</span>
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: "11px 18px", fontSize: 14.5 }} onClick={() => onReserve(bike)}>
            {t.reserve}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fleet section ---------------- */
function FleetSection({ t, lang, onReserve }) {
  return (
    <section id="fleet" className="wrap" style={{ padding: "76px 28px 30px" }}>
      <div>
        <span className="mono" style={{ color: "var(--coral)", fontWeight: 700 }}>◇ {lang === "es" ? "La moto" : "The bike"}</span>
        <h2 style={{ fontSize: "clamp(34px, 4.5vw, 52px)", marginTop: 10 }}>{t.fleetTitle}</h2>
        <p style={{ marginTop: 12, color: "var(--ink-soft)", maxWidth: 460, fontSize: 16 }}>{t.fleetSub}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 24, marginTop: 38 }}>
        {BBM.FLEET.map((b, i) => <FleetCard key={b.id} bike={b} t={t} lang={lang} onReserve={onReserve} i={i} />)}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks({ t, lang }) {
  const steps = [
    { ic: Ic.cal, t: t.step1t, d: t.step1d },
    { ic: Ic.speedo, t: t.step2t, d: t.step2d },
    { ic: Ic.pin, t: t.step3t, d: t.step3d },
    { ic: Ic.road, t: t.step4t, d: t.step4d },
  ];
  return (
    <section id="how" style={{ background: "var(--night-2)", color: "var(--sand)", position: "relative", overflow: "hidden", marginTop: 50 }} className="grain">
      <Waves flip color="var(--night-2)" style={{ height: 70, marginTop: -1 }} />
      <div className="wrap" style={{ padding: "30px 28px 80px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 50px" }}>
          <span className="mono" style={{ color: "var(--sun)", fontWeight: 700 }}>◇ {lang === "es" ? "Sencillo" : "Simple"}</span>
          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 50px)", color: "var(--sand)", marginTop: 10 }}>
            {lang === "es" ? "De la idea a la carretera en minutos" : "From idea to open road in minutes"}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ position: "relative", padding: "26px 22px", borderRadius: "var(--r-lg)", background: "var(--night-3)", border: "1px solid color-mix(in oklch, var(--sand) 10%, transparent)" }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, display: "grid", placeItems: "center", background: "color-mix(in oklch, var(--ocean) 26%, transparent)", color: "var(--ocean-bright)" }}>
                <s.ic s={24} c="var(--ocean-bright)" />
              </div>
              <span style={{ position: "absolute", top: 22, right: 22, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 38, color: "color-mix(in oklch, var(--sand) 14%, transparent)" }}>0{i + 1}</span>
              <h3 style={{ color: "var(--sand)", fontSize: 20, marginTop: 18 }}>{s.t}</h3>
              <p style={{ marginTop: 8, color: "color-mix(in oklch, var(--sand) 70%, transparent)", fontSize: 14.5 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA band ---------------- */
function CtaBand({ t, lang, onBook }) {
  return (
    <section id="routes" className="wrap" style={{ padding: "84px 28px" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-xl)", padding: "clamp(36px, 6vw, 72px)",
        background: "linear-gradient(120deg, var(--ocean-deep), var(--ocean))", color: "white" }} className="grain">
        <SunBurst size={420} style={{ position: "absolute", bottom: -200, right: -100, opacity: 0.4 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 620 }}>
          <h2 style={{ fontSize: "clamp(32px, 4.6vw, 56px)", color: "white" }}>
            {lang === "es" ? "Tu mapa de Bali empieza con dos ruedas." : "Your Bali map starts with two wheels."}
          </h2>
          <p style={{ marginTop: 18, fontSize: 18, color: "color-mix(in oklch, white 86%, transparent)", maxWidth: 480 }}>
            {lang === "es" ? "Reserva en 60 segundos. Cancela gratis hasta 24h antes." : "Book in 60 seconds. Free cancellation up to 24h before."}
          </p>
          <button className="btn btn-lg" style={{ marginTop: 28, background: "white", color: "var(--ocean-deep)" }} onClick={onBook}>
            {t.bookYours} <Ic.arrow s={20} c="var(--ocean-deep)" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Home root ---------------- */
function Home({ t, lang, onSearch, onReserve, onBook, layout }) {
  return (
    <main>
      <Hero t={t} lang={lang} locations={BBM.LOCATIONS} onSearch={onSearch} layout={layout} />
      <FleetSection t={t} lang={lang} onReserve={onReserve} />
      <HowItWorks t={t} lang={lang} />
      <CtaBand t={t} lang={lang} onBook={onBook} />
    </main>
  );
}

Object.assign(window, { QuickSearch, Hero, FleetCard, FleetSection, HowItWorks, CtaBand, Home });
