# NJBOARD

Next.js App Routeri, TypeScripti ja Tailwind CSS-i ingliskeelne töölaud.
Üks beež plokk sisaldab Google Sheeti andmetest arvutatud meeskondade mulle,
säästude edetabelit, kogusummat ja muudetavat eesmärgimõõdikut.

## Kohalik arendus

Vajalik on Node.js 20.9 või uuem ja npm. Projekt on kontrollitud Node.js 24-ga.

```bash
npm install
npm run dev
```

Ava [http://localhost:3000](http://localhost:3000).

## Production-build

```bash
npm run build
npm start
```

Koodi stiili saab kontrollida käsuga `npm run lint`.
Andmete töötlemise teste saab käivitada käsuga `npm test` (testimiseks Node.js 24).

## Google Sheet ja värskendamine

Vaikimisi kasutatakse antud avalikku Google Sheeti ja lehte GID-ga `1940995846`.
API võtmeid ega teenusekontot pole selle tabeli lugemiseks vaja.
Teise tabeli kasutamiseks kopeeri `.env.example` failiks `.env.local` ja muuda
`GOOGLE_SHEET_ID` ning `GOOGLE_SHEET_GID`. Vercelis saab samad väärtused lisada
projekti keskkonnamuutujatesse.

- Server loeb tabeli CSV-ekspordi kaudu teekonnal `/api/sheet`.
- Esimene rida peab sisaldama veerge `Team` ja `Value / savings (€ per year)`.
- Iga järgnev mittetühi rida on üks algatus; sama meeskonna summad liidetakse.
- Mullide pindala vastab positiivsele säästusummale. Null- ja negatiivse säästuga
  meeskonnad säilivad edetabelis, nende mull on minimaalse suurusega.
- Mulligraafik näitab kuni kuut suurima säästuga meeskonda, kogusumma kõiki.
- Tabelit kontrollitakse avatud vaates iga 30 sekundi järel ja aknasse naasmisel.
  Google'i enda ekspordi viivitus võib lisanduda.
- Võrguvea korral jäävad viimati saadud andmed ekraanile ja kuvatakse veateade.
- Mullides näidatakse meeskonna nime, säästusummat ja algatuste arvu.
- API tagastab ainult koondandmed; algtabeli ülejäänud veerge brauserisse ei saadeta.

Lehel oleva pliiatsiikooni kaudu saab muuta eesmärgi pealkirja ja summat.
Esialgne 6000 € on muudetav näidisväärtus. Seade salvestub selle brauseri
`localStorage`-isse ega muuda Google Sheeti või teiste kasutajate eesmärke.

Google Sheeti muudatused ilmuvad ilma uue deploy'ta. Tabeli jagamisõigus peab
säilima; töölaud kuvab selle andmeid kõigile veebilehe külastajatele.

Kohalikuks IP-põhiseks eelvaateks on `next.config.ts` failis lubatud
`192.168.1.160` ja `127.0.0.1`. Arvuti IP muutumisel uuenda `allowedDevOrigins`
loendit ja taaskäivita arendusserver. See seadistus puudutab ainult arendust.

## Olulised failid

- `src/app/page.tsx` – avaleht.
- `src/components/dashboard.tsx` – töölaud, mulligraafik ja automaatne värskendamine.
- `src/app/api/sheet/route.ts` – serveri andmeühendus.
- `src/lib/google-sheet.ts` – Google Sheeti lugemine.
- `src/lib/sheet-model.ts` – summade teisendamine ja meeskondade koondamine.
- `src/app/layout.tsx` – ühine lehe struktuur ja metaandmed.
- `src/app/globals.css` – Tailwindi import ja globaalsed stiilid.
- `next.config.ts` – Next.js-i ja kohaliku eelvaate seadistus.
- `postcss.config.mjs` – Tailwindi PostCSS-integratsioon.
- `public/` – staatiliste failide asukoht.

## Vercelisse deploy

Selle projekti töövoog on **kohalik arendus → GitHub → Vercel**.

1. Lisa projekt Git-repositooriumisse ja laadi see GitHubi.
2. Vercelis vali **Add New → Project** ning impordi GitHubi repositoorium.
3. Vali **Framework Preset: Next.js** ja juurkaustaks see kaust, kus asub `package.json`.
4. Jäta build'i ja väljundkausta seaded vaikimisi väärtustele ning vajuta **Deploy**.

Lisa lähtekood, seadistusfailid ja `package-lock.json` GitHubi repositooriumisse.
`.gitignore` välistab sõltuvuste kausta `node_modules/`, build'i kausta `.next/`,
kohalikud `.env*` failid (välja arvatud näidis `.env.example`) ja Verceli kohaliku seadistuse `.vercel/`.

Projekt ei vaja alustamiseks keskkonnamuutujaid ega eraldi `vercel.json` faili.

[Verceli ametlik Next.js-i juhend](https://vercel.com/docs/frameworks/full-stack/nextjs)
