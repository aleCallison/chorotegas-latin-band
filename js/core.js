(function () {
  const config = window.APP_CONFIG || {};
  const configured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  const client = configured && window.supabase
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    : null;

  const monthNames = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];


  function isLoginPage() {
    const page = location.pathname.split("/").pop() || "";
    return page === "login.html";
  }

  function pageReturnPath() {
    const parts = location.pathname.split("/").filter(Boolean);
    const adminIndex = parts.lastIndexOf("admin");

    if (adminIndex !== -1) {
      return parts.slice(adminIndex).join("/");
    }

    return parts[parts.length - 1] || "index.html";
  }

  function loginPath() {
    return location.pathname.includes("/admin/") ? "../login.html" : "login.html";
  }

  async function enforceGlobalLogin() {
    if (isLoginPage()) return true;

    if (!configured || !client) {
      location.replace(loginPath());
      return false;
    }

    const session = await getSession();

    if (!session) {
      const ret = encodeURIComponent(pageReturnPath());
      location.replace(`${loginPath()}?return=${ret}`);
      return false;
    }

    return true;
  }

  async function personalizePublicNav() {
    const session = await getSession();
    if (!session) return;

    const profile = await getProfile(session.user.id);
    const accountLink = document.querySelector(".nav-login");

    if (accountLink) {
      accountLink.textContent = "Mi cuenta";
      accountLink.href = location.pathname.includes("/admin/") ? "../mi-cuenta.html" : "mi-cuenta.html";
    }

    const nav = document.querySelector("[data-nav]");
    if (nav && !nav.querySelector("[data-nav-logout]")) {
      if (profile && ["admin", "director", "director_banda"].includes(profile.rol) && !nav.querySelector("[data-admin-panel-link]")) {
        const adminLink = document.createElement("a");
        adminLink.href = "admin/index.html";
        adminLink.textContent = "Panel";
        adminLink.dataset.adminPanelLink = "true";
        nav.appendChild(adminLink);
      }

      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.textContent = "Salir";
      logoutLink.dataset.navLogout = "true";
      logoutLink.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await logout();
      });
      nav.appendChild(logoutLink);
    }
  }

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
    if (!configured || !client) {
      location.href = loginPath();
      return null;
    }

    const session = await getSession();

    if (!session) {
      const ret = encodeURIComponent(pageReturnPath());
      location.href = `${loginPath()}?return=${ret}`;
      return null;
    }

    return session;
  }

  async function logout() {
    if (!client) return;
    await client.auth.signOut();
    location.href = location.pathname.includes("/admin/") ? "../login.html" : "login.html";
  }


  function initHomeClock() {
    const currentPage = location.pathname.split("/").pop() || "index.html";
    if (currentPage !== "index.html") return;

    const heroText = document.querySelector(".hero > div:first-child");
    if (!heroText || document.getElementById("clb-live-clock")) return;

    const clock = document.createElement("div");
    clock.id = "clb-live-clock";
    clock.className = "clb-live-clock";
    clock.setAttribute("aria-live", "polite");
    clock.innerHTML = `
      <div class="clb-clock-time" data-clock-time>--:-- --</div>
      <div class="clb-clock-date" data-clock-date>Cargando fecha…</div>
    `;

    const paragraph = heroText.querySelector("p");
    if (paragraph) paragraph.insertAdjacentElement("afterend", clock);
    else heroText.appendChild(clock);

    if (!document.getElementById("clb-clock-styles")) {
      const style = document.createElement("style");
      style.id = "clb-clock-styles";
      style.textContent = `
        .clb-live-clock{
          display:inline-flex;
          flex-direction:column;
          gap:3px;
          margin:18px 0 4px;
          padding:14px 18px;
          border:1px solid rgba(105,227,77,.28);
          border-radius:16px;
          background:rgba(105,227,77,.055);
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          min-width:240px;
        }
        .clb-clock-time{
          font-size:clamp(2rem,5vw,3.35rem);
          line-height:1;
          font-weight:800;
          letter-spacing:-.04em;
          color:#fff;
          font-variant-numeric:tabular-nums;
        }
        .clb-clock-date{
          margin-top:5px;
          font-size:.96rem;
          color:var(--muted,#aab3ad);
          text-transform:capitalize;
        }
        @media (max-width:640px){
          .clb-live-clock{
            width:100%;
            min-width:0;
            text-align:center;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const timeEl = clock.querySelector("[data-clock-time]");
    const dateEl = clock.querySelector("[data-clock-date]");

    const timeFormatter = new Intl.DateTimeFormat("es-HN", {
      timeZone: "America/Tegucigalpa",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    const dateFormatter = new Intl.DateTimeFormat("es-HN", {
      timeZone: "America/Tegucigalpa",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    function updateClock() {
      const now = new Date();
      timeEl.textContent = timeFormatter.format(now).replace(/\s+/g, " ").toUpperCase();
      dateEl.textContent = dateFormatter.format(now);
    }

    updateClock();
    setInterval(updateClock, 1000);
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

  document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await enforceGlobalLogin();
    if (!allowed && !isLoginPage()) return;

    initMenu();
    setActiveNav();
    initHomeClock();

    document.querySelectorAll("[data-logout]").forEach(btn => btn.addEventListener("click", logout));
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

    if (!isLoginPage()) {
      await personalizePublicNav();
    }
  });
})();
