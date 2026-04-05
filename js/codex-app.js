// ============================================
// CODEX ARCANUM — Application Logic
// ============================================

(function() {
  'use strict';

  // ============ STATE ============
  let currentSection = 'ward-logs';
  let currentWardDate = null;
  let currentChantaraDate = null;
  let currentVeilDate = null;
  let currentEvidence = null;
  let currentCadet = null;

  // ============ INIT ============
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupNavigation();
    buildDateGrids();
    setupSearch();
    setupFilters();
    renderEvidenceList();
    renderCompendium();
    // Show first date by default
    selectWardDate('210-12-01');
  }

  // ============ NAVIGATION ============
  function setupNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const section = tab.dataset.section;
        switchSection(section);
      });
    });
  }

  function switchSection(sectionId) {
    currentSection = sectionId;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const tab = document.querySelector(`.nav-tab[data-section="${sectionId}"]`);
    const section = document.getElementById(sectionId);
    if (tab) tab.classList.add('active');
    if (section) section.classList.add('active');
  }

  // ============ DATE GRIDS ============
  function buildDateGrids() {
    // Ward logs
    buildMonthGrid('dec-210-dates', 210, 12, 31, selectWardDate);
    buildMonthGrid('jan-211-dates', 211, 1, 31, selectWardDate);
    buildMonthGrid('feb-211-dates', 211, 2, 25, selectWardDate);
    // Chantara
    buildMonthGrid('chantara-dec-210-dates', 210, 12, 31, selectChantaraDate);
    buildMonthGrid('chantara-jan-211-dates', 211, 1, 31, selectChantaraDate);
    buildMonthGrid('chantara-feb-211-dates', 211, 2, 25, selectChantaraDate);
    // Veil
    buildMonthGrid('veil-dec-210-dates', 210, 12, 31, selectVeilDate);
    buildMonthGrid('veil-jan-211-dates', 211, 1, 31, selectVeilDate);
    buildMonthGrid('veil-feb-211-dates', 211, 2, 25, selectVeilDate);
  }

  function buildMonthGrid(containerId, year, month, maxDay, clickHandler) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Special dates that should be flagged
    const alertDates = ['211-02-22','211-02-23','211-02-24','211-02-25'];
    
    for (let d = 1; d <= maxDay; d++) {
      const dateKey = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const btn = document.createElement('button');
      btn.className = 'date-btn';
      btn.textContent = d;
      btn.dataset.date = dateKey;
      if (alertDates.includes(dateKey)) btn.classList.add('has-alert');
      btn.addEventListener('click', () => clickHandler(dateKey));
      container.appendChild(btn);
    }
  }

  // ============ WARD LOG RENDERING ============
  function selectWardDate(dateKey) {
    currentWardDate = dateKey;
    // Update active button
    document.querySelectorAll('#ward-logs .date-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.date === dateKey);
    });
    renderWardLog(dateKey);
  }

  function renderWardLog(dateKey) {
    const display = document.getElementById('ward-log-display');
    const log = DAILY_LOGS[dateKey];
    if (!log) { display.innerHTML = '<div class="no-results">No log found for this date.</div>'; return; }

    const filterVal = (document.getElementById('ward-log-filter').value || '').toLowerCase();

    let entries = log.entries || [];
    if (filterVal) {
      entries = entries.filter(e => 
        (e.cadet||'').toLowerCase().includes(filterVal) ||
        (e.location||'').toLowerCase().includes(filterVal) ||
        (e.violation||'').toLowerCase().includes(filterVal) ||
        (e.time||'').toLowerCase().includes(filterVal)
      );
    }

    let html = `
      <div class="log-header-block">
        <h3>█ UNAUTHORIZED MOVEMENT LOG █</h3>
        <div class="meta">${log.date_display} · Tuner: ${log.tuner || 'Unknown'} · Total Entries: ${log.total_entries}</div>
      </div>
      <table class="log-table">
        <thead><tr>
          <th class="col-time">Time</th>
          <th class="col-cadet">Cadet / Position</th>
          <th class="col-location">Location / Area</th>
          <th class="col-violation">Violation / Flag</th>
        </tr></thead>
        <tbody>
    `;

    for (const e of entries) {
      const violClass = getViolationClass(e.violation);
      const violText = formatViolation(e.violation);
      html += `<tr>
        <td class="col-time">${esc(e.time)}</td>
        <td class="col-cadet">${esc(e.cadet)}</td>
        <td class="col-location">${esc(e.location)}</td>
        <td class="col-violation"><span class="violation-tag ${violClass}">${violText}</span></td>
      </tr>`;
    }

    html += '</tbody></table>';

    // Comments
    let comments = log.comments || [];
    if (filterVal) {
      comments = comments.filter(c =>
        (c.label||'').toLowerCase().includes(filterVal) ||
        (c.text||'').toLowerCase().includes(filterVal)
      );
    }

    if (comments.length > 0) {
      html += '<div class="comments-block"><div class="comments-header">═ Observer Comments ═</div>';
      for (const c of comments) {
        const isRedacted = c.label.includes('█');
        html += `<div class="comment-entry ${isRedacted ? 'comment-redacted' : ''}">
          <div class="comment-label">${esc(c.label)}</div>
          <div class="comment-text">${esc(c.text)}</div>
        </div>`;
      }
      html += '</div>';
    }

    display.innerHTML = html;
  }

  function getViolationClass(v) {
    if (!v) return '';
    const vl = v.toLowerCase();
    if (vl.includes('classified zone')) return 'viol-classified';
    if (vl.includes('sensitive')) return 'viol-sensitive';
    if (vl.includes('curfew')) return 'viol-curfew';
    if (vl.includes('guard') || vl.includes('rotation')) return 'viol-guard';
    if (vl.includes('projection')) return 'viol-projection';
    return 'viol-area';
  }

  function formatViolation(v) {
    if (!v) return '';
    let text = v.replace('▸ BSPP PATCH', '<span class="viol-bspp"> ▸ BSPP</span>');
    return text;
  }

  // Ward log filter
  document.getElementById('ward-log-filter')?.addEventListener('input', () => {
    if (currentWardDate) renderWardLog(currentWardDate);
  });

  // ============ CHANTARA LOG RENDERING ============
  function selectChantaraDate(dateKey) {
    currentChantaraDate = dateKey;
    document.querySelectorAll('#chantara-logs .date-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.date === dateKey);
    });
    renderChantaraLog(dateKey);
  }

  function renderChantaraLog(dateKey) {
    const display = document.getElementById('chantara-log-display');
    const log = CHANTARA_LOGS[dateKey];
    if (!log) { display.innerHTML = '<div class="no-results">No log found for this date.</div>'; return; }

    const filterVal = (document.getElementById('chantara-log-filter').value || '').toLowerCase();
    let entries = log.entries || [];
    if (filterVal) {
      entries = entries.filter(e =>
        (e.name||'').toLowerCase().includes(filterVal) ||
        (e.gate||'').toLowerCase().includes(filterVal) ||
        (e.noted_by||'').toLowerCase().includes(filterVal) ||
        (e.type||'').toLowerCase().includes(filterVal)
      );
    }

    let html = `
      <div class="log-header-block">
        <h3>█ CHANTARA VILLAGE — PERIMETER LOG █</h3>
        <div class="meta">${log.date_display} · Entries: ${entries.length}</div>
      </div>
      <table class="chantara-table">
        <thead><tr>
          <th>Time</th><th>Name</th><th>Direction</th><th>Gate</th><th>Noted By</th>
        </tr></thead><tbody>
    `;
    for (const e of entries) {
      const cls = e.type === 'ENTRY' ? 'entry-tag' : 'exit-tag';
      html += `<tr>
        <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--ink-dim)">${esc(e.time)}</td>
        <td>${esc(e.name)}</td>
        <td><span class="${cls}">${esc(e.type)}</span></td>
        <td style="color:var(--ink-dim)">${esc(e.gate)}</td>
        <td style="color:var(--ink-faint);font-size:0.75rem">${esc(e.noted_by)}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    display.innerHTML = html;
  }

  document.getElementById('chantara-log-filter')?.addEventListener('input', () => {
    if (currentChantaraDate) renderChantaraLog(currentChantaraDate);
  });

  // ============ VEIL LOG RENDERING ============
  function selectVeilDate(dateKey) {
    currentVeilDate = dateKey;
    document.querySelectorAll('#veil-logs .date-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.date === dateKey);
    });
    renderVeilLog(dateKey);
  }

  function renderVeilLog(dateKey) {
    const display = document.getElementById('veil-log-display');
    const log = VEIL_LOGS[dateKey];
    if (!log) { display.innerHTML = '<div class="no-results">No log found for this date.</div>'; return; }

    const filterVal = (document.getElementById('veil-log-filter').value || '').toLowerCase();
    let transits = log.transits || [];
    if (filterVal) {
      transits = transits.filter(t =>
        (t.dragon||'').toLowerCase().includes(filterVal) ||
        (t.rider||'').toLowerCase().includes(filterVal) ||
        (t.color||'').toLowerCase().includes(filterVal) ||
        (t.direction||'').toLowerCase().includes(filterVal) ||
        (t.dragon_type||'').toLowerCase().includes(filterVal)
      );
    }

    const colorMap = {
      'Red':'#a83232','Blue':'#3a5a8a','Green':'#3a6a3a','Brown':'#7a5a2a',
      'Orange':'#c8752a','Black':'#555','Iridescent':'#9a7acc'
    };

    let html = `
      <div class="log-header-block">
        <h3>█ DRAGON VEIL TRANSIT LOG █</h3>
        <div class="meta">${log.date_display} · Transits: ${transits.length}</div>
      </div>
      <table class="veil-table">
        <thead><tr>
          <th>Time</th><th>Dragon</th><th>Type</th><th>Rider</th><th>Direction</th><th>Den</th>
        </tr></thead><tbody>
    `;
    for (const t of transits) {
      const dirCls = t.direction.includes('ENTER') ? 'dir-enter' : 'dir-depart';
      const dotColor = colorMap[t.color] || '#888';
      html += `<tr>
        <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--ink-dim)">${esc(t.time)}</td>
        <td><span class="dragon-color" style="background:${dotColor}"></span>${esc(t.dragon)}</td>
        <td style="color:var(--ink-dim);font-size:0.78rem">${esc(t.dragon_type)}</td>
        <td>${esc(t.rider)}</td>
        <td class="${dirCls}" style="font-family:var(--font-mono);font-size:0.72rem">${esc(t.direction)}</td>
        <td style="color:var(--ink-faint);font-size:0.75rem">${esc(t.den)}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    display.innerHTML = html;
  }

  document.getElementById('veil-log-filter')?.addEventListener('input', () => {
    if (currentVeilDate) renderVeilLog(currentVeilDate);
  });

  // ============ EVIDENCE FILES ============
  function renderEvidenceList() {
    const container = document.getElementById('evidence-list');
    let html = '';
    for (const doc of EVIDENCE_DOCS) {
      const clsType = doc.classification.includes('ALPHA') ? 'ev-alpha' : 
                       doc.classification.includes('C') ? 'ev-charlie' : 'ev-bravo';
      const typeTag = doc.type ? `<span class="ev-type">${esc(doc.type)}</span>` : '';
      html += `<div class="evidence-card" data-id="${doc.id}">
        <span class="ev-class ${clsType}">${esc(doc.classification)}</span>${typeTag}
        <h4>${esc(doc.title)}</h4>
        <div class="ev-date">${esc(doc.date)} · ${esc(doc.author)}</div>
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('.evidence-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        selectEvidence(id);
        container.querySelectorAll('.evidence-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Select first by default
    if (EVIDENCE_DOCS.length > 0) selectEvidence(EVIDENCE_DOCS[0].id);
  }

  function selectEvidence(id) {
    currentEvidence = id;
    const doc = EVIDENCE_DOCS.find(d => d.id === id);
    if (!doc) return;
    const display = document.getElementById('evidence-display');
    display.innerHTML = `
      <div class="ev-title">${esc(doc.title)}</div>
      <div class="ev-meta">${esc(doc.classification)} · ${esc(doc.date)} · Author: ${esc(doc.author)}</div>
      <div class="ev-body">${esc(doc.content)}</div>
    `;
  }

  // ============ CADET COMPENDIUM ============
  function renderCompendium() {
    filterCompendium();
  }

  function filterCompendium() {
    const searchVal = (document.getElementById('compendium-search')?.value || '').toLowerCase();
    const wingFilter = document.getElementById('filter-wing')?.value || '';
    const sectionFilter = document.getElementById('filter-section')?.value || '';
    const yearFilter = document.getElementById('filter-year')?.value || '';
    const roleFilter = document.getElementById('filter-role')?.value || '';

    let results = CADETS.filter(c => {
      if (wingFilter && String(c.wing) !== wingFilter) return false;
      if (sectionFilter && c.section !== sectionFilter) return false;
      if (yearFilter && String(c.year) !== yearFilter) return false;
      if (roleFilter && !c.role.includes(roleFilter)) return false;
      if (searchVal) {
        const text = [c.full_name, c.signet, c.bonded_dragon, c.dragon_nickname, c.dragon_type, c.role, c.section, 'Wing '+c.wing].join(' ').toLowerCase();
        if (!text.includes(searchVal)) return false;
      }
      return true;
    });

    const container = document.getElementById('compendium-results');
    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">No matching personnel found.</div>';
      return;
    }

    // Sort: leadership first, then by name
    const roleOrder = {'Commanding General':0,'Commandant':1,'All Forces General':0,'Vice Commandant':2,
      'Executive Wingleader':3,'Wingleader':4,'Section Leader':5,'Section Executive':6,
      'Squad Leader':7,'Cadet':8};
    results.sort((a,b) => {
      const ra = roleOrder[a.role] ?? 10;
      const rb = roleOrder[b.role] ?? 10;
      if (ra !== rb) return ra - rb;
      return a.full_name.localeCompare(b.full_name);
    });

    let html = '';
    for (const c of results) {
      html += `<div class="comp-row" data-id="${esc(c.id)}">
        <span class="comp-name">${esc(c.full_name)}</span>
        <span class="comp-role">${esc(c.role)}</span>
        <span class="comp-section">${c.section ? esc(c.section) : '—'}</span>
        <span class="comp-wing">${c.wing ? 'W'+c.wing : '—'}</span>
        <span class="comp-signet">${esc(c.signet) || '—'}</span>
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('.comp-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        selectCadet(id);
        container.querySelectorAll('.comp-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
      });
    });
  }

  function selectCadet(id) {
    currentCadet = id;
    const cadet = CADETS.find(c => c.id === id);
    if (!cadet) return;

    const display = document.getElementById('compendium-detail');

    // Find all log references for this person
    const logRefs = findLogReferences(cadet.full_name);

    let html = `
      <div class="detail-name">${esc(cadet.full_name)}</div>
      <div class="detail-role">${esc(cadet.role)}${cadet.wing ? ' · Wing ' + cadet.wing : ''}${cadet.section ? ' · ' + cadet.section + ' Section' : ''}${cadet.squad ? ' · Squad ' + cadet.squad : ''}</div>
      <div class="detail-grid">
        <div class="detail-field">
          <span class="detail-label">Year</span>
          <span class="detail-value">${cadet.year || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Squad</span>
          <span class="detail-value">${cadet.squad ? 'Squad ' + cadet.squad : '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Section</span>
          <span class="detail-value">${cadet.section || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Wing</span>
          <span class="detail-value">${cadet.wing ? 'Wing ' + cadet.wing : '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Position</span>
          <span class="detail-value">${esc(cadet.role)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Signet</span>
          <span class="detail-value">${esc(cadet.signet) || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Bonded Dragon</span>
          <span class="detail-value">${esc(cadet.bonded_dragon) || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Dragon Type</span>
          <span class="detail-value">${esc(cadet.dragon_type) || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Second Signet</span>
          <span class="${cadet.second_signet ? 'detail-classified' : 'detail-value'}">${cadet.second_signet || '—'}</span>
        </div>
      </div>
    `;

    if (logRefs.length > 0) {
      html += `<div class="detail-log-refs"><h4>Log References (${logRefs.length})</h4>`;
      for (const ref of logRefs) {
        html += `<div class="log-ref-item" data-date="${ref.date}" data-source="${ref.source}">
          <span class="ref-date">${ref.dateDisplay}</span> ${esc(ref.summary)}
        </div>`;
      }
      html += '</div>';
    }

    display.innerHTML = html;

    // Make log refs clickable
    display.querySelectorAll('.log-ref-item').forEach(item => {
      item.addEventListener('click', () => {
        const date = item.dataset.date;
        const source = item.dataset.source;
        if (source === 'ward') { switchSection('ward-logs'); selectWardDate(date); }
        else if (source === 'chantara') { switchSection('chantara-logs'); selectChantaraDate(date); }
        else if (source === 'veil') { switchSection('veil-logs'); selectVeilDate(date); }
      });
    });
  }

  function findLogReferences(name) {
    const refs = [];
    const nameLower = name.toLowerCase();
    const lastName = name.split(' ').pop().toLowerCase();

    // Search ward logs
    for (const [dateKey, log] of Object.entries(DAILY_LOGS)) {
      for (const e of (log.entries||[])) {
        if ((e.cadet||'').toLowerCase().includes(lastName)) {
          refs.push({ date: dateKey, dateDisplay: log.date_display, source: 'ward',
            summary: `${e.time} — ${e.location} — ${e.violation}` });
        }
      }
      for (const c of (log.comments||[])) {
        if ((c.label||'').toLowerCase().includes(lastName) || (c.text||'').toLowerCase().includes(lastName)) {
          refs.push({ date: dateKey, dateDisplay: log.date_display, source: 'ward',
            summary: `Comment: ${c.text}` });
        }
      }
    }
    // Search Chantara logs
    for (const [dateKey, log] of Object.entries(CHANTARA_LOGS)) {
      for (const e of (log.entries||[])) {
        if ((e.name||'').toLowerCase().includes(nameLower)) {
          refs.push({ date: dateKey, dateDisplay: log.date_display, source: 'chantara',
            summary: `${e.time} — ${e.type} — ${e.gate}` });
        }
      }
    }
    // Search Veil logs
    for (const [dateKey, log] of Object.entries(VEIL_LOGS)) {
      for (const t of (log.transits||[])) {
        if ((t.rider||'').toLowerCase().includes(nameLower)) {
          refs.push({ date: dateKey, dateDisplay: log.date_display, source: 'veil',
            summary: `${t.time} — ${t.dragon} — ${t.direction}` });
        }
      }
    }

    refs.sort((a,b) => a.date.localeCompare(b.date));
    return refs;
  }

  // Compendium filter listeners
  ['compendium-search','filter-wing','filter-section','filter-year','filter-role'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', filterCompendium);
    if (el) el.addEventListener('change', filterCompendium);
  });

  // ============ GLOBAL SEARCH ============
  function setupSearch() {
    const input = document.getElementById('global-search');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query.length >= 2) performGlobalSearch(query);
      }
    });
  }

  function performGlobalSearch(query) {
    const q = query.toLowerCase();
    const results = { ward: [], chantara: [], veil: [], evidence: [], compendium: [] };

    // Search ward logs
    for (const [dateKey, log] of Object.entries(DAILY_LOGS)) {
      for (const e of (log.entries||[])) {
        const text = [e.time, e.cadet, e.location, e.violation].join(' ');
        if (text.toLowerCase().includes(q)) {
          results.ward.push({ date: dateKey, dateDisplay: log.date_display,
            text: `${e.time} · ${e.cadet} · ${e.location} · ${e.violation}` });
        }
      }
      for (const c of (log.comments||[])) {
        const text = [c.label, c.text].join(' ');
        if (text.toLowerCase().includes(q)) {
          results.ward.push({ date: dateKey, dateDisplay: log.date_display,
            text: `${c.label}: ${c.text}` });
        }
      }
    }
    // Search Chantara
    for (const [dateKey, log] of Object.entries(CHANTARA_LOGS)) {
      for (const e of (log.entries||[])) {
        const text = [e.name, e.type, e.gate, e.time].join(' ');
        if (text.toLowerCase().includes(q)) {
          results.chantara.push({ date: dateKey, dateDisplay: log.date_display,
            text: `${e.time} · ${e.name} · ${e.type} · ${e.gate}` });
        }
      }
    }
    // Search Veil
    for (const [dateKey, log] of Object.entries(VEIL_LOGS)) {
      for (const t of (log.transits||[])) {
        const text = [t.dragon, t.rider, t.direction, t.dragon_type].join(' ');
        if (text.toLowerCase().includes(q)) {
          results.veil.push({ date: dateKey, dateDisplay: log.date_display,
            text: `${t.time} · ${t.dragon} (${t.rider}) · ${t.direction}` });
        }
      }
    }
    // Search evidence
    for (const doc of EVIDENCE_DOCS) {
      const text = [doc.title, doc.content, doc.author].join(' ');
      if (text.toLowerCase().includes(q)) {
        results.evidence.push({ id: doc.id, text: `${doc.title} — ${doc.content}` });
      }
    }
    // Search cadets
    for (const c of CADETS) {
      const text = [c.full_name, c.role, c.signet, c.bonded_dragon, c.dragon_type, c.section, 'Wing '+c.wing].join(' ');
      if (text.toLowerCase().includes(q)) {
        results.compendium.push({ id: c.id, text: `${c.full_name} — ${c.role} — ${c.signet || 'No signet listed'}` });
      }
    }

    renderSearchResults(query, results);
  }

  function renderSearchResults(query, results) {
    // Show the search results tab
    const tab = document.getElementById('search-results-tab');
    tab.style.display = 'flex';
    switchSection('search-results');

    const total = results.ward.length + results.chantara.length + results.veil.length + results.evidence.length + results.compendium.length;
    document.getElementById('search-query-display').textContent = `Query: "${query}" — ${total} results found`;

    const display = document.getElementById('search-results-display');
    let html = '';

    if (total === 0) {
      html = '<div class="no-results">No results found across any records.</div>';
    }

    const renderCategory = (title, items) => {
      if (items.length === 0) return '';
      let h = `<div class="sr-category"><h3>${title}<span class="sr-count">(${items.length})</span></h3>`;
      for (const item of items) {
        const highlighted = highlightMatch(item.text, query);
        h += `<div class="sr-item" ${item.date ? `data-date="${item.date}"` : ''} ${item.id ? `data-id="${item.id}"` : ''} data-source="${title.toLowerCase()}">
          ${item.dateDisplay ? `<div class="sr-source">${item.dateDisplay}</div>` : ''}
          <div class="sr-text">${highlighted}</div>
        </div>`;
      }
      h += '</div>';
      return h;
    };

    html += renderCategory('Ward Movement Logs', results.ward);
    html += renderCategory('Chantara Perimeter Logs', results.chantara);
    html += renderCategory('Dragon Veil Transit', results.veil);
    html += renderCategory('Evidence Files', results.evidence);
    html += renderCategory('Cadet Compendium', results.compendium);

    display.innerHTML = html;

    // Make results clickable
    display.querySelectorAll('.sr-item').forEach(item => {
      item.addEventListener('click', () => {
        const date = item.dataset.date;
        const id = item.dataset.id;
        const source = item.dataset.source;
        if (source.includes('ward') && date) { switchSection('ward-logs'); selectWardDate(date); }
        else if (source.includes('chantara') && date) { switchSection('chantara-logs'); selectChantaraDate(date); }
        else if (source.includes('veil') && date) { switchSection('veil-logs'); selectVeilDate(date); }
        else if (source.includes('evidence') && id) { switchSection('evidence'); selectEvidence(id); }
        else if (source.includes('compendium') && id) { switchSection('compendium'); selectCadet(id); }
      });
    });
  }

  function highlightMatch(text, query) {
    if (!query) return esc(text);
    const escaped = esc(text);
    const regex = new RegExp(`(${escRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  function setupFilters() {
    // Auto-select first Chantara date when tab is clicked
    document.querySelector('.nav-tab[data-section="chantara-logs"]')?.addEventListener('click', () => {
      if (!currentChantaraDate) selectChantaraDate('210-12-01');
    });
    document.querySelector('.nav-tab[data-section="veil-logs"]')?.addEventListener('click', () => {
      if (!currentVeilDate) selectVeilDate('210-12-01');
    });
  }

  // ============ UTILITIES ============
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

})();
