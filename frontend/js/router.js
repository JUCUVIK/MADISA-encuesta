const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function register(pattern, handler) {
    routes[pattern] = handler;
  }

  function match(path) {
    for (const pattern of Object.keys(routes)) {
      const regexStr = pattern.replace(/:([^/]+)/g, '([^/]+)');
      const regex = new RegExp(`^${regexStr}$`);
      const m = path.match(regex);
      if (m) {
        const keys = [...pattern.matchAll(/:([^/]+)/g)].map(x => x[1]);
        const params = {};
        keys.forEach((k, i) => (params[k] = m[i + 1]));
        return { handler: routes[pattern], params };
      }
    }
    return null;
  }

  function navigate(path) {
    history.pushState({}, '', path);
    render(path);
  }

  function render(path) {
    const result = match(path);
    const app = document.getElementById('app');
    if (result) {
      currentRoute = path;
      result.handler(app, result.params);
    } else {
      app.innerHTML = `
        <div class="page">
          <div class="empty-state">
            <div class="empty-icon">🗺️</div>
            <h3>Página no encontrada</h3>
            <p>La ruta <code>${path}</code> no existe.</p>
            <br>
            <a href="/admin" onclick="Router.navigate('/admin'); return false;" class="btn btn-primary">
              Ir al inicio
            </a>
          </div>
        </div>
      `;
    }
  }

  window.addEventListener('popstate', () => render(location.pathname));

  return { register, navigate, render };
})();
