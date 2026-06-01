function userNav(extraLinks = '') {
  return `
    <nav class="nav nav-user">
      <a href="/" onclick="Router.navigate('/'); return false;" class="nav-brand">
        <img src="https://madisa.es/assets/logo-footer.svg" class="nav-logo" alt="Madisa"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <span style="display:none;color:white;font-weight:800;font-size:1.2rem;">madisa</span>
        <span class="nav-tagline">Opinión</span>
      </a>
      <div class="nav-links">${extraLinks}</div>
    </nav>
  `;
}

function renderSurveyPage(app, params) {
  app.innerHTML = userNav() + `
    <div class="page" id="survey-page">
      <div class="loading"><div class="spinner"></div><span>Cargando encuesta…</span></div>
    </div>
  `;

  API.getSurvey(params.id).then(survey => {
    const page = document.getElementById('survey-page');

    page.innerHTML = `
      <a class="survey-back-link" onclick="Router.navigate('/')">← Volver a encuestas</a>
      <div class="survey-header">
        <div class="logo-wrap">
          <div class="logo-badge">
            <img src="https://madisa.es/assets/logo-header.svg" alt="Madisa"
                 onerror="this.outerHTML='<span style=\'color:white;font-weight:800;font-size:1rem;\'>madisa</span>'">
          </div>
        </div>
        <div class="eyebrow">Encuesta de satisfacción</div>
        <h1>${escHtml(survey.title)}</h1>
        ${survey.description ? `<p>${escHtml(survey.description)}</p>` : ''}
      </div>

      <div class="progress-wrap">
        <div class="progress-label">
          <span id="prog-text">0 de ${survey.questions.length} respondidas</span>
          <span id="prog-pct">0%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" id="prog-fill" style="width:0%"></div></div>
      </div>

      <div class="question-card" style="animation-delay:0s; border-left: 3px solid var(--accent);">
        <div class="question-num">Requerido</div>
        <div class="question-text">¿Cuál es tu correo electrónico?</div>
        <input type="email" class="form-input" id="survey-email" placeholder="Ej: usuario@gmail.com" required>
      </div>

      <div id="questions-container"></div>

      <div class="form-actions">
        <button class="btn btn-accent btn-lg" id="submit-btn">Enviar respuestas →</button>
      </div>
    `;

    const answers = {};
    const container = document.getElementById('questions-container');

    survey.questions.forEach((q, i) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      card.style.animationDelay = `${i * 0.06}s`;

      if (q.type === 'scale') {
        card.innerHTML = `
          <div class="question-num">Pregunta ${i + 1} de ${survey.questions.length}</div>
          <div class="question-text">${escHtml(q.text)}</div>
          <div class="scale-wrap">
            ${[1,2,3,4,5].map(v => `
              <input type="radio" name="q_${q.id}" id="q_${q.id}_${v}" value="${v}" class="scale-option">
              <label for="q_${q.id}_${v}" class="scale-label">
                <span class="star-icon">${moodEmoji(v)}</span>
                <span class="star-num">${v}</span>
              </label>
            `).join('')}
          </div>
        `;
        card.querySelectorAll('.scale-option').forEach(radio => {
          radio.addEventListener('change', () => { answers[q.id] = radio.value; updateProgress(); });
        });
      } else {
        card.innerHTML = `
          <div class="question-num">Pregunta ${i + 1} de ${survey.questions.length}</div>
          <div class="question-text">${escHtml(q.text)}</div>
          <textarea class="survey-textarea" placeholder="Escribe tu respuesta aquí…" id="ta_${q.id}"></textarea>
        `;
        const ta = card.querySelector('textarea');
        ta.addEventListener('input', () => { answers[q.id] = ta.value; updateProgress(); });
      }
      container.appendChild(card);
    });

    function updateProgress() {
      const filled = survey.questions.filter(q => answers[q.id] !== undefined && String(answers[q.id]).trim() !== '').length;
      const pct = Math.round((filled / survey.questions.length) * 100);
      document.getElementById('prog-fill').style.width = pct + '%';
      document.getElementById('prog-pct').textContent = pct + '%';
      document.getElementById('prog-text').textContent = `${filled} de ${survey.questions.length} respondidas`;
    }

    document.getElementById('submit-btn').addEventListener('click', async () => {
      const email = document.getElementById('survey-email').value.trim();
      if (!email || !email.includes('@')) {
        showToast('⚠️ Por favor, ingresa un correo electrónico válido');
        return;
      }

      const btn = document.getElementById('submit-btn');
      const answersArr = survey.questions.map(q => ({ question_id: q.id, value: answers[q.id] || '' }));
      btn.disabled = true;
      btn.textContent = 'Enviando…';

      try {
        await API.submitResponse(survey.id, answersArr, email);
        page.innerHTML = `
          <div class="thankyou">
            <div class="thankyou-icon">🎉</div>
            <h2>¡Gracias por tu opinión!</h2>
            <p>Tu respuesta ha sido registrada correctamente.<br>En Madisa valoramos mucho tu feedback.</p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="Router.navigate('/survey/${survey.id}')">Responder de nuevo</button>
              ${survey.is_public || sessionStorage.getItem('admin_auth') === 'true' ? `<button class="btn btn-outline" onclick="Router.navigate('/results/${survey.id}')">Ver resultados</button>` : ''}
            </div>
          </div>
        `;
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Enviar respuestas →';
        showToast('⚠️ Error al enviar: ' + e.message);
      }
    });

  }).catch(e => {
    document.getElementById('survey-page').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>Encuesta no encontrada</h3>
        <p>${e.message}</p>
        <br>
        <button class="btn btn-primary" onclick="Router.navigate('/admin')">Volver</button>
      </div>
    `;
  });
}

function moodEmoji(v) { return ['😞','😐','🙂','😊','🤩'][v-1]; }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
