const MLKIT_PLUGIN = 'ReceiptOcr';

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Ne mogu pročitati sliku računa.'));
  r.readAsDataURL(file);
});

const getNativePlugin = async () => {
  try {
    const mod = await import('@capacitor/core');
    const Capacitor = mod.Capacitor;
    const registerPlugin = mod.registerPlugin;
    if (!Capacitor?.isNativePlatform?.()) return null;
    return registerPlugin(MLKIT_PLUGIN);
  } catch {
    return null;
  }
};

const parseAmount = (text) => {
  const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const preferred = lines.filter(l => /(ukupno|total|za platiti|iznos|amount|sveukupno)/i.test(l));
  const candidates = [...preferred, ...lines].flatMap(line => {
    const matches = line.match(/(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{2})/g) || [];
    return matches.map(raw => ({ raw, line }));
  });
  const values = candidates.map(c => {
    const normalized = c.raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return { value: parseFloat(normalized), raw: c.raw, line: c.line };
  }).filter(x => isFinite(x.value) && x.value > 0 && x.value < 100000);
  if (!values.length) return null;
  const fromPreferred = values.find(v => preferred.includes(v.line));
  return fromPreferred || values.sort((a,b)=>b.value-a.value)[0];
};

const parseDate = (text) => {
  const s = String(text || '');
  const m = s.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  const iso = `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
};

const parseMerchant = (text) => {
  const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(l => l.length > 2);
  const blacklist = /(oib|iban|racun|račun|datum|vrijeme|ukupno|total|pdv|porez|stavka|kolic|količ|gotovina|kartica|visa|mastercard)/i;
  return lines.find(l => !blacklist.test(l) && /[A-Za-zČĆŽŠĐčćžšđ]/.test(l)) || '';
};

const guessCategory = (description, categories = []) => {
  const d = String(description || '').toLowerCase();
  const rules = [
    ['Hrana', /(konzum|spar|plodine|kaufland|lidl|tommy|studena|pekara|mlinar|restoran|caffe|billa|mercator|dm)/],
    ['Prijevoz', /(ina|petrol|crodux|tifon|parking|uber|bolt|hŽ|autobus|tramvaj|gorivo)/i],
    ['Režije', /(hep|vodoopskrba|plinara|čistoća|cistoca|a1|telekom|telemach|internet)/i],
    ['Oprema', /(links|elipso|sancta|mall|ikea|pevex|bauhaus|obi)/i],
  ];
  const hit = rules.find(([cat, re]) => categories.includes(cat) && re.test(d));
  return hit ? hit[0] : '';
};

export async function recognizeReceiptFromFile(file, { categories = [] } = {}) {
  if (!file) throw new Error('Nije odabrana slika računa.');
  const dataUrl = await readAsDataUrl(file);
  const plugin = await getNativePlugin();
  if (!plugin) {
    return {
      ok: false,
      text: '',
      fields: {},
      engine: 'web-fallback',
      message: 'OCR je ugrađen za Android APK preko ML Kita. U web/PWA načinu za sada učitaj sliku, a podatke provjeri ručno.',
    };
  }
  const result = await plugin.recognize({ dataUrl });
  const text = result?.text || '';
  const amount = parseAmount(text);
  const merchant = parseMerchant(text);
  const fields = {
    amount: amount ? String(amount.value.toFixed(2)) : '',
    date: parseDate(text) || '',
    description: merchant,
    category: guessCategory(merchant, categories),
    notes: text ? `OCR račun:\n${text.slice(0, 1200)}` : '',
  };
  return { ok: true, text, fields, engine: 'mlkit-android' };
}
