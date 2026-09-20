(function () {
  function ensureFinanceLinks() {
    const nav = document.querySelector(".sidebar-nav");
    if (!nav || nav.querySelector('a[href="reportes.html"]')) return;

    const reference = nav.querySelector('a[href="instrumentos.html"]');
    const html = `
      <a href="reportes.html" data-admin-only>📊 Reportes</a>
      <a href="economia.html" data-admin-only>💰 Economía</a>
    `;

    if (reference) reference.insertAdjacentHTML("beforebegin", html);
    else nav.insertAdjacentHTML("beforeend", html);
  }

  async function initAdmin() {
    ensureFinanceLinks();

    if (!CLB.configured) {
      document.querySelector(".admin-content").innerHTML = `
        <div class="notice info">
          Para usar el panel administrativo debes conectar Supabase.
          Abre <code>js/config.js</code> y agrega la URL y la clave pública del proyecto.
        </div>`;
      return null;
    }

    const session = await CLB.getSession();
    if (!session) {
      location.href = "../login.html";
      return null;
    }

    const profile = await CLB.getProfile(session.user.id);
    if (!profile || !["admin", "director"].includes(profile.rol)) {
      location.href = "../mi-cuenta.html";
      return null;
    }

    document.querySelectorAll("[data-admin-user]").forEach(el => {
      el.textContent = profile.nombre || session.user.email;
    });

    document.querySelectorAll("[data-admin-role]").forEach(el => {
      el.textContent = profile.rol;
    });

    if (profile.rol !== "admin") {
      document.querySelectorAll("[data-admin-only]").forEach(el => el.classList.add("hidden"));
    }

    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".sidebar-nav a").forEach(a => {
      if (a.getAttribute("href") === current) a.classList.add("active");
    });

    return { session, profile };
  }

  function bindSidebar() {
    ensureFinanceLinks();
    const btn = document.querySelector("[data-sidebar-toggle]");
    const sidebar = document.querySelector(".sidebar");
    btn?.addEventListener("click", () => sidebar?.classList.toggle("open"));
  }

  function openModal(id) {
    document.getElementById(id)?.classList.add("open");
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.remove("open");
  }

  document.addEventListener("click", (ev) => {
    const open = ev.target.closest("[data-open-modal]");
    if (open) openModal(open.dataset.openModal);
    const close = ev.target.closest("[data-close-modal]");
    if (close) closeModal(close.dataset.closeModal);
  });

  window.CLBAdmin = { initAdmin, openModal, closeModal };
  document.addEventListener("DOMContentLoaded", bindSidebar);
})();
