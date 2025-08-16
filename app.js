// Snow generator
(function makeSnow(){
  const snow = document.getElementById('snow');
  if (!snow) return;
  const COUNT = 100;
  for (let i = 0; i < COUNT; i++) {
    const f = document.createElement('div');
    f.className = 'snowflake';
    const size = (Math.random() * 4 + 2).toFixed(1);      // 2–6px
    const left = (Math.random() * 100).toFixed(2) + 'vw';
    const delay = (Math.random() * 10).toFixed(2) + 's';
    const dur = (Math.random() * 10 + 10).toFixed(2) + 's'; // 10–20s
    const drift = ((Math.random() * 60 - 30).toFixed(1)) + 'px'; // -30..30
    const op = (Math.random() * 0.5 + 0.45).toFixed(2);   // 0.45–0.95
    f.style.left = left;
    f.style.setProperty('--size', size + 'px');
    f.style.setProperty('--delay', delay);
    f.style.setProperty('--dur', dur);
    f.style.setProperty('--drift', drift);
    f.style.setProperty('--op', op);
    snow.appendChild(f);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // Helpers to read CSS vars for consistent chart colors
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // Build unique keys and restore from localStorage
  const STORAGE_KEY = 'chapterStatusV1';
  const checkboxes = Array.from(document.querySelectorAll('.chapter-checkbox'));

  // Compute a unique data-key if not preset
  checkboxes.forEach(cb => {
    if (!cb.dataset.key) {
      const subj = cb.dataset.subject || 'Unknown';
      const chapter = (cb.parentElement?.textContent || '').replace(/\s+/g,' ').trim();
      cb.dataset.key = `${subj}::${chapter}`;
    }
  });

  // Restore saved state
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const set = new Set(saved);
    checkboxes.forEach(cb => {
      if (set.has(cb.dataset.key)) cb.checked = true;
    });
  } catch(e){ /* ignore */ }

  // Charts
  const ctx1 = document.getElementById('progressChart').getContext('2d');
  const ctx2 = document.getElementById('overallChart').getContext('2d');

  const subjectChart = new Chart(ctx1, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          cssVar('--c1'), cssVar('--c2'), cssVar('--c3'), cssVar('--c4'),
          cssVar('--c5'), cssVar('--c6'), cssVar('--c7'), cssVar('--c8')
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: cssVar('--text') } } }
    }
  });

  const overallChart = new Chart(ctx2, {
    type: 'pie',
    data: {
      labels: ['Done', 'Remaining'],
      datasets: [{
        data: [0, 100],
        backgroundColor: [cssVar('--green'), cssVar('--red')],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: cssVar('--text') } } }
    }
  });

  function updateCharts() {
    const subjects = {};
    let doneTotal = 0, totalChapters = 0;

    checkboxes.forEach(cb => {
      const subj = cb.dataset.subject || 'Unknown';
      subjects[subj] = subjects[subj] || { done: 0, total: 0 };
      subjects[subj].total++;
      totalChapters++;
      if (cb.checked) {
        subjects[subj].done++;
        doneTotal++;
      }
    });
// Update counters
document.querySelectorAll('.counter').forEach(span => {
  const subj = span.dataset.subject;
  if (subjects[subj]) {
    span.textContent = `(${subjects[subj].done} / ${subjects[subj].total})`;
  }
});

    // Subject-wise percentages
    const labels = [];
    const data1 = [];
    Object.keys(subjects).forEach(subj => {
      const { done, total } = subjects[subj];
      const pct = total ? Math.round((done / total) * 100) : 0;
      labels.push(`${subj} (${pct}%)`);
      data1.push(pct);
    });

    subjectChart.data.labels = labels;
    subjectChart.data.datasets[0].data = data1;
    subjectChart.update();

    // Overall done vs remaining
    overallChart.data.datasets[0].data = [doneTotal, totalChapters - doneTotal];
    overallChart.update();
  }

  // Save on change + update charts
  function handleChange() {
    const checkedKeys = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedKeys));
    updateCharts();
  }

  checkboxes.forEach(cb => cb.addEventListener('change', handleChange));

  // Initial draw
  updateCharts();

  // Toggle charts
  const btn = document.getElementById('toggleChart');
  const subjDiv = document.getElementById('chart-container');
  const overallDiv = document.getElementById('overall-chart-container');

  btn.addEventListener('click', () => {
    const showingSubj = subjDiv.style.display !== 'none';
    subjDiv.style.display = showingSubj ? 'none' : 'block';
    overallDiv.style.display = showingSubj ? 'block' : 'none';
    btn.textContent = showingSubj ? 'Show Subject Breakdown' : 'Show Overall Progress';
  });
});
// Add search/filter behavior (improved: rank all subjects by number of matches)
(function () {
  const searchBox = document.getElementById('searchBox');
  if (!searchBox) return;

  function normalize(s) { return (s || '').toString().toLowerCase().trim(); }

  function applySearch() {
    const q = normalize(searchBox.value);
    const inputs = Array.from(document.querySelectorAll('input.chapter-checkbox'));
    const detailsHasMatch = new Map();
    const detailsMatchCount = new Map();

    // show/hide list items and compute per-details match counts
    inputs.forEach(input => {
      const label = input.closest('label') || input.parentElement;
      const li = input.closest('li');
      if (!li || !label) return;

      const text = normalize(label.textContent || label.innerText);
      const isMatch = q === '' ? true : text.includes(q);
      li.style.display = isMatch ? '' : 'none';

      const parentDetails = li.closest('details');
      if (parentDetails) {
        detailsHasMatch.set(parentDetails, (detailsHasMatch.get(parentDetails) || false) || isMatch);
        detailsMatchCount.set(parentDetails, (detailsMatchCount.get(parentDetails) || 0) + (isMatch ? 1 : 0));
      }
    });

    // open details that have at least one match, close others
    const container = document.getElementById('expandedArea') || document.querySelector('.page');
    const allDetails = Array.from((container || document).querySelectorAll('details'));
    allDetails.forEach(d => {
      const has = !!detailsHasMatch.get(d);
      d.open = has; // opens matched, closes unmatched (if q==='', all open=true)
    });

    // reorder details inside expandedArea by match count (descending)
    if (container) {
      const originalIndex = new Map(allDetails.map((d, i) => [d, i]));
      const ordered = allDetails.slice().sort((a, b) => {
        const ca = detailsMatchCount.get(a) || 0;
        const cb = detailsMatchCount.get(b) || 0;
        if (cb !== ca) return cb - ca;
        return originalIndex.get(a) - originalIndex.get(b);
      });
      ordered.forEach(d => container.appendChild(d));
    }

    // build matchedSubjects list for listeners
    const matchedSubjects = [];
    detailsHasMatch.forEach((has, detailsEl) => {
      if (has) {
        const subj = detailsEl.querySelector('.summary-icon')?.dataset.subject || '';
        if (subj) matchedSubjects.push(subj);
      }
    });

    // notify compact-bar + selection code to refresh badges / selected slice
    document.dispatchEvent(new CustomEvent('search-applied', {
      detail: { query: q, matchedSubjects }
    }));
  }

  // simple debounce
  let debounceTimer = null;
  searchBox.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applySearch, 150);
  });

  // Enter focuses first match
  searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstVisible = document.querySelector('li:not([style*="display: none"]) input.chapter-checkbox');
      if (firstVisible) firstVisible.focus();
    }
  });
})();

(function setupCompactBarAndSelection(){
  const compactBar = document.getElementById('compactBar');
  const expandedArea = document.getElementById('expandedArea') || document.querySelector('.page');
  if (!compactBar || !expandedArea) return;

  const detailsList = Array.from(expandedArea.querySelectorAll('details'));
  const baseColors = [
    getComputedStyle(document.documentElement).getPropertyValue('--c1').trim() || '#4aa3ff',
    getComputedStyle(document.documentElement).getPropertyValue('--c2').trim() || '#7be6a6',
    getComputedStyle(document.documentElement).getPropertyValue('--c3').trim() || '#ffc857',
    getComputedStyle(document.documentElement).getPropertyValue('--c4').trim() || '#ff7b9c',
    getComputedStyle(document.documentElement).getPropertyValue('--c5').trim() || '#b79cff',
    getComputedStyle(document.documentElement).getPropertyValue('--c6').trim() || '#5fd3ff',
    getComputedStyle(document.documentElement).getPropertyValue('--c7').trim() || '#8ad3ff',
    getComputedStyle(document.documentElement).getPropertyValue('--c8').trim() || '#ffd6a5'
  ];

  let selectedSubject = null;
  let hoverSubject = null; // NEW: temporary hover selection

  // listen for search events so compact bar & selection reset correctly
  document.addEventListener('search-applied', (e) => {
    const q = e.detail?.query || '';
    const matches = e.detail?.matchedSubjects || [];
    if (q === '') {
      // clear selection when search cleared
      selectedSubject = null;
    } else {
      // if single match, select it; if multiple, select the first match (keeps pie highlight)
      selectedSubject = matches.length === 1 ? matches[0] : (matches[0] || null);
    }
    // refresh compact buttons and chart highlight
    refreshCompactButtons();
    try { if (typeof updateCharts === 'function') updateCharts(); } catch(_) {}
  });

  const refreshCompactButtons = () => {
    compactBar.innerHTML = '';
    detailsList.forEach((d, idx) => {
      const subj = d.querySelector('.summary-icon')?.dataset.subject || `Subject ${idx+1}`;
      const counterSpan = d.querySelector('.counter');
      const badgeText = counterSpan ? counterSpan.textContent.replace(/[()]/g,'') : '';
      // only show a compact button for collapsed details
      if (!d.open) {
        const btn = document.createElement('button');
        btn.className = 'compact-btn';
        btn.type = 'button';
        btn.dataset.subject = subj;
        btn.dataset.index = idx;
        btn.title = badgeText ? `${subj} ${badgeText}` : subj; // native tooltip

        // clone icon into button
        const icon = d.querySelector('.summary-icon')?.cloneNode(true);
        if (icon) icon.classList.add('compact-icon');
        btn.appendChild(icon || document.createElement('span'));
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = badgeText || '';
        btn.appendChild(badge);

        // click: open this subject and select it
        btn.addEventListener('click', () => {
          detailsList.forEach(dd => { dd.open = false; });
          d.open = true;
          selectedSubject = subj;
          updateCharts(); // highlight selection in chart
          refreshCompactButtons();
          setTimeout(() => d.scrollIntoView({behavior:'smooth', block:'center'}), 80);
        });

        // hover: temporarily highlight subject in chart and show tooltip (immediate visual feedback)
        btn.addEventListener('mouseenter', () => {
          hoverSubject = subj;
          try { if (typeof updateCharts === 'function') updateCharts(); } catch(_) {}
        });
        btn.addEventListener('mouseleave', () => {
          hoverSubject = null;
          try { if (typeof updateCharts === 'function') updateCharts(); } catch(_) {}
        });

        compactBar.appendChild(btn);
      }
    });
  }

  // when details toggles open/close, refresh compact bar and selection
  detailsList.forEach(d => {
    d.addEventListener('toggle', () => {
      const openOne = detailsList.find(dd => dd.open);
      selectedSubject = openOne ? (openOne.querySelector('.summary-icon')?.dataset.subject || null) : null;
      refreshCompactButtons();
      updateCharts();
    });
  });

  // ensure we wrap/extend existing updateCharts to respect hoverSubject first, then selectedSubject
  if (typeof window.updateCharts === 'undefined') {
    if (typeof updateCharts === 'function') window.updateCharts = updateCharts;
  }
  const realUpdate = window.updateCharts || function(){};

  window.updateCharts = function(){
    // call original to recompute labels/data
    realUpdate();

    // apply selection/hover highlighting on subjectChart
    try {
      const chartEl = document.getElementById('progressChart');
      if (!chartEl) return;
      const ch = Chart.getChart(chartEl);
      if (!ch) return;

      const labels = ch.data.labels || [];
      // active selection: hover takes precedence
      const active = hoverSubject || selectedSubject;
      const colors = labels.map((lab, i) => {
        const subjName = String(lab).split(' (')[0];
        const base = baseColors[i % baseColors.length] || '#9aa';
        // if there is no active selection, use base colors
        if (!active) return base;
        // dim non-active slices
        return subjName === active ? base : 'rgba(200,200,200,0.18)';
      });
      ch.data.datasets[0].backgroundColor = colors;
      ch.update();
    } catch (e) {
      // ignore
    }
  };

  // initial build
  refreshCompactButtons();

  // ensure compact bar updates when checkboxes change (so badges update)
  document.addEventListener('change', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('chapter-checkbox')) {
      setTimeout(() => refreshCompactButtons(), 80);
    }
  });

  // expose selected for debugging
  window.__selectedSubject = () => selectedSubject;
})();