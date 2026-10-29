/* Indoor Golf Ribe: sidens egen JS. Engine'en (scrollcraft.js) røres ikke. */
(function () {
  'use strict';

  // Kontakt pinnes kun, når formularen kan stå på én skærm. Ellers bliver den
  // en almindelig sektion, så intet klippes af på telefoner og lave vinduer.
  var close = document.getElementById('kontakt');
  if (window.matchMedia('(max-width: 860px), (max-height: 760px)').matches) {
    close.setAttribute('data-sc-act', 'flow');
    close.removeAttribute('data-sc-span');
    close.classList.add('close--flow');
  }
  // Railens ekstra-rejse (data-sc-pan) skubber sidste kort ud over venstre kant på smalle skærme.
  if (window.matchMedia('(max-width: 860px)').matches) {
    var rail = document.querySelector('.rail[data-sc-pan]');
    if (rail) rail.setAttribute('data-sc-pan', '0');
    // Drikke & snacks på telefonen er en sekvens i stedet for side om side:
    // loungeteksten → produkterne samles stort midt på skærmen → de glider op,
    // og prislisten kommer ind under dem (CSS i site.css, styret af --sc-p).
    // Længere akt, så de 68 frames får ~700 px scroll i stedet for ~400.
    var lounge = document.getElementById('loungen');
    if (lounge) {
      lounge.setAttribute('data-sc-span', '4.4');
      lounge.querySelector('.lounge__copy').setAttribute('data-sc-cue', '0.2 0.52 0.1 0.15');
      lounge.querySelector('.menu').setAttribute('data-sc-cue', '0.84 1.01 0.25 0');
      lounge.querySelector('.snacks__canvas').setAttribute('data-window', '0.58 0.82');
    }
  }

  ScrollCraft.mount(document.body);

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     Signaturen: jeres scroll er et slag. Sidens scroll-position er boldens
     flugt. Tallene er en leg, ikke målinger, og bolden lander 0,4 m fra
     pinden, når man når kontaktformularen.
     ------------------------------------------------------------------- */
  var hud = document.querySelector('.hud');
  var path = document.getElementById('hudPath');
  var ball = document.getElementById('hudBall');
  var carryEl = document.getElementById('hudCarry');
  var apexEl = document.getElementById('hudApex');
  var pinEl = document.getElementById('hudPin');
  var HOLE = 142;   // meter til pinden
  var APEX = 31;    // toppunkt i meter
  var LEFT = 0.4;   // bolden lander 0,4 m kort
  var len = path.getTotalLength();
  path.style.strokeDasharray = len;
  var ticking = false;

  function landedLine() {
    var r = close.getBoundingClientRect();
    return r.top < window.innerHeight * 0.55;
  }

  function fmt(n, d) { return n.toFixed(d).replace('.', ','); }

  function frame() {
    ticking = false;
    var max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    var top = close.offsetTop;
    // Flugten slutter, når kontaktsektionen står på skærmen.
    var end = Math.min(max, top);
    var s = Math.min(Math.max(window.scrollY / Math.max(end, 1), 0), 1);
    var landed = s >= 0.995 || landedLine();
    if (landed) s = 1;

    hud.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.35);
    hud.classList.toggle('is-landed', landed);

    var t = 1 - Math.pow(1 - s, 1.6);          // hurtig start, blød landing
    var carry = (HOLE - LEFT) * t;
    var height = 4 * APEX * t * (1 - t);
    path.style.strokeDashoffset = len * (1 - t);
    var pt = path.getPointAtLength(len * t);
    ball.setAttribute('cx', pt.x.toFixed(1));
    ball.setAttribute('cy', pt.y.toFixed(1));
    carryEl.textContent = Math.round(carry);
    apexEl.textContent = Math.round(height);
    pinEl.textContent = landed ? fmt(LEFT, 1) : Math.max(Math.round(HOLE - carry), 1);
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  /* ---------------------------------------------------------------------
     Logobolden på forsiden. Den ligger klar på højre side, og når man
     scroller, bliver den slået: kort sammentrykning ved slaget, så en bue
     op og væk ind i båsene med spin, og et lime-spor tegnes efter den.
     ------------------------------------------------------------------- */
  (function heroBall() {
    var hero = document.querySelector('.hero');
    var ball = hero && hero.querySelector('.ball');
    if (!ball) return;
    var body = ball.querySelector('.ball__body');
    var svg = ball.querySelector('.ball__trace');
    var path = document.getElementById('ballTrace');
    var grad = document.getElementById('traceGrad');
    var img = ball.querySelector('.ball__img');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W, H, size, x0, y0, rise, queued = false;

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function layout() {
      W = window.innerWidth; H = window.innerHeight;
      var narrow = W <= 860;
      size = narrow ? Math.min(W * 0.46, 240) : Math.min(W * 0.27, H * 0.46, 440);
      // Hvilepositionen: midten af bolden.
      x0 = narrow ? W * 0.7 : W * 0.71;
      y0 = narrow ? H * 0.3 : H * 0.55;
      if (narrow) {
        // På lave telefoner skal bolden stå mellem bjælken og teksten, ikke oven på kickeren.
        var stage = hero.querySelector('[data-sc-stage]');
        var copyTop = hero.querySelector('.hero__copy').getBoundingClientRect().top - stage.getBoundingClientRect().top;
        var barB = 72, pad = 14;
        size = Math.max(110, Math.min(size, copyTop - barB - 2 * pad));
        y0 = Math.min(y0, copyTop - pad - size / 2);
      }
      rise = narrow ? 0.16 : 0.34;   // hvor højt den stiger, før den forsvinder ind i båsene
      ball.style.setProperty('--ball-size', size + 'px');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }

    // Boldens bane som funktion af u (0..1): en bue mod højre, ind i dybden
    // mod båsenes skærme, og aldrig op i menuen.
    function pos(u) {
      return {
        x: x0 + u * W * 0.13,
        y: y0 - u * H * (rise + 0.14) + u * u * H * 0.14,
        s: 1 - 0.95 * u
      };
    }

    function render() {
      queued = false;
      var travel = Math.max(hero.offsetHeight - H, 1);
      var p = clamp(window.scrollY / travel);
      if (reduce) {
        var c = pos(0);
        body.style.transform = 'translate(' + (c.x - size / 2) + 'px,' + (c.y - size / 2) + 'px)';
        ball.style.opacity = clamp(1 - p * 2.5);
        return;
      }
      var t = clamp((p - 0.02) / 0.6);
      ball.classList.toggle('is-idle', t === 0);
      var u = 1 - Math.pow(1 - t, 2.2);            // hurtig fra køllen, blød i dybden
      var q = pos(u);
      // Sammentrykning i selve slaget.
      var hit = t < 0.07 ? Math.sin(Math.PI * t / 0.07) : 0;
      var sx = q.s * (1 + 0.12 * hit), sy = q.s * (1 - 0.1 * hit);
      body.style.transform = 'translate(' + (q.x - size / 2).toFixed(1) + 'px,' + (q.y - size / 2).toFixed(1) + 'px) rotate(' + (u * -150).toFixed(1) + 'deg) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
      ball.style.setProperty('--ball-shadow', (0.7 * clamp(1 - u * 5)).toFixed(3));
      body.style.opacity = clamp((1 - u) / 0.14).toFixed(3);

      // Sporet: fra tee til bolden, toner ud når bolden er væk.
      if (t > 0) {
        var d = '', n = 28;
        for (var i = 0; i <= n; i++) {
          var pt = pos(u * i / n);
          d += (i ? ' L ' : 'M ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
        }
        path.setAttribute('d', d);
        grad.setAttribute('x1', x0); grad.setAttribute('y1', y0);
        grad.setAttribute('x2', q.x.toFixed(1)); grad.setAttribute('y2', q.y.toFixed(1));
        path.style.opacity = clamp((1 - p) * 2.2).toFixed(3);
      } else {
        path.setAttribute('d', '');
      }
    }

    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(render); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { layout(); onScroll(); });
    layout(); render();
    function enter() { requestAnimationFrame(function () { ball.classList.add('is-in'); }); }
    if (img.complete) enter(); else img.addEventListener('load', enter);
  })();

  /* Scener der overlapper den forrige: synlige først når de låser fast. */
  var overlaps = Array.prototype.slice.call(document.querySelectorAll('.dest, .lounge'));
  function overlapTick() {
    overlaps.forEach(function (s) { s.classList.toggle('is-on', window.scrollY >= s.offsetTop - 1); });
  }
  window.addEventListener('scroll', overlapTick, { passive: true });
  window.addEventListener('resize', overlapTick);
  overlapTick();

  /* ---------------------------------------------------------------------
     Destinationer: banerne drejer ind som træ-lameller (som WoodUpp-panelerne
     i loungen), og navnet bladrer på plads som en afgangstavle. Drevet af
     sektionens egen scroll-position.
     ------------------------------------------------------------------- */
  (function destinations() {
    var sec = document.querySelector('.dest');
    if (!sec) return;
    var data = JSON.parse(document.getElementById('destData').textContent);
    var layers = Array.prototype.slice.call(sec.querySelectorAll('.dest__layer'));
    var buttons = Array.prototype.slice.call(sec.querySelectorAll('.dest__index button'));
    var nameEl = document.getElementById('destName');
    var placeEl = document.getElementById('destPlace');
    var parEl = document.getElementById('destPar');
    var lineEl = document.getElementById('destLine');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var narrow = window.matchMedia('(max-width: 860px)').matches;
    var N = narrow ? 6 : 9;            // antal lameller
    var FIRST = 0.03, STEP = 0.155, DUR = 0.075;
    var current = -1;
    var swapTimer = null;
    var board = sec.querySelector('.dest__board');

    layers.forEach(function (layer) {
      var src = narrow ? layer.getAttribute('data-img-m') : layer.getAttribute('data-img');
      for (var i = 0; i < N; i++) {
        var slat = document.createElement('div');
        slat.className = 'slat';
        slat.style.left = (i * 100 / N) + '%';
        slat.style.width = 'calc(' + (100 / N) + '% + 1px)';
        var img = document.createElement('img');
        img.src = src; img.alt = ''; img.decoding = 'async';
        img.style.width = (N * 100) + '%';
        img.style.left = (-i * 100) + '%';
        slat.appendChild(img);
        layer.appendChild(slat);
      }
    });
    var slats = layers.map(function (l) { return Array.prototype.slice.call(l.children); });

    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    // Ægte crossfade: det gamle og det nye navn ligger oven på hinanden i samme
    // grid-celle. Det gamle opløses i blødt fokus, det nye toner frem af det,
    // så der aldrig er et tomt øjeblik, og hurtig scroll bare blander roligt.
    function nameLayer(text) {
      var s = document.createElement('span');
      s.className = 'swap__n';
      s.textContent = text;
      return s;
    }

    function fillDetails(d) {
      placeEl.textContent = d.place;
      parEl.textContent = d.par;
      lineEl.textContent = d.line;
    }

    var LEAVE_MS = 900, DETAIL_OUT_MS = 280;
    function swapTo(d, first) {
      if (reduce || first) {
        nameEl.textContent = '';
        nameEl.appendChild(nameLayer(d.name));
        fillDetails(d);
        return;
      }
      Array.prototype.forEach.call(nameEl.querySelectorAll('.swap__n:not(.is-leaving)'), function (old) {
        old.classList.add('is-leaving');
        setTimeout(function () { old.remove(); }, LEAVE_MS);
      });
      var next = nameLayer(d.name);
      next.classList.add('is-entering');
      nameEl.appendChild(next);
      void next.offsetWidth;   // start fra den skjulte tilstand
      next.classList.remove('is-entering');

      // Sted, par og linje dykker kort og kommer tilbage med det nye indhold.
      clearTimeout(swapTimer);
      board.classList.add('is-swapping');
      swapTimer = setTimeout(function () {
        fillDetails(d);
        board.classList.remove('is-swapping');
      }, DETAIL_OUT_MS);
    }

    function show(k) {
      if (k === current) return;
      var first = current === -1;
      current = k;
      var d = data[k];
      document.getElementById('destTitle').setAttribute('aria-label', d.name);
      swapTo(d, first);
      buttons.forEach(function (b, i) { b.setAttribute('aria-current', i === k ? 'true' : 'false'); });
    }

    function progress() {
      var travel = Math.max(sec.offsetHeight - window.innerHeight, 1);
      return clamp((window.scrollY - sec.offsetTop) / travel);
    }

    function render() {
      var p = progress();
      var active = 0;
      layers.forEach(function (layer, k) {
        var start = FIRST + k * STEP;
        var t = clamp((p - start) / DUR);
        var nextT = k + 1 < layers.length ? clamp((p - (start + STEP)) / DUR) : 0;
        var live = t > 0 && nextT < 1;
        layer.classList.toggle('is-live', live);
        layer.style.zIndex = k + 1;
        if (t >= 0.5) active = k;  // navnet skifter halvvejs i overgangen
        if (!live) return;
        // Langsom Ken Burns, mens banen står fremme. Den sidste lander på 1,
        // så loungens bund (samme billede) overtager uden spring.
        var span = k === layers.length - 1 ? 1 - start : STEP + DUR;
        var hold = clamp((p - start) / span);
        if (!reduce) layer.style.transform = 'scale(' + (1.1 - 0.1 * hold).toFixed(4) + ')';
        slats[k].forEach(function (s, i) {
          if (reduce) { s.style.opacity = t; return; }
          var delay = (i / (N - 1)) * 0.45;
          var lt = ease(clamp((t - delay) / 0.55));
          s.style.transform = 'perspective(1600px) rotateY(' + ((1 - lt) * -88).toFixed(2) + 'deg)';
          s.style.opacity = clamp(lt * 3).toFixed(3);
          s.style.setProperty('--shade', (1 - lt).toFixed(3));
        });
      });
      show(active);
    }

    buttons.forEach(function (b, k) {
      b.addEventListener('click', function () {
        var travel = Math.max(sec.offsetHeight - window.innerHeight, 1);
        window.scrollTo({ top: sec.offsetTop + (FIRST + k * STEP + DUR + 0.01) * travel, behavior: reduce ? 'auto' : 'smooth' });
      });
    });

    var queued = false;
    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; render(); }); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    render();
  })();

  /* ---------------------------------------------------------------------
     Drikke & snacks: en golfbold tegner neon-ringen, og produkterne falder
     på plads frame for frame (Higgsfield-video, skåret til en sekvens).
     Styres af loungens egen --sc-p, så den følger scroll begge veje. Uden
     bevægelse vises kun det færdige billede.
     ------------------------------------------------------------------- */
  /* Billedsekvens på canvas, scrubbet af aktens --sc-p inden for data-window.
     Bruges til drikke & snacks i loungen og til Trackman-tegningen ved neonskiltet. */
  function frameScrub(cv) {
    if (!cv || getComputedStyle(cv.parentNode).display === 'none') return;
    var act = cv.closest('[data-sc-act]');
    var mobile = window.matchMedia('(max-width: 860px)').matches;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tpl = cv.getAttribute(mobile ? 'data-src-mobile' : 'data-src');
    var count = parseInt(cv.getAttribute('data-frames'), 10);
    var win = cv.getAttribute('data-window').split(' ').map(parseFloat);
    var ctx = cv.getContext('2d', { alpha: false });
    var frames = [], cur = 0, drawn = -1, live = false, raf = 0;

    function load() {
      if (frames.length) return;
      // Kun sidste frame ved reduceret bevægelse; ellers hele sekvensen.
      for (var i = still ? count - 1 : 0; i < count; i++) {
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () { drawn = -1; };
        img.src = tpl.replace('{ii}', String(i).padStart(2, '0'));
        frames[i] = img;
      }
    }
    function size() {
      var box = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(box.width * dpr);
      cv.height = Math.round(box.height * dpr);
      drawn = -1;
    }
    function draw(idx) {
      // Ikke hentet endnu: vis nærmeste færdige frame bagud.
      for (var i = idx; i >= 0; i--) {
        var img = frames[i];
        if (img && img.complete && img.naturalWidth) {
          if (i === drawn) return;
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          drawn = i;
          return;
        }
      }
    }
    function tick() {
      raf = live ? requestAnimationFrame(tick) : 0;
      var p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
      var t = Math.min(Math.max((p - win[0]) / (win[1] - win[0]), 0), 1);
      cur += (t - cur) * 0.2;
      if (Math.abs(t - cur) < 0.001) cur = t;
      draw(still ? count - 1 : Math.round(cur * (count - 1)));
    }

    size();
    window.addEventListener('resize', size);
    // Hent frames i god tid (3 skærme før), så de er klar når akten nås, også
    // på mobilnet. Tegn kun mens akten er tæt på.
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) load();
    }, { rootMargin: '300% 0px' }).observe(act);
    new IntersectionObserver(function (es) {
      live = es[0].isIntersecting;
      if (live) { load(); if (!raf) tick(); }
    }, { rootMargin: '100% 0px' }).observe(act);
  }
  frameScrub(document.querySelector('.snacks__canvas'));
  frameScrub(document.querySelector('.tm__canvas'));

  /* ---------------------------------------------------------------------
     Kontaktformular. Sendes via Web3Forms, når access_key er sat. Indtil da
     åbnes en færdigudfyldt mail til indoorgolfribe@gmail.com.
     ------------------------------------------------------------------- */
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  var MAIL = 'indoorgolfribe@gmail.com';

  function setErr(input, errId, msg) {
    var e = document.getElementById(errId);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) input.setAttribute('aria-describedby', errId); else input.removeAttribute('aria-describedby');
    e.textContent = msg || '';
    return !msg;
  }

  function validate() {
    var ok = true;
    var name = form.elements.navn, mail = form.elements.email, msg = form.elements.besked;
    ok = setErr(name, 'e-name', name.value.trim() ? '' : 'Skriv jeres navn.') && ok;
    var m = mail.value.trim();
    ok = setErr(mail, 'e-mail', !m ? 'Skriv en mail, vi kan svare på.' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m) ? '' : 'Tjek mailadressen.')) && ok;
    ok = setErr(msg, 'e-msg', msg.value.trim() ? '' : 'Skriv kort, hvad I gerne vil.') && ok;
    return ok;
  }

  ['navn', 'email', 'besked'].forEach(function (n) {
    form.elements[n].addEventListener('blur', function () {
      if (this.getAttribute('aria-invalid') === 'true') validate();
    });
  });

  function mailtoFallback(data) {
    var lines = [
      'Navn: ' + data.get('navn'),
      'Mail: ' + data.get('email'),
      'Telefon: ' + (data.get('telefon') || '-'),
      'Emne: ' + data.get('emne'),
      'Antal: ' + (data.get('antal') || '-'),
      'Dato: ' + (data.get('dato') || '-'),
      '',
      data.get('besked')
    ];
    window.location.href = 'mailto:' + MAIL +
      '?subject=' + encodeURIComponent(data.get('emne') + ' · ' + data.get('navn')) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    status.className = 'form__status is-ok';
    status.textContent = 'Jeres mailprogram åbner nu med beskeden klar til at sende.';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    status.className = 'form__status';
    status.textContent = '';
    if (!validate()) {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    if (form.elements.botcheck.checked) return;
    var data = new FormData(form);
    var key = data.get('access_key');
    if (!key || key.indexOf('DIN_') === 0) { mailtoFallback(data); return; }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = 'Sender...';
    fetch('https://api.web3forms.com/submit', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.success) throw new Error(json.message || 'fejl');
        form.reset();
        status.className = 'form__status is-ok';
        status.textContent = 'Tak! Vi har fået jeres besked og vender tilbage hurtigst muligt.';
      })
      .catch(function () {
        status.className = 'form__status is-err';
        status.innerHTML = 'Beskeden kunne ikke sendes. Skriv i stedet til <a href="mailto:' + MAIL + '">' + MAIL + '</a>.';
      })
      .then(function () { btn.disabled = false; });
  });

  /* ---------------------------------------------------------------------
     Neonskiltet "Oplev vores simulator.": Trackman-strålen rammer skiltet, og bogstaverne tænder ét for ét fra
     venstre, med et kort neon-flimmer, mens man scroller gennem akten. Så
     vokser lyspølen bag, røret under trækkes ud, og skiltet zoomer let ind
     mod peak'en (zoomet ligger i CSS på --sc-p). Alt følger scroll begge veje.
     ------------------------------------------------------------------- */
  (function hushNeon() {
    var sec = document.querySelector('.hush');
    var line = sec && sec.querySelector('.hush__line');
    var stage = sec && sec.querySelector('.hush__stage');   // --glow/--tube her, ikke på sektionen, som observeren lytter på
    if (!line || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // I aktens fremdrift: Trackman tegnes 0.02-0.42 (frameScrub), strålen skyder ned 0.36-0.5,
    // bogstaverne tænder 0.44-0.8, røret trækkes ud 0.76-0.88, og alt zoomer mod peak'en fra 0.86 (CSS).
    var IGNITE_FROM = 0.44, IGNITE_TO = 0.8, CHAR_W = 0.1;
    var TUBE_FROM = 0.76, TUBE_TO = 0.88;
    var BEAM_FROM = 0.36, BEAM_TO = 0.5;
    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    // Lysstyrke gennem ét bogstavs tænding: svag summen, tænd, dyk, tænd, lille blink, fast lys.
    function flicker(t, calm) {
      if (t <= 0) return 0;
      if (t < 0.25) return 0.12 * t / 0.25;
      if (t < 0.38) return 1;
      if (t < 0.5) return 0.22;
      if (t < 0.6 || calm) return 1;
      if (t < 0.68) return 0.55;
      return 1;
    }

    var chars = [];
    line.textContent = '';
    line.getAttribute('aria-label').split(' ').forEach(function (word, w) {
      if (w) line.appendChild(document.createTextNode(' '));
      var wEl = document.createElement('span');
      wEl.className = 'hush__w';
      wEl.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var c = document.createElement('span');
        c.className = 'hush__c';
        c.textContent = ch;
        wEl.appendChild(c);
        c.style.setProperty('--lit', '0');
        chars.push({ el: c, last: 0 });
      });
      line.appendChild(wEl);
    });
    var n = chars.length;
    stage.style.setProperty('--glow', '0');
    stage.style.setProperty('--tube', '0');
    stage.style.setProperty('--beam', '0');
    var span = IGNITE_TO - IGNITE_FROM - CHAR_W;

    function render() {
      var p = parseFloat(sec.style.getPropertyValue('--sc-p'));
      if (isNaN(p)) return;
      var sum = 0;
      chars.forEach(function (c, i) {
        var start = IGNITE_FROM + (n > 1 ? i / (n - 1) : 0) * span;
        var lit = flicker(clamp((p - start) / CHAR_W), i % 3 !== 1);
        sum += lit;
        if (lit !== c.last) { c.last = lit; c.el.style.setProperty('--lit', lit.toFixed(3)); }
      });
      stage.style.setProperty('--glow', (sum / n).toFixed(3));
      stage.style.setProperty('--tube', ease(clamp((p - TUBE_FROM) / (TUBE_TO - TUBE_FROM))).toFixed(3));
      // Strålen: skyder ned fra linsen, og falder til et roligt skær, når skiltet lyser selv.
      var b = ease(clamp((p - BEAM_FROM) / (BEAM_TO - BEAM_FROM)));
      stage.style.setProperty('--beam', (b * (1 - 0.45 * sum / n)).toFixed(3));
      stage.style.setProperty('--beam-y', b.toFixed(3));
    }
    new MutationObserver(render).observe(sec, { attributes: true, attributeFilter: ['style'] });
    render();
  })();

  /* ---------------------------------------------------------------------
     Fakta-ikonerne tegnes af scroll. Engine'en skriver aktens fremdrift som
     --sc-p på sektionen; hvert punkt har sit eget udsnit (data-draw), og
     ikonets streger tegnes i DOM-rækkefølge, let overlappende, inden for det.
     Scroller man tilbage, viskes de ud igen i samme tempo.
     ------------------------------------------------------------------- */
  (function factIcons() {
    var sec = document.querySelector('.facts');
    var list = sec && sec.querySelector('.facts__list');
    if (!list) return;
    list.classList.add('js-draw');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var OVERLAP = 0.5;   // hver streg bruger halvdelen af ikonets udsnit; de næste starter undervejs
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    var icons = Array.prototype.map.call(list.querySelectorAll('[data-draw]'), function (item) {
      var r = item.getAttribute('data-draw').split(/\s+/).map(parseFloat);
      var parts = Array.prototype.slice.call(item.querySelectorAll('.ic-draw, .ic-fade'));
      var m = parts.length;
      return {
        from: r[0], to: r[1],
        parts: parts.map(function (el, j) {
          var start = m > 1 ? j * (1 - OVERLAP) / (m - 1) : 0;
          return {
            el: el, start: start, len: m > 1 ? OVERLAP : 1,
            fade: el.classList.contains('ic-fade'),
            o: parseFloat(el.style.getPropertyValue('--o')) || 1,
            last: -1
          };
        })
      };
    });

    function render() {
      var p = parseFloat(sec.style.getPropertyValue('--sc-p'));
      if (isNaN(p)) return;
      icons.forEach(function (ic) {
        var t = clamp((p - ic.from) / (ic.to - ic.from));
        ic.parts.forEach(function (pt) {
          var k = ease(clamp((t - pt.start) / pt.len));
          if (Math.abs(k - pt.last) < 0.001) return;
          pt.last = k;
          if (pt.fade) pt.el.style.opacity = (k * pt.o).toFixed(3);
          else pt.el.style.strokeDashoffset = (1 - k).toFixed(4);
        });
      });
    }
    new MutationObserver(render).observe(sec, { attributes: true, attributeFilter: ['style'] });
    render();
  })();

  /* FAQ: når et svar foldes ud, flytter kontakt-akten sig. Mål siden igen,
     ellers pinner kontakt og HUD'ens landing ud fra den gamle højde.
     Højden animeres her (details kan ikke transitione selv); fortryder man
     midt i, vender animationen fra den aktuelle højde. */
  var faqCalm = window.matchMedia('(prefers-reduced-motion: reduce)');
  function faqRelayout() {
    if (window.ScrollCraft) window.ScrollCraft.instances.forEach(function (sc) { sc.layout(); });
    window.dispatchEvent(new Event('resize'));
  }
  document.querySelectorAll('.faq details').forEach(function (d) {
    var body = d.querySelector('.faq__a'), anim = null;
    d.querySelector('summary').addEventListener('click', function (e) {
      if (faqCalm.matches || !body.animate) return;
      e.preventDefault();
      var opening = !d.classList.contains('is-open');
      var from = d.open ? body.getBoundingClientRect().height : 0;
      if (anim) anim.cancel();
      if (opening) d.open = true;
      /* Mål tekstens egen højde (translateY flytter den uden at ændre højden),
         ikke scrollHeight, som tæller forskydningen med; ellers åbner kortet
         for langt og hopper tilbage, når animationen slutter. */
      var to = opening ? body.firstElementChild.getBoundingClientRect().height : 0;
      d.classList.toggle('is-open', opening);
      anim = body.animate([{ height: from + 'px' }, { height: to + 'px' }], {
        duration: opening ? 650 : 450, easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
      });
      anim.onfinish = function () {
        anim = null;
        if (!opening) d.open = false;
        faqRelayout();
      };
    });
    d.addEventListener('toggle', function () {
      d.classList.toggle('is-open', d.open);
      faqRelayout();
    });
  });

  /* Mobilmenu: knappen ved siden af "Book en bane" åbner sektionslisten.
     Lukker på link, Escape og når skærmen bliver bred nok til bjælkens nav. */
  (function () {
    var btn = document.querySelector('.bar__menu'), menu = document.getElementById('mnav');
    if (!btn || !menu) return;
    var wide = window.matchMedia('(min-width: 861px)'), timer = 0;
    function set(open) {
      clearTimeout(timer);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Luk menu' : 'Åbn menu');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) {
        menu.hidden = false;
        menu.offsetHeight; // start fra lukket tilstand, så overgangen kører
        menu.classList.add('is-open');
        menu.querySelector('a').focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        timer = setTimeout(function () { menu.hidden = true; }, 400);
      }
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    wide.addEventListener('change', function () { if (wide.matches) set(false); });
  })();
})();
