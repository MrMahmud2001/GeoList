function parseKML(txt) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(txt, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('Невалидный XML/KML файл');

  const placemarks = Array.from(doc.querySelectorAll('Placemark'));
  if (!placemarks.length) throw new Error('Не найдено ни одного объекта Placemark');

  const result = [];

  placemarks.forEach(pm => {
    const rawDesc  = (pm.querySelector('description')?.textContent || '').trim();
    const cleanDesc = rawDesc.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const nameRaw  = (pm.querySelector('name')?.textContent || '').trim();
    const name     = nameRaw || cleanDesc.replace(/<[^>]*>/g, '').split('\n')[0].trim() || 'Без названия';

    let status = 'open';
    const dl = cleanDesc.toLowerCase();
    if (dl.includes('repair') || dl.includes('ремонт'))    status = 'repair';
    else if (dl.includes('closed') || dl.includes('закрыт')) status = 'closed';

    let type = '', district = '', length = '', note = '', material = '', lanes = '', year_built = '', last_updated = '';

    pm.querySelectorAll('SimpleData').forEach(sd => {
      const n = (sd.getAttribute('name') || '').toLowerCase();
      const v = (sd.textContent || '').trim();
      if (n === 'status') {
        if (v === 'repair' || v === 'ремонт')  status = 'repair';
        else if (v === 'closed' || v === 'закрыт') status = 'closed';
        else if (v === 'open'   || v === 'открыт') status = 'open';
      }
      if (n === 'type'         || n === 'тип')           type         = v;
      if (n === 'district'     || n === 'район')         district     = v;
      if (n === 'length'       || n === 'длина')         length       = v;
      if (n === 'note'         || n === 'примечание')    note         = v;
      if (n === 'material'     || n === 'покрытие')      material     = v;
      if (n === 'lanes'        || n === 'полос')         lanes        = v;
      if (n === 'year_built'   || n === 'год_постройки') year_built   = v;
      if (n === 'last_updated' || n === 'обновлено')     last_updated = v;
    });

    let geom = null;

    const ptEl = pm.querySelector('Point coordinates');
    if (ptEl) {
      const parts = ptEl.textContent.trim().split(',').map(Number);
      if (!isNaN(parts[0]) && !isNaN(parts[1]))
        geom = { type: 'Point', coordinates: [parts[0], parts[1]] };
    }

    const lsEl = pm.querySelector('LineString coordinates');
    if (!geom && lsEl) {
      const cs = lsEl.textContent.trim().split(/\s+/).map(s => {
        const p = s.split(',').map(Number); return [p[0], p[1]];
      }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
      if (cs.length >= 2) geom = { type: 'LineString', coordinates: cs };
    }

    const pyEl = pm.querySelector('Polygon outerBoundaryIs LinearRing coordinates')
               || pm.querySelector('Polygon LinearRing coordinates');
    if (!geom && pyEl) {
      const cs = pyEl.textContent.trim().split(/\s+/).map(s => {
        const p = s.split(',').map(Number); return [p[0], p[1]];
      }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
      if (cs.length >= 3) geom = { type: 'Polygon', coordinates: [cs] };
    }

    if (geom) {
      result.push({
        type: 'Feature', geometry: geom,
        properties: { name, status, type, district, length, note, material, lanes, year_built, last_updated,
          description: cleanDesc.length > 1 && !['open','repair','closed'].includes(cleanDesc)
            ? (cleanDesc.length > 100 ? cleanDesc.slice(0, 100) + '…' : cleanDesc) : '' }
      });
    }
  });

  return result;
}

function onFileInput(inp) { if (inp.files[0]) readKMLFile(inp.files[0]); }

function onDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('over');
  if (e.dataTransfer.files[0]) readKMLFile(e.dataTransfer.files[0]);
}

function readKMLFile(file) {
  if (!/\.(kml|xml)$/i.test(file.name)) {
    addLog('Неверный формат «' + file.name + '». Ожидается .kml', 'err');
    toast('Ожидается .kml файл', 'er');
    return;
  }
  addLog('Чтение файла: ' + file.name + ' (' + Math.round(file.size / 1024) + ' КБ)…', '');
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const kmlText = e.target.result;
      const fts     = parseKML(kmlText);

      try {
        const r = await fetch('/api/map/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, kml_data: kmlText })
        });
        const data = await r.json();
        if (data.error) addLog('Ошибка сервера: ' + data.error, 'warn');
        else { addLog('Сохранено в БД: ' + data.features_count + ' объектов', 'ok'); loadUploadHistory(); }
      } catch { addLog('Не удалось сохранить на сервере', 'warn'); }

      window.features = fts;
      applyFilter();
      updateStats();
      updateCommentObjectList();

      if (fts.length && window.mapInst) {
        const ll = fts.map(f => getCenter(f.geometry)).filter(Boolean);
        if (ll.length) window.mapInst.fitBounds(L.latLngBounds(ll), { padding: [30, 30] });
      }

      addLog('Загружено ' + fts.length + ' объектов из «' + file.name + '»', 'ok');
      toast('Загружено ' + fts.length + ' объектов', 'ok');
    } catch (err) {
      addLog('Ошибка: ' + err.message, 'err');
      toast('Ошибка разбора KML', 'er');
    }
  };
  reader.readAsText(file);
}

function addLog(txt, type) {
  const list  = document.getElementById('log-list');
  const icons = { ok: '✓', err: '✕', warn: '⚠', '': 'ℹ' };
  const time  = new Date().toLocaleTimeString('ru');
  const el    = document.createElement('div');
  el.className = 'log-item' + (type ? ' ' + type : '');
  el.innerHTML = `<span class="log-item-ico">${icons[type] || 'ℹ'}</span><span class="log-item-txt">[${time}] ${txt}</span>`;
  const first = list.firstChild;
  if (first?.querySelector?.('.log-item-txt')?.textContent?.includes('не загружались')) list.innerHTML = '';
  list.insertBefore(el, list.firstChild);
  while (list.children.length > 8) list.removeChild(list.lastChild);
}

async function loadLatestMap() {
  try {
    const r = await fetch('/api/map/latest');
    if (!r.ok) return;
    const data = await r.json();
    const fts  = parseKML(data.kml_data);
    window.features = fts;
    applyFilter();
    updateStats();
    updateCommentObjectList();
    if (fts.length && window.mapInst) {
      const ll = fts.map(f => getCenter(f.geometry)).filter(Boolean);
      if (ll.length) window.mapInst.fitBounds(L.latLngBounds(ll), { padding: [30, 30] });
    }
    document.getElementById('topbar-project').textContent =
      'Карта: ' + data.filename + ' (' + data.features_count + ' объектов)';
  } catch {}
}

async function loadUploadHistory() {
  try {
    const r    = await fetch('/api/map/history');
    if (!r.ok) return;
    const rows = await r.json();
    const el   = document.getElementById('upload-history');
    if (!rows.length) { el.innerHTML = '<div style="font-size:11.5px;color:var(--text3);padding:4px 0">Загрузок нет</div>'; return; }
    el.innerHTML = rows.map(row =>
      `<div class="history-item">
        <span class="history-name">${row.filename}</span>
        <span class="history-cnt">${row.features_count} объектов</span>
        <span class="history-date">${String(row.uploaded_at).slice(0, 16)}</span>
      </div>`
    ).join('');
  } catch {}
}
