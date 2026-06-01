// ─── Edit Survey Page ──────────────────────────────────────────────────────────
function renderEditPage(app, params) {
  app.innerHTML = `
    <nav class="nav">
      <a href="/admin" onclick="Router.navigate('/admin'); return false;" class="nav-brand">
        <img src="https://madisa.es/assets/logo-header.svg" class="nav-logo" alt="Madisa"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <span style="display:none;color:white;font-weight:800;font-size:1.2rem;">madisa</span>
        <span class="nav-tagline">Satisfacción</span>
      </a>
      <div class="nav-links">
        <button class="btn btn-ghost" onclick="Router.navigate('/admin')">← Panel</button>
      </div>
    </nav>
    <div class="page" id="edit-page">
      <div class="loading"><div class="spinner"></div><span>Cargando encuesta…</span></div>
    </div>
  `;

  API.getSurvey(params.id).then(survey => {
    const page = document.getElementById('edit-page');

    page.innerHTML = `
      <div class="admin-hero">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <span style="background:var(--accent-glow);color:var(--accent);border:1px solid rgba(0,170,255,0.3);border-radius:50px;padding:3px 12px;font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Editando</span>
        </div>
        <h1>Editar encuesta</h1>
        <p>Modifica el título, descripción o preguntas. Los datos ya enviados se conservarán.</p>
      </div>

      <div class="create-section">
        <div class="form-group">
          <label class="form-label">Título</label>
          <input class="form-input" id="edit-title" type="text" value="${escHtml(survey.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Descripción (opcional)</label>
          <input class="form-input" id="edit-desc" type="text" value="${escHtml(survey.description || '')}">
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="edit-public" style="width:16px; height:16px; cursor:pointer;" ${survey.is_public ? 'checked' : ''}>
          <label class="form-label" style="margin:0; cursor:pointer;" for="edit-public">Hacer resultados públicos</label>
        </div>
        <div class="questions-builder">
          <div class="questions-builder-title">Preguntas</div>
          <div id="edit-questions-list"></div>
          <button class="add-question-btn" id="edit-add-q-btn" type="button">+ Añadir pregunta</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
          <button class="btn btn-accent btn-lg" id="save-btn">Guardar cambios</button>
          <button class="btn btn-outline" onclick="Router.navigate('/admin')">Cancelar</button>
        </div>
      </div>
    `;

    // Pre-fill existing questions
    survey.questions.forEach(q => addEditQuestion(q.text, q.type, q.id));

    document.getElementById('edit-add-q-btn').addEventListener('click', () => addEditQuestion('', 'scale', null));
    document.getElementById('save-btn').addEventListener('click', () => handleSave(params.id));

  }).catch(e => {
    document.getElementById('edit-page').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>No se pudo cargar la encuesta</h3>
        <p>${e.message}</p>
        <br><button class="btn btn-primary" onclick="Router.navigate('/admin')">Volver</button>
      </div>
    `;
  });
}

function addEditQuestion(text = '', type = 'scale', existingId = null) {
  const list = document.getElementById('edit-questions-list');
  if (!list) return;
  const rowId = 'eqrow_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const row = document.createElement('div');
  row.className = 'question-row';
  row.id = rowId;
  if (existingId) row.dataset.questionId = existingId;
  row.innerHTML = `
    <input class="form-input" type="text" placeholder="Escribe la pregunta aquí…" value="${escHtml(text)}">
    <select class="question-type-select">
      <option value="scale" ${type === 'scale' ? 'selected' : ''}>⭐ Escala 1-5</option>
      <option value="text"  ${type === 'text'  ? 'selected' : ''}>✏️ Texto libre</option>
    </select>
    <button class="btn-remove-q" type="button" title="Eliminar pregunta">×</button>
  `;
  row.querySelector('.btn-remove-q').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

async function handleSave(surveyId) {
  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-desc').value.trim();
  const rows = document.querySelectorAll('#edit-questions-list .question-row');
  const questions = [];

  rows.forEach(row => {
    const text = row.querySelector('input').value.trim();
    const type = row.querySelector('select').value;
    const id = row.dataset.questionId || null;
    if (text) questions.push({ text, type, id });
  });

  const is_public = document.getElementById('edit-public').checked;

  if (!title)              { showToast('⚠️ Escribe un título'); return; }
  if (questions.length === 0) { showToast('⚠️ Añade al menos una pregunta'); return; }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    await API.updateSurvey(surveyId, { title, description, questions, is_public });
    showToast('✅ Encuesta actualizada');
    Router.navigate('/results/' + surveyId);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
    showToast('⚠️ Error: ' + e.message);
  }
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
