# emeliebergqvist.com

Emelies sajt: podd, blogg, nyhetsbrev och en samarbetssida för företag.
Statisk HTML, inga beroenden. Byggs med Node och serveras av GitHub Pages från `docs/`.

```
node build.mjs            # bygger allt som inte är utkast
node build.mjs --utkast   # tar med utkast, för förhandsgranskning
npx serve docs            # titta lokalt på http://localhost:3000
```

Commita alltid `docs/` efter bygget, det är den mappen som är live.

## Skriva

| Vad | Var | Blir |
|---|---|---|
| Blogginlägg | `innehall/blogg/ÅÅÅÅ-MM-DD-rubrik.md` | `/blogg/rubrik/` |
| Poddavsnitt | `innehall/podd/ÅÅÅÅ-MM-DD-rubrik.md` | `/podd/rubrik/` |
| Nyhetsbrev | `innehall/nyhetsbrev/ÅÅÅÅ-MM-DD-rubrik.md` | `/nyhetsbrev/rubrik/` + `utskick/rubrik.txt` |

Varje fil börjar med några rader mellan `---` (titel, datum, beskrivning, bild). Se exemplen i varje mapp.
`utkast: true` gör att filen inte publiceras. Bilder läggs i `static/bilder/` och skrivs `/bilder/namn.jpg`.

Poddavsnitt kan ha `ljud` (mp3-länk från poddtjänsten), `spotify`, `apple` och `youtube`.

## Nyhetsbrevet

Anmälan går till Duco-portalens CRM, underkonto `emelie`, magnet `nyhetsbrev`, med dubbel opt-in
(bekräftelsemejl, sedan välkomstmejl). Inställningarna finns i Jean-Claude-repot: `data/crm/accounts/emelie.json`.

Varje brev i `innehall/nyhetsbrev/` blir en textfil i `utskick/` med `{{halsning}}` och avregistreringslänk,
färdig att skicka till listan. Utskick till hela listan är inte byggt i CRM:et än.

## Samarbetsformuläret

Skickas till samma CRM som förfrågan (magnet `samarbete`). Kontakten hamnar som lead i underkontot `emelie`
och en notis mejlas till oss. Allt i formuläret (företag, intresse, budget, när) samlas i meddelandet.

## Att fylla i (site.json)

- `podd.namn` och länkar till Spotify, Apple, YouTube
- `instagram.url`
- `siffror`: tomma siffror visas inte. Fyll i riktiga värden, sektionen dyker upp på samarbetssidan.
- `tidigareSamarbeten`: namn på varumärken, visas när listan inte är tom
- Bilder: byt `<div class="foto ...">` i `sidor/` mot `<div class="foto ..."><img src="/bilder/..." alt="..."></div>`

## Gå live på emeliebergqvist.com

1. Lägg till `"doman": "emeliebergqvist.com"` i `site.json` (skriver `docs/CNAME`).
2. DNS: A-poster för `@` till 185.199.108.153, .109.153, .110.153, .111.153 och CNAME `www` till `ducostudios.github.io`.
3. Sätt `indexera: true` och `forhandsvisning: false` i `site.json`, bygg, commita.
4. I portalen: lägg till `https://emeliebergqvist.com` i `WIDGET_ALLOWED_ORIGIN` (fly.toml) och deploya, så att formulären får skicka.
5. Avsändaren `hej@emeliebergqvist.com` måste finnas innan bekräftelsemejlen kan gå ut.
