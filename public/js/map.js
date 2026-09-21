window.mapInst        = null;
window.mkLayer        = null;
window.features       = [];
window.filteredFeatures = [];
window.curFilter      = 'all';
window.currentObjName = null;

function statusColor(s) {
  return s === 'open' ? '#26d97f' : s === 'repair' ? '#f5c02e' : s === 'closed' ? '#ef4646' : '#4b7cf6';
}
function norm(v) {
  return String(v || '').trim().toLowerCase();
}
function typeKey(t) {
  const n = norm(t);
  if (!n) return 'road';
  if (n === 'road' || n.includes('дорог')) return 'road';
  if (n === 'bridge' || n.includes('мост')) return 'bridge';
  if (n === 'sign' || n.includes('знак')) return 'sign';
  if (n === 'light' || n.includes('освещ')) return 'light';
  return 'road';
}
function typeColor(t) {
  const k = typeKey(t);
  return k === 'road' ? '#4b7cf6'
    : k === 'bridge' ? '#a78bfa'
    : k === 'sign' ? '#34d399'
    : k === 'light' ? '#fbbf24'
    : '#4b7cf6';
}
function statusLabel(s) {
  return s === 'open' ? 'Открыт' : s === 'repair' ? 'На ремонте' : s === 'closed' ? 'Закрыт' : 'Неизвестно';
}
function typeLabel(t) {
  const k = typeKey(t);
  return k === 'road' ? 'Дорога'
    : k === 'bridge' ? 'Мост'
    : k === 'sign' ? 'Знак'
    : k === 'light' ? 'Освещение'
    : (t || 'Объект');
}

function getCenter(g) {
  if (!g) return null;
  if (g.type === 'Point')      return [g.coordinates[1], g.coordinates[0]];
  if (g.type === 'LineString') { const m = Math.floor(g.coordinates.length / 2); return [g.coordinates[m][1], g.coordinates[m][0]]; }
  if (g.type === 'Polygon')    { const r = g.coordinates[0], m = Math.floor(r.length / 2); return [r[m][1], r[m][0]]; }
  return null;
}

function makeMarkerIcon(s, t) {
  const cStatus = statusColor(s);
  const cType = typeColor(t);
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${cStatus};border:2px solid ${cType};box-shadow:0 0 8px ${cType}99;cursor:pointer"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });
}

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  mapEl.style.position = 'absolute';
  mapEl.style.top      = '0';
  mapEl.style.left     = '0';
  mapEl.style.right    = '0';
  mapEl.style.bottom   = '0';
  mapEl.style.width    = '100%';
  mapEl.style.height   = '100%';

  window.mapInst = L.map('map', { center: [54.75, 37.4], zoom: 11 });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: ''
  }).addTo(window.mapInst);

  window.mkLayer = L.layerGroup().addTo(window.mapInst);

  setTimeout(() => {
    if (window.mapInst) window.mapInst.invalidateSize();
  }, 300);
}

function renderMap(fts) {
  if (!window.mkLayer) return;
  window.mkLayer.clearLayers();

  fts.forEach((f, i) => {
    if (!f.geometry) return;
    const p    = f.properties || {};
    const s    = p.status || 'open';
    const cStatus = statusColor(s);
    const cType = typeColor(p.type);
    const name = p.name || `Объект ${i + 1}`;

    if (f.geometry.type === 'LineString') {
      const ll = f.geometry.coordinates.map(c => [c[1], c[0]]);
      L.polyline(ll, { color: cType, weight: 5, opacity: .9, dashArray: s === 'repair' ? '8,5' : null }).addTo(window.mkLayer);
    } else if (f.geometry.type === 'Polygon') {
      const ll = f.geometry.coordinates[0].map(c => [c[1], c[0]]);
      L.polygon(ll, { color: cType, weight: 2, fillColor: cType, fillOpacity: .2, dashArray: s === 'repair' ? '8,5' : null }).addTo(window.mkLayer);
    }

    const coords = getCenter(f.geometry);
    if (!coords) return;

    const marker = L.marker(coords, { icon: makeMarkerIcon(s, p.type) });
    marker.on('click', () => selectFeature(f, i));
    marker.bindPopup(
      `<div style="padding:11px 13px;min-width:190px">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${name}</div>
        <div style="font-size:11.5px;display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <span style="color:var(--text3)">Статус</span>
            <span style="color:${cStatus};font-weight:500">${statusLabel(s)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px">
            <span style="color:var(--text3)">Тип</span>
            <span style="color:${cType};font-weight:500">${typeLabel(p.type)}</span>
          </div>
        </div>
      </div>`,
      { maxWidth: 260 }
    );
    window.mkLayer.addLayer(marker);
  });
}

function setFilter(f) {
  window.curFilter = f;
  ['all', 'open', 'repair', 'closed'].forEach(id => {
    const el = document.getElementById('f-' + id);
    if (!el) return;
    el.classList.toggle('on', id === f);
    if (id !== 'all') el.classList.toggle('dim', f !== 'all' && f !== id);
  });
  applyFilter();
}

function applyFilter() {
  const fts = window.curFilter === 'all'
    ? window.features
    : window.features.filter(f => (f.properties?.status || 'open') === window.curFilter);
  window.filteredFeatures = fts;
  renderObjList(fts);
  renderMap(fts);
}

function renderObjList(fts) {
  document.getElementById('cnt').textContent = fts.length;
  const el = document.getElementById('obj-list');
  if (!fts.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-ico">🔍</div><div class="empty-state-txt">Нет объектов с выбранным фильтром</div></div>`;
    return;
  }
  el.innerHTML = fts.map((f, i) => {
    const p = f.properties || {};
    const s = p.status || 'open';
    return `<div class="object-item" id="oi${i}" onclick="flyTo(${i})">
      <div class="object-status-dot dot-${s}"></div>
      <div class="object-info">
        <div class="object-name">${p.name || 'Объект ' + (i + 1)}</div>
        <div class="object-meta">${statusLabel(s)}${p.district ? ' · ' + p.district : ''}</div>
      </div>
      <div class="object-type-badge">${typeLabel(p.type)}</div>
    </div>`;
  }).join('');
}

function flyTo(i) {
  const f = window.filteredFeatures[i];
  if (!f) return;
  const c = getCenter(f.geometry);
  if (c) window.mapInst.flyTo(c, 15, { duration: 1 });
  selectFeature(f, i);
}

function selectFeature(f, i) {
  const p    = f.properties || {};
  const s    = p.status || 'open';
  const name = p.name || 'Без названия';
  window.currentObjName = name;

  document.getElementById('det-name').textContent = name;
  const badge = document.getElementById('det-badge');
  badge.textContent = statusLabel(s);
  badge.className   = `detail-status-badge ${s || 'unknown'}`;

  const rows = [];
  if (p.type)         rows.push(['Тип',          typeLabel(p.type)]);
  if (p.length)       rows.push(['Длина',         p.length + ' м']);
  if (p.district)     rows.push(['Район',         p.district]);
  if (p.year_built)   rows.push(['Год постройки', p.year_built]);
  if (p.material)     rows.push(['Покрытие',      p.material]);
  if (p.lanes)        rows.push(['Полос',         p.lanes]);
  if (p.last_updated) rows.push(['Обновлено',     p.last_updated]);
  if (p.note)         rows.push(['Примечание',    p.note]);
  if (p.description && !['open','repair','closed'].includes(p.description) && p.description.length > 1)
    rows.push(['Описание', p.description.length > 80 ? p.description.slice(0, 80) + '…' : p.description]);

  document.getElementById('det-body').innerHTML = rows.length
    ? rows.map(([k, v]) => `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`).join('')
    : '<div style="font-size:12px;color:var(--text3)">Дополнительные атрибуты отсутствуют</div>';

  document.getElementById('det-comment-btn').style.display =
    window.currentUser?.role === 'customer' ? 'flex' : 'none';

  document.getElementById('detail-card').classList.add('on');
  document.querySelectorAll('.object-item').forEach((el, j) => el.classList.toggle('sel', j === i));
}

function closeDetail() {
  document.getElementById('detail-card').classList.remove('on');
  document.querySelectorAll('.object-item').forEach(el => el.classList.remove('sel'));
  window.currentObjName = null;
}

function updateStats() {
  const fts = window.features;
  document.getElementById('s-total').textContent  = fts.length;
  document.getElementById('s-open').textContent   = fts.filter(f => (f.properties?.status || 'open') === 'open').length;
  document.getElementById('s-repair').textContent = fts.filter(f => f.properties?.status === 'repair').length;
  document.getElementById('s-closed').textContent = fts.filter(f => f.properties?.status === 'closed').length;
}
