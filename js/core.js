(function () {
  const config = window.APP_CONFIG || {};
  const configured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  const client = configured && window.supabase
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    : null;

  const monthNames = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value, options = { day: "2-digit", month: "long", year: "numeric" }) {
    if (!value) return "Sin fecha";
    const d = new Date(value + (String(value).length === 10 ? "T12:00:00" : ""));
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("es-HN", options).format(d);
  }

  function formatDateTime(date, time) {
    if (!date) return "Sin fecha";
    const base = formatDate(date);
    return time ? `${base} · ${time.slice(0,5)}` : base;
  }

  function dateBox(value) {
    if (!value) return { day: "--", month: "---" };
    const d = new Date(value + "T12:00:00");
    return { day: String(d.getDate()).padStart(2, "0"), month: monthNames[d.getMonth()] };
  }

  function toast(message, type = "") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.className = `toast ${type}`.trim();
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function setLoading(el, loading) {
    if (!el) return;
    el.classList.toggle("loading", loading);
    if ("disabled" in el) el.disabled = loading;
  }

  function showSetupNotice(targetId) {
    const target = document.getElementById(targetId);
    if (!target || configured) return;
    target.innerHTML = `
      <div class="notice info">
        <strong>Modo demostración:</strong> la interfaz está lista, pero Supabase aún no está conectado.
        Configura <code>js/config.js</code> para usar datos reales.
      </div>`;
  }

  function initMenu() {
    const btn = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => nav.classList.toggle("open"));
  }

  function setActiveNav() {
    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a").forEach(a => {
      const href = a.getAttribute("href");
      if (href && href.split("/").pop() === current) a.classList.add("active");
    });
  }

  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function getProfile(userId) {
    if (!client || !userId) return null;
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return data;
  }

  async function requireAuth() {
    if (!configured) {
      location.href = "login.html";
      return null;
    }
    const session = await getSession();
    if (!session) {
      const ret = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
      location.href = `login.html?return=${ret}`;
      return null;
    }
    return session;
  }

  async function logout() {
    if (!client) return;
    await client.auth.signOut();
    location.href = location.pathname.includes("/admin/") ? "../login.html" : "login.html";
  }

  window.CLB = {
    client,
    configured,
    escapeHTML,
    formatDate,
    formatDateTime,
    dateBox,
    toast,
    setLoading,
    showSetupNotice,
    getSession,
    getProfile,
    requireAuth,
    logout
  };

  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    setActiveNav();
    document.querySelectorAll("[data-logout]").forEach(btn => btn.addEventListener("click", logout));
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  });
})();
