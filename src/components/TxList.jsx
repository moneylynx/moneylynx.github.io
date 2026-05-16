import { useState, useMemo, useEffect, useRef } from 'react';
import { fmtEur, fDate, translateNote } from '../lib/helpers.js';
import { categoryIcon } from '../lib/categoryIcons.js';
import { Ic, Pill, StickyHeader } from './ui.jsx';

function TxList({ C, data, year, filter, setFilter, onEdit, onDelete, onDeleteGroup, onPay, onUnpay, onBack, t, lang, fmt: fmtProp }) {
  const fmt = fmtProp || fmtEur;

  // ── Search & filter state ──────────────────────────────────────────────────
  const [q,         setQ]         = useState("");
  const [amtOpen,   setAmtOpen]   = useState(false);
  const [amtMin,    setAmtMin]    = useState("");
  const [amtMax,    setAmtMax]    = useState("");
  const [selCat,    setSelCat]    = useState("");   // single category filter
  const [catOpen,   setCatOpen]   = useState(false);

  // ── Bulk selection state ───────────────────────────────────────────────────
  const [bulkMode,  setBulkMode]  = useState(false);
  const [selected,  setSelected]  = useState(new Set()); // set of tx.id
  const [bulkCfm,   setBulkCfm]  = useState(null); // null | 'delete' | 'pay'

  // ── Row confirmation state ─────────────────────────────────────────────────
  const [delCfm, setDelCfm] = useState(null);
  const [grpCfm, setGrpCfm] = useState(null);
  const [page, setPage]     = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => { setFilter("overdue"); }, []);

  const filterColor = {
    all: null, expense: C.income, pending: C.warning,
    processing: "#FB923C", income: C.income, overdue: C.expense,
  };

  // Duplicate detection
  const dupIds = useMemo(() => {
    const seen = {}; const dups = new Set();
    data.forEach(x => {
      const key = `${x.date}|${x.amount}|${x.description?.trim().toLowerCase()}`;
      if (seen[key]) { dups.add(x.id); dups.add(seen[key]); } else seen[key] = x.id;
    });
    return dups;
  }, [data]);

  // All unique categories in current dataset (for category filter)
  const allCats = useMemo(() => {
    const s = new Set(data.map(x => x.category).filter(Boolean));
    return [...s].sort();
  }, [data]);

  // Main filter + search pipeline
  const rows = useMemo(() => {
    let f = data.filter(x => new Date(x.date).getFullYear() === year);
    if (filter === "expense")    f = f.filter(x => x.type === "Isplata" && x.status === "Plaćeno");
    if (filter === "income")     f = f.filter(x => x.type === "Primitak");
    if (filter === "pending")    f = f.filter(x => x.status === "Čeka plaćanje");
    if (filter === "processing") f = f.filter(x => x.status === "U obradi");
    if (filter === "overdue") {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      f = data.filter(x =>
        (x.status === "Čeka plaćanje" || x.status === "U obradi") &&
        new Date(x.date) <= today
      );
    }
    // Text search
    if (q) {
      const ql = q.toLowerCase();
      f = f.filter(x =>
        x.description?.toLowerCase().includes(ql) ||
        x.category?.toLowerCase().includes(ql) ||
        x.location?.toLowerCase().includes(ql) ||
        x.notes?.toLowerCase().includes(ql)
      );
    }
    // Amount range
    const mn = parseFloat(amtMin); const mx = parseFloat(amtMax);
    if (!isNaN(mn) && mn > 0) f = f.filter(x => parseFloat(x.amount) >= mn);
    if (!isNaN(mx) && mx > 0) f = f.filter(x => parseFloat(x.amount) <= mx);
    // Category filter
    if (selCat) f = f.filter(x => x.category === selCat);

    if (filter === "pending" || filter === "processing" || filter === "overdue")
      return f.sort((a, b) => new Date(a.date) - new Date(b.date));
    return f.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, filter, q, year, amtMin, amtMax, selCat]);

  useEffect(() => { setPage(1); }, [filter, q, amtMin, amtMax, selCat]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Active filter count badge
  const activeFilters = [
    q, (amtMin || amtMax) ? "amt" : null, selCat
  ].filter(Boolean).length;

  // ── Bulk helpers ───────────────────────────────────────────────────────────
  const toggleBulkMode = () => {
    setBulkMode(v => !v);
    setSelected(new Set());
    setBulkCfm(null);
  };
  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map(r => r.id)));
  };
  const bulkPaySelected = () => {
    const today = new Date().toISOString().split("T")[0];
    selected.forEach(id => onPay(id));
    setSelected(new Set()); setBulkCfm(null);
  };
  const bulkDeleteSelected = () => {
    selected.forEach(id => onDelete(id));
    setSelected(new Set()); setBulkCfm(null); setBulkMode(false);
  };
  const canPay = [...selected].some(id => {
    const tx = data.find(x => x.id === id);
    return tx && (tx.status === "Čeka plaćanje" || tx.status === "U obradi");
  });

  // ── Long-press: revert Plaćeno → Čeka plaćanje ────────────────────────────
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const [longPressFeedback, setLongPressFeedback] = useState(null);

  const startLongPress = (tx) => {
    if (!onUnpay || tx.status !== "Plaćeno" || tx.type !== "Isplata") return;
    longPressTriggered.current = false;
    setLongPressFeedback(tx.id);
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onUnpay(tx.id);
      setLongPressFeedback(null);
      if (navigator.vibrate) try { navigator.vibrate(40); } catch {}
    }, 600);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    setLongPressFeedback(null);
  };

  const fldSm = { height: 36, padding: "0 10px", background: C.cardAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, width: "100%" };

  return (
    <div className="fi" style={{ width: "100%" }}>
      <StickyHeader C={C} icon="list" title={`${t("Transakcije")} · ${year}.`}
        right={
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {onBack && !bulkMode && (
              <button onClick={onBack} title={t("Natrag")}
                style={{ background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: "6px 11px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {t("Natrag")}
              </button>
            )}
            <button onClick={toggleBulkMode}
              style={{ background: bulkMode ? `${C.accent}20` : C.cardAlt, border: `1px solid ${bulkMode ? C.accent : C.border}`, borderRadius: 10, padding: "6px 11px", fontSize: 12, fontWeight: 700, color: bulkMode ? C.accent : C.textMuted, cursor: "pointer" }}>
              {bulkMode ? t("Zatvori") : t("Odaberi")}
            </button>
          </div>
        }
      />

      <div style={{ padding: "12px 16px 0" }}>

        {/* ── Search bar + filter toggles ──────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: amtOpen || catOpen ? 8 : 0 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input type="text" placeholder={t("Pretraži…")} value={q} onChange={e => setQ(e.target.value)}
                style={{ ...fldSm, paddingLeft: 36, height: 40 }}/>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                <Ic n="search" s={15} c={C.textMuted}/>
              </span>
              {q && (
                <button onClick={() => setQ("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <Ic n="x" s={12} c={C.textMuted}/>
                </button>
              )}
            </div>
            {/* Amount filter toggle */}
            <button onClick={() => { setAmtOpen(v => !v); setCatOpen(false); }}
              style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: (amtMin || amtMax) ? `${C.accent}20` : C.cardAlt, border: `1.5px solid ${(amtMin || amtMax) ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              title={t("Filtriraj po iznosu")}>
              <Ic n="coins" s={15} c={(amtMin || amtMax) ? C.accent : C.textMuted}/>
            </button>
            {/* Category filter toggle */}
            <button onClick={() => { setCatOpen(v => !v); setAmtOpen(false); }}
              style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: selCat ? `${C.accent}20` : C.cardAlt, border: `1.5px solid ${selCat ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              title={t("Filtriraj po kategoriji")}>
              <span style={{ fontSize: 16 }}>{selCat ? categoryIcon(selCat) : "🏷️"}</span>
            </button>
          </div>

          {/* Amount range panel */}
          {amtOpen && (
            <div className="su" style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{t("Od")}</span>
              <input type="number" inputMode="decimal" placeholder="0" value={amtMin}
                onChange={e => setAmtMin(e.target.value)}
                style={{ ...fldSm, flex: 1 }}/>
              <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>€ — {t("do")}</span>
              <input type="number" inputMode="decimal" placeholder="∞" value={amtMax}
                onChange={e => setAmtMax(e.target.value)}
                style={{ ...fldSm, flex: 1 }}/>
              <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>€</span>
              {(amtMin || amtMax) && (
                <button onClick={() => { setAmtMin(""); setAmtMax(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                  <Ic n="x" s={13} c={C.textMuted}/>
                </button>
              )}
            </div>
          )}

          {/* Category filter panel */}
          {catOpen && (
            <div className="su" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>
                <button onClick={() => setSelCat("")}
                  style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 18, border: `1.5px solid ${!selCat ? C.accent : C.border}`, background: !selCat ? `${C.accent}18` : "transparent", color: !selCat ? C.accent : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t("Sve")}
                </button>
                {allCats.map(cat => (
                  <button key={cat} onClick={() => setSelCat(selCat === cat ? "" : cat)}
                    style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 18, border: `1.5px solid ${selCat === cat ? C.accent : C.border}`, background: selCat === cat ? `${C.accent}18` : "transparent", color: selCat === cat ? C.accent : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 13 }}>{categoryIcon(cat)}</span>{t(cat)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 4, overflowX: "auto", paddingBottom: 4 }}>
          {[
            ["all", t("Sve")], ["expense", t("Plaćeno")], ["overdue", t("Dospjelo")],
            ["pending", t("Čeka plaćanje")], ["processing", t("U obradi")], ["income", t("Primici")]
          ].map(([id, lb]) => (
            <Pill key={id} label={lb} active={filter === id}
              color={id === "overdue" ? "#F87171" : id === "processing" ? "#FB923C" : id === "expense" ? C.income : id === "income" ? C.income : C.accent}
              inactiveColor={id === "overdue" ? "#FB923C" : undefined}
              onClick={() => setFilter(id)}/>
          ))}
        </div>

        {filter === "overdue" && (
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, padding: "4px 2px", display: "flex", alignItems: "center", gap: 5 }}>
            <Ic n="alert" s={11} c={C.warning}/>
            {t("Prikazuje neplaćene stavke s rokom do danas (tekući + prošli mjeseci)")}
          </div>
        )}
        {filter === "expense" && onUnpay && rows.length > 0 && (
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8, padding: "4px 2px", display: "flex", alignItems: "center", gap: 5, fontStyle: "italic" }}>
            <Ic n="info" s={10} c={C.textMuted}/>
            {t("Savjet: drži duže na ikoni kategorije za vraćanje u Čeka plaćanje")}
          </div>
        )}

        {/* ── Bulk mode toolbar ────────────────────────────────────────── */}
        {bulkMode && (
          <div className="su" style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}40`, borderRadius: 12, padding: "10px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={selectAll}
              style={{ background: selected.size === pageRows.length && pageRows.length > 0 ? `${C.accent}25` : C.cardAlt, border: `1.5px solid ${C.accent}60`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: C.accent, fontSize: 11, fontWeight: 700 }}>
              {selected.size === pageRows.length && pageRows.length > 0 ? t("Odznači sve") : t("Odaberi sve")}
            </button>
            <span style={{ fontSize: 11, color: C.textMuted, flex: 1, textAlign: "center" }}>
              {selected.size > 0 ? `${selected.size} ${t("odabrano")}` : t("Tap na stavku za odabir")}
            </span>
            {selected.size > 0 && !bulkCfm && (
              <>
                {canPay && (
                  <button onClick={() => setBulkCfm("pay")}
                    style={{ background: C.income, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <Ic n="check" s={11} c="#fff"/>{t("Plati")}
                  </button>
                )}
                <button onClick={() => setBulkCfm("delete")}
                  style={{ background: C.expense, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Ic n="trash" s={11} c="#fff"/>{t("Obriši")}
                </button>
              </>
            )}
            {bulkCfm === "delete" && (
              <>
                <span style={{ fontSize: 11, color: C.expense, fontWeight: 700 }}>{t("Jeste li sigurni?")}</span>
                <button onClick={bulkDeleteSelected} style={{ background: C.expense, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }}>{t("Da!")}</button>
                <button onClick={() => setBulkCfm(null)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: C.textMuted, fontSize: 11 }}>{t("Ne")}</button>
              </>
            )}
            {bulkCfm === "pay" && (
              <>
                <span style={{ fontSize: 11, color: C.income, fontWeight: 700 }}>{t("Plati sve odabrane?")}</span>
                <button onClick={bulkPaySelected} style={{ background: C.income, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }}>{t("Da!")}</button>
                <button onClick={() => setBulkCfm(null)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: C.textMuted, fontSize: 11 }}>{t("Ne")}</button>
              </>
            )}
          </div>
        )}

        {/* ── Transaction rows ─────────────────────────────────────────── */}
        {rows.length === 0
          ? (
            <div style={{ textAlign: "center", padding: 50, color: C.textMuted }}>
              <Ic n="list" s={44} c={C.border} style={{ marginBottom: 12, opacity: .3 }}/>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t("Nema transakcija")}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                {q || amtMin || amtMax || selCat
                  ? t("Pokušajte s drugačijim filterom ili pretragom.")
                  : filter !== "all" ? t("Nema stavki za odabrani filter.")
                  : t("Pritisnite + za dodavanje.")}
              </p>
              {(q || amtMin || amtMax || selCat) && (
                <button onClick={() => { setQ(""); setAmtMin(""); setAmtMax(""); setSelCat(""); }}
                  style={{ marginTop: 12, background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {t("Ukloni filtere")}
                </button>
              )}
            </div>
          )
          : pageRows.map((tx, i) => {
            const leftColor = filter === "overdue" || filter === "all"
              ? (tx.installmentGroup ? C.warning : tx.type === "Primitak" ? C.income : C.expense)
              : (filterColor[filter] || (tx.type === "Primitak" ? C.income : C.expense));

            const isLongPressActive = longPressFeedback === tx.id;
            const canUnpay = onUnpay && tx.status === "Plaćeno" && tx.type === "Isplata";
            const isSelected = selected.has(tx.id);

            return (
              <div key={tx.id} className="su"
                onClick={bulkMode ? () => toggleSelect(tx.id) : undefined}
                style={{
                  background: isSelected ? `${C.accent}12` : C.card,
                  border: `1px solid ${isSelected ? C.accent : C.border}`,
                  borderLeft: `3px solid ${isSelected ? C.accent : leftColor}`,
                  borderRadius: 14, padding: 13, marginBottom: 8,
                  animationDelay: `${i * .02}s`,
                  cursor: bulkMode ? "pointer" : "default",
                  transition: "background .15s, border-color .15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: 10 }}>

                  {/* Checkbox (bulk mode) or Category icon */}
                  {bulkMode ? (
                    <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, border: `2px solid ${isSelected ? C.accent : C.border}`, background: isSelected ? `${C.accent}20` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                      {isSelected && <Ic n="check" s={16} c={C.accent}/>}
                    </div>
                  ) : (
                    <div
                      onMouseDown={() => canUnpay && startLongPress(tx)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => canUnpay && startLongPress(tx)}
                      onTouchEnd={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      title={canUnpay ? t("Drži duže za vraćanje u Čeka plaćanje") : ""}
                      style={{
                        width: 38, height: 38, flexShrink: 0, borderRadius: 11,
                        background: isLongPressActive ? `${C.warning}30` : `${leftColor}15`,
                        border: `1px solid ${isLongPressActive ? C.warning : leftColor}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, transition: "all .2s",
                        cursor: canUnpay ? "pointer" : "default", userSelect: "none",
                      }}>
                      {tx.type === "Primitak" ? "💵" : categoryIcon(tx.category)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{tx.description}</span>
                      {tx.splits?.length > 0 && <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${C.accent}20`, color:C.accent }}>🔀 {tx.splits.length}</span>}
                      {tx.installmentGroup && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: `${C.warning}20`, color: C.warning }}>{tx.installmentNum}/{tx.installmentTotal}</span>}
                      {dupIds.has(tx.id) && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: `${C.expense}20`, color: C.expense, display: "flex", alignItems: "center", gap: 3 }}>
                          <Ic n="alert" s={9} c={C.expense}/>{t("Duplikat?")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{fDate(tx.date)} · {t(tx.category)} · {t(tx.location)}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{t(tx.payment)} · <span style={{ color: tx.status === "Plaćeno" ? C.income : tx.status === "U obradi" ? "#FB923C" : C.warning }}>{t(tx.status)}</span></div>
                  </div>

                  {!bulkMode && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: tx.type === "Primitak" ? C.income : C.expense }}>
                        {tx.type === "Primitak" ? "+" : "-"}{fmt(+tx.amount)}
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: "auto", justifyContent: "flex-end" }}>
                        {(tx.status === "Čeka plaćanje" || tx.status === "U obradi") && (
                          <button title={t("Plati")} onClick={() => { try{navigator.vibrate?.(40)}catch{}; onPay(tx.id); }} style={{ background: `${C.income}18`, border: `1px solid ${C.income}40`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
                            <Ic n="check" s={13} c={C.income}/>
                          </button>
                        )}
                        <button title={t("Uredi")} onClick={() => onEdit(tx.id)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
                          <Ic n="edit" s={13} c={C.accent}/>
                        </button>
                        {tx.installmentGroup && grpCfm !== tx.id
                          ? <button title={t("Obriši")} onClick={() => setGrpCfm(tx.id)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                          : !tx.installmentGroup && (
                            delCfm === tx.id
                              ? <button onClick={() => { onDelete(tx.id); setDelCfm(null); }} style={{ background: C.expense, border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }}>{t("Obriši!")}</button>
                              : <button title={t("Obriši")} onClick={() => setDelCfm(tx.id)} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                          )
                        }
                      </div>
                    </div>
                  )}

                  {/* Amount shown in bulk mode (no action buttons) */}
                  {bulkMode && (
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: tx.type === "Primitak" ? C.income : C.expense, flexShrink: 0, alignSelf: "center" }}>
                      {tx.type === "Primitak" ? "+" : "-"}{fmt(+tx.amount)}
                    </div>
                  )}
                </div>

                {tx.installmentGroup && grpCfm === tx.id && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: `${C.expense}10`, borderRadius: 10, border: `1px solid ${C.expense}30`, textAlign: "left" }}>
                    <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{t("Što obrisati?")}</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { onDelete(tx.id); setGrpCfm(null); }} style={{ flex: 1, padding: "8px 4px", background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 11, cursor: "pointer" }}>{t("Ovaj obrok")}</button>
                      <button onClick={() => { onDeleteGroup(tx.installmentGroup); setGrpCfm(null); }} style={{ flex: 1, padding: "8px 4px", background: C.expense, border: "none", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{t("Sve obroke")} ({tx.installmentTotal})</button>
                      <button onClick={() => setGrpCfm(null)} style={{ padding: "8px 10px", background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, cursor: "pointer" }}><Ic n="x" s={12} c={C.textMuted}/></button>
                    </div>
                  </div>
                )}
                {tx.notes && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 7, fontStyle: "italic", borderTop: `1px solid ${C.border}`, paddingTop: 7, textAlign: "left" }}>💬 {translateNote(tx.notes, lang)}</div>}
              {tx.splits?.length > 0 && (
                <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.border}40` }}>
                  {tx.splits.map((sp, si) => (
                    <div key={sp.id || si} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: C.textMuted, padding: "2px 0" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span>{categoryIcon(sp.category)}</span>{t(sp.category)}{sp.description ? ` · ${sp.description}` : ""}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{fmt(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            );
          })
        }

        <div style={{ textAlign: "center", padding: "10px 0", color: C.textMuted, fontSize: 12 }}>
          {rows.length} {t("transakcija")} · {year}.
          {(q || amtMin || amtMax || selCat) && ` (${t("filtrirano")})`}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 0 16px" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ padding: "7px 14px", background: safePage === 1 ? C.cardAlt : C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: safePage === 1 ? C.textMuted : C.accent, fontWeight: 600, fontSize: 12, cursor: safePage === 1 ? "not-allowed" : "pointer" }}>
              ← {t("Prethodna")}
            </button>
            <span style={{ fontSize: 12, color: C.textMuted, minWidth: 80, textAlign: "center" }}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} / {rows.length}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              style={{ padding: "7px 14px", background: safePage === totalPages ? C.cardAlt : C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: safePage === totalPages ? C.textMuted : C.accent, fontWeight: 600, fontSize: 12, cursor: safePage === totalPages ? "not-allowed" : "pointer" }}>
              {t("Sljedeća")} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


export default TxList;
