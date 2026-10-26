// Bygger sajten till docs/ (GitHub Pages serverar den mappen).
//   node build.mjs            bygger allt som inte är utkast
//   node build.mjs --utkast   tar med utkast, för att förhandsgranska
//
// Källor:
//   site.json                 namn, länkar, siffror till samarbetssidan
//   sidor/*.html              sidorna (frontmatter + HTML med {{platshållare}})
//   innehall/blogg/*.md       blogginlägg
//   innehall/podd/*.md        poddavsnitt
//   innehall/nyhetsbrev/*.md  nyhetsbrev: arkivsida på webben + textversion i utskick/
//   static/                   css, js, bilder (kopieras rakt av)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROT = path.dirname(new URL(import.meta.url).pathname);
const UT = path.join(ROT, "docs");
const MED_UTKAST = process.argv.includes("--utkast");
const site = JSON.parse(readFileSync(path.join(ROT, "site.json"), "utf8"));

// ---------- hjälpare ----------

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, kropp: text };
  const meta = {};
  for (const rad of m[1].split("\n")) {
    const i = rad.indexOf(":");
    if (i < 0) continue;
    const nyckel = rad.slice(0, i).trim();
    let varde = rad.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (varde === "true") varde = true;
    else if (varde === "false") varde = false;
    meta[nyckel] = varde;
  }
  return { meta, kropp: text.slice(m[0].length) };
}

function inline(s) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

// Liten markdown: rubriker, stycken, listor, citat, bilder, länkar, fetstil, kursiv.
function markdown(md) {
  const ut = [];
  const block = md.replace(/\r/g, "").trim().split(/\n{2,}/);
  for (const b of block) {
    const rader = b.split("\n");
    if (/^#{1,3} /.test(b)) {
      const niva = Math.min(b.match(/^#+/)[0].length + 1, 4);
      ut.push(`<h${niva}>${inline(b.replace(/^#+ /, ""))}</h${niva}>`);
    } else if (rader.every((r) => /^[-*] /.test(r))) {
      ut.push(`<ul>${rader.map((r) => `<li>${inline(r.slice(2))}</li>`).join("")}</ul>`);
    } else if (rader.every((r) => /^\d+\. /.test(r))) {
      ut.push(`<ol>${rader.map((r) => `<li>${inline(r.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`);
    } else if (rader.every((r) => r.startsWith(">"))) {
      ut.push(`<blockquote><p>${inline(rader.map((r) => r.replace(/^> ?/, "")).join(" "))}</p></blockquote>`);
    } else if (/^!\[[^\]]*\]\([^)]+\)$/.test(b.trim())) {
      ut.push(`<figure>${inline(b.trim())}</figure>`);
    } else {
      ut.push(`<p>${rader.map(inline).join("<br>")}</p>`);
    }
  }
  return ut.join("\n");
}

// Ren text för mejlutskick: markdown utan formatering, länkar skrivs ut.
function somText(md) {
  return md.trim()
    .replace(/!\[[^\]]*\]\([^)]+\)\n?/g, "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+ /gm, "")
    .replace(/^> ?/gm, "");
}

const MANADER = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
function datum(iso) {
  const [a, m, d] = String(iso).split("-").map(Number);
  return a && m && d ? `${d} ${MANADER[m - 1]} ${a}` : "";
}

function lasMapp(mapp) {
  const dir = path.join(ROT, "innehall", mapp);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { meta, kropp } = frontmatter(readFileSync(path.join(dir, f), "utf8"));
      const slug = meta.slug || f.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
      return { ...meta, slug, kropp, fil: f };
    })
    .filter((p) => MED_UTKAST || p.utkast !== true)
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
}

// Utan egen domän ligger sajten under ducostudios.github.io/emeliebergqvist/,
// så rotlänkar får prefixet från site.json ("bas").
const BAS = site.doman ? "" : site.bas || "";
function skriv(sokvag, html) {
  const fil = path.join(UT, sokvag, sokvag.endsWith(".html") ? "" : "index.html");
  mkdirSync(path.dirname(fil), { recursive: true });
  writeFileSync(fil, BAS ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${BAS}/`) : html);
}

// ---------- byggblock ----------

const poddnamn = site.podd.namn || "Podden";
const harPoddLank = site.podd.spotify || site.podd.apple || site.podd.youtube;

function poddlankar(extra = {}) {
  const lankar = [
    ["Spotify", extra.spotify || site.podd.spotify],
    ["Apple Podcasts", extra.apple || site.podd.apple],
    ["YouTube", extra.youtube || site.podd.youtube]
  ].filter(([, url]) => url);
  if (!lankar.length) return `<p class="liten">Podden släpps snart på Spotify, Apple Podcasts och YouTube. Skriv upp dig nedan så får du veta när första avsnittet kommer.</p>`;
  return `<div class="lankrad">${lankar.map(([namn, url]) => `<a class="knapp knapp-kontur" href="${esc(url)}" rel="noopener">${namn}</a>`).join("")}</div>`;
}

function nyhetsbrevFormular(kalla = "webb") {
  return `<form class="nyhetsbrev-form" data-konto="${esc(site.konto)}" data-magnet="nyhetsbrev" data-kalla="${esc(kalla)}" novalidate>
  <div class="falt-rad">
    <label class="dold" for="nb-namn-${kalla}">Förnamn</label>
    <input id="nb-namn-${kalla}" name="namn" type="text" placeholder="Förnamn" autocomplete="given-name">
    <label class="dold" for="nb-epost-${kalla}">E-post</label>
    <input id="nb-epost-${kalla}" name="email" type="email" placeholder="Din e-post" autocomplete="email" required>
    <button class="knapp" type="submit">Skriv upp mig</button>
  </div>
  <label class="samtycke"><input type="checkbox" name="samtycke" required> <span>Ja, mejla mig när det kommer nya avsnitt och inlägg, och ibland ett personligt brev från Emelie. Jag kan avsluta när jag vill.</span></label>
  <input class="honung" name="webbplats" tabindex="-1" autocomplete="off" aria-hidden="true">
  <p class="formular-svar" role="status"></p>
</form>`;
}

function siffror() {
  const ifyllda = site.siffror.filter((s) => s.varde);
  if (!ifyllda.length) return "";
  return `<section class="sektion sektion-mork"><div class="inner">
  <p class="overrubrik">I siffror</p>
  <div class="siffror">${ifyllda.map((s) => `<div><strong>${esc(s.varde)}</strong><span>${esc(s.etikett)}</span></div>`).join("")}</div>
  <p class="liten">Uppdaterat ${datum(new Date().toISOString().slice(0, 10))}. Fullständig statistik finns i mediakitet.</p>
</div></section>`;
}

function tidigareSamarbeten() {
  if (!site.tidigareSamarbeten.length) return "";
  return `<div class="loggor"><p class="overrubrik">Har samarbetat med</p><ul>${site.tidigareSamarbeten.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`;
}

function kort(p, typ) {
  const href = `/${typ}/${p.slug}/`;
  const ovan = typ === "podd" ? `Avsnitt ${esc(p.nummer ?? "")}` : datum(p.datum);
  return `<a class="kort" href="${href}">
  ${p.bild ? `<img src="${esc(p.bild)}" alt="" loading="lazy">` : `<div class="kort-bild" aria-hidden="true"></div>`}
  <div class="kort-text"><p class="overrubrik">${ovan}${p.utkast ? " · UTKAST" : ""}</p><h3>${esc(p.titel)}</h3><p>${esc(p.beskrivning ?? "")}</p></div>
</a>`;
}

// Bildremsa från vardagen, samma på start, om och samarbeten.
const GALLERI = [
  ["kanalen.jpg", "Kanal i en sydfransk stad i kvällsljus"],
  ["granden.jpg", "Gränd med gröna fönsterluckor och krukväxter"],
  ["kakel.jpg", "Sandaler på gammalt mönstrat kakel"],
  ["oleander.jpg", "Blommande oleander över en stenmur"],
  ["vandring.jpg", "Emelie vandrar i garrigue vid havet"],
  ["palm.jpg", "Palm mot blå himmel"],
  ["landskap.jpg", "Utsikt över vingårdar och en lagun"]
];
const galleri = () => `<section class="galleri" aria-label="Från vardagen"><div class="inner"><p class="overrubrik">Från vardagen</p></div>
<div class="galleri-rad">${GALLERI.map(([f, alt]) => `<img src="/bilder/${f}" alt="${esc(alt)}" loading="lazy">`).join("")}</div>
</section>`;

const lista = (poster, typ, tom) => poster.length ? `<div class="kortlista">${poster.map((p) => kort(p, typ)).join("")}</div>` : `<p class="tomt">${tom}</p>`;

// ---------- layout ----------

function layout({ titel, beskrivning, sokvag, kropp, klass = "" }) {
  const helTitel = titel ? `${titel} · ${site.namn}` : site.namn;
  const aktiv = (s) => (sokvag.startsWith(s) ? ' aria-current="page"' : "");
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(helTitel)}</title>
<meta name="description" content="${esc(beskrivning || site.beskrivning)}">
${site.indexera ? "" : '<meta name="robots" content="noindex, nofollow">\n'}<link rel="canonical" href="${site.url}/${sokvag}">
<meta property="og:title" content="${esc(helTitel)}">
<meta property="og:description" content="${esc(beskrivning || site.beskrivning)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${site.url}/bilder/emelie-kavaj.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css?v=${BYGGE}">
</head>
<body class="${klass}" data-api="${esc(site.api)}" data-forhandsvisning="${site.forhandsvisning ? "1" : ""}">
<a class="hoppa" href="#innehall">Till innehållet</a>
<header class="sidhuvud"><div class="inner">
  <a class="logga" href="/">Emelie Bergqvist</a>
  <button class="meny-knapp" aria-expanded="false" aria-controls="meny">Meny</button>
  <nav id="meny">
    <a href="/podd/"${aktiv("podd")}>Podd</a>
    <a href="/blogg/"${aktiv("blogg")}>Blogg</a>
    <a href="/nyhetsbrev/"${aktiv("nyhetsbrev")}>Nyhetsbrev</a>
    <a href="/om/"${aktiv("om")}>Om</a>
    <a class="knapp knapp-liten" href="/samarbeten/"${aktiv("samarbeten")}>Samarbeten</a>
  </nav>
</div></header>
<main id="innehall">
${kropp}
</main>
<footer class="sidfot"><div class="inner">
  <div>
    <p class="logga">Emelie Bergqvist</p>
    <p>Livet i Frankrike, tro och vardag.</p>
  </div>
  <nav aria-label="Sidfot">
    <a href="/podd/">Podd</a><a href="/blogg/">Blogg</a><a href="/nyhetsbrev/">Nyhetsbrev</a><a href="/om/">Om</a><a href="/samarbeten/">För företag</a>
    ${site.instagram.url ? `<a href="${esc(site.instagram.url)}" rel="noopener">Instagram</a>` : ""}
  </nav>
  <p class="liten">© ${new Date().getFullYear()} Emelie Bergqvist · <a href="mailto:${esc(site.epost)}">${esc(site.epost)}</a> · <a href="/integritet/">Integritet</a></p>
</div></footer>
<script src="/sajt.js?v=${BYGGE}" defer></script>
</body>
</html>
`;
}

// ---------- bygg ----------

const BYGGE = Date.now().toString(36);
const blogg = lasMapp("blogg");
const podd = lasMapp("podd");
const brev = lasMapp("nyhetsbrev");

rmSync(UT, { recursive: true, force: true });
mkdirSync(UT, { recursive: true });
cpSync(path.join(ROT, "static"), UT, { recursive: true });
writeFileSync(path.join(UT, ".nojekyll"), "");
if (site.doman) writeFileSync(path.join(UT, "CNAME"), site.doman + "\n");
writeFileSync(path.join(UT, "robots.txt"), site.indexera ? `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n");

const platshallare = {
  nyhetsbrev_formular: () => nyhetsbrevFormular("sida"),
  nyhetsbrev_formular_hero: () => nyhetsbrevFormular("hem"),
  poddlankar: () => poddlankar(),
  poddnamn: () => esc(poddnamn),
  instagram: () => esc(site.instagram.namn),
  epost: () => esc(site.epost),
  svarstid: () => esc(site.svarstid),
  siffror,
  galleri,
  tidigare_samarbeten: tidigareSamarbeten,
  senaste_blogg: () => lista(blogg.slice(0, 3), "blogg", "Första inlägget kommer snart."),
  senaste_avsnitt: () => lista(podd.slice(0, 3), "podd", "Första avsnittet är på väg. Skriv upp dig på nyhetsbrevet så får du veta när det släpps."),
  blogglista: () => lista(blogg, "blogg", "Första inlägget kommer snart."),
  avsnittslista: () => lista(podd, "podd", "Första avsnittet är på väg. Skriv upp dig på nyhetsbrevet så får du veta när det släpps."),
  nyhetsbrevsarkiv: () => brev.length
    ? `<ul class="arkiv">${brev.map((b) => `<li><a href="/nyhetsbrev/${b.slug}/">${esc(b.titel)}</a> <span>${datum(b.datum)}</span></li>`).join("")}</ul>`
    : `<p class="tomt">Inga brev ännu. Det första kommer snart.</p>`
};
const fyllI = (html) => html.replace(/\{\{([a-z_]+)\}\}/g, (hel, namn) => (platshallare[namn] ? platshallare[namn]() : hel));

const sitemap = [];
for (const fil of readdirSync(path.join(ROT, "sidor")).filter((f) => f.endsWith(".html"))) {
  const { meta, kropp } = frontmatter(readFileSync(path.join(ROT, "sidor", fil), "utf8"));
  const sokvag = meta.sokvag ?? "";
  skriv(sokvag || "", layout({ titel: meta.titel, beskrivning: meta.beskrivning, sokvag, kropp: fyllI(kropp), klass: meta.klass }));
  if (!meta.dold) sitemap.push(sokvag);
}

function artikel(p, typ, extra = "") {
  const tillbaka = { blogg: ["/blogg/", "Alla inlägg"], podd: ["/podd/", "Alla avsnitt"], nyhetsbrev: ["/nyhetsbrev/", "Fler brev"] }[typ];
  const ovan = typ === "podd" ? `Avsnitt ${esc(p.nummer ?? "")} · ${datum(p.datum)}` : datum(p.datum);
  return `<article class="artikel">
  <header class="inner smal">
    <p class="overrubrik">${ovan}${p.utkast ? " · UTKAST" : ""}</p>
    <h1>${esc(p.titel)}</h1>
    ${p.beskrivning ? `<p class="ingress">${esc(p.beskrivning)}</p>` : ""}
  </header>
  ${p.bild ? `<figure class="inner bred"><img src="${esc(p.bild)}" alt="${esc(p.bildtext ?? "")}"></figure>` : ""}
  <div class="inner smal brodtext">
    ${extra}
    ${markdown(p.kropp)}
    <p class="tillbaka"><a href="${tillbaka[0]}">← ${tillbaka[1]}</a></p>
  </div>
</article>
<section class="sektion sektion-ljus"><div class="inner smal center">
  <h2>Vill du ha nästa i inkorgen?</h2>
  <p>Ett mejl när det kommer något nytt. Inget annat.</p>
  ${nyhetsbrevFormular(typ)}
</div></section>`;
}

for (const p of blogg) {
  skriv(`blogg/${p.slug}/`, layout({ titel: p.titel, beskrivning: p.beskrivning, sokvag: `blogg/${p.slug}/`, kropp: artikel(p, "blogg") }));
  sitemap.push(`blogg/${p.slug}/`);
}
for (const p of podd) {
  const spelare = [
    p.ljud ? `<audio controls preload="none" src="${esc(p.ljud)}"></audio>` : "",
    p.inbaddning ? `<div class="inbaddning">${p.inbaddning}</div>` : "",
    poddlankar(p)
  ].join("\n");
  skriv(`podd/${p.slug}/`, layout({ titel: p.titel, beskrivning: p.beskrivning, sokvag: `podd/${p.slug}/`, kropp: artikel(p, "podd", spelare) }));
  sitemap.push(`podd/${p.slug}/`);
}

// Nyhetsbrev: webbversion + ren text i utskick/ att lägga in i CRM:et.
const UTSKICK = path.join(ROT, "utskick");
rmSync(UTSKICK, { recursive: true, force: true });
mkdirSync(UTSKICK, { recursive: true });
for (const b of brev) {
  skriv(`nyhetsbrev/${b.slug}/`, layout({ titel: b.titel, beskrivning: b.beskrivning, sokvag: `nyhetsbrev/${b.slug}/`, kropp: artikel(b, "nyhetsbrev") }));
  const text = `Ämne: ${b.amne || b.titel}\n\n{{halsning}}\n\n${somText(b.kropp)}\n\nLäs på webben: ${site.url}/nyhetsbrev/${b.slug}/\n\n--\nDu får det här för att du anmälde dig till nyhetsbrevet på emeliebergqvist.com. Vill du inte ha fler mejl? Avsluta här: {{avregistrera_lank}}\n`;
  writeFileSync(path.join(UTSKICK, `${b.slug}.txt`), text);
}

if (site.indexera) {
  writeFileSync(path.join(UT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((s) => `  <url><loc>${site.url}/${s}</loc></url>`).join("\n")}\n</urlset>\n`);
}

console.log(`Byggt: ${sitemap.length} sidor, ${blogg.length} inlägg, ${podd.length} avsnitt, ${brev.length} brev${MED_UTKAST ? " (med utkast)" : ""}.`);
