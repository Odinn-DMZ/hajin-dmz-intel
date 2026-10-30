/* ODIN'S INTEL // HAJIN DMZ - fan-made map tool. Plain JS, no build step. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var D = null, svg, gBase, gImg, gRoutes, gLabels, gPins, vb, home, pinEls = {}, layerOn = {}, selId = null;
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function gridOf(x, y) { var g = D.meta.grid; return String.fromCharCode(65 + Math.floor((x - g.x0) / g.size)) + Math.floor((y - g.y0) / g.size); }
  function badge(c) { return '<span class="badge c-' + esc(c) + '" title="' + esc(D.meta.confidence[c] || '') + '">' + esc(c) + '</span>'; }
  function srcLinks(ids) {
    return (ids || []).map(function (id) { var s = D.sources.find(function (z) { return z.id === id; }); return s ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + '</a>' : esc(id); }).join(' · ');
  }
  var ICON = { // unit icons, ~radius 9 screen px
    poi: 'M0-7L7 0 0 7-7 0Z', fort: 'M-7 7V-3L-4-6V-3H-1V-7H1V-3H4V-6L7-3V7Z', bank: 'M-8 7H8V4H-8ZM-6 3H-3V-3H-6ZM-1.5 3H1.5V-3H-1.5ZM3 3H6V-3H3ZM-8-4H8L0-9Z',
    comp: 'M-7-7H7V7H-7ZM-3-3V3H3V-3Z', key: 'M-3-6A4 4 0 1 1-3 2V8H0V6H2V4H0V2A4 4 0 0 1-3-6ZM-3-4A1.6 1.6 0 1 0-3-0.8 1.6 1.6 0 0 0-3-4Z',
    room: 'M-7 8V-4L0-9 7-4V8H2V2H-2V8Z', ultra: 'M0-9L8 0 0 9-8 0ZM0-4L4 0 0 4-4 0Z', boss: 'M-7-2A7 7 0 0 1 7-2V3H3V7H-3V3H-7ZM-4-1A1.8 1.8 0 1 0-4 2.4 1.8 1.8 0 0 0-4-1ZM4-1A1.8 1.8 0 1 0 4 2.4 1.8 1.8 0 0 0 4-1Z',
    cache: 'M0-7A7 7 0 1 1 0 7 7 7 0 1 1 0-7ZM0-3.5A3.5 3.5 0 1 0 0 3.5 3.5 3.5 0 1 0 0-3.5Z', secret: 'M0-9L2.5-2.5 9 0 2.5 2.5 0 9-2.5 2.5-9 0-2.5-2.5Z',
    silo: 'M-6 8V-2A6 6 0 0 1 6-2V8ZM-2 8V2H2V8Z', exfil: 'M0-9L8 3H3V8H-3V3H-8Z', dot: 'M0-4A4 4 0 1 1 0 4 4 4 0 1 1 0-4Z'
  };

  fetch('data.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { D = d; init(); })
    .catch(function (e) { document.body.insertAdjacentHTML('afterbegin', '<div style="background:#8b1a1a;color:#fff;padding:10px">Could not load data.json (' + esc(e.message) + '). If you opened the file directly, serve the folder over http (see README).</div>'); console.error(e); });

  function init() {
    $('#updated').textContent = 'UPDATED ' + D.meta.updated;
    $('#disclaimer').textContent = D.meta.disclaimer;
    svg = $('#map');
    var v = D.basemap.view; vb = { x: v[0], y: v[1], w: v[2], h: v[3] }; home = Object.assign({}, vb);
    gBase = el('g', { id: 'base' }, svg); gImg = el('g', { id: 'img', style: 'display:none' }, svg);
    var gOutline = el('g', { id: 'outline' }, svg), gGrid = el('g', { id: 'grid' }, svg);
    gRoutes = el('g', { id: 'routes' }, svg); gLabels = el('g', { id: 'labels' }, svg); gPins = el('g', { id: 'pins' }, svg);
    el('rect', { x: 0, y: 0, width: 4096, height: 4096, fill: '#0e1114' }, gBase);
    var o = D.basemap.outline;
    if (o && o.playable) {
      el('polygon', { points: o.playable.map(function (p) { return p.join(','); }).join(' '), fill: '#1f262d', stroke: '#c9a227', 'stroke-opacity': .5, 'stroke-width': 4 }, gOutline);
      (o.water || []).forEach(function (w) { el('polygon', { points: w.map(function (p) { return p.join(','); }).join(' '), fill: '#14283a', stroke: '#2c5878', 'stroke-width': 3 }, gOutline); });
    }
    drawGrid(gGrid); drawZones(); drawRoutes(); drawPins(); buildLayerUI(); buildImageCtl();
    applyVB(); bindPanZoom(); bindUI(); buildKeys(); buildBanks(); buildMoney(); buildLoot(); buildAbout();
    if (location.hash.indexOf('#item=') === 0) focusItem(decodeURIComponent(location.hash.slice(6)));
    window.__HAJIN_OK__ = { items: D.items.length, keys: D.keys.length, pins: Object.keys(pinEls).length };
  }

  function drawGrid(g) {
    var G = D.meta.grid, x1 = G.x0 + G.cols * G.size, y1 = G.y0 + G.rows * G.size;
    for (var c = 0; c <= G.cols; c++) el('line', { x1: G.x0 + c * G.size, y1: G.y0, x2: G.x0 + c * G.size, y2: y1, class: 'gridline', 'stroke-width': 2 }, g);
    for (var r = 0; r <= G.rows; r++) el('line', { x1: G.x0, y1: G.y0 + r * G.size, x2: x1, y2: G.y0 + r * G.size, class: 'gridline', 'stroke-width': 2 }, g);
    for (c = 0; c < G.cols; c++) for (r = 0; r < G.rows; r++) {
      var t = el('text', { x: G.x0 + c * G.size + 10, y: G.y0 + r * G.size + 34, class: 'gridlbl', 'font-size': 30 }, g); t.textContent = String.fromCharCode(65 + c) + r;
    }
    var n = el('text', { x: G.x0, y: G.y0 - 14, class: 'gridlbl', 'font-size': 34 }, g); n.textContent = 'ESTIMATED GRID (unofficial)';
  }
  function drawZones() {
    D.items.filter(function (i) { return i.layer === 'poi'; }).forEach(function (i) {
      var major = i.kind === 'major';
      if (major) el('circle', { cx: i.x, cy: i.y, r: 110, fill: 'rgba(201,162,39,.05)', stroke: 'rgba(201,162,39,.22)', 'stroke-width': 3, 'stroke-dasharray': '10 8' }, gLabels);
      var t = el('text', { x: i.x, y: i.y - (major ? 22 : 14), 'text-anchor': 'middle', class: 'lbl' + (major ? '' : ' minor'), 'data-major': major ? 1 : 0 }, gLabels);
      t.textContent = major ? i.name.toUpperCase() : i.name;
    });
  }
  function drawRoutes() {
    D.routes.forEach(function (r) {
      var p = el('polyline', { points: r.points.map(function (q) { return q.join(','); }).join(' '), class: 'route', fill: 'none', stroke: r.color, 'stroke-width': 10, 'stroke-dasharray': '26 14', 'data-route': r.id }, gRoutes);
      var t = el('title', {}, p); t.textContent = r.name;
      p.addEventListener('click', function (e) { e.stopPropagation(); showRoute(r); });
    });
  }
  function layerById(id) { return D.layers.find(function (l) { return l.id === id; }); }
  function drawPins() {
    D.items.forEach(function (i) {
      var L = layerById(i.layer); if (!L) return;
      var g = el('g', { class: 'pin', 'data-id': i.id, 'data-layer': i.layer }, gPins);
      el('circle', { r: 13, class: 'ring', 'stroke-width': 1.5 }, g);
      var icon = i.layer === 'poi' ? (i.kind === 'major' ? 'poi' : 'dot') : L.icon;
      el('path', { d: ICON[icon] || ICON.dot, class: 'shape', fill: L.color, stroke: '#000', 'stroke-width': 1.2 }, g);
      if (i.conf === 'rumor' || i.conf === 'low') el('circle', { r: 2, cx: 7, cy: -7, fill: '#ff3b3b' }, g);
      var t = el('title', {}, g); t.textContent = i.name + ' [' + i.grid + ']';
      g.addEventListener('click', function (e) { e.stopPropagation(); select(i.id); });
      pinEls[i.id] = { g: g, item: i };
    });
  }
  function scale() { return vb.w / (svg.clientWidth || 800); }
  function applyVB() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    var s = scale(), zoomed = s < 1.6;
    for (var id in pinEls) { var p = pinEls[id]; p.g.setAttribute('transform', 'translate(' + p.item.x + ',' + p.item.y + ') scale(' + (s * 1.15) + ')'); }
    var showLbl = $('#optLabels').checked;
    gLabels.querySelectorAll('text').forEach(function (t) {
      var major = t.getAttribute('data-major') === '1';
      t.setAttribute('font-size', (major ? 13 : 11) * s); t.setAttribute('stroke-width', 3 * s);
      t.style.display = showLbl && (major || zoomed) ? '' : 'none';
    });
    gRoutes.querySelectorAll('polyline').forEach(function (p) { p.setAttribute('stroke-width', 4 * s); p.setAttribute('stroke-dasharray', (10 * s) + ' ' + (6 * s)); });
  }
  function svgPt(cx, cy) { var r = svg.getBoundingClientRect(); return { x: vb.x + (cx - r.left) / r.width * vb.w, y: vb.y + (cy - r.top) / r.height * vb.h }; }
  function fit() { var r = svg.getBoundingClientRect(); if (!r.width) return; var a = r.width / r.height; if (vb.w / vb.h > a) { var nh = vb.w / a; vb.y -= (nh - vb.h) / 2; vb.h = nh; } else { var nw = vb.h * a; vb.x -= (nw - vb.w) / 2; vb.w = nw; } }
  function zoomAt(f, px, py) { var nw = Math.min(5000, Math.max(120, vb.w * f)), k = nw / vb.w; vb.x = px - (px - vb.x) * k; vb.y = py - (py - vb.y) * k; vb.w = nw; vb.h *= k; applyVB(); }
  function bindPanZoom() {
    fit(); applyVB();
    window.addEventListener('resize', function () { fit(); applyVB(); });
    svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = svgPt(e.clientX, e.clientY); zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, p.x, p.y); }, { passive: false });
    var pts = {}, last = null, pinch = null, moved = false;
    svg.addEventListener('pointerdown', function (e) { pts[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false; svg.classList.add('drag'); });
    svg.addEventListener('pointermove', function (e) {
      var p = svgPt(e.clientX, e.clientY); $('#coords').textContent = 'X ' + Math.round(p.x) + ' Y ' + Math.round(p.y) + ' · ' + gridOf(p.x, p.y) + ' (est.)';
      if (!pts[e.pointerId]) return;
      var prev = pts[e.pointerId]; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), m = svgPt((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (pinch) zoomAt(pinch / d, m.x, m.y); pinch = d; moved = true; return;
      }
      var r = svg.getBoundingClientRect(), dx = (e.clientX - prev.x) / r.width * vb.w, dy = (e.clientY - prev.y) / r.height * vb.h;
      if (Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 0) { moved = true; vb.x -= dx; vb.y -= dy; applyVB(); }
    });
    function up(e) { delete pts[e.pointerId]; pinch = null; if (!Object.keys(pts).length) svg.classList.remove('drag'); }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); svg.addEventListener('pointerleave', up);
    svg.addEventListener('click', function () { if (!moved) closeDetails(); });
    $('#zIn').onclick = function () { zoomAt(1 / 1.4, vb.x + vb.w / 2, vb.y + vb.h / 2); };
    $('#zOut').onclick = function () { zoomAt(1.4, vb.x + vb.w / 2, vb.y + vb.h / 2); };
    $('#zReset').onclick = function () { vb = Object.assign({}, home); fit(); applyVB(); };
  }

  function buildLayerUI() {
    var box = $('#layers'), counts = {};
    D.items.forEach(function (i) { counts[i.layer] = (counts[i.layer] || 0) + 1; });
    D.layers.forEach(function (L) {
      layerOn[L.id] = !!L.on;
      var lab = document.createElement('label');
      lab.innerHTML = '<input type="checkbox" data-layer="' + esc(L.id) + '"' + (L.on ? ' checked' : '') + '><span class="sw" style="background:' + esc(L.color) + '"></span>' + esc(L.name) + '<span class="n">' + (counts[L.id] || 0) + '</span>';
      box.appendChild(lab);
    });
    box.addEventListener('change', function (e) { var id = e.target.getAttribute('data-layer'); if (id) { layerOn[id] = e.target.checked; refreshLayers(); } });
    function setAll(f) { D.layers.forEach(function (L) { layerOn[L.id] = f(L); }); box.querySelectorAll('input').forEach(function (c) { c.checked = layerOn[c.getAttribute('data-layer')]; }); refreshLayers(); }
    $('#allOn').onclick = function () { setAll(function () { return true; }); };
    $('#allOff').onclick = function () { setAll(function () { return false; }); };
    $('#defaults').onclick = function () { setAll(function (L) { return !!L.on; }); };
    $('#legend').innerHTML = 'Confidence: ' + Object.keys(D.meta.confidence).map(badge).join(' ') + '<br><span>● red dot on a pin = low confidence / rumor</span>';
    refreshLayers();
  }
  function refreshLayers() { for (var id in pinEls) pinEls[id].g.style.display = layerOn[pinEls[id].item.layer] ? '' : 'none'; }
  function enableLayer(id) { layerOn[id] = true; var c = document.querySelector('#layers input[data-layer="' + id + '"]'); if (c) c.checked = true; refreshLayers(); }

  function buildImageCtl() {
    var b = D.basemap.imageBounds || [0, 0, 4096, 4096];
    var img = el('image', { x: b[0], y: b[1], width: b[2], height: b[3], preserveAspectRatio: 'none', opacity: .7 }, gImg);
    if (D.basemap.image) { img.setAttribute('href', D.basemap.image); }
    $('#optImage').onchange = function (e) { gImg.style.display = e.target.checked ? '' : 'none'; if (e.target.checked && !img.getAttribute('href')) alert('No image yet: load one from your device below, or set basemap.image in data.json.'); };
    $('#imgOpacity').oninput = function (e) { img.setAttribute('opacity', e.target.value); };
    $('#imgFile').onchange = function (e) { var f = e.target.files[0]; if (!f) return; img.setAttribute('href', URL.createObjectURL(f)); $('#optImage').checked = true; gImg.style.display = ''; };
  }

  function bindUI() {
    document.querySelectorAll('.tab').forEach(function (t) { t.onclick = function () { showTab(t.getAttribute('data-tab')); }; });
    $('#menuBtn').onclick = function () { showTab('map'); $('#sidebar').classList.toggle('open'); };
    $('#optGrid').onchange = function (e) { $('#grid').style.display = e.target.checked ? '' : 'none'; };
    $('#optOutline').onchange = function (e) { $('#outline').style.display = e.target.checked ? '' : 'none'; };
    $('#optLabels').onchange = applyVB;
    $('#optRoutes').onchange = function (e) { gRoutes.style.display = e.target.checked ? '' : 'none'; };
    var s = $('#search'); s.addEventListener('input', function () { doSearch(s.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetails(); if (e.key === '/' && document.activeElement !== s && $('#tab-map').classList.contains('active')) { e.preventDefault(); s.focus(); } });
  }
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === name); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + name); });
    if (name === 'map') { fit(); applyVB(); }
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' '); }
  function doSearch(q) {
    var ul = $('#results'); ul.innerHTML = ''; q = q.trim(); if (!q) return;
    var gq = /^[a-j]\d$/i.test(q) ? q.toUpperCase() : null, terms = norm(q).split(/\s+/).filter(Boolean);
    var hits = D.items.map(function (i) {
      if (gq) return i.grid === gq ? { i: i, s: 1 } : null;
      var n = norm(i.name), hay = n + ' ' + norm(i.desc) + ' ' + norm(i.lootRoom) + ' ' + norm(i.layer), sc = 0;
      for (var k = 0; k < terms.length; k++) { if (hay.indexOf(terms[k]) < 0) return null; sc += n.indexOf(terms[k]) >= 0 ? 3 : 1; }
      return { i: i, s: sc };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 40);
    if (!hits.length) { ul.innerHTML = '<li><small>No matches</small></li>'; return; }
    hits.forEach(function (h) { var li = document.createElement('li'); var L = layerById(h.i.layer); li.innerHTML = esc(h.i.name) + ' <small>· ' + esc(L ? L.name : h.i.layer) + ' · ' + esc(h.i.grid) + '</small>'; li.onclick = function () { focusItem(h.i.id); }; ul.appendChild(li); });
  }
  function focusItem(id) {
    var p = pinEls[id]; if (!p) return;
    showTab('map'); enableLayer(p.item.layer);
    var w = Math.min(vb.w, 700); vb.h = vb.h * w / vb.w; vb.w = w; vb.x = p.item.x - vb.w / 2; vb.y = p.item.y - vb.h / 2; applyVB();
    select(id); $('#sidebar').classList.remove('open');
  }
  function select(id) {
    if (selId && pinEls[selId]) pinEls[selId].g.classList.remove('sel');
    selId = id; var p = pinEls[id]; p.g.classList.add('sel'); gPins.appendChild(p.g);
    var i = p.item, L = layerById(i.layer), h = '';
    h += '<button class="x" aria-label="Close">✕</button><h2>' + esc(i.name) + '</h2>';
    h += '<div class="meta-row">' + badge(i.conf) + '<span>' + esc(L ? L.name : i.layer) + '</span><span>GRID ' + esc(i.grid) + ' (est.)</span>' + (i.sector ? '<span>dmzradar sector ' + esc(i.sector) + '</span>' : '') + '<span>X ' + i.x + ' Y ' + i.y + '</span></div>';
    h += '<div class="meta-row">Position: ' + esc(i.precision) + '</div>';
    if (i.kind === 'major') h += '<p><b>Threat:</b> ' + esc(i.threat) + '<br><b>Lieutenant:</b> ' + esc(i.lieutenant) + '<br><b>Keys in area (approx):</b> ' + esc(i.keys) + '</p>';
    if (i.rarity) h += '<p><b>Rarity:</b> <span class="r-' + esc(i.rarity) + '">' + esc(i.rarity) + '</span> · <b>Worth it:</b> ' + esc(i.worth) + '</p>';
    if (i.desc) h += '<p>' + esc(i.desc) + '</p>';
    if (i.lootRoom) h += '<p><b>Loot room:</b> ' + esc(i.lootRoom) + '</p>';
    if (i.threats) h += '<p><b>Threats:</b> ' + esc(i.threats) + '<br><b>Exfil:</b> ' + esc(i.exfils) + '</p>';
    if (i.steps) h += '<h3 style="color:var(--gold2);margin:8px 0 0;font-size:14px">HEIST STEPS</h3><ol>' + i.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    h += '<div class="srcs">Sources: ' + srcLinks(i.src) + '</div>';
    h += '<div class="srcs"><a href="#item=' + encodeURIComponent(i.id) + '">Link to this pin</a></div>';
    var d = $('#details'); d.innerHTML = h; d.classList.remove('hidden'); d.querySelector('.x').onclick = closeDetails;
  }
  function showRoute(r) {
    var d = $('#details');
    d.innerHTML = '<button class="x">✕</button><h2>' + esc(r.name) + '</h2><div class="meta-row">' + badge(r.conf) + '<span>Money route</span></div><p>' + esc(r.desc) + '</p><div class="srcs">Sources: ' + srcLinks(r.src) + '</div>';
    d.classList.remove('hidden'); d.querySelector('.x').onclick = closeDetails;
  }
  function closeDetails() { $('#details').classList.add('hidden'); if (selId && pinEls[selId]) pinEls[selId].g.classList.remove('sel'); selId = null; }

  function buildKeys() {
    var tb = $('#keyTable tbody'), rs = $('#keyRarity');
    var order = ['Ultra', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common', 'Unknown'];
    order.forEach(function (r) { if (D.keys.some(function (k) { return k.rarity === r; })) { var o = document.createElement('option'); o.textContent = r; rs.appendChild(o); } });
    function firstPin(k) { return D.items.find(function (i) { return i.keyId === k.id && i.layer === 'keys'; }); }
    function render() {
      var q = norm($('#keySearch').value), r = rs.value, w = $('#keyWorth').value;
      var rows = D.keys.filter(function (k) {
        if (r && k.rarity !== r) return false;
        if (w && String(k.worth).indexOf(w) !== 0) return false;
        return !q || norm(k.name + ' ' + k.door + ' ' + k.inside + ' ' + k.grid).indexOf(q) >= 0;
      }).sort(function (a, b) { return order.indexOf(a.rarity) - order.indexOf(b.rarity) || a.name.localeCompare(b.name); });
      tb.innerHTML = rows.map(function (k) {
        var wc = /^Yes/.test(k.worth) ? 'w-Yes' : /^No/.test(k.worth) ? 'w-No' : '';
        return '<tr><td><b>' + esc(k.name) + '</b></td><td class="r-' + esc(k.rarity) + '">' + esc(k.rarity) + '</td><td class="mono">' + esc(k.grid) + '</td><td>' + esc(k.door) + '<div class="tiny">map: ' + esc(k.mapPrecision) + '</div></td><td>' + esc(k.inside) + '</td><td class="' + wc + '">' + esc(k.worth) + '</td><td>' + badge(k.conf) + '</td><td>' + (firstPin(k) ? '<button class="btn-link" data-key="' + esc(k.id) + '">Map</button>' : '') + '</td></tr>';
      }).join('');
      $('#keyCount').textContent = rows.length + ' / ' + D.keys.length + ' keys · source: ' + 'DMZ Tracker + dmzradar pins';
    }
    tb.addEventListener('click', function (e) { var id = e.target.getAttribute('data-key'); if (id) { var p = firstPin(D.keys.find(function (k) { return k.id === id; })); if (p) focusItem(p.id); } });
    ['#keySearch', '#keyRarity', '#keyWorth'].forEach(function (s) { $(s).addEventListener('input', render); });
    render();
  }
  function card(title, body, cls) { return '<div class="card ' + (cls || '') + '"><h2>' + title + '</h2>' + body + '</div>'; }
  function list(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function buildBanks() {
    var banks = D.items.filter(function (i) { return i.layer === 'banks'; });
    var h = card('ᚠ Hanex bank heist: how it works', '<ol>' + D.heistSteps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol><p class="tiny">Sources: ' + srcLinks(['gamesgg', 'gamerantbank', 'gamerfuzion']) + '</p>');
    h += '<div class="cols">' + banks.map(function (b) {
      return card(esc(b.name), '<div class="meta-row">' + badge(b.conf) + '<span>GRID ' + esc(b.grid) + ' (est.)</span></div><p>' + esc(b.desc) + '</p><p><b>Threats:</b> ' + esc(b.threats) + '<br><b>Exfil:</b> ' + esc(b.exfils) + '</p><button class="btn-link" data-go="' + esc(b.id) + '">Show on map</button><p class="tiny">Sources: ' + srcLinks(b.src) + '</p>');
    }).join('') + '</div>';
    var v = $('#banksView'); v.innerHTML = h; v.addEventListener('click', goBtn);
  }
  function goBtn(e) { var id = e.target.getAttribute('data-go'); if (id) focusItem(id); }
  function buildMoney() {
    var h = '<div class="cols">' + D.money.map(function (m) { return card(esc(m.name), '<div class="meta-row">' + badge(m.conf) + '<span>' + esc(m.value) + '</span></div><p>' + esc(m.notes) + '</p><p class="tiny">Sources: ' + srcLinks(m.src) + '</p>'); }).join('') + '</div>';
    h += card('ᛟ Cash facts', list(D.cash));
    h += card('Routes on the map', '<p>Dashed lines on the map (toggle "Money routes"). Click a line for details.</p>' + list(D.routes.map(function (r) { return r.name; })));
    $('#moneyView').innerHTML = h;
  }
  function buildLoot() {
    var L = D.loot;
    $('#lootView').innerHTML = '<div class="cols">' + card('ᚷ KEEP', list(L.keep)) + card('SELL', list(L.sell), 'warn') + '</div>' + card('Notes', list(L.notes) + '<div class="meta-row">' + badge(L.conf) + '</div><p class="tiny">Sources: ' + srcLinks(L.src) + '</p>');
  }
  function buildAbout() {
    var C = D.meta.confidence;
    var h = card('ᚨ About this map', '<p>' + esc(D.meta.game) + '. Data as of ' + esc(D.meta.dataAsOf) + '. ' + esc(D.meta.coords) + '</p><p>' + esc(D.meta.grid.note) + '</p><p>The base map is drawn from coordinates only (no game artwork). The outline is a coarse, low-resolution approximation.</p>');
    h += card('Confidence levels', '<ul>' + Object.keys(C).map(function (k) { return '<li>' + badge(k) + ' ' + esc(C[k]) + '</li>'; }).join('') + '</ul>');
    h += card('Known gaps', list(D.gaps), 'warn');
    h += card('Sources & credits', '<p>Huge thanks to these community and press sources. Go support them.</p><ul>' + D.sources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + '</a></li>'; }).join('') + '</ul>');
    h += card('Disclaimer', '<p><b>Fan-made, not affiliated with Activision.</b> ' + esc(D.meta.disclaimer) + '</p><p>Icons (raven, Valknut-style knot) are original drawings for this site.</p>', 'warn');
    $('#aboutView').innerHTML = h;
  }
})();
