(function () {
  'use strict';

  var box = document.getElementById('ggb-box');
  var host = document.getElementById('ggb-element');
  var ph = document.getElementById('ggb-ph');
  var api = null, lastW = 0, loaded = false, resizeTimer = null;

  /* ---------- komendy konstrukcji (te same co w pliku .txt) ---------- */
  var COMMANDS = [
    'g(x)=x^2',
    'h(x)=cos(x)',
    'd(x)=h(x)-g(x)',
    'A=Intersect(g,h,-1,0)',
    'B=Intersect(g,h,0,1)',
    'n=Slider(1,100,1,1,260,false,true,false,false)',
    'SetValue(n,10)',
    'obszar=IntegralBetween(h,g,x(A),x(B))',
    'trap=TrapezoidalSum(d,x(A),x(B),n)',
    'simp=Integral(d,x(A),x(B))',
    'krok=(x(B)-x(A))/n',
    'trapezy=Sequence(Polygon((x(A)+(k-1)*krok,g(x(A)+(k-1)*krok)),(x(A)+k*krok,g(x(A)+k*krok)),(x(A)+k*krok,h(x(A)+k*krok)),(x(A)+(k-1)*krok,h(x(A)+(k-1)*krok))),k,1,n)',
    'SetVisibleInView(d,1,false)',
    'SetVisibleInView(trap,1,false)',
    'SetVisibleInView(simp,1,false)'
  ];

  /* wygląd (API przyjmuje kolory w skali 0-255) */
  function styleApplet() {
    var set = function (fn) { try { fn(); } catch (e) {} };
    set(function () { api.setColor('g', 192, 87, 74); api.setLineThickness('g', 5); });
    set(function () { api.setColor('h', 63, 126, 105); api.setLineThickness('h', 5); });
    set(function () { api.setColor('obszar', 232, 206, 140); api.setFilling('obszar', 0.3); });
    set(function () { api.setColor('trapezy', 154, 116, 24); api.setFilling('trapezy', 0.45); api.setLineThickness('trapezy', 2); });
    set(function () { api.setColor('A', 0, 0, 0); api.setColor('B', 0, 0, 0); api.setPointSize('A', 5); api.setPointSize('B', 5); });
    ['g', 'h', 'A', 'B', 'obszar', 'trapezy'].forEach(function (o) {
      set(function () { api.setLabelVisible(o, false); });
    });
    set(function () { api.evalCommand('SetCoords(n,30,34)'); });
    set(function () { api.setLabelVisible('n', true); api.setLabelStyle('n', 1); });
    set(function () { api.setAxesVisible(true, true); api.setGridVisible(true); });
  }

  /* widok 1:1 dopasowany do rozmiaru apletu */
  function fitView() {
    if (!api) return;
    var w = box.clientWidth, h = host.clientHeight || calcSize().h;
    var sc = Math.min(w / 6.2, h / 3.6), cy = 0.6;
    try { api.setCoordSystem(-w / (2 * sc), w / (2 * sc), cy - h / (2 * sc), cy + h / (2 * sc)); } catch (e) {}
  }

  /* ---------- wartości liczbowe pod apletem ---------- */
  var g = function (x) { return Math.cos(x) - x * x; };
  var F = function (x) { return Math.sin(x) - x * x * x / 3; };

  function limits() {
    var a = -0.82413197, b = 0.82413197;
    try {
      var xa = api.getXcoord('A'), xb = api.getXcoord('B');
      if (isFinite(xa) && isFinite(xb) && xa < xb) { a = xa; b = xb; }
    } catch (e) {}
    return [a, b];
  }
  function trapezy(a, b, n) {
    var h = (b - a) / n, s = (g(a) + g(b)) / 2;
    for (var i = 1; i < n; i++) s += g(a + i * h);
    return h * s;
  }
  function fmt(x) { return x.toFixed(6).replace('.', ','); }
  function fmtErr(e) {
    if (e === 0) return '0';
    var ex = Math.floor(Math.log(e) / Math.LN10), m = e / Math.pow(10, ex);
    var sup = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079';
    return m.toFixed(2).replace('.', ',') + '\u00B710' +
      String(ex).replace('-', '\u207B').replace(/\d/g, function (d) { return sup.charAt(+d); });
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function showStats() {
    var n = 10;
    try { n = Math.round(api.getValue('n')); } catch (e) {}
    if (!(n >= 1)) n = 10;
    var l = limits(), a = l[0], b = l[1];
    var T = trapezy(a, b, n), P = F(b) - F(a);
    setText('v-n', n);
    setText('v-T', fmt(T));
    setText('v-P', fmt(P));
    setText('v-E', fmtErr(Math.abs(P - T)));
  }
  window.ggbOnN = showStats;

  /* ---------- po załadowaniu apletu ---------- */
  function onLoad(a) {
    api = a;
    loaded = true;
    if (ph) ph.style.display = 'none';
    try { api.setErrorDialogsActive(false); } catch (e) {}
    COMMANDS.forEach(function (c) { try { api.evalCommand(c); } catch (e) {} });
    try { api.setValue('n', 10); } catch (e) {}
    styleApplet();
    fitView();
    showStats();
    try { api.registerObjectUpdateListener('n', 'ggbOnN'); } catch (e) {}
    var dl = document.getElementById('btn-ggb');
    if (dl) dl.disabled = false;
  }

  /* ---------- wstrzyknięcie apletu: rozmiar z szerokości kontenera ---------- */
  function calcSize() {
    var w = Math.floor(box.clientWidth);
    var narrow = w < 720;
    var h = narrow ? Math.round(Math.min(520, Math.max(340, w * 0.85)))
                   : Math.round(Math.min(680, Math.max(460, w * 0.58)));
    return { w: w, h: h, narrow: narrow };
  }
  function inject() {
    var s = calcSize();
    lastW = s.w;
    loaded = false;
    api = null;
    host.innerHTML = '';
    var params = {
      appName: 'classic',
      perspective: 'G',
      width: s.w, height: s.h,
      showToolBar: false, showAlgebraInput: false, showMenuBar: false, showToolBarHelp: false,
      enableRightClick: false, enableShiftDragZoom: true, showZoomButtons: true,
      showFullscreenButton: true, showKeyboardOnFocus: false, errorDialogsActive: false,
      language: 'pl',
      appletOnLoad: onLoad
    };
    new window.GGBApplet(params, true).inject('ggb-element');
  }
  function failed() {
    if (loaded || !ph) return;
    ph.style.display = 'flex';
    ph.textContent = 'Nie udało się wczytać apletu. Pobierz plik .ggb poniżej i otwórz go w GeoGebra Classic.';
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!window.GGBApplet || document.fullscreenElement) return;
      if (Math.abs(Math.floor(box.clientWidth) - lastW) > 60) inject();
    }, 350);
  });

  var sc = document.createElement('script');
  sc.src = 'https://www.geogebra.org/apps/deployggb.js';
  sc.onerror = failed;
  sc.onload = function () {
    try { inject(); } catch (e) { failed(); }
    setTimeout(failed, 25000);
  };
  document.head.appendChild(sc);

  /* ---------- pobieranie pliku .ggb z żywego apletu ---------- */
  function b64ToBlob(b64) {
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: 'application/vnd.geogebra.file' });
  }
  function downloadGgb() {
    var status = document.getElementById('ggb-status');
    if (!api) return;
    try {
      api.getBase64(function (b64) {
        var url = URL.createObjectURL(b64ToBlob(b64));
        var a = document.createElement('a');
        a.href = url; a.download = 'pole_obszaru.ggb';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        if (status) status.textContent = 'Plik pole_obszaru.ggb został pobrany.';
      });
    } catch (e) {
      if (status) status.textContent = 'Nie udało się wygenerować pliku. Użyj komend poniżej.';
    }
  }

  /* ---------- komendy: kopiowanie i otwieranie GeoGebry ---------- */
  function commandsText() {
    var el = document.getElementById('ggb-commands');
    return el ? el.textContent.replace(/\u00A0/g, ' ').trim() : '';
  }
  function copyText(txt, onOk) {
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); onOk(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(onOk).catch(fallbackCopy);
    else fallbackCopy();
  }
  function flash(btn, msg, old) { btn.textContent = msg; setTimeout(function () { btn.textContent = old; }, 1800); }

  function bindButtons() {
    var dl = document.getElementById('btn-ggb');
    if (dl) { dl.disabled = !loaded; dl.addEventListener('click', downloadGgb); }
    var cp = document.getElementById('btn-copy');
    if (cp) cp.addEventListener('click', function () { copyText(commandsText(), function () { flash(cp, 'Skopiowano', 'Kopiuj komendy'); }); });
    var op = document.getElementById('btn-open');
    if (op) op.addEventListener('click', function () {
      copyText(commandsText(), function () { flash(op, 'Komendy skopiowane', 'Otwórz GeoGebrę'); });
      window.open('https://www.geogebra.org/classic', '_blank', 'noopener');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindButtons);
  else bindButtons();
})();
