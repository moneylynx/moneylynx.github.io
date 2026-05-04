# Korekcije Moja Lova v1.0

Ovaj paket je korigirana verzija repozitorija `moneylynx.github.io`.

## Ugrađeno / ispravljeno

1. Aktivne React komponente sada koriste naziv aplikacije **Moja Lova**.
2. Header početnog ekrana prikazuje **Moja Lova · 2026.**.
3. Kartica u postavkama prikazuje:
   - Moja Lova
   - Verzija 1.0
   - Moja Lova by MoneyLynx
   - E-mail: info.mojalova@moneylynx.net
   - © 2026 MoneyLynx · Sva prava pridržana.
   - Za osobnu upotrebu. · Verzija nije za komercijalnu distribuciju.
4. Zasebna kartica „Projekcija kraju mjeseca” nije aktivna na početnom ekranu; projekcija je prikazana unutar kartice stanja kao „Projekcija na kraju [mjeseca]”.
5. Kartice „Za platiti” i „Top kategorije” koriste kontroliranu/dinamičku visinu.
6. Uklonjeni su stari aktivni tekstovi „Money Lynx”, „Verzija .4” i „Projekcija kraju mjeseca” iz source koda.
7. Stare duple root komponente (`src/Dashboard.jsx`, `src/Settings.jsx`, itd.) pretvorene su u compatibility shim datoteke koje preusmjeravaju na aktivne komponente u `src/components/`.
8. OCR računa i PDF/XLSX export slojevi ostaju uključeni.

## Nakon raspakiravanja

Pokreni:

```bash
npm install
npm run dev -- --force
```

Za Android:

```bash
npm run build
npx cap sync android
```

Napomena: `.env` nije uključen. Koristi svoj postojeći `.env` ili kopiraj `.env.example` u `.env` i upiši Supabase vrijednosti.
