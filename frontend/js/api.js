const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error del servidor');
    }
    return res.json();
  }

  return {
    getSurveys: () => request('GET', '/surveys'),
    getSurvey: (id) => request('GET', `/surveys/${id}`),
    createSurvey: (data) => request('POST', '/surveys', data),
    updateSurvey: (id, data) => request('PUT', `/surveys/${id}`, data),
    deleteSurvey: (id) => request('DELETE', `/surveys/${id}`),
    submitResponse: (id, answers, email) => request('POST', `/surveys/${id}/responses`, { answers, email }),
    getResults: (id) => {
      const isAdmin = sessionStorage.getItem("admin_auth") === "true";
      return request('GET', `/surveys/${id}/results${isAdmin ? '?admin=true' : ''}`);
    },
    loginAdmin: (password) => request('POST', '/admin/login', { password }),
  };
})();
