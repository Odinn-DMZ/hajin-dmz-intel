/* ODIN'S INTEL // HAJIN DMZ. Plain JS, no build step. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var D = null, svg, gBase, gImg, gRoutes, gLabels, gPins, gGrid, gThreat, gLink, svgDefs, vb, home, pinEls = {}, layerOn = {}, selId = null;
  var THREAT_LEVELS = ['Extreme', 'Critical', 'High', 'Medium', 'Low'];
  var THREAT_COLOR = { Extreme: '#ff2d3a', Critical: '#e23d4a', High: '#e08a2e', Medium: '#e0c36a', Low: '#3cba6e', Unrated: '#8b95a1' };
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function gridOf(x, y) { var g = D.meta.grid; return String.fromCharCode(65 + Math.floor((x - g.x0) / g.size)) + Math.floor((y - g.y0) / g.size); }
  function badge(c) { return '<span class="badge c-' + esc(c) + '">' + esc(c) + '</span>'; }
  var ICON = { // unit icons, ~radius 9 screen px
    poi: 'M0-7L7 0 0 7-7 0Z', fort: 'M-7 7V-3L-4-6V-3H-1V-7H1V-3H4V-6L7-3V7Z', bank: 'M-8 7H8V4H-8ZM-6 3H-3V-3H-6ZM-1.5 3H1.5V-3H-1.5ZM3 3H6V-3H3ZM-8-4H8L0-9Z',
    comp: 'M-7-7H7V7H-7ZM-3-3V3H3V-3Z', key: 'M-3-6A4 4 0 1 1-3 2V8H0V6H2V4H0V2A4 4 0 0 1-3-6ZM-3-4A1.6 1.6 0 1 0-3-0.8 1.6 1.6 0 0 0-3-4Z',
    room: 'M-7 8V-4L0-9 7-4V8H2V2H-2V8Z', ultra: 'M0-9L8 0 0 9-8 0ZM0-4L4 0 0 4-4 0Z', boss: 'M-7-2A7 7 0 0 1 7-2V3H3V7H-3V3H-7ZM-4-1A1.8 1.8 0 1 0-4 2.4 1.8 1.8 0 0 0-4-1ZM4-1A1.8 1.8 0 1 0 4 2.4 1.8 1.8 0 0 0 4-1Z',
    cache: 'M0-7A7 7 0 1 1 0 7 7 7 0 1 1 0-7ZM0-3.5A3.5 3.5 0 1 0 0 3.5 3.5 3.5 0 1 0 0-3.5Z', secret: 'M0-9L2.5-2.5 9 0 2.5 2.5 0 9-2.5 2.5-9 0-2.5-2.5Z',
    silo: 'M-6 8V-2A6 6 0 0 1 6-2V8ZM-2 8V2H2V8Z', exfil: 'M0-9L8 3H3V8H-3V3H-8Z', dot: 'M0-4A4 4 0 1 1 0 4 4 4 0 1 1 0-4Z'
  };

  function hideBoot() {
    var b = $('#boot'); if (!b) return;
    b.classList.add('done');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 480);
  }
  function setDrawer(open) {
    var side = $('#sidebar'); if (!side) return;
    side.classList.toggle('open', !!open);
    var scrim = $('#scrim');
    if (scrim) { scrim.hidden = !open; scrim.classList.toggle('show', !!open); }
    var btn = $('#menuBtn'); if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  fetch('data.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { D = d; init(); })
    .catch(function (e) {
      var b = document.getElementById('boot');
      if (b) {
        b.classList.add('fail');
        var m = b.querySelector('[data-boot-status]');
        if (m) m.textContent = 'Could not load data.json (' + e.message + '). Serve the folder over http (see README).';
      }
      console.error(e);
    });

  function init() {
    $('#updated').textContent = 'UPDATED ' + D.meta.updated;
    svg = $('#map');
    var v = D.basemap.view; vb = { x: v[0], y: v[1], w: v[2], h: v[3] }; home = Object.assign({}, vb);
    gBase = el('g', { id: 'base' }, svg); gImg = el('g', { id: 'img', style: 'display:none' }, svg);
    var gOutline = el('g', { id: 'outline' }, svg);
    gThreat = el('g', { id: 'threat' }, svg);
    gGrid = el('g', { id: 'grid' }, svg);
    gRoutes = el('g', { id: 'routes' }, svg); gLabels = el('g', { id: 'labels' }, svg);
    gLink = el('g', { id: 'exfil-link' }, svg); gPins = el('g', { id: 'pins' }, svg);
    svgDefs = el('defs', {}, svg);
    var defs = svgDefs;
    var grad = el('radialGradient', { id: 'fieldGlow', cx: '50%', cy: '42%', r: '72%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#1b2632' }, grad);
    el('stop', { offset: '70%', 'stop-color': '#10151b' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#07090c' }, grad);
    el('rect', { x: 0, y: 0, width: 4096, height: 4096, fill: 'url(#fieldGlow)' }, gBase);
    var o = D.basemap.outline;
    if (o && o.playable) {
      el('polygon', { points: o.playable.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: 'rgba(186,198,210,.32)', 'stroke-width': 1.5, 'stroke-dasharray': '10 8', 'vector-effect': 'non-scaling-stroke' }, gOutline);
    }
    drawGrid(gGrid); drawZones(); drawThreatZones(); drawRoutes(); drawPins(); buildLayerUI(); buildImageCtl();
    applyVB(); bindPanZoom(); bindUI(); buildKeys(); buildBanks(); buildMoney(); buildLoot(); buildAbout();
    if (location.hash.indexOf('#item=') === 0) focusItem(decodeURIComponent(location.hash.slice(6)));
    window.__HAJIN_OK__ = { items: D.items.length, keys: D.keys.length, pins: Object.keys(pinEls).length };
    hideBoot();
  }

  function drawGrid(g) {
    var G = D.meta.grid, x1 = G.x0 + G.cols * G.size, y1 = G.y0 + G.rows * G.size, c, r, edge, x, y;
    for (c = 0; c <= G.cols; c++) {
      x = G.x0 + c * G.size; edge = (c === 0 || c === G.cols) ? ' edge' : '';
      el('line', { x1: x, y1: G.y0, x2: x, y2: y1, class: 'gridshadow' + edge, 'stroke-width': edge ? 3.4 : 2.2 }, g);
      el('line', { x1: x, y1: G.y0, x2: x, y2: y1, class: 'gridline' + edge, 'stroke-width': edge ? 1.55 : 1.05 }, g);
    }
    for (r = 0; r <= G.rows; r++) {
      y = G.y0 + r * G.size; edge = (r === 0 || r === G.rows) ? ' edge' : '';
      el('line', { x1: G.x0, y1: y, x2: x1, y2: y, class: 'gridshadow' + edge, 'stroke-width': edge ? 3.4 : 2.2 }, g);
      el('line', { x1: G.x0, y1: y, x2: x1, y2: y, class: 'gridline' + edge, 'stroke-width': edge ? 1.55 : 1.05 }, g);
    }
    var arm = 42;
    [[G.x0, G.y0, 1, 1], [x1, G.y0, -1, 1], [G.x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (p) {
      el('path', { d: 'M' + (p[0] + p[2] * arm) + ' ' + p[1] + ' H' + p[0] + ' V' + (p[1] + p[3] * arm), class: 'gridbracket', 'stroke-width': 2.5 }, g);
    });
    for (c = 0; c < G.cols; c++) for (r = 0; r < G.rows; r++) {
      var t = el('text', { x: G.x0 + c * G.size + 14, y: G.y0 + r * G.size + 50, class: 'gridlbl cell', 'font-size': 42, 'stroke-width': 6 }, g);
      t.textContent = String.fromCharCode(65 + c) + r;
    }
    for (c = 0; c < G.cols; c++) {
      var col = el('text', { x: G.x0 + (c + 0.5) * G.size, y: G.y0 + 34, 'text-anchor': 'middle', class: 'gridlbl axis', 'font-size': 36, 'stroke-width': 5 }, g);
      col.textContent = String.fromCharCode(65 + c); col.style.display = 'none';
    }
    for (r = 0; r < G.rows; r++) {
      var row = el('text', { x: G.x0 + 16, y: G.y0 + (r + 0.62) * G.size, class: 'gridlbl axis', 'font-size': 36, 'stroke-width': 5 }, g);
      row.textContent = String(r); row.style.display = 'none';
    }
  }
  function threatLevels(text) {
    if (!text) return [];
    var head = String(text).split(';')[0];
    var found = [];
    THREAT_LEVELS.forEach(function (level) {
      if (new RegExp('\\b' + level + '\\b', 'i').test(head)) found.push(level);
    });
    return found;
  }
  function crossOf(id) {
    var list = (D.threatCrosscheck && D.threatCrosscheck.locations) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function zoneFill(levels, id) {
    if (!levels.length) return 'rgba(139,149,161,.16)';
    if (levels.length === 1) return THREAT_COLOR[levels[0]];
    var gid = 'tz-' + id;
    var lg = el('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '1' }, svgDefs);
    el('stop', { offset: '0%', 'stop-color': THREAT_COLOR[levels[0]] }, lg);
    el('stop', { offset: '100%', 'stop-color': THREAT_COLOR[levels[1]] }, lg);
    return 'url(#' + gid + ')';
  }
  function drawThreatZones() {
    D.items.filter(function (i) { return i.layer === 'poi' && i.kind === 'major'; }).forEach(function (i) {
      var levels = threatLevels(i.threat);
      var rank = levels.length ? THREAT_LEVELS.indexOf(levels[0]) : 99;
      var attrs = {
        cx: i.x, cy: i.y, r: 168,
        fill: zoneFill(levels, i.id),
        'fill-opacity': levels.length > 1 ? 0.28 : 0.18,
        stroke: levels.length ? THREAT_COLOR[levels[0]] : THREAT_COLOR.Unrated,
        'stroke-opacity': 0.9,
        'stroke-width': 3
      };
      if (!levels.length) attrs['stroke-dasharray'] = '8 6';
      var c = el('circle', attrs, gThreat);
      c.setAttribute('data-rank', String(rank));
    });
    var nodes = Array.prototype.slice.call(gThreat.querySelectorAll('circle'));
    nodes.sort(function (a, b) { return (+b.getAttribute('data-rank')) - (+a.getAttribute('data-rank')); });
    nodes.forEach(function (n) { gThreat.appendChild(n); });
    var box = $('#threatLegend');
    if (!box) return;
    var keys = THREAT_LEVELS.concat(['Unrated']);
    box.innerHTML = '<div class="threat-key">' + keys.map(function (k) {
      return '<span><i class="swatch" style="background:' + THREAT_COLOR[k] + '"></i>' + k + '</span>';
    }).join('') + '</div>';
  }
  function drawZones() {
    D.items.filter(function (i) { return i.layer === 'poi'; }).forEach(function (i) {
      var major = i.kind === 'major';
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
      el('circle', { r: 10.4, class: 'pin-plate', fill: '#07090c', stroke: 'rgba(255,255,255,.28)', 'stroke-width': .7 }, g);
      var icon = i.layer === 'poi' ? (i.kind === 'major' ? 'poi' : 'dot') : L.icon;
      el('path', { d: ICON[icon] || ICON.dot, class: 'shape', fill: L.color, stroke: '#000', 'stroke-width': 1.2 }, g);
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
    var cellPx = D.meta.grid.size / s, showCells = cellPx >= 72;
    gGrid.querySelectorAll('.gridlbl.cell').forEach(function (t) {
      t.style.display = showCells ? '' : 'none';
      if (showCells) { t.setAttribute('font-size', Math.min(48, 15 * s)); t.setAttribute('stroke-width', Math.max(3, 4.5 * s / 3)); }
    });
    gGrid.querySelectorAll('.gridlbl.axis').forEach(function (t) {
      t.style.display = showCells ? 'none' : '';
      if (!showCells) { t.setAttribute('font-size', 15 * s); t.setAttribute('stroke-width', Math.max(3, 4 * s / 3)); }
    });
    gGrid.querySelectorAll('.gridlbl.caption').forEach(function (t) {
      t.setAttribute('font-size', 12 * s); t.setAttribute('stroke-width', Math.max(2.5, 3 * s / 3));
    });
    gLabels.querySelectorAll('text').forEach(function (t) {
      var major = t.getAttribute('data-major') === '1';
      t.setAttribute('font-size', (major ? 13 : 11) * s); t.setAttribute('stroke-width', 3 * s);
      t.style.display = showLbl && (major || zoomed) ? '' : 'none';
    });
    gRoutes.querySelectorAll('polyline').forEach(function (p) { p.setAttribute('stroke-width', 4 * s); p.setAttribute('stroke-dasharray', (10 * s) + ' ' + (6 * s)); });
    gLink.querySelectorAll('line').forEach(function (ln) { ln.setAttribute('stroke-width', Math.max(2, 3.2 * s / 3)); });
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
      var p = svgPt(e.clientX, e.clientY); $('#coords').textContent = 'X ' + Math.round(p.x) + ' Y ' + Math.round(p.y) + ' · ' + gridOf(p.x, p.y);
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
    $('#legend').innerHTML = '';
    refreshLayers();
  }
  function refreshLayers() { for (var id in pinEls) pinEls[id].g.style.display = layerOn[pinEls[id].item.layer] ? '' : 'none'; }
  function enableLayer(id) { layerOn[id] = true; var c = document.querySelector('#layers input[data-layer="' + id + '"]'); if (c) c.checked = true; refreshLayers(); }

  function placeImage(img, bounds) {
    img.setAttribute('x', bounds[0]); img.setAttribute('y', bounds[1]);
    img.setAttribute('width', bounds[2]); img.setAttribute('height', bounds[3]);
    img.setAttribute('preserveAspectRatio', 'none');
  }
  function presetFor(w, h) {
    var list = (D.basemap && D.basemap.imagePresets) || [], i;
    for (i = 0; i < list.length; i++) if (list[i].width === w && list[i].height === h && list[i].bounds) return list[i];
    return null;
  }
  function noteImage() {}
  function buildImageCtl() {
    var fallback = D.basemap.imageBounds || [0, 0, 4096, 4096];
    var img = el('image', { preserveAspectRatio: 'none', opacity: $('#imgOpacity').value || .72 }, gImg);
    var lastUrl = null;
    placeImage(img, fallback);
    function useSize(w, h) {
      var preset = presetFor(w, h);
      placeImage(img, preset ? preset.bounds : fallback);
      noteImage(w, h, preset);
    }
    function showLocal(url, w, h) {
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = url;
      useSize(w, h);
      img.setAttribute('href', url);
      $('#optImage').checked = true;
      gImg.style.display = '';
    }
    if (D.basemap.image) {
      img.setAttribute('href', D.basemap.image);
      var probe = new Image();
      probe.onload = function () { useSize(probe.naturalWidth, probe.naturalHeight); };
      probe.src = D.basemap.image;
    }
    $('#optImage').onchange = function (e) {
      gImg.style.display = e.target.checked ? '' : 'none';
      if (e.target.checked && !img.getAttribute('href')) alert('No image yet. Use Load map image.');
    };
    $('#imgOpacity').oninput = function (e) { img.setAttribute('opacity', e.target.value); };
    $('#imgFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var url = URL.createObjectURL(f), probe = new Image();
      probe.onload = function () { showLocal(url, probe.naturalWidth, probe.naturalHeight); };
      probe.onerror = function () { URL.revokeObjectURL(url); alert('Could not read that image.'); };
      probe.src = url;
    };
  }

  function bindUI() {
    document.querySelectorAll('.tab').forEach(function (t) { t.onclick = function () { showTab(t.getAttribute('data-tab')); }; });
    $('#menuBtn').onclick = function () {
      showTab('map');
      var open = !$('#sidebar').classList.contains('open');
      if (open) closeDetails();
      setDrawer(open);
    };
    var scrim = $('#scrim'); if (scrim) scrim.onclick = function () { setDrawer(false); };
    $('#optGrid').onchange = function (e) { $('#grid').style.display = e.target.checked ? '' : 'none'; };
    $('#optOutline').onchange = function (e) { $('#outline').style.display = e.target.checked ? '' : 'none'; };
    $('#optLabels').onchange = applyVB;
    $('#optRoutes').onchange = function (e) { gRoutes.style.display = e.target.checked ? '' : 'none'; };
    var threatBox = $('#optThreat');
    if (threatBox) threatBox.onchange = function (e) { gThreat.style.display = e.target.checked ? '' : 'none'; };
    var s = $('#search'); s.addEventListener('input', function () { doSearch(s.value); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDetails(); setDrawer(false); }
      if (e.key === '/' && document.activeElement !== s && $('#tab-map').classList.contains('active')) { e.preventDefault(); s.focus(); }
    });
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
    select(id); setDrawer(false);
  }
  function select(id) {
    if (selId && pinEls[selId]) pinEls[selId].g.classList.remove('sel');
    selId = id; var p = pinEls[id]; p.g.classList.add('sel'); gPins.appendChild(p.g);
    var i = p.item, L = layerById(i.layer), h = '';
    h += '<button class="x" aria-label="Close">✕</button><h2>' + esc(i.name) + '</h2>';
    h += '<div class="meta-row">' + badge(i.conf) + '<span>' + esc(L ? L.name : i.layer) + '</span><span>GRID ' + esc(i.grid) + '</span><span>X ' + i.x + ' Y ' + i.y + '</span></div>';
    if (i.kind === 'major') h += '<p><b>Threat:</b> ' + esc(i.threat) + '<br><b>Lieutenant:</b> ' + esc(i.lieutenant) + '<br><b>Keys in area:</b> ' + esc(i.keys) + '</p>';
    h += crossHtml(i);
    h += exfilHtml(i);
    if (i.rarity) h += '<p><b>Rarity:</b> <span class="r-' + esc(i.rarity) + '">' + esc(i.rarity) + '</span> · <b>Worth it:</b> ' + esc(i.worth) + '</p>';
    if (i.desc) h += '<p>' + esc(shown(i.desc)) + '</p>';
    if (i.lootRoom) h += '<p><b>Loot room:</b> ' + esc(i.lootRoom) + '</p>';
    if (i.threats) h += '<p><b>Threats:</b> ' + esc(i.threats) + '<br><b>Exfil:</b> ' + esc(i.exfils) + '</p>';
    if (i.steps) h += '<h3 style="color:var(--gold2);margin:8px 0 0;font-size:14px">HEIST STEPS</h3><ol>' + i.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    h += '<div class="srcs"><a href="#item=' + encodeURIComponent(i.id) + '">Link to this pin</a></div>';
    var d = $('#details'); d.innerHTML = h; d.classList.remove('hidden'); d.querySelector('.x').onclick = closeDetails;
  }
  function clearExfilLink() { while (gLink.firstChild) gLink.removeChild(gLink.firstChild); }
  function nearestExfils(item, n) {
    return D.items.filter(function (e) { return e.layer === 'exfils' && e.id !== item.id; }).map(function (e) {
      var dx = e.x - item.x, dy = e.y - item.y;
      return { item: e, d: Math.sqrt(dx * dx + dy * dy) };
    }).sort(function (a, b) { return a.d - b.d; }).slice(0, n);
  }
  function drawExfilLink(from, to) {
    clearExfilLink();
    if (!from || !to) return;
    el('line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: '#3ee07a', 'stroke-width': 3, 'stroke-dasharray': '12 8',
      'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', class: 'exfil-link'
    }, gLink);
    applyVB();
  }
  function exfilHtml(item) {
    var near = nearestExfils(item, 2);
    drawExfilLink(item, near.length ? near[0].item : null);
    if (!near.length) return '';
    return '<div class="exfil-note"><b>Nearest exfils</b><ol>' +
      near.map(function (e, idx) {
        return '<li>' + (idx === 0 ? 'Nearest' : 'Second') + ': ' + esc(e.item.name) + ' · grid ' + esc(e.item.grid) + ' · ' + Math.round(e.d) + ' map units</li>';
      }).join('') + '</ol></div>';
  }
  function crossHtml(item) {
    var c = crossOf(item.id); if (!c) return '';
    var h = '<p><b>Side of the border:</b> ' + esc(c.side) + '</p>';
    if (c.zones && c.zones.length) {
      h += '<p class="tiny"><b>Zones:</b> ' + c.zones.map(function (z) { return esc(z.name) + ' · ' + esc(z.level); }).join('; ') + '</p>';
    }
    return h;
  }
  function showRoute(r) {
    clearExfilLink();
    var d = $('#details');
    d.innerHTML = '<button class="x">✕</button><h2>' + esc(r.name) + '</h2><div class="meta-row">' + badge(r.conf) + '<span>Money route</span></div><p>' + esc(shown(r.desc)) + '</p>';
    d.classList.remove('hidden'); d.querySelector('.x').onclick = closeDetails;
  }
  function closeDetails() { $('#details').classList.add('hidden'); clearExfilLink(); if (selId && pinEls[selId]) pinEls[selId].g.classList.remove('sel'); selId = null; }

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
        return '<tr><td><b>' + esc(k.name) + '</b></td><td class="r-' + esc(k.rarity) + '">' + esc(k.rarity) + '</td><td class="mono">' + esc(k.grid) + '</td><td>' + esc(k.door) + '</td><td>' + esc(k.inside) + '</td><td class="' + wc + '">' + esc(k.worth) + '</td><td>' + badge(k.conf) + '</td><td>' + (firstPin(k) ? '<button class="btn-link" data-key="' + esc(k.id) + '">Map</button>' : '') + '</td></tr>';
      }).join('');
      $('#keyCount').textContent = rows.length + ' / ' + D.keys.length + ' keys';
    }
    tb.addEventListener('click', function (e) { var id = e.target.getAttribute('data-key'); if (id) { var p = firstPin(D.keys.find(function (k) { return k.id === id; })); if (p) focusItem(p.id); } });
    ['#keySearch', '#keyRarity', '#keyWorth'].forEach(function (s) { $(s).addEventListener('input', render); });
    render();
  }
  function card(title, body, cls) { return '<div class="card ' + (cls || '') + '"><h2>' + title + '</h2>' + body + '</div>'; }
  function list(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function buildBanks() {
    var banks = D.items.filter(function (i) { return i.layer === 'banks'; });
    var h = card('ᚠ Hanex bank heist: how it works', '<ol>' + D.heistSteps.map(function (s) { return '<li>' + esc(shown(s)) + '</li>'; }).join('') + '</ol>');
    h += '<div class="cols">' + banks.map(function (b) {
      return card(esc(b.name), '<div class="meta-row">' + badge(b.conf) + '<span>GRID ' + esc(b.grid) + '</span></div><p>' + esc(shown(b.desc)) + '</p><p><b>Threats:</b> ' + esc(b.threats) + '<br><b>Exfil:</b> ' + esc(b.exfils) + '</p><button class="btn-link" data-go="' + esc(b.id) + '">Show on map</button>');
    }).join('') + '</div>';
    var v = $('#banksView'); v.innerHTML = h; v.addEventListener('click', goBtn);
  }
  function goBtn(e) { var id = e.target.getAttribute('data-go'); if (id) focusItem(id); }
  function buildMoney() {
    var h = '<div class="cols">' + D.money.map(function (m) { return card(esc(m.name), '<div class="meta-row">' + badge(m.conf) + '<span>' + esc(m.value) + '</span></div><p>' + esc(shown(m.notes)) + '</p>'); }).join('') + '</div>';
    h += card('ᛟ Cash facts', list(D.cash));
    h += card('Routes on the map', '<p>Dashed lines on the map (toggle "Money routes"). Click a line for details.</p>' + list(D.routes.map(function (r) { return r.name; })));
    $('#moneyView').innerHTML = h;
  }
  function moneyLabel(n) {
    if (n == null || n === '') return '—';
    return '$' + Number(n).toLocaleString('en-US');
  }
  function buildLoot() {
    var L = D.loot, items = L.items || [];
    var calls = ['keep', 'sell', 'extract', 'use', 'unclear'];
    var callLabel = { keep: 'Keep', sell: 'Sell', extract: 'Extract', use: 'Use', unclear: 'Unclear' };
    var cats = [];
    items.forEach(function (it) { if (cats.indexOf(it.cat) < 0) cats.push(it.cat); });
    cats.sort();
    var h = '<div class="tablebar">' +
      '<input id="lootSearch" class="search" type="search" placeholder="Filter loot…">' +
      '<select id="lootCall"><option value="">All calls</option>' + calls.map(function (c) { return '<option value="' + c + '">' + callLabel[c] + '</option>'; }).join('') + '</select>' +
      '<select id="lootCat"><option value="">All types</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<span class="mono tiny" id="lootCount"></span></div>' +
      '<div class="tablewrap"><table id="lootTable" class="grid-table"><thead><tr><th>Item</th><th>Type</th><th>Call</th><th>Value</th><th>Note</th></tr></thead><tbody></tbody></table></div>' +
      card('Notes', list(L.notes));
    var v = $('#lootView'); v.innerHTML = h;
    var tb = v.querySelector('tbody');
    function render() {
      var q = norm($('#lootSearch').value), call = $('#lootCall').value, cat = $('#lootCat').value;
      var rows = items.filter(function (it) {
        if (call && it.call !== call) return false;
        if (cat && it.cat !== cat) return false;
        return !q || norm(it.name + ' ' + (it.why || '') + ' ' + it.cat).indexOf(q) >= 0;
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      tb.innerHTML = rows.map(function (it) {
        return '<tr><td><b>' + esc(it.name) + '</b></td><td>' + esc(it.cat) + '</td><td class="loot-' + esc(it.call) + '">' + esc(callLabel[it.call] || it.call) + '</td><td class="mono">' + moneyLabel(it.value) + '</td><td>' + esc(it.why || '') + '</td></tr>';
      }).join('');
      $('#lootCount').textContent = rows.length + ' / ' + items.length;
    }
    ['#lootSearch', '#lootCall', '#lootCat'].forEach(function (s) { v.querySelector(s).addEventListener('input', render); });
    render();
  }
  function shown(s) {
    return String(s == null ? '' : s)
      .replace(/Only 3-4 are active per match \(green smoke\)\.\s*/g, '')
      .replace(/\s*Creator claims best ~\$285k \(unverified\)\./g, '');
  }
  function buildAbout() {
    var h = card('ᚨ About this map', '<p>' + esc(D.meta.game) + '. Data as of ' + esc(D.meta.dataAsOf) + '. ' + esc(D.meta.coords) + '</p>');
    if (D.threatCrosscheck) {
      var rows = (D.threatCrosscheck.locations || []).map(function (z) {
        var poi = D.items.find(function (i) { return i.id === z.id; });
        return '<li><b>' + esc(poi ? poi.name : z.id) + '</b> — ' + esc(z.side) + '</li>';
      }).join('');
      h += card('ᚨ Border side', '<ul>' + rows + '</ul>');
    }
    $('#aboutView').innerHTML = h;
  }
})();
