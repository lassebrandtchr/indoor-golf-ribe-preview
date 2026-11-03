/* Samtykke til statistik (Google Analytics 4).
   GA indlæses først, når den besøgende har sagt ja. Et nej gemmes, så banneret ikke kommer igen.
   "Cookieindstillinger" i footeren åbner banneret igen. */
(function () {
  var GA_ID = 'G-VDKSEPWQHB';
  var KEY = 'igr-samtykke';
  var banner = document.getElementById('consent');
  if (!banner) return;

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function loadGA() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  // Fjerner GA-cookies, hvis samtykket trækkes tilbage.
  function clearGA() {
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^_ga/.test(name)) {
        var host = location.hostname.replace(/^www\./, '');
        document.cookie = name + '=; Max-Age=0; path=/; domain=.' + host;
        document.cookie = name + '=; Max-Age=0; path=/';
      }
    });
    window['ga-disable-' + GA_ID] = true;
  }

  function show() { banner.hidden = false; requestAnimationFrame(function () { banner.classList.add('is-in'); }); }
  function hide() { banner.classList.remove('is-in'); setTimeout(function () { banner.hidden = true; }, 260); }

  banner.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-consent]');
    if (!btn) return;
    var yes = btn.getAttribute('data-consent') === 'ja';
    save(yes ? 'ja' : 'nej');
    if (yes) { window['ga-disable-' + GA_ID] = false; loadGA(); } else { clearGA(); }
    hide();
  });

  var open = document.getElementById('consentOpen');
  if (open) open.addEventListener('click', function (e) { e.preventDefault(); show(); });

  var choice = read();
  if (choice === 'ja') loadGA();
  else if (choice !== 'nej') show();
})();
