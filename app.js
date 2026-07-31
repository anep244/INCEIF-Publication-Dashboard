// ---------- State ----------
let DATA = null;
let state = null;

function newState(){
  return {
    yearMin: DATA.yearRange[0],
    yearMax: DATA.yearRange[1],
    selYearMin: DATA.yearRange[0],
    selYearMax: DATA.yearRange[1],
    selectedAuthorId: null,
    authorSearch: '',
    authorSort: 'pubs',
    titleSearch: '',
    docTypeFilter: '',
    sortKey: 'year',
    sortDir: 'desc',
    page: 1,
    pageSize: 15,
  };
}

const GOLD = '#c79a3c', GOLD_DK = '#a9791f', TEAL = '#0f5c52', ROSE = '#8a3b2b', NAVY = '#0e2c4c', NAVY_LT = '#20507f', PLUM='#5c5346', DIM='#7c8b98';
const LINE = '#dfd6bf';
const INK_900 = '#111a24', INK_600 = '#4a5a68', INK_400 = '#7c8b98';
const DOC_COLORS = {
  'Article': GOLD, 'Book chapter': TEAL, 'Editorial': ROSE, 'Book': NAVY_LT,
  'Review': PLUM, 'Conference paper': '#187a6d', 'Note': GOLD_DK, 'Erratum': DIM, 'Unknown': DIM
};

// ---------- Helpers ----------
function pubsInRange(minY, maxY){
  return DATA.publications.filter(p => p.year >= minY && p.year <= maxY);
}

// Same as pubsInRange, but also narrowed to the selected author (if any) —
// used by the Composition and Citations-per-Year charts so they reflect
// whichever author is currently selected in the Authors list.
function pubsForCharts(){
  let list = pubsInRange(state.selYearMin, state.selYearMax);
  if(state.selectedAuthorId){
    list = list.filter(p => p.authors.some(a => a.id === state.selectedAuthorId));
  }
  return list;
}

function filteredPubs(){
  let list = pubsInRange(state.selYearMin, state.selYearMax);
  if(state.selectedAuthorId){
    list = list.filter(p => p.authors.some(a => a.id === state.selectedAuthorId));
  }
  if(state.titleSearch){
    const q = state.titleSearch.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q) || p.source.toLowerCase().includes(q));
  }
  if(state.docTypeFilter){
    list = list.filter(p => p.docType === state.docTypeFilter);
  }
  return list;
}

function authorsInRange(){
  const range = pubsInRange(state.selYearMin, state.selYearMax);
  const map = {};
  range.forEach(p => {
    p.authors.forEach(a => {
      if(!map[a.id]) map[a.id] = {id:a.id, name:a.name, pubCount:0, totalCites:0, years:{}, docTypes:{}};
      map[a.id].pubCount++;
      map[a.id].totalCites += p.citedBy;
      map[a.id].years[p.year] = (map[a.id].years[p.year]||0)+1;
      map[a.id].docTypes[p.docType] = (map[a.id].docTypes[p.docType]||0)+1;
    });
  });
  return Object.values(map);
}

function fmt(n){ return n.toLocaleString('en-US'); }

// ---------- Ribbon (hero) ----------
let ribbonDrag = null;
function renderRibbon(){
  const svg = document.getElementById('ribbon');
  const years = [];
  for(let y=state.yearMin; y<=state.yearMax; y++) years.push(y);
  const counts = years.map(y => DATA.publications.filter(p=>p.year===y).length);
  const maxCount = Math.max(...counts);
  const W = svg.parentElement.clientWidth || 1260;
  const H = 90;
  const topPad = 16; // room for the count label above the tallest bar
  svg.setAttribute('viewBox', `0 0 ${W} ${H+20}`);
  svg.innerHTML = '';
  const barW = W / years.length;
  const gap = Math.max(2, barW*0.18);
  const labelFont = Math.max(7, Math.min(10, barW * 0.3));

  years.forEach((y, i) => {
    const h = maxCount ? (counts[i]/maxCount) * (H - topPad) : 0;
    const x = i * barW;
    const inSel = y >= state.selYearMin && y <= state.selYearMax;
    const barTop = H - h;
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x + gap/2);
    rect.setAttribute('y', barTop);
    rect.setAttribute('width', Math.max(1, barW - gap));
    rect.setAttribute('height', h);
    rect.setAttribute('rx', 1.5);
    rect.setAttribute('fill', inSel ? GOLD : LINE);
    rect.setAttribute('data-year', y);
    rect.style.transition = 'fill 0.15s';
    svg.appendChild(rect);

    const countLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
    countLabel.setAttribute('x', x + barW/2);
    countLabel.setAttribute('y', Math.max(labelFont, barTop - 4));
    countLabel.setAttribute('text-anchor','middle');
    countLabel.setAttribute('font-family','IBM Plex Mono, monospace');
    countLabel.setAttribute('font-size', labelFont);
    countLabel.setAttribute('fill', inSel ? GOLD_DK : INK_400);
    countLabel.textContent = counts[i];
    svg.appendChild(countLabel);

    if(y % 2 === 0 || years.length < 12){
      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.setAttribute('x', x + barW/2);
      label.setAttribute('y', H + 16);
      label.setAttribute('text-anchor','middle');
      label.setAttribute('font-family','IBM Plex Mono, monospace');
      label.setAttribute('font-size','10');
      label.setAttribute('fill', inSel ? INK_600 : INK_400);
      label.textContent = "'" + String(y).slice(2);
      svg.appendChild(label);
    }
  });

  function yearFromX(clientX){
    const rect = svg.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width * W;
    const idx = Math.min(years.length-1, Math.max(0, Math.floor(relX / barW)));
    return years[idx];
  }
  let dragMoved = false;
  svg.onmousedown = (e) => {
    const y = yearFromX(e.clientX);
    ribbonDrag = {start: y, end: y};
    dragMoved = false;
    state.selYearMin = y; state.selYearMax = y;
    renderRibbon();
  };
  svg.onmousemove = (e) => {
    if(!ribbonDrag) return;
    const y = yearFromX(e.clientX);
    if(y !== ribbonDrag.start) dragMoved = true;
    ribbonDrag.end = y;
    state.selYearMin = Math.min(ribbonDrag.start, ribbonDrag.end);
    state.selYearMax = Math.max(ribbonDrag.start, ribbonDrag.end);
    renderRibbon();
  };
  window.onmouseup = () => {
    if(ribbonDrag){
      // Whether it was a single click (isolate that year) or a drag (range) —
      // either way state.selYearMin/Max is already set correctly above.
      ribbonDrag = null;
      dragMoved = false;
      state.page = 1;
      renderAll();
    }
  };

  document.getElementById('rangeLabel').textContent =
    (state.selYearMin === state.yearMin && state.selYearMax === state.yearMax)
      ? `${state.yearMin} - ${state.yearMax} (full range)`
      : (state.selYearMin === state.selYearMax)
        ? `${state.selYearMin} only`
        : `${state.selYearMin} - ${state.selYearMax} selected`;
}

// ---------- KPIs ----------
function renderKpis(){
  const list = pubsInRange(state.selYearMin, state.selYearMax);
  const totalCites = list.reduce((s,p)=>s+p.citedBy,0);
  const authors = authorsInRange();
  const oaCount = list.filter(p=>p.openAccess).length;
  const avgCites = list.length ? (totalCites/list.length) : 0;

  const kpis = [
    {num: fmt(list.length), lbl:'Publications', accent:true},
    {num: fmt(totalCites), lbl:'Total citations'},
    {num: fmt(authors.length), lbl:'Contributing authors'},
    {num: avgCites.toFixed(1), lbl:'Avg. citations / paper'},
    {num: list.length ? Math.round(oaCount/list.length*100)+'%' : '0%', lbl:'Open access share'},
  ];
  document.getElementById('kpiRow').innerHTML = kpis.map(k => `
    <div class="kpi ${k.accent?'accent':''}">
      <div class="num">${k.num}</div>
      <div class="lbl">${k.lbl}</div>
    </div>
  `).join('');
}

// ---------- Author list ----------
function renderAuthorList(){
  let authors = authorsInRange();
  if(state.authorSearch){
    const q = state.authorSearch.toLowerCase();
    authors = authors.filter(a => a.name.toLowerCase().includes(q));
  }
  if(state.authorSort === 'pubs') authors.sort((a,b)=>b.pubCount-a.pubCount);
  else if(state.authorSort === 'cites') authors.sort((a,b)=>b.totalCites-a.totalCites);
  else authors.sort((a,b)=>a.name.localeCompare(b.name));

  const maxPubs = Math.max(...authors.map(a=>a.pubCount), 1);
  const el = document.getElementById('authorList');
  if(authors.length === 0){
    el.innerHTML = `<div style="padding:20px 6px; color:var(--text-faint); font-size:13px;">No authors match.</div>`;
    return;
  }
  el.innerHTML = authors.slice(0,300).map((a,i) => `
    <div class="author-row ${a.id===state.selectedAuthorId?'active':''}" data-id="${a.id}">
      <div class="rank">${i+1}</div>
      <div>
        <div class="aname">${a.name}</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${(a.pubCount/maxPubs*100).toFixed(0)}%"></div></div>
      </div>
      <div class="apubs">${a.pubCount}</div>
      <div class="acites">${fmt(a.totalCites)} cites</div>
    </div>
  `).join('');

  el.querySelectorAll('.author-row').forEach(row => {
    row.onclick = () => {
      const id = row.getAttribute('data-id');
      state.selectedAuthorId = (state.selectedAuthorId === id) ? null : id;
      state.page = 1;
      renderAll();
    };
  });
}

// ---------- Workbook parsing (mirrors the original Python pipeline) ----------
function parseAuthorField(str){
  if(!str) return [];
  return String(str).split(';').map(s=>s.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(.*)\((\d+)\)\s*$/);
    if(m) return { name: m[1].trim(), id: m[2] };
    return { name: part, id: part };
  });
}

function parseWorkbook(wb){
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const publications = [];
  const authorMap = {};
  let yMin = Infinity, yMax = -Infinity;
  let pid = 0;

  rows.forEach(row => {
    const yearNum = parseInt(row['Year'], 10);
    if(!Number.isFinite(yearNum)) return; // skip malformed rows, same as the Python cleanup

    let citedBy = parseInt(row['Cited by'], 10);
    if(!Number.isFinite(citedBy)) citedBy = 0;

    let authors = parseAuthorField(row['Author full names']);
    if(authors.length === 0 && row['Authors']){
      authors = String(row['Authors']).split(',').map(s=>s.trim()).filter(Boolean).map(n=>({name:n, id:n}));
    }

    const oaField = row['Open Access'];
    const isOA = !!(oaField && String(oaField).includes('Open Access'));

    const rec = {
      id: String(pid++),
      title: row['Title'] != null ? String(row['Title']) : '',
      year: yearNum,
      source: row['Source title'] != null ? String(row['Source title']) : '',
      docType: row['Document Type'] != null ? String(row['Document Type']) : 'Unknown',
      citedBy: citedBy,
      authors: authors,
      openAccess: isOA,
      doi: row['DOI'] != null ? String(row['DOI']) : '',
    };
    publications.push(rec);
    if(yearNum < yMin) yMin = yearNum;
    if(yearNum > yMax) yMax = yearNum;

    authors.forEach(a => {
      if(!authorMap[a.id]) authorMap[a.id] = { id:a.id, name:a.name, pubIds:[], years:{}, totalCites:0, docTypes:{} };
      const am = authorMap[a.id];
      am.pubIds.push(rec.id);
      am.years[rec.year] = (am.years[rec.year]||0)+1;
      am.totalCites += rec.citedBy;
      am.docTypes[rec.docType] = (am.docTypes[rec.docType]||0)+1;
    });
  });

  const authorsOut = Object.values(authorMap).map(a => ({
    id: a.id, name: a.name, pubCount: a.pubIds.length, totalCites: a.totalCites,
    years: a.years, docTypes: a.docTypes, pubIds: a.pubIds
  })).sort((a,b)=>b.pubCount-a.pubCount);

  if(!Number.isFinite(yMin)){ yMin = new Date().getFullYear(); yMax = yMin; }

  return { publications, authors: authorsOut, yearRange: [yMin, yMax] };
}

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs){
  const el = document.createElementNS(SVGNS, tag);
  for(const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function addTooltip(el, text){
  const title = document.createElementNS(SVGNS, 'title');
  title.textContent = text;
  el.appendChild(title);
}

// Custom floating tooltip (instant, styled) used for chart hover interactions.
const tooltipEl = document.getElementById('chartTooltip');
function showChartTooltip(clientX, clientY, html){
  if(!tooltipEl) return;
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('visible');
  positionChartTooltip(clientX, clientY);
}
function positionChartTooltip(clientX, clientY){
  if(!tooltipEl) return;
  const pad = 14;
  let x = clientX + pad, y = clientY + pad;
  const rect = tooltipEl.getBoundingClientRect();
  if(x + rect.width > window.innerWidth - 8) x = clientX - rect.width - pad;
  if(y + rect.height > window.innerHeight - 8) y = clientY - rect.height - pad;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
}
function hideChartTooltip(){
  if(tooltipEl) tooltipEl.classList.remove('visible');
}
function wireHoverTooltip(el, htmlFn, dimAttr){
  el.addEventListener('mousemove', (e) => showChartTooltip(e.clientX, e.clientY, htmlFn()));
  el.addEventListener('mouseenter', (e) => {
    showChartTooltip(e.clientX, e.clientY, htmlFn());
    el.style.opacity = '0.82';
  });
  el.addEventListener('mouseleave', () => {
    hideChartTooltip();
    el.style.opacity = '1';
  });
}

function renderDocTypeChart(){
  const list = pubsForCharts();
  const subEl = document.getElementById('compSub');
  if(subEl){
    const authorName = state.selectedAuthorId ? (authorsInRange().find(a=>a.id===state.selectedAuthorId)||{}).name : null;
    subEl.textContent = authorName
      ? `Document types & access for ${authorName}`
      : 'Document types & access within selected range';
  }
  const counts = {};
  list.forEach(p => counts[p.docType] = (counts[p.docType]||0)+1);
  const labels = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  const values = labels.map(l=>counts[l]);
  const total = values.reduce((a,b)=>a+b,0);

  const svg = document.getElementById('docTypeChart');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 190 190');

  const cx = 95, cy = 95, rOuter = 85, rInner = 53;
  if(total === 0){
    svg.appendChild(svgEl('circle', {cx, cy, r: rOuter, fill:'none', stroke:LINE, 'stroke-width': rOuter-rInner}));
  } else {
    let angleStart = -Math.PI/2;
    labels.forEach((l, i) => {
      const frac = values[i] / total;
      const angleEnd = angleStart + frac * 2 * Math.PI;
      const largeArc = (angleEnd - angleStart) > Math.PI ? 1 : 0;
      const x1o = cx + rOuter*Math.cos(angleStart), y1o = cy + rOuter*Math.sin(angleStart);
      const x2o = cx + rOuter*Math.cos(angleEnd), y2o = cy + rOuter*Math.sin(angleEnd);
      const x1i = cx + rInner*Math.cos(angleEnd), y1i = cy + rInner*Math.sin(angleEnd);
      const x2i = cx + rInner*Math.cos(angleStart), y2i = cy + rInner*Math.sin(angleStart);
      const d = `M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i} Z`;
      const path = svgEl('path', {d, fill: DOC_COLORS[l]||DIM, stroke:'#ffffff', 'stroke-width':2});
      path.style.cursor = 'default';
      path.style.transition = 'opacity 0.1s';
      wireHoverTooltip(path, () => `
        <span class="tt-label">${l}</span><span class="tt-value">${fmt(values[i])}</span>
        <span class="tt-label">(${Math.round(frac*100)}%)</span>
      `);
      svg.appendChild(path);
      angleStart = angleEnd;
    });
  }
  const centerNum = svgEl('text', {x:cx, y:cy-4, 'text-anchor':'middle', 'font-family':'Fraunces, serif', 'font-size':'22', 'font-weight':'600', fill:INK_900});
  centerNum.textContent = total;
  svg.appendChild(centerNum);
  const centerLbl = svgEl('text', {x:cx, y:cy+14, 'text-anchor':'middle', 'font-family':'IBM Plex Mono, monospace', 'font-size':'9', fill:INK_400});
  centerLbl.textContent = 'PAPERS';
  svg.appendChild(centerLbl);

  document.getElementById('docTypeLegend').innerHTML = labels.map(l => `
    <span><span class="legend-dot" style="background:${DOC_COLORS[l]||DIM}"></span>${l} (${counts[l]})</span>
  `).join('');
}

function renderBarChartSVG(svgId, years, values, color, tooltipSuffix, showValues){
  const svg = document.getElementById(svgId);
  const box = svg.getBoundingClientRect();
  const W = box.width || 600, H = box.height || 150;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';

  const padBottom = 18, padTop = showValues ? 18 : 8;
  const maxVal = Math.max(...values, 1);
  const barW = W / years.length;
  const gap = Math.max(2, barW * 0.25);
  const fontSize = Math.max(7, Math.min(10, barW * 0.32));

  years.forEach((y, i) => {
    const v = values[i];
    const h = maxVal ? (v / maxVal) * (H - padBottom - padTop) : 0;
    const x = i * barW;
    const barTop = H - padBottom - h;
    const rect = svgEl('rect', {
      x: x + gap/2, y: barTop,
      width: Math.max(1, barW - gap), height: h,
      rx: 2, fill: color
    });
    addTooltip(rect, `${y}: ${v}${tooltipSuffix}`);
    svg.appendChild(rect);

    if(showValues){
      const valLabel = svgEl('text', {
        x: x + barW/2, y: Math.max(fontSize, barTop - 4), 'text-anchor':'middle',
        'font-family':'IBM Plex Mono, monospace', 'font-size': fontSize, fill: INK_900
      });
      valLabel.textContent = fmt(v);
      svg.appendChild(valLabel);
    }

    if(years.length <= 20 || y % 2 === 0){
      const label = svgEl('text', {
        x: x + barW/2, y: H - 4, 'text-anchor':'middle',
        'font-family':'IBM Plex Mono, monospace', 'font-size':'9', fill:INK_400
      });
      label.textContent = "'" + String(y).slice(2);
      svg.appendChild(label);
    }
  });
}

function renderCiteChart(){
  const years = [];
  for(let y=state.selYearMin; y<=state.selYearMax; y++) years.push(y);
  const list = pubsForCharts();
  const values = years.map(y => list.filter(p=>p.year===y).reduce((s,p)=>s+p.citedBy,0));
  renderBarChartSVG('citeChart', years, values, TEAL, ' citations', true);

  const subEl = document.getElementById('citeSub');
  if(subEl){
    const authorName = state.selectedAuthorId ? (authorsInRange().find(a=>a.id===state.selectedAuthorId)||{}).name : null;
    subEl.textContent = authorName
      ? `Citations accrued by ${authorName}'s papers, by publication year`
      : 'Total citations accrued by papers published each year';
  }
}

function renderAuthorDetail(){
  const panel = document.getElementById('authorDetail');
  if(!state.selectedAuthorId){ panel.classList.add('hidden'); return; }
  const authors = authorsInRange();
  const a = authors.find(x => x.id === state.selectedAuthorId);
  if(!a){ panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');

  document.getElementById('detailName').textContent = a.name;
  document.getElementById('dPubs').textContent = a.pubCount;
  document.getElementById('dCites').textContent = fmt(a.totalCites);
  const yrs = Object.keys(a.years).map(Number);
  document.getElementById('dSpan').textContent = yrs.length ? `${Math.min(...yrs)} - ${Math.max(...yrs)}` : '';
  document.getElementById('dAvg').textContent = a.pubCount ? (a.totalCites/a.pubCount).toFixed(1) : '0';

  const years = [];
  for(let y=state.selYearMin; y<=state.selYearMax; y++) years.push(y);
  const values = years.map(y => a.years[y] || 0);
  renderBarChartSVG('authorYearChart', years, values, GOLD, ' publication(s)');
}

// ---------- Table ----------
function populateDocTypeFilter(){
  const sel = document.getElementById('docTypeFilter');
  const types = [...new Set(DATA.publications.map(p=>p.docType))].sort();
  sel.innerHTML = `<option value="">All document types</option>` + types.map(t=>`<option value="${t}">${t}</option>`).join('');
}

function renderTable(){
  let list = filteredPubs();

  list = list.slice().sort((a,b) => {
    let av = a[state.sortKey], bv = b[state.sortKey];
    if(typeof av === 'string'){ av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if(av < bv) return state.sortDir === 'asc' ? -1 : 1;
    if(av > bv) return state.sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page-1)*state.pageSize;
  const pageItems = list.slice(start, start+state.pageSize);

  document.getElementById('tableSub').textContent =
    state.selectedAuthorId
      ? `Showing publications for selected author  ${total} record(s)`
      : `${total} record(s) in the selected range`;

  document.getElementById('pubTableBody').innerHTML = pageItems.map(p => `
    <tr>
      <td style="font-family:var(--font-mono); color:var(--text-dim);">${p.year}</td>
      <td class="ttitle">${p.title}
        <div class="tmeta">${p.authors.slice(0,4).map(a=>a.name).join(', ')}${p.authors.length>4?' et al.':''}</div>
      </td>
      <td style="color:var(--text-dim); max-width:200px;">${p.source}</td>
      <td><span class="badge">${p.docType}</span> ${p.openAccess?'<span class="badge oa">OA</span>':''}</td>
      <td style="font-family:var(--font-mono); text-align:right; color:${p.citedBy>0?'var(--gold)':'var(--text-faint)'}">${p.citedBy}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--text-faint); padding:24px;">No publications match the current filters.</td></tr>`;

  document.getElementById('pageInfo').textContent = `Page ${state.page} of ${totalPages}  ${total} total`;
  document.getElementById('prevPage').disabled = state.page <= 1;
  document.getElementById('nextPage').disabled = state.page >= totalPages;

  document.querySelectorAll('th[data-key]').forEach(th => {
    th.classList.toggle('sorted', th.getAttribute('data-key') === state.sortKey);
  });
}

// ---------- Wire up ----------
function renderAll(){
  const steps = [renderRibbon, renderKpis, renderAuthorList, renderDocTypeChart, renderCiteChart, renderAuthorDetail, renderTable];
  steps.forEach(fn => {
    try { fn(); } catch(err) { console.error(fn.name, err); }
  });
}

let eventsWired = false;
function wireEvents(){
  if(eventsWired) return; // only attach DOM listeners once
  eventsWired = true;

  document.getElementById('authorSearch').addEventListener('input', (e)=>{
    state.authorSearch = e.target.value; renderAuthorList();
  });
  document.getElementById('authorSort').addEventListener('change', (e)=>{
    state.authorSort = e.target.value; renderAuthorList();
  });
  document.getElementById('titleSearch').addEventListener('input', (e)=>{
    state.titleSearch = e.target.value; state.page = 1; renderTable();
  });
  document.getElementById('docTypeFilter').addEventListener('change', (e)=>{
    state.docTypeFilter = e.target.value; state.page = 1; renderTable();
  });
  document.getElementById('clearAllFilters').addEventListener('click', ()=>{
    state.titleSearch=''; state.docTypeFilter=''; state.selectedAuthorId=null;
    state.selYearMin = state.yearMin; state.selYearMax = state.yearMax;
    state.page = 1;
    document.getElementById('titleSearch').value='';
    document.getElementById('docTypeFilter').value='';
    renderAll();
  });
  document.getElementById('resetRibbon').addEventListener('click', ()=>{
    state.selYearMin = state.yearMin; state.selYearMax = state.yearMax;
    state.page = 1;
    renderAll();
  });
  document.getElementById('closeDetail').addEventListener('click', ()=>{
    state.selectedAuthorId = null; renderAll();
  });
  document.getElementById('prevPage').addEventListener('click', ()=>{
    if(state.page>1){ state.page--; renderTable(); }
  });
  document.getElementById('nextPage').addEventListener('click', ()=>{
    state.page++; renderTable();
  });
  document.querySelectorAll('th[data-key]').forEach(th => {
    th.addEventListener('click', ()=>{
      const key = th.getAttribute('data-key');
      if(state.sortKey === key){ state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
      else { state.sortKey = key; state.sortDir = key==='citedBy'?'desc':'asc'; }
      renderTable();
    });
  });
  window.addEventListener('resize', () => { if(DATA) renderRibbon(); });

  const fileInput = document.getElementById('dataFileInput');
  if(fileInput){
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(file) loadFromFile(file);
    });
  }
  const fileInput2 = document.getElementById('dataFileInput2');
  if(fileInput2){
    fileInput2.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(file) loadFromFile(file);
    });
  }
}

function startDashboard(data, sourceLabel){
  DATA = data;
  state = newState();
  document.getElementById('loaderScreen').classList.add('hidden');
  document.getElementById('dashboardRoot').classList.remove('hidden');
  const asOf = document.getElementById('asOf');
  if(asOf) asOf.textContent = sourceLabel || 'DATA LOADED';
  populateDocTypeFilter();
  renderAll();
}

function showLoaderError(msg){
  const el = document.getElementById('loaderStatus');
  if(el) el.textContent = msg;
}

function loadFromFile(file){
  showLoaderError('Reading ' + file.name + ' …');
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const parsed = parseWorkbook(wb);
      startDashboard(parsed, 'LOADED FROM: ' + file.name);
    } catch(err){
      console.error(err);
      showLoaderError('Could not parse that file: ' + err.message);
    }
  };
  reader.onerror = () => showLoaderError('Could not read that file.');
  reader.readAsArrayBuffer(file);
}

function tryAutoLoad(){
  fetch('./data.xlsx')
    .then(resp => { if(!resp.ok) throw new Error('no data.xlsx found'); return resp.arrayBuffer(); })
    .then(buf => {
      const wb = XLSX.read(new Uint8Array(buf), {type:'array'});
      const parsed = parseWorkbook(wb);
      startDashboard(parsed, 'DATA.XLSX · AUTO-LOADED');
    })
    .catch(() => {
      showLoaderError('No data.xlsx found next to this page — upload a Scopus export (.xlsx) to view the dashboard.');
    });
}

wireEvents();
tryAutoLoad();
