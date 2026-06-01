function renderLoginPage(app) { 
  app.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background-color: var(--page-bg);">
      <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 300px; text-align: center;">
        <img src="https://madisa.es/assets/logo-header.svg" alt="Madisa" style="width: 150px; margin-bottom: 1.5rem;">
        <h2 style="margin-bottom: 1rem; color: #333;">Login Admin</h2>
        <input type="password" id="admin-pwd" placeholder="Contraseña" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        <button id="login-btn" class="btn btn-primary" style="width: 100%;">Entrar</button>
        <p id="login-error" style="color: red; font-size: 0.8rem; margin-top: 0.5rem; display: none;">Contraseña incorrecta</p>
      </div>
    </div>
  `;

  document.getElementById("login-btn").addEventListener("click", async () => {
    const pwd = document.getElementById("admin-pwd").value;
    try {
      await API.loginAdmin(pwd);
      sessionStorage.setItem("admin_auth", "true");
      Router.navigate("/admin");
    } catch (e) {
      document.getElementById("login-error").style.display = "block";
    }
  });
}
