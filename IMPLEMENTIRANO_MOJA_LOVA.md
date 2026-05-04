# Implementirano — Moja Lova / MoneyLynx

Datum: 2026-05-03

## 1. Rebranding
- Naziv aplikacije promijenjen je u **Moja Lova**.
- Podnaslov je postavljen na **Osobne financije bez kompliciranja**.
- Tehnički / web / company brand ostaje **MoneyLynx**.
- Kartica u postavkama prikazuje:
  - Moja Lova
  - Verzija 1.0
  - Moja Lova by MoneyLynx
  - info.mojalova@moneylynx.net
  - © 2026 MoneyLynx · Sva prava pridržana.
  - Za osobnu upotrebu. · Verzija nije za komercijalnu distribuciju.

## 2. Početni ekran
- Projekcija kraja mjeseca prikazuje se inline u kartici **Stanje**.
- Tekst je preciziran na hrvatski genitiv mjeseca, npr. **Projekcija na kraju travnja**.
- Duplicirani forecast insight više se ne prikazuje kao zaseban advisor zapis.
- U aktivnom Dashboard kodu nije postojala zasebna samostalna kartica "Projekcija na kraju mjeseca"; postojala je inline projekcija i advisor forecast zapis. Zadržana je inline projekcija jer je najlogičnije UX mjesto.

## 3. Dinamičnije kartice
- Kartica **Za platiti** dobila je dinamički maksimalni prostor prema visini ekrana, uz scroll samo kada je potrebno.
- Kartica **Top kategorije** prikazuje najviše 4 kategorije i prirodno mijenja visinu ovisno o broju aktualnih kategorija.

## 4. OCR računa
- Dodan je Android native Capacitor bridge za **Google ML Kit Text Recognition**.
- U formi za novi trošak dodan je gumb **Skeniraj račun (OCR)**.
- OCR pokušava automatski popuniti datum, iznos, opis trgovca, kategoriju i napomenu s OCR tekstom.
- Web/PWA način zasad prikazuje kontrolirani fallback jer ML Kit OCR radi u Android APK-u.

## 5. PDF / Excel export
- U postavkama, pod **Dijeli i izvezi**, dodana je sekcija **Izvještaji PDF / Excel**.
- Osnovni PDF i XLSX export uključuju sažetak, mjesečni pregled, top kategorije, budžete i transakcije.
- PRO PDF report uključuje dodatni okvir za usporedbe, ciljeve i prognoze.
- Prva faza koristi runtime biblioteke za PDF/XLSX; za komercijalnu verziju preporučuje se lokalno bundlanje tih biblioteka i vezivanje PRO reporta uz licencu/pretplatu.
