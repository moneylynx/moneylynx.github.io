import { fmtEur } from '../lib/helpers.js';
import { trainOnTransaction, rebuildModel } from '../lib/aiCategorizer.js';

// ─── useTransactions ──────────────────────────────────────────────────────────
// Encapsulates transaction CRUD operations.
// All mutations go through setTxs / setDrafts to keep App.jsx state as the
// single source of truth; cloud operations are delegated to injected helpers.
//
// Parameters:
//   txs, setTxs         — transaction list + setter
//   drafts, setDrafts   — drafts list + setter
//   queueSync           — from useCloudSync — debounced batch Supabase upsert
//   cloudDel            — from useCloudSync — single-transaction remote delete
//   startUndo           — from useUndo — shows undo toast
//   setPage             — navigation callback so addTx can redirect
//   t                   — translation function
// ─────────────────────────────────────────────────────────────────────────────
export function useTransactions({ txs, setTxs, drafts, setDrafts, queueSync, cloudDel, startUndo, setPage, t }) {

  // ── Add (with installment splitting) ─────────────────────────────────────
  const addTx = (tx) => {
    // Train AI model immediately on new transaction
    if (tx.type === 'Isplata' && tx.category && tx.description) {
      trainOnTransaction(tx);
    }
    const inst = parseInt(tx.installments) || 0;
    if (inst > 1) {
      const tot    = parseFloat(tx.amount) || 0;
      const mo     = Math.round(tot / inst * 100) / 100;
      const rem    = Math.round((tot - mo * inst) * 100) / 100;
      const gid    = Date.now().toString();
      const sd     = new Date(tx.date);
      const isYearly = tx.installmentPeriod === 'Y';
      const arr = [];
      for (let i = 0; i < inst; i++) {
        const d = new Date(
          sd.getFullYear() + (isYearly ? i : 0),
          sd.getMonth()    + (isYearly ? 0 : i),
          Math.min(sd.getDate(), 28)
        );
        let itemStatus = 'Čeka plaćanje';
        if (tx.payment === 'Kartica (debitna)' && i === 0) itemStatus = 'Plaćeno';
        arr.push({
          ...tx,
          id:               `${gid}_${i}`,
          installmentGroup: gid,
          installmentNum:   i + 1,
          installmentTotal: inst,
          amount:           i === 0 ? mo + rem : mo,
          date:             d.toISOString().split('T')[0],
          status:           itemStatus,
          description:      `${tx.description} (${i + 1}/${inst})`,
          notes:            tx.notes
            ? `${tx.notes} | ${t('Obrok')} ${i + 1}/${inst}`
            : `${t('Obrok')} ${i + 1}/${inst} · ${fmtEur(tot)}`,
        });
      }
      // Single batch Supabase call for all installments.
      setTxs(p => { const newTxs = [...p, ...arr]; queueSync(arr); return newTxs; });
    } else {
      const newTx = { ...tx, id: Date.now().toString(), installments: 0 };
      setTxs(p => { queueSync([newTx]); return [...p, newTx]; });
    }
    setPage('dashboard');
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const updTx = (tx) => {
    // Retrain on edit (user correcting a category = valuable signal)
    if (tx.type === 'Isplata' && tx.category && tx.description) {
      trainOnTransaction(tx);
    }
    setTxs(p => { queueSync([tx]); return p.map(x => x.id === tx.id ? tx : x); });
    setPage('transactions');
  };

  // ── Delete single transaction ─────────────────────────────────────────────
  const delTx = (id) => {
    const removed = txs.find(x => x.id === id);
    if (!removed) return;
    setTxs(p => p.filter(x => x.id !== id));
    cloudDel(id);
    startUndo(t('Stavka obrisana'), () => {
      setTxs(p => [...p, removed]);
      queueSync([removed]);
    });
  };

  // ── Delete installment group ──────────────────────────────────────────────
  const delGrp = (g) => {
    const removed = txs.filter(x => x.installmentGroup === g);
    if (!removed.length) return;
    setTxs(p => p.filter(x => x.installmentGroup !== g));
    removed.forEach(r => cloudDel(r.id));
    startUndo(`${t('Grupa obrisana')} (${removed.length})`, () => {
      setTxs(p => [...p, ...removed]);
      queueSync(removed);
    });
  };

  // ── Delete draft ──────────────────────────────────────────────────────────
  const delDraft = (id) => {
    const removed = drafts.find(d => d.id === id);
    if (!removed) return;
    setDrafts(p => p.filter(d => d.id !== id));
    startUndo(t('Skica obrisana'), () => setDrafts(p => [...p, removed]));
  };

  return { addTx, updTx, delTx, delGrp, delDraft };
}
