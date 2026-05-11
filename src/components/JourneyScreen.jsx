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

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: color || 'var(--color-text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StepRow({ step, isCurrent, isDone, progress, t }) {
  const statusColor = isDone
    ? 'var(--color-text-success)'
    : isCurrent
    ? 'var(--color-text-info)'
    : 'var(--color-text-tertiary)';
  const bgColor = isDone
    ? 'var(--color-background-success)'
    : isCurrent
    ? 'var(--color-background-info)'
    : 'var(--color-background-secondary)';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, marginTop: 2 }}>
        {isDone ? '✓' : step.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: isDone || isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
            {t(step.name)}
          </span>
          {isCurrent && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
              {t('U tijeku')}
            </span>
          )}
          {isDone && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--color-background-success)', color: 'var(--color-text-success)' }}>
              {t('Završeno')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: isCurrent && progress > 0 ? 6 : 0 }}>
          {t(step.desc)}
        </div>
        {isCurrent && progress > 0 && (
          <div>
            <ProgressBar pct={progress} color="var(--color-border-info)" height={4} />
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 3 }}>{progress}%</div>
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
      <StickyHeader C={C} icon="route" title={t('Financijski put')}
        right={
          <button onClick={() => setShowQuiz(true)}
            style={{ background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: '6px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ic n="edit" s={13} c={C.textMuted}/>{t('Ažuriraj podatke')}
          </button>
        }
      />

      <div style={{ padding: '12px 16px 0' }}>

        {/* ── Score + stepenica header ──────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.cardAlt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px solid ${scoreColor}` }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{journeyScore}</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>/100</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>{t('Trenutna stepenica')}</div>
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
                {t('2-min. quiz')}
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
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t('7 stepenica')}</span>
            <Ic n="chevron-down" s={14} c={C.textMuted} style={{ transform: expandedSection === 'steps' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
          </button>
          {expandedSection === 'steps' && (
            <div style={{ padding: '0 16px 12px' }}>
              {STEPS.map(step => (
                <StepRow
                  key={step.id}
                  step={step}
                  isCurrent={step.id === currentStep}
                  isDone={step.id < currentStep}
                  progress={step.id === currentStep ? stepProgress : 0}
                  t={t}
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
    </div>
  );
}

export default JourneyScreen;
