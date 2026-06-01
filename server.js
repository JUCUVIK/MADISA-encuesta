const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
require('dotenv').config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'survey.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ─── Data Access Layer (Encapsulated) ─────────────────────────────────────────
const DAO = {
  db: null,
  init: function(dbInstance) { this.db = dbInstance; },
  save: function() { fs.writeFileSync(DB_PATH, Buffer.from(this.db.export())); },
  run: function(sql, params) { return this.db.run(sql, params); },
  exec: function(sql, params) { return this.db.exec(sql, params); },

  migrate: function() {
    let tableInfo = this.exec("PRAGMA table_info(surveys)");
    if (tableInfo.length > 0) {
      const cols = tableInfo[0].values.map(r => r[1]);
      if (!cols.includes('is_public')) {
        this.run("ALTER TABLE surveys ADD COLUMN is_public INTEGER DEFAULT 0");
        console.log("Migration: Added is_public to surveys");
      }
    }
    tableInfo = this.exec("PRAGMA table_info(responses)");
    if (tableInfo.length > 0) {
      const cols = tableInfo[0].values.map(r => r[1]);
      if (!cols.includes('email')) {
        this.run("ALTER TABLE responses ADD COLUMN email TEXT DEFAULT ''");
        console.log("Migration: Added email to responses");
      }
    }
    this.save();
  },

  getAllSurveys: function() {
    const result = this.exec("SELECT * FROM surveys ORDER BY created_at DESC");
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
      const s = {};
      cols.forEach((c, i) => s[c] = row[i]);
      return s;
    });
  },
  
  getSurveyById: function(id) {
    const result = this.exec("SELECT * FROM surveys WHERE id = ?", [id]);
    if (!result.length || !result[0].values.length) return null;
    const cols = result[0].columns;
    const s = {};
    cols.forEach((c, i) => s[c] = result[0].values[0][i]);
    return s;
  },

  getQuestions: function(surveyId) {
    const qRes = this.exec("SELECT * FROM questions WHERE survey_id = ? ORDER BY position", [surveyId]);
    if (!qRes.length) return [];
    const cols = qRes[0].columns;
    return qRes[0].values.map(row => {
      const q = {};
      cols.forEach((c, i) => q[c] = row[i]);
      return q;
    });
  },

  createSurvey: function(surveyId, title, description, isPublic) {
    this.run("INSERT INTO surveys (id, title, description, is_public) VALUES (?, ?, ?, ?)", [surveyId, title, description || '', isPublic ? 1 : 0]);
  },
  
  updateSurvey: function(id, title, description, isPublic) {
    this.run("UPDATE surveys SET title = ?, description = ?, is_public = ? WHERE id = ?", [title, description || '', isPublic ? 1 : 0, id]);
  },

  createQuestion: function(id, surveyId, text, type, position) {
    this.run("INSERT INTO questions (id, survey_id, text, type, position) VALUES (?, ?, ?, ?, ?)", [id, surveyId, text, type || 'scale', position]);
  },
  
  updateQuestion: function(id, text, type, position) {
    this.run("UPDATE questions SET text = ?, type = ?, position = ? WHERE id = ?", [text, type || 'scale', position, id]);
  },

  deleteQuestion: function(id) {
    this.run("DELETE FROM answers WHERE question_id = ?", [id]);
    this.run("DELETE FROM questions WHERE id = ?", [id]);
  },

  createResponse: function(responseId, surveyId, email) {
    this.run("INSERT INTO responses (id, survey_id, email) VALUES (?, ?, ?)", [responseId, surveyId, email]);
  },

  createAnswer: function(id, responseId, questionId, value) {
    this.run("INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)", [id, responseId, questionId, value]);
  },

  deleteSurveyFull: function(id) {
    this.run("DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)", [id]);
    this.run("DELETE FROM responses WHERE survey_id = ?", [id]);
    this.run("DELETE FROM questions WHERE survey_id = ?", [id]);
    this.run("DELETE FROM surveys WHERE id = ?", [id]);
    this.save();
  },

  getResponseCount: function(surveyId) {
    const res = this.exec("SELECT COUNT(*) FROM responses WHERE survey_id = ?", [surveyId]);
    return res[0].values[0][0];
  },

  getQuestionAverageAndCount: function(questionId) {
    const res = this.exec("SELECT AVG(CAST(value AS REAL)), COUNT(*) FROM answers WHERE question_id = ? AND value != ''", [questionId]);
    return { avg: res[0].values[0][0], count: res[0].values[0][1] };
  },

  getQuestionDistribution: function(questionId) {
    const dist = {};
    for (let i = 1; i <= 5; i++) {
      const r = this.exec("SELECT COUNT(*) FROM answers WHERE question_id = ? AND value = ?", [questionId, String(i)]);
      dist[i] = r[0].values[0][0];
    }
    return dist;
  },

  getTextAnswers: function(questionId) {
    const res = this.exec("SELECT value FROM answers WHERE question_id = ? AND value != '' ORDER BY rowid DESC LIMIT 20", [questionId]);
    return res.length > 0 ? res[0].values.map(r => r[0]) : [];
  },

  getIndividualResponses: function(surveyId) {
    const res = this.exec("SELECT id, email, submitted_at FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC", [surveyId]);
    if (!res.length) return [];
    const cols = res[0].columns;
    const responses = res[0].values.map(row => {
      const obj = {};
      cols.forEach((c, i) => obj[c] = row[i]);
      obj.answers = [];
      return obj;
    });

    responses.forEach(r => {
      const ansRes = this.exec("SELECT question_id, value FROM answers WHERE response_id = ?", [r.id]);
      if (ansRes.length) {
        r.answers = ansRes[0].values.map(row => ({ question_id: row[0], value: row[1] }));
      }
    });
    return responses;
  }
};

async function initDB() {
  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  DAO.init(db);

  DAO.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_public INTEGER DEFAULT 0
    )
  `);

  DAO.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('scale','text')),
      position INTEGER NOT NULL,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    )
  `);

  DAO.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email TEXT DEFAULT '',
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    )
  `);

  DAO.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY (response_id) REFERENCES responses(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  DAO.migrate();
  seedDemo();
}

function seedDemo() {
  const surveys = DAO.getAllSurveys();
  if (surveys.length > 0) return;

  const surveyId = uuidv4();
  DAO.createSurvey(surveyId, 'Encuesta de Satisfacción — Madisa', '¡Tu opinión nos ayuda a mejorar! Solo te llevará 2 minutos.', 1);

  const questions = [
    { text: '¿Cómo calificarías tu experiencia con el software de Madisa?', type: 'scale' },
    { text: '¿Qué tan fácil de usar te ha resultado el TPV?', type: 'scale' },
    { text: '¿Cómo valorarías la atención del equipo de soporte?', type: 'scale' },
    { text: '¿Recomendarías Madisa a otros negocios?', type: 'scale' },
    { text: '¿Qué mejorarías de nuestros productos o servicios?', type: 'text' },
    { text: '¿Tienes algún comentario adicional para el equipo de Madisa?', type: 'text' }
  ];

  questions.forEach((q, i) => {
    DAO.createQuestion(uuidv4(), surveyId, q.text, q.type, i + 1);
  });

  DAO.save();
  console.log(`✅ Demo survey created with id: ${surveyId}`);
}

// ─── Routes ───────────────────────────────────────────────────

app.get('/api/surveys', (req, res) => {
  res.json(DAO.getAllSurveys());
});

app.post('/api/surveys', (req, res) => {
  const { title, description, questions, is_public } = req.body;
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'title and questions are required' });
  }
  const surveyId = uuidv4();
  DAO.createSurvey(surveyId, title, description, is_public);
  questions.forEach((q, i) => {
    DAO.createQuestion(uuidv4(), surveyId, q.text, q.type, i + 1);
  });
  DAO.save();
  res.status(201).json({ id: surveyId, title, description, is_public });
});

app.get('/api/surveys/:id', (req, res) => {
  const survey = DAO.getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  survey.questions = DAO.getQuestions(req.params.id);
  res.json(survey);
});

app.post('/api/surveys/:id/responses', (req, res) => {
  const { answers, email } = req.body;
  if (!answers || answers.length === 0) return res.status(400).json({ error: 'answers required' });
  if (!email) return res.status(400).json({ error: 'email is required' });

  const survey = DAO.getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });

  const responseId = uuidv4();
  DAO.createResponse(responseId, req.params.id, email);
  answers.forEach(a => {
    DAO.createAnswer(uuidv4(), responseId, a.question_id, a.value);
  });
  DAO.save();
  res.status(201).json({ response_id: responseId });
});

app.get('/api/surveys/:id/results', (req, res) => {
  const survey = DAO.getSurveyById(req.params.id);
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  
  const isAdmin = req.query.admin === 'true';

  if (!survey.is_public && !isAdmin) {
    return res.status(403).json({ error: 'Survey results are private. Admin access required.' });
  }

  survey.total_responses = DAO.getResponseCount(req.params.id);
  const questions = DAO.getQuestions(req.params.id);

  survey.questions = questions.map(q => {
    if (q.type === 'scale') {
      const stats = DAO.getQuestionAverageAndCount(q.id);
      q.average = stats.avg ? Math.round(stats.avg * 10) / 10 : 0;
      q.count = stats.count;
      q.distribution = DAO.getQuestionDistribution(q.id);
    } else {
      q.answers = DAO.getTextAnswers(q.id);
    }
    return q;
  });

  if (isAdmin) {
    survey.individual_responses = DAO.getIndividualResponses(req.params.id);
  }

  res.json(survey);
});

app.put('/api/surveys/:id', (req, res) => {
  const { title, description, questions, is_public } = req.body;
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'title and questions are required' });
  }

  const surveyCheck = DAO.getSurveyById(req.params.id);
  if (!surveyCheck) return res.status(404).json({ error: 'Survey not found' });

  DAO.updateSurvey(req.params.id, title, description, is_public);

  const existingQs = DAO.getQuestions(req.params.id);
  const existingIds = existingQs.map(q => q.id);
  const incomingIds = questions.filter(q => q.id).map(q => q.id);

  existingIds.forEach(eid => {
    if (!incomingIds.includes(eid)) DAO.deleteQuestion(eid);
  });

  questions.forEach((q, i) => {
    if (q.id && existingIds.includes(q.id)) {
      DAO.updateQuestion(q.id, q.text, q.type, i + 1);
    } else {
      DAO.createQuestion(uuidv4(), req.params.id, q.text, q.type, i + 1);
    }
  });

  DAO.save();
  res.json({ id: req.params.id, title, description, is_public });
});

app.delete('/api/surveys/:id', (req, res) => {
  DAO.deleteSurveyFull(req.params.id);
  res.json({ deleted: true });
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || "admin123"; 
  if (password === adminPass) {
    res.json({ success: true, token: "admin-token-123" });
  } else {
    res.status(401).json({ success: false, error: "Contraseña incorrecta" });
  }
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
});
