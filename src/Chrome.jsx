/* ============================================================
   BALI BEST MOTORCYCLE — chrome: NavBar, LangSwitch, Footer
   ============================================================ */

function LangSwitch({ lang, setLang, dark }) {
  return (
    <div style={{
      display: "inline-flex", padding: 3, borderRadius: 999,
      background: dark ? "color-mix(in oklch, white 12%, transparent)" : "color-mix(in oklch, var(--ink) 8%, transparent)",
      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
    }}>
      {["en", "es"].map((l) => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding: "5px 11px", borderRadius: 999, textTransform: "uppercase",
            color: lang === l ? (dark ? "var(--ink)" : "var(--sand)") : (dark ? "var(--sand)" : "var(--ink-soft)"),
            background: lang === l ? (dark ? "var(--sand)" : "var(--ink)") : "transparent",
            transition: "all .2s",
          }}>{l}</button>
      ))}
    </div>
  );
}

function NavBar({ t, lang, setLang, onBook, dark, onHome }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f);
  }, []);
  const links = [
    { k: "navFleet", href: "#fleet" }, { k: "navHow", href: "#how" },
    { k: "navRoutes", href: "#routes" }, { k: "navHelp", href: "#help" },
  ];
  const onDarkHero = dark && !scrolled;
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      transition: "all .35s cubic-bezier(.2,.7,.3,1)",
      background: scrolled ? "color-mix(in oklch, var(--sand) 88%, transparent)" : "transparent",
      backdropFilter: scrolled ? "blur(14px) saturate(1.3)" : "none",
      boxShadow: scrolled ? "0 1px 0 var(--sand-3), 0 6px 24px oklch(0.4 0.04 210 / 0.06)" : "none",
    }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 76 }}>
        <div onClick={onHome} style={{ cursor: "pointer" }}><Logo dark={onDarkHero} /></div>
        <nav style={{ display: "flex", alignItems: "center", gap: 30 }} className="nav-links">
          {links.map((l) => (
            <a key={l.k} href={l.href} style={{
              fontWeight: 600, fontSize: 15, color: onDarkHero ? "var(--sand)" : "var(--ink-soft)",
              transition: "color .2s", position: "relative",
            }} className="nav-link">{t[l.k]}</a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LangSwitch lang={lang} setLang={setLang} dark={onDarkHero} />
          <button className="btn btn-primary" style={{ padding: "11px 20px", fontSize: 15 }} onClick={onBook}>
            {t.book} <Ic.arrow s={17} c="white" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer({ t, lang }) {
  return (
    <footer style={{ background: "var(--night-2)", color: "var(--sand)", position: "relative", overflow: "hidden" }} className="grain">
      <Waves color="var(--night-2)" style={{ height: 60, marginTop: -1 }} />
      <div className="wrap" style={{ padding: "30px 28px 50px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 320 }}>
            <Logo dark s={1.1} />
            <p style={{ marginTop: 16, color: "color-mix(in oklch, var(--sand) 72%, transparent)", fontSize: 14.5 }}>
              {lang === "es"
                ? "Alquiler de motos de aventura en Bali desde 2014. Bien cuidadas, bien queridas."
                : "Adventure motorcycle rental in Bali since 2014. Well-maintained, well-loved."}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Stars n={5} s={15} />
              <span style={{ fontSize: 13, color: "color-mix(in oklch, var(--sand) 65%, transparent)" }}>{t.rating}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
            {[
              { h: lang === "es" ? "Explorar" : "Explore", items: [t.navFleet, t.navRoutes, t.navHow] },
              { h: lang === "es" ? "Empresa" : "Company", items: [t.navHelp, "WhatsApp", "Instagram"] },
              { h: lang === "es" ? "Legal" : "Legal", items: ["Terms", "Privacy", "Insurance"] },
            ].map((col) => (
              <div key={col.h} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <span className="mono" style={{ color: "var(--ocean-bright)", fontSize: 11 }}>{col.h}</span>
                {col.items.map((it) => (
                  <a key={it} href="#" style={{ fontSize: 14.5, color: "color-mix(in oklch, var(--sand) 80%, transparent)" }}>{it}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{
          marginTop: 40, paddingTop: 22, borderTop: "1px solid color-mix(in oklch, var(--sand) 16%, transparent)",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          fontSize: 12.5, color: "color-mix(in oklch, var(--sand) 55%, transparent)",
        }}>
          <span className="mono">© 2026 Bali Best Motorcycle Co.</span>
          <span className="mono">Jl. Pantai Batu Bolong · Canggu · Bali</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { LangSwitch, NavBar, Footer });
