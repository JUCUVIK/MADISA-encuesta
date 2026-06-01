// ─── User Portal ───────────────────────────────────────────────────────────────
function renderUserPortal(app) {
  app.innerHTML = `
    <nav class="nav nav-user">
      <a href="/" onclick="Router.navigate('/'); return false;" class="nav-brand">
        <img src="https://madisa.es/assets/logo-footer.svg" class="nav-logo" alt="Madisa"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <span style="display:none;color:white;font-weight:800;font-size:1.2rem;letter-spacing:-0.02em;">madisa</span>
        <span class="nav-tagline">Opinión</span>
      </a>
      <div class="nav-links">
      </div>
    </nav>
    <div class="page" id="user-portal">
      <div class="loading"><div class="spinner"></div><span>Cargando encuestas…</span></div>
    </div>
  `;

  API.getSurveys().then(surveys => {
    const page = document.getElementById('user-portal');

    if (surveys.length === 0) {
      page.innerHTML = `
        <div class="user-hero">
          <div class="user-hero-eyebrow">Tu opinión importa</div>
          <h1>Encuestas de satisfacción</h1>
          <p>Ayúdanos a mejorar compartiendo tu experiencia. Solo te llevará unos minutos.</p>
        </div>
        <div class="empty-state" style="padding:48px 24px;">
          <div class="empty-icon">📋</div>
          <h3>No hay encuestas disponibles</h3>
          <p>Vuelve pronto, pronto tendremos encuestas para ti.</p>
        </div>
      `;
      return;
    }

    page.innerHTML = `
      <div class="user-hero">
        <div class="user-hero-eyebrow">Tu opinión importa</div>
        <h1>Encuestas de satisfacción</h1>
        <p>Selecciona una encuesta y comparte tu experiencia con nosotros. ¡Gracias por tu tiempo!</p>
      </div>
      <div class="user-surveys-list" id="user-surveys-list">
        ${surveys.map((s, i) => `
          <div class="user-survey-card" style="animation-delay:${i * 0.07}s" onclick="Router.navigate('/survey/${s.id}')">
            <div class="user-survey-card-icon">📝</div>
            <div class="user-survey-card-body">
              <h3>${escHtml(s.title)}</h3>
              ${s.description ? `<p>${escHtml(s.description)}</p>` : ''}
            </div>
            <div class="user-survey-card-arrow">→</div>
          </div>
        `).join('')}
      </div>
    `;
  }).catch(e => {
    document.getElementById('user-portal').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error al cargar</h3>
        <p>${e.message}</p>
      </div>
    `;
  });
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
