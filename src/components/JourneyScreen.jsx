// ─── JourneyScreen — Financijski suputnik ─────────────────────────────────────
// Prikazuje korisnikovu stepenicu, napredak, money maturity i sljedeće akcije.
// Ovisi o useJourney hooku koji radi svu matematiku.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Ic, StickyHeader } from '../ui.jsx';
import { useJourney, STEPS } from '../hooks/useJourney.js';
import { fmtEur } from '../lib/helpers.js';

// ── Onboarding Quiz ───────────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    id: 'emergencyFund',
    q: 'Koliko imaš trenutno u štednji / hitnom fondu?',
    qEN: 'How much do you have in savings / emergency fund?',
    type: 'amount',
    hint: '€ — tekući i štedni račun koji možeš odmah podignuti',
  },
  {
    id: 'expensiveDebt',
    q: 'Imaš li dugova s kamatom višom od 6%?',
    qEN: 'Do you have debt with interest above 6%?',
    type: 'amount_optional',
    hint: 'Kreditne kartice, potrošački krediti, minusi — ako nemaš, ostavi 0',
  },
  {
    id: 'investingMonthly',
    q: 'Koliko ulažeš svaki mjesec? (ZPDŠ, ETF, dionice)',
    qEN: 'How much do you invest monthly? (pension fund, ETF, stocks)',
    type: 'amount_optional',
    hint: 'Ako još ne ulažeš, ostavi 0',
  },
];

// ── Pomoćne komponente ────────────────────────────────────────────────────────

function ProgressBar({ pct, color, height = 6 }) {
  return (
    <div style={{ height, background: 'var(--color-background-secondary)', borderRadius: height }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color || 'var(--color-border-info)',
        borderRadius: height,
        transition: 'width .5s ease',
      }}/>
    </div>
  );
}

// ── Step detail descriptions (bilingual) ─────────────────────────────────────
const STEP_DETAILS = [
  {
    id: 0,
    hr: `Razumij točno kamo ide tvoj novac. Unesi sve redovne prihode i troškove, pregled obveza i dugova. Ovaj korak ti daje jasnu sliku — bez toga ne možeš planirati sljedeće.

Što napraviti:
• Unesi sve redovne prihode (plaća, najamnina, freelance)
• Unesi sve fiksne troškove (stanarina, kredit, pretplate)
• Dodaj sve dugove — koliko duguješ i po kojoj kamati
• Koristi kategorije troškova za detaljan pregled`,
    en: `Understand exactly where your money goes. Enter all recurring income and expenses, obligations and debts. This step gives you a clear picture — without it you can't plan the next steps.

What to do:
• Enter all recurring income (salary, rent, freelance)
• Enter all fixed expenses (rent, loan, subscriptions)
• Add all debts — how much you owe and at what rate
• Use expense categories for a detailed breakdown`,
  },
  {
    id: 1,
    hr: `Cilj je imati 2.500 € likvidne štednje dostupne odmah. Ovo je tvoj financijski "air bag" — štiti te od neočekivanih troškova (popravak auta, liječnik, hitni troškovi) bez ulaska u dug.

Što napraviti:
• Svaki mjesec odvoji minimalno 10% prihoda na štedni račun
• Ne diraj ovaj novac osim za prave hitne slučajeve
• Drži na tekućem ili štednom računu — ne na investicijama
• Jednom kad dostigneš cilj, prelazi na korak 3`,
    en: `The goal is to have €2,500 in liquid savings available immediately. This is your financial "air bag" — it protects you from unexpected costs (car repair, medical, emergencies) without going into debt.

What to do:
• Set aside at least 10% of income monthly to a savings account
• Don't touch this money except for genuine emergencies
• Keep it in a current or savings account — not investments
• Once you reach the goal, move to step 3`,
  },
  {
    id: 2,
    hr: `Otplati sve dugove s kamatom višom od 6% što je brže moguće. Kreditne kartice (15-25% kamata) i potrošački krediti su financijski "crne rupe" koje troše više nego što možeš zaraditi ulaganjem.

Što napraviti:
• Napravi popis svih dugova s kamatama
• Koristi "avalanche" metodu — plaćaj minimum na sve, a ostatak na dug s najvišom kamatom
• Ne uzimaj nove dugove dok ne otplatiš ove
• Kad otplatiš, taj isti iznos usmjeri na štednju`,
    en: `Pay off all debts with interest above 6% as fast as possible. Credit cards (15-25% interest) and consumer loans are financial "black holes" that cost more than you can earn from investing.

What to do:
• List all debts with their interest rates
• Use the "avalanche" method — pay minimum on all, extra on highest-rate debt
• Don't take on new debt while paying these off
• Once paid, redirect that same amount to savings`,
  },
  {
    id: 3,
    hr: `Proširi sigurnosni jastuk na 6 punih mjeseci troškova. Ako izgubiš posao ili dođe do veće krize, ovo ti daje dovoljno vremena bez finansijskog stresa.

Što napraviti:
• Izračunaj svoju prosječnu mjesečnu potrošnju
• Pomnoži s 6 — to je tvoj cilj
• Odvajaj 15-20% prihoda dok ne dostigneš cilj
• Drži na odvojenom računu s boljom kamatom (npr. Treasury fond)`,
    en: `Expand your emergency fund to cover 6 full months of expenses. If you lose your job or face a major crisis, this gives you enough time without financial stress.

What to do:
• Calculate your average monthly spending
• Multiply by 6 — that is your target
• Set aside 15-20% of income until you reach the goal
• Keep in a separate account with better interest (e.g. money market)`,
  },
  {
    id: 4,
    hr: `Počni graditi bogatstvo kroz ulaganja. ZPDŠ i ETF fondovi su osnova — daju ti pristup globalnom tržištu uz minimalne naknade i porezne prednosti.

Što napraviti:
• Otvori ZPDŠ (III. stup mirovinskog) ako nemaš — do 663 € godišnje je porezno odbitno
• Otvori investicijski račun (npr. IBKR, Trading 212) za ETF
• Ulaži 10-15% prihoda u S&P 500 ili world ETF (npr. VWCE)
• Ne pokušavaj "tajmati" tržište — ulaži svaki mjesec bez iznimke`,
    en: `Start building wealth through investments. Pension funds and ETFs are the foundation — they give you access to global markets with minimal fees and tax advantages.

What to do:
• Open a supplementary pension (3rd pillar) if you don't have one — up to €663/year is tax-deductible
• Open a brokerage account (e.g. IBKR, Trading 212) for ETFs
• Invest 10-15% of income in S&P 500 or world ETF (e.g. VWCE)
• Don't try to "time" the market — invest every month without exception`,
  },
  {
    id: 5,
    hr: `Odluči između bržeg otplaćivanja stambenog kredita i pojačavanja ulaganja. Ovo je osobna odluka koja ovisi o kamati kredita i tvojoj toleranciji na rizik.

Što napraviti:
• Ako je kamata kredita > 4%: razmisli o prijevremenoj otplati
• Ako je kamata kredita < 3%: ulaganje vjerojatno donosi više
• Između 3-4%: kombiniraj — pola na kredit, pola na ulaganja
• Prilagodi strategiju prema trenutnim kamatnim stopama`,
    en: `Decide between paying off your mortgage faster and ramping up investments. This is a personal decision depending on your loan rate and risk tolerance.

What to do:
• If loan rate > 4%: consider early repayment
• If loan rate < 3%: investing likely yields more
• Between 3-4%: split — half to loan, half to investments
• Adjust your strategy based on current interest rates`,
  },
  {
    id: 6,
    hr: `Ulaži 20%+ prihoda i gradi pasivne izvore zarade. Na ovoj razini novac počinje raditi za tebe više nego ti za njega.

Što napraviti:
• Povećaj udio ulaganja na 20-30% prihoda
• Razmotr nekretninu za najam kao dodatni prihod
• Diversificiraj: ETF, obveznice, nekretnine, dividendne dionice
• Reinvestiraj sve dividende i prihode — složeni rast je ključan`,
    en: `Invest 20%+ of income and build passive income streams. At this level, money starts working harder for you than you for it.

What to do:
• Increase investment share to 20-30% of income
• Consider rental property as additional income
• Diversify: ETFs, bonds, real estate, dividend stocks
• Reinvest all dividends and income — compound growth is key`,
  },
  {
    id: 7,
    hr: `Dostigao si financijsku slobodu — tvoji pasivni prihodi pokrivaju troškove. Sada je fokus na planiranju nasljeđa i ostavljanju traga.

Što napraviti:
• Napravi oporuku i plan nasljeđivanja
• Razmisli o darovima i donacijama za života
• Postavi automatske investicije za djecu/unuke
• Dokumentiraj sve — računi, ulaganja, upute za obitelj`,
    en: `You have achieved financial freedom — your passive income covers expenses. The focus now is on legacy planning and leaving a lasting impact.

What to do:
• Create a will and inheritance plan
• Consider gifts and donations during your lifetime
• Set up automatic investments for children/grandchildren
• Document everything — accounts, investments, family instructions`,
  },
];

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: color || 'var(--color-text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StepDetailModal({ step, detail, C, t, lang, onClose }) {
  if (!step || !detail) return null;
  const stepNum = step.id + 1;
  const name = lang === 'en' ? (step.nameEN || step.name) : step.name;
  const text = lang === 'en' ? detail.en : detail.hr;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:20, width:'100%', maxWidth:440, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,.4)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px 12px', borderBottom:`1px solid ${C.border}`, flexShrink:0, background:C.card }}>
          <div style={{ width:40, height:40, borderRadius:12, background:`${C.accent}20`, border:`1px solid ${C.accent}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
            {step.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, marginBottom:2, letterSpacing:.5, textTransform:'uppercase' }}>{t('Korak')} {stepNum} / 8</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, lineHeight:1.2 }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 11px', cursor:'pointer', fontSize:13, color:C.textMuted, fontWeight:700 }}>
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ overflowY:'auto', padding:'14px 18px 20px', flex:1, background:C.bg }}>
          {text.split('\n').map((line, i) => {
            if (line.startsWith('• ')) {
              return (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:7 }}>
                  <span style={{ color:C.accent, flexShrink:0, marginTop:1, fontWeight:700 }}>•</span>
                  <span style={{ fontSize:13, color:C.text, lineHeight:1.55 }}>{line.slice(2)}</span>
                </div>
              );
            }
            if (line === '') return <div key={i} style={{ height:10 }}/>;
            const isSectionHead = line.endsWith(':');
            return (
              <div key={i} style={{ fontSize: isSectionHead ? 11 : 13, fontWeight: isSectionHead ? 700 : 400, color: isSectionHead ? C.textMuted : C.text, lineHeight:1.6, marginBottom: isSectionHead ? 6 : 7, letterSpacing: isSectionHead ? .8 : 0, textTransform: isSectionHead ? 'uppercase' : 'none' }}>
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Redak pojedinog koraka (Cijeli redak je klikabilan gumb, bez "i" kružića) ──
function StepRow({ step, isCurrent, isDone, progress, t, onSelect, C }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Boje stanja mapirane iz centralne teme
  const statusColor = isDone
    ? (C.income || 'var(--color-text-success)')
    : isCurrent
    ? (C.accent || 'var(--color-text-info)')
    : (C.textMuted || 'var(--color-text-tertiary)');

  const statusBg = isDone
    ? `${C.income}15`
    : isCurrent
    ? `${C.accent}15`
    : (C.cardAlt || 'var(--color-background-secondary)');

  const stepNum = step.id + 1;

  return (
    <div
      onClick={() => onSelect(step)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => { setIsPressed(false); setIsHovered(false); }}
      onMouseEnter={() => setIsHovered(true)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      title={t('Više o ovom koraku')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '12px 10px',
        borderBottom: `1px solid ${C.border}40`,
        cursor: 'pointer',
        borderRadius: 12,
        backgroundColor: isPressed ? `${C.border}30` : isHovered ? `${C.border}12` : 'transparent',
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* Vizualni kvadratni Button s 3D efektom sjene (bez "i" kružića) */}
      <div
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 10,
          background: statusBg,
          border: `1.5px solid ${statusColor}`,
          boxShadow: isPressed 
            ? '0 1px 2px rgba(0,0,0,0.15), inset 0 2px 4px rgba(0,0,0,0.2)' 
            : '0 3px 6px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
          marginTop: 2,
          transition: 'transform .1s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isPressed ? 'scale(0.92)' : 'scale(1)',
        }}
      >
        <span style={{ color: isDone || isCurrent ? statusColor : C.textMuted, fontWeight: 600 }}>
          {isDone ? '✓' : step.icon}
        </span>
      </div>

      {/* Tekstualni detalji koraka */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, minWidth: 18 }}>{stepNum}.</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: isDone || isCurrent ? C.text : C.textMuted }}>
            {t(step.name)}
          </span>
          {isCurrent && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${C.accent}20`, color: C.accent, fontWeight: 500 }}>
              {t('U tijeku')}
            </span>
          )}
          {isDone && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${C.income}20`, color: C.income, fontWeight: 500 }}>
              {t('Završeno')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4, marginBottom: isCurrent && progress > 0 ? 8 : 0 }}>
          {t(step.desc)}
        </div>
        {isCurrent && progress > 0 && (
          <div style={{ marginTop: 6 }}>
            <ProgressBar pct={progress} color={C.accent} height={4} />
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>{progress}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Onboarding Quiz komponenta ────────────────────────────────────────────────
function QuizModal({ onSave, onDismiss, C, t }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);

  const q = QUIZ_QUESTIONS[step];
  const total = QUIZ_QUESTIONS.length;
  const val = answers[q.id] || '';

  const next = () => {
    if (step < total - 1) {
      setStep(s => s + 1);
    } else {
      const parsed = {};
      QUIZ_QUESTIONS.forEach(({ id }) => {
        parsed[id] = parseFloat(answers[id]) || 0;
      });
      onSave(parsed);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, maxWidth: 360, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>{t('Pitanje')} {step + 1} / {total}</div>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <ProgressBar pct={(step / total) * 100} color={C.accent} height={3} />
        <div style={{ marginTop: 20, marginBottom: 8, fontSize: 16, fontWeight: 500, color: C.text, lineHeight: 1.5 }}>
          {t(q.q)}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{q.hint}</div>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input
            type="number"
            min="0"
            step="100"
            value={val}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            placeholder="0"
            style={{ width: '100%', background: C.cardAlt, border: `1.5px solid ${C.accent}60`, borderRadius: 12, padding: '10px 40px 10px 14px', fontSize: 16, color: C.text, boxSizing: 'border-box' }}
            autoFocus
          />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 14 }}>€</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: '11px 0', background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, cursor: 'pointer' }}>
              ← {t('Natrag')}
            </button>
          )}
          <button onClick={next}
            style={{ flex: 2, padding: '11px 0', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {step < total - 1 ? t('Sljedeće') + ' →' : '✓ ' + t('Završi')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Glavni ekran ──────────────────────────────────────────────────────────────
export function JourneyScreen({ C, txs, lists, prefs, user, setPage, t, lang }) {
  const [selectedStep, setSelectedStep] = useState(null);
  const fmt = n => fmtEur(n, prefs?.currency);
  const [showQuiz, setShowQuiz] = useState(false);
  const [expandedSection, setExpandedSection] = useState('steps'); // steps | money | actions | badges

  const journey = useJourney({ txs, lists, prefs, user });

  const {
    currentStep, stepProgress, journeyScore,
    monthlyIncome, monthlyExpense, savingsRate, freeCash,
    emergencyFund, emergencyTarget,
    moneyAge, moneyAgeStatus,
    streak, unlockedBadges, nextActions,
    saveJourneyData, hasQuizData,
  } = journey;

  const moneyAgeColor =
    moneyAgeStatus === 'secure'     ? C.income :
    moneyAgeStatus === 'stable'     ? C.income :
    moneyAgeStatus === 'developing' ? C.warning :
    moneyAgeStatus === 'critical'   ? C.expense : C.textMuted;

  const scoreColor =
    journeyScore >= 70 ? C.income :
    journeyScore >= 40 ? C.warning : C.expense;

  const toggle = (s) => setExpandedSection(v => v === s ? null : s);

  return (
    <div className="fi" style={{ width: '100%', paddingBottom: 80 }}>
      <StickyHeader C={C} icon="run" title={t('Trening')}
        center={
          <button onClick={() => setShowQuiz(true)}
            style={{ background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: '6px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <Ic n="edit" s={13} c={C.textMuted}/>{t('Ažuriraj podatke')}
          </button>
        }
        right={
          <button onClick={() => setPage('dashboard')}
            style={{ background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: '6px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {t('Natrag')}
          </button>
        }
      />

      <div style={{ padding: '12px 16px 0' }}>

        {/* ── Score + korak header ──────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.cardAlt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px solid ${scoreColor}` }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{journeyScore}</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>/100</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>{t('Trenutni korak')}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>{STEPS[currentStep]?.icon} {t(STEPS[currentStep]?.name)}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{t(STEPS[currentStep]?.desc)}</div>
            </div>
          </div>
          {stepProgress > 0 && stepProgress < 100 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
                <span>{t('Napredak prema stepenici')} {currentStep + 1}</span>
                <span>{stepProgress}%</span>
              </div>
              <ProgressBar pct={stepProgress} color={C.accent} height={6} />
            </div>
          )}
          {!hasQuizData && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: `${C.warning}18`, border: `1px solid ${C.warning}40`, borderRadius: 10, fontSize: 12, color: C.warning }}>
              💡 {t('Dodaj podatke o štednji i dugovima za precizniji izračun')} →{' '}
              <span style={{ fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowQuiz(true)}>
                {t('2-min. kviz')}
              </span>
            </div>
          )}
        </div>

        {/* ── Metrike ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <MetricCard label={t('Starost novca')} value={`${moneyAge} ${t('dana')}`} sub={moneyAge >= 30 ? t('Stabilan') : moneyAge >= 14 ? t('U razvoju') : moneyAge > 0 ? t('Kritično') : '—'} color={moneyAgeColor} />
          <MetricCard label={t('Stopa štednje')} value={`${savingsRate}%`} sub={savingsRate >= 20 ? t('Odlično') : savingsRate >= 10 ? t('Dobro') : t('Povećaj')} color={savingsRate >= 20 ? C.income : savingsRate >= 10 ? C.warning : C.expense} />
          <MetricCard label={t('Streak')} value={`${streak} ${t('dana')}`} sub={t('Uzastopno praćenje')} />
          <MetricCard label={t('Slobodan novac')} value={fmt(freeCash)} sub={t('ovaj mj.')} color={freeCash > 0 ? C.income : C.expense} />
        </div>

        {/* ── Sekcija: Stepenice ────────────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
          <button onClick={() => toggle('steps')} type="button"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t('7 koraka')}</span>
            <Ic n="chevron-down" s={14} c={C.textMuted} style={{ transform: expandedSection === 'steps' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
          </button>
          {expandedSection === 'steps' && (
            <div style={{ padding: '0 10px 12px' }}>
              {STEPS.map(step => (
                <StepRow
                  key={step.id}
                  step={step}
                  isCurrent={step.id === currentStep}
                  isDone={step.id < currentStep}
                  progress={step.id === currentStep ? stepProgress : 0}
                  t={t}
                  onSelect={setSelectedStep}
                  C={C}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sekcija: Starost novca ────────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
          <button onClick={() => toggle('money')} type="button"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>⏳ {t('Starost novca')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: moneyAgeColor }}>{moneyAge} {t('dana')}</span>
              <Ic n="chevron-down" s={14} c={C.textMuted} style={{ transform: expandedSection === 'money' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
            </div>
          </button>
          {expandedSection === 'money' && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                {t('Prosječan broj dana između primitka i trošenja novca. Što je veći broj, to si financijski stabilniji i manje ovisan o idućoj plaći.')}
              </div>
              <div style={{ marginBottom: 8 }}>
                <ProgressBar pct={Math.min(100, (moneyAge / 60) * 100)} color={moneyAgeColor} height={8} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  { range: '0–7 dana', label: t('Krizna zona'), color: C.expense, active: moneyAge < 8 },
                  { range: '8–29 dana', label: t('U razvoju'), color: C.warning, active: moneyAge >= 8 && moneyAge < 30 },
                  { range: '30+ dana', label: t('Stabilan'), color: C.income, active: moneyAge >= 30 },
                ].map(z => (
                  <div key={z.range} style={{ background: z.active ? `${z.color}18` : C.cardAlt, border: `${z.active ? '1.5' : '0.5'}px solid ${z.active ? z.color + '60' : C.border}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>{z.range}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: z.active ? z.color : C.textMuted }}>{z.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sekcija: Sljedeći koraci ──────────────────────────────────── */}
        {nextActions.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => toggle('actions')} type="button"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>🎯 {t('Sljedeći koraci')}</span>
              <Ic n="chevron-down" s={14} c={C.textMuted} style={{ transform: expandedSection === 'actions' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
            </button>
            {expandedSection === 'actions' && (
              <div style={{ padding: '0 16px 12px' }}>
                {nextActions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < nextActions.length - 1 ? `0.5px solid ${C.border}` : 'none' }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3, marginTop: 1 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 3 }}>{t(a.title)}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{a.body}</div>
                      {a.cta && a.action === 'add_tx' && (
                        <button onClick={() => setPage('add')} type="button"
                          style={{ marginTop: 8, padding: '5px 14px', background: `${C.accent}18`, border: `1px solid ${C.accent}40`, borderRadius: 20, fontSize: 11, color: C.accent, cursor: 'pointer', fontWeight: 500 }}>
                          {t(a.cta)} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sekcija: Badges ───────────────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
          <button onClick={() => toggle('badges')} type="button"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>🏅 {t('Moja postignuća')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>{unlockedBadges.length} / 10</span>
              <Ic n="chevron-down" s={14} c={C.textMuted} style={{ transform: expandedSection === 'badges' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
            </div>
          </button>
          {expandedSection === 'badges' && (
            <div style={{ padding: '0 16px 16px' }}>
              {unlockedBadges.length === 0 && (
                <div style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic', padding: '8px 0' }}>
                  {t('Dodaj transakcije da otključaš prva postignuća.')}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {unlockedBadges.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: `${C.income}18`, border: `1px solid ${C.income}40`, fontSize: 12, color: C.income, fontWeight: 500 }}>
                    <span style={{ fontSize: 14 }}>{b.icon}</span>
                    {t(b.name)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Quiz Modal ───────────────────────────────────────────────────── */}
      {showQuiz && (
        <QuizModal
          C={C}
          t={t}
          onSave={(data) => { saveJourneyData(data); setShowQuiz(false); }}
          onDismiss={() => setShowQuiz(false)}
        />
      )}

      {/* ── Step Detail Modal ─────────────────────────────────────────── */}
      {selectedStep !== null && (
        <StepDetailModal
          step={selectedStep}
          detail={STEP_DETAILS.find(d => d.id === selectedStep.id)}
          C={C}
          t={t}
          lang={lang}
          onClose={() => setSelectedStep(null)}
        />
      )}
    </div>
  );
}

export default JourneyScreen;
