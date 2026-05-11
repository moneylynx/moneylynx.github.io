// ─── useJourney — Financijski suputnik ───────────────────────────────────────
//
// Ovaj hook je "mozak" Journey modula. Analizira postojeće podatke korisnika
// (transakcije, prihodi, dugovi, štednja) i automatski određuje:
//
//   1. Na kojoj je stepenici korisnik (0–7)
//   2. Starost novca u danima (Money Maturity)
//   3. Koji konkretni koraci su sljedeći
//   4. Badges koje je korisnik zaslužio
//   5. Journey score (0–100)
//
// NE zahtijeva nikakav ručni unos — sve računa iz podataka koji već postoje.
// Korisnik može opcionalno dodati informacije (iznos dugova, štedni račun)
// kroz jednostavan onboarding quiz koji traje 2 minute.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { save, load } from '../lib/helpers.js';

const JOURNEY_KEY = 'ml_journey';

// ── Konstante ─────────────────────────────────────────────────────────────────

// Iznosi prilagođeni HR/EU kontekstu (2026.)
const STEP1_TARGET = 2500;   // € — sigurnosni jastuk (≈ 1 plaća)
const STEP2_RATE   = 0.06;   // 6% — granica "skupog" duga
const STEP3_MONTHS = 6;      // 6 mjeseci troškova = puni hitni fond
const INVEST_RATE  = 0.15;   // 15% prihoda = optimalno ulaganje
const MONEY_AGE_STABLE = 30; // 30+ dana = stabilan
const MONEY_AGE_SECURE = 60; // 60+ dana = siguran

// ── Stepenice ─────────────────────────────────────────────────────────────────
export const STEPS = [
  {
    id: 0,
    name: 'Pregled stanja',
    nameEN: 'Financial overview',
    desc: 'Mapa prihoda, troškova i dugova',
    descEN: 'Map of income, expenses and debts',
    icon: '🗺️',
    category: 'foundation',
  },
  {
    id: 1,
    name: 'Sigurnosni jastuk',
    nameEN: 'Starter emergency fund',
    desc: `${STEP1_TARGET.toLocaleString('hr-HR')} € likvidne štednje`,
    descEN: `${STEP1_TARGET.toLocaleString('en-EU')} € in liquid savings`,
    icon: '🛡️',
    category: 'safety',
    target: STEP1_TARGET,
  },
  {
    id: 2,
    name: 'Skupi dugovi',
    nameEN: 'Eliminate costly debt',
    desc: 'Sve obveze s kamatom >6%',
    descEN: 'All obligations above 6% interest',
    icon: '⚡',
    category: 'debt',
  },
  {
    id: 3,
    name: 'Puni hitni fond',
    nameEN: 'Full emergency fund',
    desc: '6 mjeseci troškova u gotovini',
    descEN: '6 months of expenses in cash',
    icon: '🏦',
    category: 'safety',
  },
  {
    id: 4,
    name: 'Osnovna ulaganja',
    nameEN: 'Start investing',
    desc: 'ZPDŠ + ETF, 10–15% prihoda',
    descEN: 'Pension fund + ETF, 10–15% of income',
    icon: '📈',
    category: 'investing',
  },
  {
    id: 5,
    name: 'Otplata umjerenih dugova',
    nameEN: 'Pay moderate debt',
    desc: 'Stambeni kredit ili pojačaj ulaganja',
    descEN: 'Mortgage payoff vs. investment tradeoff',
    icon: '🏠',
    category: 'debt',
  },
  {
    id: 6,
    name: 'Bogatstvo',
    nameEN: 'Build wealth',
    desc: '20%+ prihoda u ulaganja, pasivni prihodi',
    descEN: '20%+ of income invested, passive income',
    icon: '🌱',
    category: 'wealth',
  },
  {
    id: 7,
    name: 'Nasljeđe i sloboda',
    nameEN: 'Legacy & freedom',
    desc: 'Financijska sloboda, planiranje nasljeđa',
    descEN: 'Financial freedom, estate planning',
    icon: '✨',
    category: 'legacy',
  },
];

// ── Badges ────────────────────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id: 'first_tx',     name: 'Prva transakcija',    nameEN: 'First transaction',    icon: '💳', condition: (d) => d.totalTx >= 1 },
  { id: 'week_streak',  name: '7 dana praćenja',     nameEN: '7 day streak',         icon: '🔥', condition: (d) => d.streak >= 7 },
  { id: 'month_streak', name: '30 dana praćenja',    nameEN: '30 day streak',        icon: '🏅', condition: (d) => d.streak >= 30 },
  { id: 'step1_done',   name: 'Jastuk postavljen',   nameEN: 'Buffer achieved',      icon: '🛡️', condition: (d) => d.step >= 2 },
  { id: 'step2_done',   name: 'Bez skupih dugova',   nameEN: 'No costly debt',       icon: '⚡', condition: (d) => d.step >= 3 },
  { id: 'step3_done',   name: 'Hitni fond završen',  nameEN: 'Emergency fund done',  icon: '🏦', condition: (d) => d.step >= 4 },
  { id: 'saver',        name: 'Štediša',             nameEN: 'Saver',                icon: '💰', condition: (d) => d.savingsRate >= 10 },
  { id: 'super_saver',  name: 'Super štediša',       nameEN: 'Super saver',          icon: '🚀', condition: (d) => d.savingsRate >= 20 },
  { id: 'mature_money', name: 'Stabilan novac',      nameEN: 'Stable money',         icon: '⏳', condition: (d) => d.moneyAge >= MONEY_AGE_STABLE },
  { id: 'secure_money', name: 'Siguran novac',       nameEN: 'Secure money',         icon: '🔒', condition: (d) => d.moneyAge >= MONEY_AGE_SECURE },
];

// ── Pomoćne funkcije ───────────────────────────────────────────────────────────

/**
 * Izračunava prosječnu "starost novca" u danima.
 *
 * Logika: Za svaku isplatu, pronalazimo koji je primitak "platio" tu isplatu
 * (FIFO redoslijed) i računamo razliku u danima. Prosječna razlika = Money Age.
 *
 * Zašto je ovo važno: Ako trošiš novac 3 dana nakon primitka — živiš od plaće
 * do plaće. Ako trošiš novac koji si zaradio 45 dana ranije — imaš buffer.
 */
function calcMoneyAge(txs) {
  const year = new Date().getFullYear();
  const recent = txs.filter(t => new Date(t.date).getFullYear() >= year - 1);

  const income  = recent.filter(t => t.type === 'Primitak' && t.status === 'Plaćeno')
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const expense = recent.filter(t => t.type === 'Isplata' && t.status === 'Plaćeno')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!income.length || !expense.length) return 0;

  // FIFO matching
  const ages = [];
  let incomeQ = income.map(t => ({ date: new Date(t.date), amount: parseFloat(t.amount) || 0 }));
  let pool = 0, poolDate = incomeQ[0]?.date;
  let iIdx = 0;

  for (const exp of expense) {
    const expDate = new Date(exp.date);
    const expAmt  = parseFloat(exp.amount) || 0;

    // Fill pool from income received before this expense
    while (iIdx < incomeQ.length && incomeQ[iIdx].date <= expDate) {
      pool += incomeQ[iIdx].amount;
      poolDate = incomeQ[iIdx].date;
      iIdx++;
    }

    if (pool > 0) {
      const ageDays = Math.round((expDate - poolDate) / 86400000);
      ages.push(Math.max(0, ageDays));
      pool = Math.max(0, pool - expAmt);
    }
  }

  if (!ages.length) return 0;
  return Math.round(ages.reduce((s, a) => s + a, 0) / ages.length);
}

/**
 * Izračunava prosječne MJESEČNE troškove (zadnjih 3 mj.)
 */
function avgMonthlyExpenses(txs) {
  const now = new Date();
  const months = [0, 1, 2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const totals = months.map(ym =>
    txs
      .filter(t => t.type === 'Isplata' && t.status === 'Plaćeno' && t.date?.startsWith(ym))
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  ).filter(v => v > 0);

  return totals.length ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
}

/**
 * Izračunava prosječne MIESEČNE prihode (zadnjih 3 mj.)
 */
function avgMonthlyIncome(txs) {
  const now = new Date();
  const months = [0, 1, 2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const totals = months.map(ym =>
    txs
      .filter(t => t.type === 'Primitak' && t.status === 'Plaćeno' && t.date?.startsWith(ym))
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  ).filter(v => v > 0);

  return totals.length ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
}

/**
 * Izračunava streak — koliko uzastopnih dana (ili tjedana) korisnik prati.
 */
function calcStreak(txs) {
  if (!txs.length) return 0;
  const dates = [...new Set(txs.map(t => t.date?.split('T')[0]).filter(Boolean))].sort().reverse();
  if (!dates.length) return 0;

  let streak = 0;
  let current = new Date(dates[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow 1 day gap
  const diffToToday = Math.round((today - current) / 86400000);
  if (diffToToday > 1) return streak;

  for (let i = 0; i < dates.length - 1; i++) {
    const a = new Date(dates[i]);
    const b = new Date(dates[i + 1]);
    const diff = Math.round((a - b) / 86400000);
    if (diff <= 7) { // weekly tracking is fine
      streak++;
    } else {
      break;
    }
  }
  return streak + 1;
}

// ── Glavni hook ────────────────────────────────────────────────────────────────
export function useJourney({ txs = [], lists = {}, prefs = {}, user = {} } = {}) {

  // Opcionalni podaci koje korisnik unosi kroz quiz
  const journeyData = useMemo(() => load(JOURNEY_KEY, {}), []);

  const result = useMemo(() => {
    // ── 1. Osnovne metrike ───────────────────────────────────────────────────
    const monthlyIncome  = avgMonthlyIncome(txs);
    const monthlyExpense = avgMonthlyExpenses(txs);
    const savingsRate    = monthlyIncome > 0
      ? Math.round((monthlyIncome - monthlyExpense) / monthlyIncome * 100)
      : 0;
    const moneyAge  = calcMoneyAge(txs);
    const streak    = calcStreak(txs);
    const totalTx   = txs.length;

    // Prihodi i troškovi ove godine
    const year = new Date().getFullYear();
    const yearTxs = txs.filter(t => new Date(t.date).getFullYear() === year);
    const yearIncome  = yearTxs.filter(t => t.type === 'Primitak').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const yearExpense = yearTxs.filter(t => t.type === 'Isplata' && t.status === 'Plaćeno').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    // Slobodan novac (netto ovog mj.)
    const freeCash = Math.max(0, yearIncome - yearExpense);

    // Ciljni puni hitni fond (6 mj. prosj. troškova)
    const emergencyTarget = Math.round(monthlyExpense * STEP3_MONTHS);

    // Korisnikovi opcionalni podaci (iz quiza)
    const emergencyFund  = journeyData.emergencyFund  || 0;   // € u štednji
    const totalExpDebt   = journeyData.expensiveDebt  || 0;   // € skupih dugova
    const investingAmt   = journeyData.investingMonthly || 0; // € mj. ulaganja

    // ── 2. Određivanje stepenice ─────────────────────────────────────────────
    let currentStep = 0;
    let stepProgress = 0; // 0–100% napretka prema sljedećoj stepenici

    if (totalTx === 0) {
      // Nema podataka — korisnik tek počinje
      currentStep = 0;
      stepProgress = 0;
    } else if (emergencyFund < STEP1_TARGET) {
      // Stepenica 1: skupi sigurnosni jastuk
      currentStep = 1;
      stepProgress = Math.round(Math.min(100, (emergencyFund / STEP1_TARGET) * 100));
    } else if (totalExpDebt > 0) {
      // Stepenica 2: skupi dugovi još postoje
      currentStep = 2;
      stepProgress = 0; // Korisnik mora pratiti otplatu
    } else if (emergencyTarget > 0 && emergencyFund < emergencyTarget) {
      // Stepenica 3: puni hitni fond
      currentStep = 3;
      stepProgress = Math.round(Math.min(100, (emergencyFund / emergencyTarget) * 100));
    } else if (savingsRate < INVEST_RATE * 100) {
      // Stepenica 4: još ne ulažemo dovoljno
      currentStep = 4;
      stepProgress = Math.round(Math.min(100, (savingsRate / (INVEST_RATE * 100)) * 100));
    } else if (journeyData.moderateDebt > 0 && !journeyData.step5done) {
      // Stepenica 5: umjereni dugovi (opcija korisnika)
      currentStep = 5;
      stepProgress = 0;
    } else if (savingsRate < 20) {
      // Stepenica 6: gradimo bogatstvo
      currentStep = 6;
      stepProgress = Math.round(Math.min(100, (savingsRate / 20) * 100));
    } else {
      // Stepenica 7: nasljeđe
      currentStep = 7;
      stepProgress = 100;
    }

    // ── 3. Journey score (0–100) ─────────────────────────────────────────────
    // Kompozitna ocjena: stepenica (50%) + money age (25%) + streak (25%)
    const stepScore    = Math.round((currentStep / 7) * 50);
    const ageScore     = Math.round(Math.min(25, (moneyAge / 60) * 25));
    const streakScore  = Math.round(Math.min(25, (streak / 30) * 25));
    const journeyScore = stepScore + ageScore + streakScore;

    // ── 4. Sljedeći koraci (konkretni) ──────────────────────────────────────
    const nextActions = generateNextActions({
      currentStep, emergencyFund, emergencyTarget, totalExpDebt,
      savingsRate, monthlyIncome, monthlyExpense, freeCash,
      moneyAge, investingAmt,
    });

    // ── 5. Badges ────────────────────────────────────────────────────────────
    const metricsForBadges = { totalTx, streak, step: currentStep, savingsRate, moneyAge };
    const unlockedBadges = BADGE_DEFS.filter(b => b.condition(metricsForBadges));

    // ── 6. Money Age opis ────────────────────────────────────────────────────
    const moneyAgeStatus =
      moneyAge === 0    ? 'unknown' :
      moneyAge < 7      ? 'critical' :
      moneyAge < MONEY_AGE_STABLE ? 'developing' :
      moneyAge < MONEY_AGE_SECURE ? 'stable' : 'secure';

    return {
      // Stepenice
      currentStep,
      stepProgress,
      steps: STEPS,

      // Score
      journeyScore,

      // Metrike
      monthlyIncome,
      monthlyExpense,
      savingsRate,
      freeCash,
      emergencyFund,
      emergencyTarget,
      totalExpDebt,
      investingAmt,

      // Money Maturity
      moneyAge,
      moneyAgeStatus,
      moneyAgeGoal: MONEY_AGE_STABLE,

      // Streak i aktivnost
      streak,
      totalTx,

      // Akcije i gamifikacija
      nextActions,
      unlockedBadges,

      // Opcionalni podaci iz quiza
      journeyData,
      hasQuizData: Object.keys(journeyData).length > 0,
    };
  }, [txs, lists, prefs, user, journeyData]);

  // ── Spremi journey quiz podatke ───────────────────────────────────────────
  const saveJourneyData = (data) => {
    const merged = { ...journeyData, ...data, updatedAt: new Date().toISOString() };
    save(JOURNEY_KEY, merged);
  };

  return { ...result, saveJourneyData };
}

// ── Generiranje konkretnih sljedećih koraka ───────────────────────────────────
function generateNextActions({ currentStep, emergencyFund, emergencyTarget, totalExpDebt,
  savingsRate, monthlyIncome, monthlyExpense, freeCash, moneyAge, investingAmt }) {

  const actions = [];
  const monthly = monthlyIncome;

  switch (currentStep) {
    case 0:
      actions.push({
        priority: 1,
        title: 'Dodaj prvu transakciju',
        body: 'Počni pratiti prihode i troškove — to je sve što trebaš na početku.',
        cta: 'Dodaj transakciju',
        action: 'add_tx',
        icon: '💳',
      });
      break;

    case 1: {
      const needed = STEP1_TARGET - emergencyFund;
      const months = monthly > monthlyExpense ? Math.ceil(needed / (monthly - monthlyExpense)) : '?';
      actions.push({
        priority: 1,
        title: `Skupi još ${needed.toLocaleString('hr-HR', { minimumFractionDigits: 0 })} €`,
        body: `Ostavljaj slobodni novac dok ne dostigneš ${STEP1_TARGET.toLocaleString('hr-HR')} €. Uz sadašnje stanje: ${months} mj.`,
        cta: 'Postavi cilj štednje',
        action: 'set_savings_goal',
        icon: '🛡️',
      });
      break;
    }

    case 2:
      actions.push({
        priority: 1,
        title: 'Napadni najskuplji dug',
        body: `Imaš ${totalExpDebt.toLocaleString('hr-HR')} € skupih dugova. Svaki EUR koji priložiš štedi te kamatu >6%.`,
        cta: 'Unesi dug u tracker',
        action: 'track_debt',
        icon: '⚡',
      });
      if (freeCash > 0) {
        actions.push({
          priority: 2,
          title: `Usmjeri ${Math.round(freeCash * 0.5).toLocaleString('hr-HR')} € prema dugu`,
          body: 'Pola slobodnog novca ovog mjeseca možeš odmah iskoristiti za otplatu.',
          icon: '🎯',
        });
      }
      break;

    case 3: {
      const needed3 = emergencyTarget - emergencyFund;
      actions.push({
        priority: 1,
        title: `Puni fond: još ${needed3.toLocaleString('hr-HR', { minimumFractionDigits: 0 })} €`,
        body: `Cilj: ${(emergencyTarget).toLocaleString('hr-HR')} € (6 mj. troškova od ${Math.round(monthlyExpense).toLocaleString('hr-HR')} €/mj.)`,
        icon: '🏦',
      });
      break;
    }

    case 4: {
      const zpdsPotential = Math.round(monthly * 0.1);
      actions.push({
        priority: 1,
        title: 'Otvori ZPDŠ fond',
        body: `Uplatom ${zpdsPotential.toLocaleString('hr-HR')} €/mj. dobivaš poreznu olakšicu 24% — to je garantirani "prinos" koji ETF teško premašuje.`,
        cta: 'Saznaj više o ZPDŠ',
        action: 'learn_zpdsh',
        icon: '🏛️',
      });
      actions.push({
        priority: 2,
        title: 'Postavi automatsko ulaganje u ETF',
        body: 'MSCI World ili S&P 500 index fondovi — niska naknada, globalna diversifikacija.',
        icon: '📈',
      });
      break;
    }

    case 5:
      actions.push({
        priority: 1,
        title: 'Izračunaj: otplata vs. ulaganje',
        body: 'Ako je kamata kredita <4%, ETF ulaganje može biti bolje. Ako je >4%, brža otplata ima smisla.',
        cta: 'Otvori kalkulator',
        action: 'debt_vs_invest',
        icon: '🏠',
      });
      break;

    case 6:
      actions.push({
        priority: 1,
        title: 'Povećaj stopu ulaganja na 20%+',
        body: `Trenutno štediš ${savingsRate}% prihoda. Svaki dodatni posto znači raniju financijsku slobodu.`,
        icon: '🌱',
      });
      break;

    case 7:
      actions.push({
        priority: 1,
        title: 'Financijska sloboda — planiranje nasljeđa',
        body: 'Razgovor s odvjetnikom o testamentu i obiteljskim financijama.',
        icon: '✨',
      });
      break;
  }

  // Dodaj money age akciju ako je loš
  if (moneyAge < 14 && moneyAge > 0 && currentStep >= 2) {
    actions.push({
      priority: 3,
      title: 'Povećaj starost novca',
      body: `Trošiš novac ${moneyAge} dana nakon primitka. Cilj je 30+ dana — to znači da nisi ovisan o idućoj plaći.`,
      icon: '⏳',
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
