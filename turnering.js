/* Turneringsforespørgsel (turnering.html). Sendes via Web3Forms-formularen
   "Opsætning af turnering" (egen access key) til indoorgolfribe@gmail.com. */
(function () {
  'use strict';
  var form = document.getElementById('turneringForm');
  if (!form) return;
  var status = document.getElementById('turneringStatus');
  var MAIL = 'indoorgolfribe@gmail.com';
  var EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
  var el = form.elements;

  // Ingen datoer i fortiden.
  var d = new Date();
  var today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  el.dato_fra.min = today;
  el.dato_til.min = today;
  el.dato_fra.addEventListener('change', function () { el.dato_til.min = this.value || today; });

  // Spillerlisten: mails adskilt af linjeskift, komma, semikolon eller mellemrum.
  function players() {
    var seen = {}, ok = [], bad = [];
    el.spillere.value.split(/[\s,;]+/).forEach(function (raw) {
      var m = raw.trim().replace(/^<|>$/g, '').toLowerCase();
      if (!m || seen[m]) return;
      seen[m] = true;
      (EMAIL_RE.test(m) ? ok : bad).push(m);
    });
    return { ok: ok, bad: bad };
  }
  var count = document.getElementById('c-t-spillere');
  function updateCount() {
    var p = players();
    count.textContent = p.ok.length ? p.ok.length + (p.ok.length === 1 ? ' spiller' : ' spillere') : '';
  }
  el.spillere.addEventListener('input', updateCount);

  function setErr(input, errId, msg) {
    var e = document.getElementById(errId);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var desc = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== errId; });
    if (msg) desc.push(errId);
    if (desc.length) input.setAttribute('aria-describedby', desc.join(' ')); else input.removeAttribute('aria-describedby');
    e.textContent = msg || '';
    return !msg;
  }

  function int(v) { return /^\d+$/.test(v) ? parseInt(v, 10) : NaN; }

  var RULES = [
    ['turnering', 'e-t-navn', function (v) { return v ? '' : 'Giv turneringen et navn.'; }],
    ['runder', 'e-t-runder', function (v) { var n = int(v); return !v ? 'Skriv antal runder.' : (n >= 1 && n <= 52 ? '' : 'Skriv et tal mellem 1 og 52.'); }],
    ['dage_mellem_runder', 'e-t-mellem', function (v) { var n = int(v); return v === '' ? 'Skriv antal dage (0, hvis runderne kan spilles samme dag).' : (n >= 0 && n <= 365 ? '' : 'Skriv et helt antal dage.'); }],
    ['dato_fra', 'e-t-fra', function (v) { return !v ? 'Vælg en startdato.' : (v < today ? 'Startdatoen er overstået.' : ''); }],
    ['dato_til', 'e-t-til', function (v) { var f = el.dato_fra.value; return !v ? 'Vælg en slutdato.' : (f && v < f ? 'Slutdatoen skal ligge efter startdatoen.' : ''); }],
    ['spillere', 'e-t-spillere', function () {
      var p = players();
      if (p.bad.length) return 'Tjek ' + (p.bad.length === 1 ? 'denne mail: ' : 'disse mails: ') + p.bad.slice(0, 3).join(', ') + (p.bad.length > 3 ? ' …' : '');
      return p.ok.length >= 2 ? '' : 'Skriv mindst to spilleres mailadresser.';
    }],
    ['navn', 'e-t-kname', function (v) { return v ? '' : 'Skriv jeres navn.'; }],
    ['email', 'e-t-kmail', function (v) { return !v ? 'Skriv en mail, vi kan svare på.' : (EMAIL_RE.test(v) ? '' : 'Tjek mailadressen.'); }],
    ['telefon', 'e-t-ktel', function (v) { return !v ? 'Skriv et telefonnummer.' : (v.replace(/[\s+-]/g, '').length >= 8 ? '' : 'Tjek telefonnummeret.'); }],
    ['medlem', 'e-t-medlem', function () { return el.medlem.checked ? '' : 'Turneringer sættes kun op for medlemmer.'; }]
  ];

  function validate() {
    var ok = true;
    RULES.forEach(function (r) {
      var input = el[r[0]];
      ok = setErr(input, r[1], r[2](input.value.trim())) && ok;
    });
    return ok;
  }

  RULES.forEach(function (r) {
    var input = el[r[0]];
    var evt = (input.type === 'checkbox' || input.type === 'date') ? 'change' : 'blur';
    input.addEventListener(evt, function () { if (this.getAttribute('aria-invalid') === 'true') validate(); });
  });

  function fmt(iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    status.className = 'form__status';
    status.textContent = '';
    if (!validate()) {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    if (el.botcheck.checked) return;

    var p = players();
    var data = new FormData(form);
    data.set('subject', 'Turneringsforespørgsel · ' + el.turnering.value.trim());
    data.set('dato_fra', fmt(el.dato_fra.value));
    data.set('dato_til', fmt(el.dato_til.value));
    data.set('spillere', p.ok.join('\n'));
    data.set('antal_spillere', String(p.ok.length));

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = 'Sender...';
    fetch('https://api.web3forms.com/submit', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.success) throw new Error(json.message || 'fejl');
        form.reset();
        updateCount();
        status.className = 'form__status is-ok';
        status.textContent = 'Tak! Vi har fået jeres forespørgsel og vender tilbage, når turneringen er sat op.';
      })
      .catch(function () {
        status.className = 'form__status is-err';
        status.innerHTML = 'Forespørgslen kunne ikke sendes. Skriv i stedet til <a href="mailto:' + MAIL + '">' + MAIL + '</a>.';
      })
      .then(function () { btn.disabled = false; });
  });
})();
