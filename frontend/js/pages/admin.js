// ─── Madisa nav helper ────────────────────────────────────────────────────────
function madisaNav(extraLinks = '') {
  return `
    <nav class="nav">
      <a href="/admin" onclick="Router.navigate('/admin'); return false;" class="nav-brand">
        <img src="https://madisa.es/assets/logo-header.svg" class="nav-logo" alt="Madisa"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <span style="display:none;color:white;font-weight:800;font-size:1.2rem;letter-spacing:-0.02em;">madisa</span>
        <span class="nav-tagline">Admin</span>
      </a>
      <div class="nav-links">
        <a href="/" onclick="Router.navigate('/'); return false;" class="btn btn-ghost-dark" style="font-size:0.78rem;">Portal usuarios →</a>
        ${extraLinks}
      </div>
    </nav>
  `;
}

// ─── Admin page ───────────────────────────────────────────────────────────────
function renderAdminPage(app) {
  // Check auth
  if (sessionStorage.getItem('admin_auth') !== 'true') {
    Router.navigate('/admin/login');
    return;
  }

  app.innerHTML = madisaNav() + `
    <div class="page-wide" id="admin-page">
      <div class="loading"><div class="spinner"></div><span>Cargando panel…</span></div>
    </div>
  `;

  API.getSurveys().then(surveys => {
    const page = document.getElementById('admin-page');

    page.innerHTML = `
      <div class="admin-hero">
        <h1>Panel de encuestas</h1>
        <p>Crea y gestiona encuestas de satisfacción. Visualiza resultados en tiempo real.</p>
      </div>

      <div class="surveys-grid" id="surveys-grid">
        ${surveys.length === 0
          ? `<div class="empty-state" style="padding:36px 24px;">
               <div class="empty-icon">📋</div>
               <h3>Sin encuestas todavía</h3>
               <p>Crea tu primera encuesta en el formulario de abajo.</p>
             </div>`
          : surveys.map(s => renderSurveyItem(s)).join('')
        }
      </div>

      <div class="create-section">
        <h2>Nueva encuesta</h2>
        <div class="form-group">
          <label class="form-label">Título</label>
          <input class="form-input" id="new-title" type="text" placeholder="Ej: Satisfacción con el TPV">
        </div>
        <div class="form-group">
          <label class="form-label">Descripción (opcional)</label>
          <input class="form-input" id="new-desc" type="text" placeholder="Ej: Queremos conocer tu experiencia con nuestro servicio">
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="new-public" style="width:16px; height:16px; cursor:pointer;">
          <label class="form-label" style="margin:0; cursor:pointer;" for="new-public">Hacer resultados públicos</label>
        </div>
        <div class="questions-builder">
          <div class="questions-builder-title">Preguntas</div>
          <div id="questions-list"></div>
          <button class="add-question-btn" id="add-q-btn" type="button">
            + Añadir pregunta
          </button>
        </div>
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button class="btn btn-accent btn-lg" id="create-btn">Crear encuesta</button>
        </div>
      </div>
    `;

    // ⚠️ FIX: attachar listeners DESPUÉS de que el innerHTML esté en el DOM
    addQuestion('¿Cómo calificarías tu experiencia con Madisa?', 'scale');
    addQuestion('¿Qué tan probable es que nos recomiendes?', 'scale');
    addQuestion('¿Cómo valorarías la atención recibida?', 'scale');
    addQuestion('¿Qué podríamos mejorar?', 'text');

    document.getElementById('add-q-btn').addEventListener('click', () => addQuestion('', 'scale'));
    document.getElementById('create-btn').addEventListener('click', handleCreate);
  }).catch(e => {
    document.getElementById('admin-page').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error al cargar</h3>
        <p>${e.message}</p>
      </div>
    `;
  });
}

// ─── Survey item row ──────────────────────────────────────────────────────────
function renderSurveyItem(s) {
  return `
    <div class="survey-item" id="si-${s.id}">
      <div class="survey-item-info">
        <h3>${escHtml(s.title)}</h3>
        <p>${s.description ? escHtml(s.description) : 'Sin descripción'} &nbsp;·&nbsp; ${formatDate(s.created_at)} ${s.is_public ? '&nbsp;·&nbsp; 🌍 Pública' : '&nbsp;·&nbsp; 🔒 Privada'}</p>
      </div>
      <div class="survey-item-actions">
        <button class="btn btn-outline" onclick="Router.navigate('/admin/edit/${s.id}')">✏️ Editar</button>
        <button class="btn btn-primary" onclick="Router.navigate('/results/${s.id}')">Resultados</button>
        <button class="btn btn-ghost-dark" onclick="copyLink('${location.origin}/survey/${s.id}')" title="Copiar link usuario">🔗</button>
        <button class="btn btn-ghost-dark" style="color:#d93025" onclick="deleteSurvey('${s.id}')" title="Eliminar">🗑</button>
      </div>
    </div>
  `;
}

// ─── Add question row ─────────────────────────────────────────────────────────
function addQuestion(text = '', type = 'scale') {
  const list = document.getElementById('questions-list');
  if (!list) return; // guard: si el DOM no está listo aún
  const id = 'qrow_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const row = document.createElement('div');
  row.className = 'question-row';
  row.id = id;
  row.innerHTML = `
    <input class="form-input" type="text" placeholder="Escribe la pregunta aquí…" value="${escHtml(text)}">
    <select class="question-type-select">
      <option value="scale" ${type === 'scale' ? 'selected' : ''}>⭐ Escala 1-5</option>
      <option value="text"  ${type === 'text'  ? 'selected' : ''}>✏️ Texto libre</option>
    </select>
    <button class="btn-remove-q" type="button" title="Eliminar pregunta">×</button>
  `;
  // Usar evento en el botón, no onclick con ID (más robusto)
  row.querySelector('.btn-remove-q').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

// ─── Create survey ────────────────────────────────────────────────────────────
async function handleCreate() {
  const title = document.getElementById('new-title').value.trim();
  const description = document.getElementById('new-desc').value.trim();
  const rows = document.querySelectorAll('#questions-list .question-row');
  const questions = [];

  rows.forEach(row => {
    const text = row.querySelector('input').value.trim();
    const type = row.querySelector('select').value;
    if (text) questions.push({ text, type });
  });

  const is_public = document.getElementById('new-public').checked;

  if (!title)              { showToast('⚠️ Escribe un título'); return; }
  if (questions.length === 0) { showToast('⚠️ Añade al menos una pregunta'); return; }

  const btn = document.getElementById('create-btn');
  btn.disabled = true;
  btn.textContent = 'Creando…';

  try {
    const survey = await API.createSurvey({ title, description, questions, is_public });
    showToast('✅ Encuesta creada');
    Router.navigate('/results/' + survey.id);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Crear encuesta';
    showToast('⚠️ Error: ' + e.message);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteSurvey(id) {
  if (!confirm('¿Eliminar esta encuesta y todos sus datos?')) return;
  try {
    await API.deleteSurvey(id);
    const el = document.getElementById('si-' + id);
    if (el) { el.style.opacity = '0'; el.style.transform = 'scale(0.95)'; el.style.transition = '0.2s'; setTimeout(() => el.remove(), 200); }
    showToast('🗑️ Encuesta eliminada');
  } catch (e) {
    showToast('⚠️ Error: ' + e.message);
  }
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => showToast('✅ Link copiado'));
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
