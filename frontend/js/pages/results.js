function renderResultsPage(app, params) {
  const isAdmin = sessionStorage.getItem('admin_auth') === 'true';
  const brandLink = isAdmin ? '/admin' : '/';
  const backBtn = isAdmin ? `<button class="btn btn-ghost" onclick="Router.navigate('/admin')">← Panel</button>` : `<button class="btn btn-ghost" onclick="Router.navigate('/')">← Volver</button>`;

  app.innerHTML = `
    <nav class="nav">
      <a href="${brandLink}" onclick="Router.navigate('${brandLink}'); return false;" class="nav-brand">
        <img src="https://madisa.es/assets/logo-header.svg" class="nav-logo" alt="Madisa"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <span style="display:none;color:white;font-weight:800;font-size:1.2rem;">madisa</span>
        <span class="nav-tagline">Satisfacción</span>
      </a>
      <div class="nav-links">
        ${backBtn}
      </div>
    </nav>
    <div class="page-wide" id="results-page">
      <div class="loading"><div class="spinner"></div><span>Cargando resultados…</span></div>
    </div>
  `;

  API.getResults(params.id).then(data => {
    const page = document.getElementById('results-page');
    const scaleQs = data.questions.filter(q => q.type === 'scale');
    const avgAll = scaleQs.length > 0
      ? (scaleQs.reduce((s, q) => s + q.average, 0) / scaleQs.length).toFixed(1)
      : '—';

    page.innerHTML = `
      <div class="results-header">
        <div class="eyebrow">Dashboard · Resultados en tiempo real</div>
        <h1>${escHtml(data.title)}</h1>
        <div style="display:flex;gap:9px;flex-wrap:wrap;">
          <button class="btn btn-accent" onclick="Router.navigate('/survey/${data.id}')">🔗 Abrir encuesta</button>
          <button class="btn btn-outline" onclick="copyLink('${location.origin}/survey/${data.id}')">📋 Copiar link</button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">${data.total_responses}</div>
          <div class="stat-label">Respuestas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value accent">${avgAll}</div>
          <div class="stat-label">Puntuación media</div>
        </div>
        <div class="stat-card">
          <div class="stat-value green">${data.questions.length}</div>
          <div class="stat-label">Preguntas</div>
        </div>
      </div>

      <div id="q-results">
        ${data.questions.map(q => renderQuestionResult(q, data.total_responses)).join('')}
      </div>

      ${data.individual_responses ? renderIndividualResponses(data.individual_responses, data.questions) : ''}
    `;

    // Animate bars
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar-fill[data-pct]').forEach(el => {
        setTimeout(() => { el.style.width = el.dataset.pct + '%'; }, 120);
      });
    });
  }).catch(e => {
    document.getElementById('results-page').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>No se pudieron cargar los resultados</h3>
        <p>${e.message}</p>
        <br><button class="btn btn-primary" onclick="Router.navigate('/admin')">Volver</button>
      </div>
    `;
  });
}

function renderQuestionResult(q, total) {
  if (q.type === 'scale') {
    const maxCount = Math.max(...Object.values(q.distribution), 1);
    const bars = [5,4,3,2,1].map(v => {
      const count = q.distribution[v] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barPct = Math.round((count / maxCount) * 100);
      return `
        <div class="scale-result-row">
          <div class="scale-result-label">${moodEmoji(v)} ${v}</div>
          <div class="bar-track"><div class="bar-fill" data-pct="${barPct}" style="width:0%"></div></div>
          <div class="bar-count">${count} <span style="color:#a0aec0;font-size:0.72rem;">(${pct}%)</span></div>
        </div>
      `;
    }).join('');

    const starsFull = Math.round(q.average);
    const starsStr = '★'.repeat(starsFull) + '☆'.repeat(5 - starsFull);

    return `
      <div class="result-card">
        <h3>${escHtml(q.text)}</h3>
        <div class="average-badge">
          <span style="letter-spacing:2px;color:var(--accent)">${starsStr}</span>
          ${q.average} / 5 &nbsp;·&nbsp; ${q.count} votos
        </div>
        ${bars}
      </div>
    `;
  } else {
    const items = q.answers.length > 0
      ? q.answers.map((a, i) =>
          `<div class="text-answer-item" style="animation-delay:${i*0.04}s">${escHtml(a)}</div>`
        ).join('')
      : `<p class="no-answers">Sin respuestas de texto aún.</p>`;

    return `
      <div class="result-card">
        <h3>${escHtml(q.text)}</h3>
        <details>
          <summary style="cursor: pointer; color: var(--accent); font-weight: 600; margin-bottom: 8px; outline: none; user-select: none;">Ver ${q.answers.length} respuestas</summary>
          <div class="text-answers-list" style="margin-top: 10px;">${items}</div>
        </details>
      </div>
    `;
  }
}

function renderIndividualResponses(responses, questions) {
  if (responses.length === 0) return '<div class="result-card"><h3>Respuestas individuales</h3><p class="no-answers">Aún no hay respuestas.</p></div>';

  const qMap = {};
  questions.forEach(q => qMap[q.id] = q.text);

  const list = responses.map(r => {
    const answersHtml = r.answers.map(a => `
      <div style="margin-bottom: 8px;">
        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${escHtml(qMap[a.question_id] || 'Pregunta eliminada')}</div>
        <div style="font-size: 0.85rem; color: #1e293b;">${escHtml(a.value)}</div>
      </div>
    `).join('');

    return `
      <div class="result-card" style="margin-bottom: 1rem; border-left: 3px solid var(--accent);">
        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          <div style="font-weight: 700; color: #0f172a;">${escHtml(r.email || 'Anónimo')}</div>
          <div style="font-size: 0.7rem; color: #94a3b8;">${new Date(r.submitted_at + 'Z').toLocaleString()}</div>
        </div>
        ${answersHtml || '<div style="font-size: 0.85rem; color: #64748b;">Sin respuestas.</div>'}
      </div>
    `;
  }).join('');

  return `
    <div style="margin-top: 2rem;">
      <h2 style="margin-bottom: 1rem; font-size: 1.2rem; color: #1e293b;">Respuestas Individuales</h2>
      ${list}
    </div>
  `;
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => showToast('✅ Link copiado'));
}

function moodEmoji(v) { return ['😞','😐','🙂','😊','🤩'][v-1]; }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
