(function () {
  async function redirectAfterLogin() {
    location.href = "index.html";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const setup = document.getElementById("setup-auth");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");

    if (!CLB.configured) {
      setup?.classList.remove("hidden");
      loginForm?.classList.add("hidden");
      registerForm?.classList.add("hidden");
      return;
    }

    const session = await CLB.getSession();
    if (session) {
      await redirectAfterLogin(session.user);
      return;
    }

    function showTab(tab) {
      const login = tab === "login";
      loginForm.classList.toggle("hidden", !login);
      registerForm.classList.toggle("hidden", login);
      tabLogin.classList.toggle("active", login);
      tabRegister.classList.toggle("active", !login);
    }

    tabLogin.addEventListener("click", () => showTab("login"));
    tabRegister.addEventListener("click", () => showTab("register"));

    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = loginForm.querySelector("button[type=submit]");
      CLB.setLoading(btn, true);

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      const { data, error } = await CLB.client.auth.signInWithPassword({ email, password });
      CLB.setLoading(btn, false);

      if (error) {
        CLB.toast(error.message, "error");
        return;
      }

      CLB.toast("Sesión iniciada.", "success");
      await redirectAfterLogin(data.user);
    });

    registerForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = registerForm.querySelector("button[type=submit]");
      CLB.setLoading(btn, true);

      const nombre = document.getElementById("register-name").value.trim();
      const apellido = document.getElementById("register-lastname").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const seccion = document.getElementById("register-section").value;

      if (!nombre || !apellido) {
        CLB.setLoading(btn, false);
        CLB.toast("Nombre y apellido son obligatorios.", "error");
        return;
      }

      const allowedSections = [
        "Sección de Viento",
        "Percusión",
        "Cuadros Artísticos",
        "Otro"
      ];

      if (!allowedSections.includes(seccion)) {
        CLB.setLoading(btn, false);
        CLB.toast("Selecciona una sección válida.", "error");
        return;
      }

      const { data, error } = await CLB.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            apellido,
            seccion
          }
        }
      });

      CLB.setLoading(btn, false);

      if (error) {
        CLB.toast(error.message, "error");
        return;
      }

      if (data.session) {
        CLB.toast("Cuenta creada.", "success");
        await redirectAfterLogin(data.user);
      } else {
        CLB.toast("Cuenta creada. Revisa tu correo para confirmar el acceso.", "success");
        showTab("login");
      }
    });
  });
})();
