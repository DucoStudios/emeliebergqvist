// Meny, nyhetsbrevsformulär och samarbetsformulär.
// Båda formulären skickar till Duco-portalens CRM (underkonto "emelie"):
// nyhetsbrev = lista med dubbel opt-in, samarbete = förfrågan med notis till oss.
// Med data-forhandsvisning på <body> skickas inget, formuläret visar bara vad som skulle hänt.
(function () {
  var body = document.body;
  var API = body.dataset.api;
  var FORHANDSVISNING = body.dataset.forhandsvisning === "1";
  var giltig = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); };

  var knapp = document.querySelector(".meny-knapp"), meny = document.getElementById("meny");
  if (knapp && meny) knapp.addEventListener("click", function () {
    var oppen = meny.classList.toggle("oppen");
    knapp.setAttribute("aria-expanded", oppen ? "true" : "false");
  });

  function skicka(data) {
    if (FORHANDSVISNING) { console.info("Förhandsvisning, skickas inte:", data); return new Promise(function (r) { setTimeout(r, 500); }); }
    return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  }

  function upptagen(form, pa, text) {
    var b = form.querySelector("button[type=submit]");
    if (pa) { b.dataset.text = b.textContent; b.textContent = text; b.disabled = true; }
    else { b.textContent = b.dataset.text; b.disabled = false; }
  }

  function svar(form, text, ok) {
    var p = form.querySelector(".formular-svar");
    p.textContent = text;
    p.className = "formular-svar " + (ok ? "ok" : "fel");
  }

  document.querySelectorAll(".nyhetsbrev-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      if (!giltig(email)) return svar(form, "Skriv en giltig e-postadress.");
      if (!form.samtycke.checked) return svar(form, "Kryssa i rutan så att jag får mejla dig.");
      upptagen(form, true, "Skickar...");
      var kalla = new URLSearchParams(location.search).get("src") || form.dataset.kalla || "webb";
      skicka({ konto: form.dataset.konto, magnet: form.dataset.magnet, email: email, namn: form.namn.value.trim() || undefined, samtycke: true, kalla: kalla, webbplats: form.webbplats.value || undefined })
        .then(function () {
          form.innerHTML = '<div class="formular-tack"><h3>Kolla din inkorg</h3><p>Jag har skickat ett mejl till ' + email.replace(/</g, "") + '. Klicka på länken i det så är du med. Hittar du det inte, titta i skräpposten.</p>' + (FORHANDSVISNING ? '<p class="liten">Förhandsvisning: inget skickades.</p>' : "") + "</div>";
        })
        .catch(function () { upptagen(form, false); svar(form, "Något gick fel. Försök igen om en stund."); });
    });
  });

  var samarbete = document.querySelector(".samarbete-form");
  if (samarbete) {
    // "Be om mediakit" kryssar i rutan i formuläret.
    document.querySelectorAll('[data-typ]').forEach(function (a) {
      a.addEventListener("click", function () {
        var box = samarbete.querySelector('input[name=typ][value="' + a.dataset.typ + '"]');
        if (box) box.checked = true;
      });
    });

    samarbete.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = samarbete;
      var email = f.email.value.trim();
      if (!f.namn.value.trim() || !f.foretag.value.trim()) return svar(f, "Fyll i namn och företag.");
      if (!giltig(email)) return svar(f, "Skriv en giltig e-postadress.");
      var typer = Array.prototype.map.call(f.querySelectorAll("input[name=typ]:checked"), function (i) { return i.value; });
      // CRM:ets förfrågningar har ett fritextfält, så allt utom kontaktuppgifterna samlas där.
      var meddelande = [
        "Företag: " + f.foretag.value.trim(),
        f.lank.value.trim() ? "Webb/Instagram: " + f.lank.value.trim() : "",
        typer.length ? "Intresse: " + typer.join(", ") : "",
        f.budget.value ? "Budget: " + f.budget.value : "",
        f.nar.value ? "När: " + f.nar.value : "",
        f.meddelande.value.trim() ? "\n" + f.meddelande.value.trim() : ""
      ].filter(Boolean).join("\n").slice(0, 2000);
      upptagen(f, true, "Skickar...");
      skicka({ konto: f.dataset.konto, magnet: f.dataset.magnet, email: email, namn: f.namn.value.trim(), telefon: f.telefon.value.trim() || undefined, meddelande: meddelande, kalla: new URLSearchParams(location.search).get("src") || "samarbeten", webbplats: f.webbplats.value || undefined })
        .then(function () {
          f.innerHTML = '<div><h3>Tack, ' + f.namn.value.trim().split(" ")[0].replace(/</g, "") + '!</h3><p>Din förfrågan har kommit fram. Jag återkommer personligen med ett förslag och mitt mediakit.</p>' + (FORHANDSVISNING ? '<p class="liten">Förhandsvisning: inget skickades.</p>' : "") + "</div>";
        })
        .catch(function () { upptagen(f, false); svar(f, "Något gick fel. Försök igen, eller mejla direkt."); });
    });

    var cta = document.querySelector(".mobil-cta"), kontakt = document.getElementById("kontakt");
    if (cta && kontakt && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { cta.classList.toggle("gom", es[0].isIntersecting); }, { threshold: 0.05 }).observe(kontakt);
    }
  }
})();
