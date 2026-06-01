// Register routes
Router.register('/survey/:id', renderSurveyPage);
Router.register('/results/:id', renderResultsPage);
Router.register('/admin/login', renderLoginPage);
Router.register('/admin', renderAdminPage);
Router.register('/admin/edit/:id', renderEditPage);
Router.register('/', renderUserPortal);

// Toast utility (global)
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 3000);
}

// Boot — detect portal by path
Router.render(location.pathname || '/');
