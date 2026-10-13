// ====== ÉTAT ======
let state = {
  produits: JSON.parse(localStorage.getItem('produits')) || [],
  ventes: JSON.parse(localStorage.getItem('ventes')) || [],
  clients: JSON.parse(localStorage.getItem('clients')) || []
};

let charts = { ca: null, produits: null, top: null };

const save = () => {
  localStorage.setItem('produits', JSON.stringify(state.produits));
  localStorage.setItem('ventes', JSON.stringify(state.ventes));
  localStorage.setItem('clients', JSON.stringify(state.clients));
};

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

// ====== TOAST ======
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast ' + type; }, 2800);
}

// ====== THEME ======
const themeBtn = document.getElementById('theme-toggle');

function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeBtn.querySelector('.theme-icon').textContent = dark ? '☀️' : '🌙';
  themeBtn.querySelector('.theme-label').textContent = dark ? 'Mode clair' : 'Mode sombre';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  setTimeout(renderCharts, 100);
}

themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});

// ====== NAVIGATION ======
const titles = {
  dashboard: ['Tableau de bord', "Vue d'ensemble de votre activité"],
  produits: ['Produits', 'Gérez votre catalogue et vos stocks'],
  ventes: ['Ventes', 'Enregistrez et consultez vos ventes'],
  clients: ['Clients', 'Votre base de clients']
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');

    const [t, s] = titles[btn.dataset.tab];
    document.getElementById('page-title').textContent = t;
    document.getElementById('page-subtitle').textContent = s;

    if (btn.dataset.tab === 'dashboard') setTimeout(renderCharts, 80);
  });
});

// ====== PRODUITS ======
document.getElementById('form-produit').addEventListener('submit', (e) => {
  e.preventDefault();
  const nom = document.getElementById('prod-nom').value.trim();
  const prix = +document.getElementById('prod-prix').value;
  const stock = +document.getElementById('prod-stock').value;
  const seuil = +document.getElementById('prod-seuil').value;

  state.produits.push({ id: Date.now(), nom, prix, stock, seuil });
  save();
  e.target.reset();
  document.getElementById('prod-seuil').value = 5;
  render();
  toast(`Produit "${nom}" ajouté ✅`);
});

function supprimerProduit(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  state.produits = state.produits.filter(p => p.id !== id);
  save();
  render();
  toast('Produit supprimé', 'error');
}

// ====== VENTES ======
document.getElementById('form-vente').addEventListener('submit', (e) => {
  e.preventDefault();
  const produitId = +document.getElementById('vente-produit').value;
  const qte = +document.getElementById('vente-qte').value;
  const clientId = document.getElementById('vente-client').value;

  const produit = state.produits.find(p => p.id === produitId);
  if (!produit) return toast('Sélectionnez un produit', 'error');
  if (produit.stock < qte) return toast('Stock insuffisant !', 'error');

  produit.stock -= qte;
  const client = state.clients.find(c => c.id === +clientId);

  state.ventes.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    produitId,
    produitNom: produit.nom,
    qte,
    prixUnitaire: produit.prix,
    total: produit.prix * qte,
    clientNom: client ? client.nom : '—'
  });

  save();
  e.target.reset();
  document.getElementById('vente-qte').value = 1;
  render();
  toast('Vente enregistrée 💵');
});

// ====== CLIENTS ======
document.getElementById('form-client').addEventListener('submit', (e) => {
  e.preventDefault();
  const nom = document.getElementById('cli-nom').value.trim();
  const tel = document.getElementById('cli-tel').value.trim();

  state.clients.push({ id: Date.now(), nom, tel });
  save();
  e.target.reset();
  render();
  toast(`Client "${nom}" ajouté 👤`);
});

function supprimerClient(id) {
  if (!confirm('Supprimer ce client ?')) return;
  state.clients = state.clients.filter(c => c.id !== id);
  save();
  render();
  toast('Client supprimé', 'error');
}

// ====== RENDU GLOBAL ======
function render() {
  renderProduits();
  renderVentes();
  renderClients();
  renderDashboard();
  renderSelects();
  renderCharts();
}

// ====== TABLE PRODUITS ======
function renderProduits() {
  const tbody = document.querySelector('#table-produits tbody');
  tbody.innerHTML = '';

  document.getElementById('badge-produits').textContent =
    state.produits.length + (state.produits.length > 1 ? ' produits' : ' produit');

  if (state.produits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Aucun produit. Ajoutez-en un !</td></tr>`;
    return;
  }

  state.produits.forEach(p => {
    const alerte = p.stock <= p.seuil;
    const rupture = p.stock === 0;
    let statut = '<span class="badge badge-success">En stock</span>';
    if (rupture) statut = '<span class="badge badge-danger">Rupture</span>';
    else if (alerte) statut = '<span class="badge badge-warning">Stock faible</span>';

    tbody.innerHTML += `
      <tr>
        <td><strong>${p.nom}</strong></td>
        <td>${fmt(p.prix)}</td>
        <td class="${alerte ? 'alerte' : ''}">${p.stock}</td>
        <td>${p.seuil}</td>
        <td>${statut}</td>
        <td><button class="btn-del" onclick="supprimerProduit(${p.id})">🗑️</button></td>
      </tr>`;
  });
}

// ====== TABLE VENTES ======
function renderVentes() {
  const tbody = document.querySelector('#table-ventes tbody');
  tbody.innerHTML = '';

  document.getElementById('badge-ventes').textContent =
    state.ventes.length + (state.ventes.length > 1 ? ' ventes' : ' vente');

  if (state.ventes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Aucune vente enregistrée.</td></tr>`;
    return;
  }

  state.ventes.forEach(v => {
    tbody.innerHTML += `
      <tr>
        <td>${new Date(v.date).toLocaleString('fr-FR')}</td>
        <td><strong>${v.produitNom}</strong></td>
        <td>${v.qte}</td>
        <td>${fmt(v.total)}</td>
        <td>${v.clientNom}</td>
      </tr>`;
  });
}

// ====== TABLE CLIENTS ======
function renderClients() {
  const tbody = document.querySelector('#table-clients tbody');
  tbody.innerHTML = '';

  document.getElementById('badge-clients').textContent =
    state.clients.length + (state.clients.length > 1 ? ' clients' : ' client');

  if (state.clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Aucun client enregistré.</td></tr>`;
    return;
  }

  state.clients.forEach(c => {
    const total = state.ventes
      .filter(v => v.clientNom === c.nom)
      .reduce((s, v) => s + v.total, 0);

    tbody.innerHTML += `
      <tr>
        <td><strong>${c.nom}</strong></td>
        <td>${c.tel || '—'}</td>
        <td>${fmt(total)}</td>
        <td><button class="btn-del" onclick="supprimerClient(${c.id})">🗑️</button></td>
      </tr>`;
  });
}

// ====== DASHBOARD ======
function renderDashboard() {
  const ca = state.ventes.reduce((s, v) => s + v.total, 0);
  const today = new Date().toDateString();
  const ventesJour = state.ventes.filter(v => new Date(v.date).toDateString() === today);
  const caJour = ventesJour.reduce((s, v) => s + v.total, 0);
  const alertes = state.produits.filter(p => p.stock <= p.seuil);

  document.getElementById('stat-ca').textContent = fmt(ca);
  document.getElementById('stat-ventes').textContent = ventesJour.length;
  document.getElementById('stat-produits').textContent = state.produits.length;
  document.getElementById('stat-alertes').textContent = alertes.length;

  document.getElementById('trend-ca').textContent = caJour > 0
    ? `+ ${fmt(caJour)} aujourd'hui` : 'Aucune vente aujourd\'hui';

  document.getElementById('trend-ventes').textContent = ventesJour.length > 0
    ? `${fmt(caJour)} encaissés` : 'Aucune vente aujourd\'hui';

  const stockTotal = state.produits.reduce((s, p) => s + p.stock, 0);
  document.getElementById('trend-produits').textContent = `${stockTotal} unités en stock`;

  // Alertes
  const ul = document.getElementById('alertes-list');
  if (alertes.length === 0) {
    ul.innerHTML = `<li class="alerte-ok">✅ Aucune alerte. Tous vos stocks sont bons !</li>`;
  } else {
    ul.innerHTML = alertes
      .sort((a, b) => a.stock - b.stock)
      .map(p => {
        const cls = p.stock === 0 ? 'alerte-danger' : 'alerte-warning';
        const icon = p.stock === 0 ? '🚨' : '⚠️';
        return `<li class="${cls}">
          <span>${icon} <strong>${p.nom}</strong></span>
          <span>${p.stock} / seuil ${p.seuil}</span>
        </li>`;
      })
      .join('');
  }

  document.getElementById('current-date').textContent =
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

// ====== SELECTS ======
function renderSelects() {
  const selProd = document.getElementById('vente-produit');
  const currentProd = selProd.value;
  selProd.innerHTML = '<option value="">— Choisir un produit —</option>' +
    state.produits.map(p =>
      `<option value="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
        ${p.nom} (${p.stock} en stock)
      </option>`
    ).join('');
  if (currentProd) selProd.value = currentProd;

  const selCli = document.getElementById('vente-client');
  const currentCli = selCli.value;
  selCli.innerHTML = '<option value="">— Aucun —</option>' +
    state.clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
  if (currentCli) selCli.value = currentCli;
}

// ====== GRAPHIQUES ======
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#f1f5f9' : '#0f172a',
    muted: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.1)',
    primary: '#6366f1',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };
}

function renderCharts() {
  if (typeof Chart === 'undefined') return;
  const c = getChartColors();

  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.color = c.muted;

  // --- 1. CA sur 7 jours ---
  const days = [];
  const caParJour = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    const total = state.ventes
      .filter(v => new Date(v.date).toDateString() === d.toDateString())
      .reduce((s, v) => s + v.total, 0);
    caParJour.push(total);
  }

  const ctxCa = document.getElementById('chart-ca');
  if (ctxCa) {
    if (charts.ca) charts.ca.destroy();
    const grad = ctxCa.getContext('2d').createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(99,102,241,0.35)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');

    charts.ca = new Chart(ctxCa, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: "Chiffre d'affaires",
          data: caParJour,
          borderColor: c.primary,
          backgroundColor: grad,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: c.primary,
          pointBorderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.text,
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 13 },
            callbacks: {
              label: (ctx) => ' ' + fmt(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: c.muted } },
          y: {
            beginAtZero: true,
            grid: { color: c.grid },
            ticks: {
              color: c.muted,
              callback: (v) => new Intl.NumberFormat('fr-FR').format(v)
            }
          }
        }
      }
    });
  }

  // --- 2. Répartition par produit (Doughnut) ---
  const prodTotals = {};
  state.ventes.forEach(v => {
    prodTotals[v.produitNom] = (prodTotals[v.produitNom] || 0) + v.total;
  });
  const prodLabels = Object.keys(prodTotals);
  const prodData = Object.values(prodTotals);

  const ctxProd = document.getElementById('chart-produits');
  if (ctxProd) {
    if (charts.produits) charts.produits.destroy();

    if (prodLabels.length === 0) {
      charts.produits = new Chart(ctxProd, {
        type: 'doughnut',
        data: { labels: ['Aucune vente'], datasets: [{ data: [1], backgroundColor: [c.grid] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    } else {
      const palette = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
      charts.produits = new Chart(ctxProd, {
        type: 'doughnut',
        data: {
          labels: prodLabels,
          datasets: [{
            data: prodData,
            backgroundColor: palette,
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 14, boxWidth: 12, boxHeight: 12, usePointStyle: true, color: c.muted }
            },
            tooltip: {
              backgroundColor: c.text,
              padding: 12,
              cornerRadius: 8,
              callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}` }
            }
          }
        }
      });
    }
  }

  // --- 3. Top 5 produits (barres horizontales) ---
  const qteParProduit = {};
  state.ventes.forEach(v => {
    qteParProduit[v.produitNom] = (qteParProduit[v.produitNom] || 0) + v.qte;
  });
  const topEntries = Object.entries(qteParProduit)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ctxTop = document.getElementById('chart-top');
  if (ctxTop) {
    if (charts.top) charts.top.destroy();

    charts.top = new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: topEntries.map(e => e[0]),
        datasets: [{
          label: 'Quantité vendue',
          data: topEntries.map(e => e[1]),
          backgroundColor: ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444'],
          borderRadius: 8,
          barThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.text,
            padding: 12,
            cornerRadius: 8,
            callbacks: { label: (ctx) => ` ${ctx.parsed.x} unités` }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: c.grid },
            ticks: { color: c.muted, precision: 0 }
          },
          y: { grid: { display: false }, ticks: { color: c.muted } }
        }
      }
    });
  }
}

// ====== INITIALISATION ======
(function init() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

  render();
})();