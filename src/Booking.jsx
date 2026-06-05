/* ============================================================
   BALI BEST MOTORCYCLE — booking flow
   ============================================================ */

/* ---------- price helpers ---------- */
function calc(booking) {
  const bike = BBM.FLEET.find((b) => b.id === booking.bikeId);
  const days = daysBetween(booking.from, booking.to) || 1;
  const qty = booking.qty || 1;
  const rental = bike ? bike.price * days * qty : 0;
  const extras = BBM.EXTRAS.filter((e) => booking.extras[e.id]).reduce((s, e) => s + e.price, 0);
  const total = rental + extras;
  return { bike, days, qty, rental, extras, total, deposit: Math.round(total * 0.2), rest: total - Math.round(total * 0.2) };
}

/* ---------- Stepper ---------- */
function Stepper({ step, t, onJump }) {
  const labels = [t.stepDates, t.stepReview];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
      {labels.map((l, i) => {
        const done = i < step, active = i === step;
        return (
          <React.Fragment key={i}>
            <button onClick={() => i < step && onJump(i)} style={{ display: "flex", alignItems: "center", gap: 9, cursor: i < step ? "pointer" : "default" }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13,
                background: done ? "var(--ocean)" : active ? "var(--coral)" : "var(--sand-3)",
                color: done || active ? "white" : "var(--ink-faint)", transition: "all .3s",
              }}>{done ? <Ic.check s={15} c="white" /> : i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: active ? "var(--ink)" : done ? "var(--ink-soft)" : "var(--ink-faint)", whiteSpace: "nowrap" }} className="step-label">{l}</span>
            </button>
            {i < labels.length - 1 && <span style={{ flex: 1, minWidth: 16, height: 2, margin: "0 12px", background: i < step ? "var(--ocean)" : "var(--sand-3)", transition: "background .3s" }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---------- Step 1: dates & place ---------- */
function StepDates({ booking, set, t, lang }) {
  const days = daysBetween(booking.from, booking.to);
  const fld = { display: "flex", flexDirection: "column", gap: 8 };
  const lab = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 7 };
  const inp = { padding: "14px 16px", borderRadius: "var(--r)", border: "1.5px solid var(--sand-3)", background: "var(--shell)", fontSize: 16, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-body)", width: "100%" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
        <label style={fld}><span style={lab}><Ic.cal s={14} c="var(--ocean)" />{t.bkPickup}</span>
          <input type="date" style={inp} value={booking.from} min={todayISO(0)} onChange={(e) => set({ from: e.target.value, to: e.target.value >= booking.to ? "" : booking.to })} /></label>
        <label style={fld}><span style={lab}><Ic.cal s={14} c="var(--ocean)" />{t.bkReturn}</span>
          <input type="date" style={inp} value={booking.to} min={booking.from || todayISO(0)} onChange={(e) => set({ to: e.target.value })} /></label>
      </div>
      {days > 0 && (
        <div className="pill" style={{ alignSelf: "flex-start", background: "color-mix(in oklch, var(--ocean) 16%, transparent)", color: "var(--ocean-deep)" }}>
          <Ic.road s={15} c="var(--ocean-deep)" /> {days} {days === 1 ? t.day : t.days} {lang === "es" ? "de aventura" : "of adventure"}
        </div>
      )}
      <div style={fld}>
        <span style={lab}><Ic.pin s={14} c="var(--ocean)" />{t.bkPickLoc}</span>
        <select style={{ ...inp, appearance: "none" }} value={booking.pickLoc} onChange={(e) => set({ pickLoc: e.target.value })}>
          {BBM.LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l[lang]}</option>)}
        </select>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", userSelect: "none" }}>
        <span onClick={() => set({ sameLoc: !booking.sameLoc })} style={{
          width: 46, height: 27, borderRadius: 999, padding: 3, background: booking.sameLoc ? "var(--ocean)" : "var(--sand-3)", transition: "background .25s", flexShrink: 0,
        }}>
          <span style={{ display: "block", width: 21, height: 21, borderRadius: "50%", background: "white", transform: booking.sameLoc ? "translateX(19px)" : "none", transition: "transform .25s", boxShadow: "var(--sh-sm)" }} />
        </span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{t.bkSame}</span>
      </label>
      {!booking.sameLoc && (
        <div style={fld} className="rise">
          <span style={lab}><Ic.pin s={14} c="var(--coral)" />{t.bkRetLoc}</span>
          <select style={{ ...inp, appearance: "none" }} value={booking.retLoc} onChange={(e) => set({ retLoc: e.target.value })}>
            {BBM.LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l[lang]}</option>)}
          </select>
        </div>
      )}
      <div style={fld}>
        <span style={lab}><Ic.speedo s={14} c="var(--ocean)" />{t.bkQty}</span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 18, alignSelf: "flex-start", background: "var(--shell)", border: "1.5px solid var(--sand-3)", borderRadius: "var(--r-pill)", padding: "6px 8px" }}>
          {["-", "+"].map((sym, k) => (
            <button key={sym} onClick={() => set({ qty: Math.max(1, Math.min(6, (booking.qty || 1) + (sym === "+" ? 1 : -1))) })}
              style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--sand-2)", color: "var(--ink)", fontSize: 22, fontWeight: 700, display: "grid", placeItems: "center", order: sym === "+" ? 2 : 0 }}>
              {sym}
            </button>
          ))}
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, minWidth: 28, textAlign: "center", order: 1 }}>{booking.qty || 1}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 2: bike ---------- */
function StepBike({ booking, set, t, lang }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {BBM.FLEET.map((b) => {
        const sel = booking.bikeId === b.id;
        return (
          <button key={b.id} onClick={() => set({ bikeId: b.id })} style={{
            textAlign: "left", borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--shell)",
            boxShadow: sel ? "0 0 0 3px var(--coral), var(--sh)" : "var(--sh-sm)", transition: "all .22s",
            transform: sel ? "translateY(-3px)" : "none", position: "relative",
          }}>
            <BikeArt bike={b} h={118} showLabel={false} />
            {sel && <span className="pill" style={{ position: "absolute", top: 10, right: 10, background: "var(--coral)", color: "white" }}><Ic.check s={13} c="white" /> {t.bkSelected}</span>}
            <div style={{ padding: "13px 15px 15px" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{b.brand}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginTop: 1 }}>{b.model}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--coral)" }}>{idrK(b.price)}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }} className="mono">{b.cc}cc · {b.trans === "Automatic" ? "auto" : "man"}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Step 3: extras ---------- */
function StepExtras({ booking, set, t, lang }) {
  const toggle = (id) => set({ extras: { ...booking.extras, [id]: !booking.extras[id] } });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: "var(--r)", background: "color-mix(in oklch, var(--ocean) 12%, var(--shell))", border: "1px solid color-mix(in oklch, var(--ocean) 30%, transparent)" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--ocean)", display: "grid", placeItems: "center", flexShrink: 0 }}><Ic.helmet s={22} c="white" /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{t.helmet2}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{lang === "es" ? "Siempre con cada reserva" : "Always with every booking"}</div>
        </div>
        <span className="pill" style={{ background: "var(--ocean)", color: "white" }}>{t.free}</span>
      </div>
      {BBM.EXTRAS.map((e) => {
        const on = !!booking.extras[e.id];
        const I = Ic[e.icon] || Ic.box;
        return (
          <button key={e.id} onClick={() => toggle(e.id)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", textAlign: "left",
            borderRadius: "var(--r)", background: "var(--shell)", transition: "all .2s",
            boxShadow: on ? "0 0 0 2px var(--coral)" : "inset 0 0 0 1.5px var(--sand-3)",
          }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center",
              background: on ? "var(--coral)" : "var(--sand-2)", transition: "background .2s" }}>
              <I s={22} c={on ? "white" : "var(--ink-soft)"} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{e[lang]}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{lang === "es" ? e.descEs : e.descEn}</div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>+{idrK(e.price)}</span>
              <span style={{ width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center",
                background: on ? "var(--coral)" : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--sand-3)" }}>
                {on && <Ic.check s={15} c="white" />}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Step 4: review ---------- */
function StepReview({ booking, t, lang }) {
  const c = calc(booking);
  const pick = BBM.LOCATIONS.find((l) => l.id === booking.pickLoc);
  const ret = BBM.LOCATIONS.find((l) => l.id === (booking.sameLoc ? booking.pickLoc : booking.retLoc));
  const row = { display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--sand-3)" };
  const k = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)" };
  const v = { fontWeight: 700, fontSize: 15, textAlign: "right" };
  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, borderRadius: "var(--r-lg)", background: "var(--shell)", boxShadow: "var(--sh-sm)" }}>
        <div style={{ width: 120, borderRadius: "var(--r)", overflow: "hidden", flexShrink: 0 }}><BikeArt bike={c.bike} h={84} showLabel={false} /></div>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{c.bike.brand}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>{c.bike.model}</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 2 }}>{c.qty} × · {idrK(c.bike.price)}{t.perDay}</div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={row}><span style={k}>{t.bkPickup}</span><span style={v}>{fmtDate(booking.from, lang)} → {fmtDate(booking.to, lang)}<br /><span style={{ fontWeight: 600, color: "var(--ink-faint)", fontSize: 13 }}>{c.days} {c.days === 1 ? t.day : t.days}</span></span></div>
        <div style={row}><span style={k}>{t.bkPickLoc}</span><span style={v}>{pick[lang]}</span></div>
        <div style={row}><span style={k}>{t.bkRetLoc}</span><span style={v}>{ret[lang]}</span></div>
        {c.extras > 0 && (
          <div style={{ ...row, alignItems: "flex-start" }}>
            <span style={k}>{t.bkExtrasL}</span>
            <span style={{ ...v, display: "flex", flexDirection: "column", gap: 4 }}>
              {BBM.EXTRAS.filter((e) => booking.extras[e.id]).map((e) => <span key={e.id}>{e[lang]} <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>+{idrK(e.price)}</span></span>)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Summary card ---------- */
function SummaryCard({ booking, t, lang, compact }) {
  const c = calc(booking);
  const line = { display: "flex", justifyContent: "space-between", fontSize: 14.5, color: "var(--ink-soft)" };
  return (
    <div style={{ padding: compact ? 18 : 24 }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>{t.bkSummary}</div>
      {c.bike ? (
        <>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, marginTop: 8 }}>{c.bike.brand} {c.bike.model}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--sand-3)" }}>
            <div style={line}><span>{idrK(c.bike.price)} × {c.days} {c.days === 1 ? t.day : t.days} × {c.qty}</span><span style={{ fontWeight: 700, color: "var(--ink)" }}>{idrK(c.rental)}</span></div>
            {BBM.EXTRAS.filter((e) => booking.extras[e.id]).map((e) => (
              <div key={e.id} style={line}><span>{e[lang]}</span><span style={{ fontWeight: 700, color: "var(--ink)" }}>+{idrK(e.price)}</span></div>
            ))}
            <div style={{ ...line, color: "var(--ocean-deep)" }}><span>{t.helmet2}</span><span style={{ fontWeight: 700 }}>{t.free}</span></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 18, paddingTop: 18, borderTop: "2px solid var(--ink)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>{t.bkTotal}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30, color: "var(--coral)", lineHeight: 1 }}>{idrK(c.total)}</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>≈ {usdApprox(c.total)}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: "var(--r)", background: "var(--sand-2)", fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>{t.bkDeposit}</span><span style={{ color: "var(--ocean-deep)" }}>{idrK(c.deposit)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-faint)", marginTop: 5 }}><span>{t.bkRest}</span><span>{idrK(c.rest)}</span></div>
          </div>
        </>
      ) : (
        <p style={{ marginTop: 14, color: "var(--ink-faint)", fontSize: 14.5 }}>
          {lang === "es" ? "Elige una moto para ver el precio." : "Pick a bike to see your price."}
        </p>
      )}
    </div>
  );
}

Object.assign(window, { calc, Stepper, StepDates, StepBike, StepExtras, StepReview, SummaryCard });
