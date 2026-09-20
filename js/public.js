(function () {
  const demo = {
    integrantes: [
      { nombres: "Carlos", apellidos: "Mendoza", seccion: "Saxofones", foto_url: "", instrumentos: { nombre: "Saxofón tenor" } },
      { nombres: "Andrea", apellidos: "López", seccion: "Saxofones", foto_url: "", instrumentos: { nombre: "Saxofón alto" } },
      { nombres: "José", apellidos: "Martínez", seccion: "Cuadro Artístico", foto_url: "", instrumentos: { nombre: "Percusión" } },
      { nombres: "María", apellidos: "García", seccion: "Fusión", foto_url: "", instrumentos: { nombre: "Trombón" } }
    ],
    eventos: [
      { nombre: "Presentación especial", fecha: "2026-10-04", hora: "18:00", lugar: "Choluteca", descripcion: "Presentación de Chorotegas Latin Band." },
      { nombre: "Concierto cultural", fecha: "2026-10-18", hora: "19:00", lugar: "Honduras", descripcion: "Actividad cultural y musical." }
    ],
    ensayos: [
      { titulo: "Ensayo general", fecha: "2026-09-23", hora_inicio: "18:00", lugar: "Salón de ensayo", descripcion: "Repaso de repertorio general." },
      { titulo: "Ensayo por secciones", fecha: "2026-09-26", hora_inicio: "15:00", lugar: "Salón de ensayo", descripcion: "Trabajo por secciones." }
    ],
    comunicados: [
      { titulo: "Bienvenidos al sistema de la banda", contenido: "Este espacio permitirá mantener a todos los integrantes informados sobre actividades, ensayos y eventos.", fecha_publicacion: "2026-09-19" }
    ]
  };

  async function fetchData(table, select = "*", order = null) {
    if (!CLB.client) return demo[table] || [];
    let q = CLB.client.from(table).select(select);
    if (order) q = q.order(order.column, { ascending: order.ascending });
    const { data, error } = await q;
    if (error) {
      console.error(error);
      CLB.toast("No se pudo cargar la información.", "error");
      return [];
    }
    return data || [];
  }

  function renderIntegrantes(items, target) {
    if (!items.length) {
      target.innerHTML = `<div class="empty-state">No hay integrantes para mostrar.</div>`;
      return;
    }

    const preferredOrder = ["Saxofones", "Cuadro Artístico", "Fusión"];
    const grouped = items.reduce((acc, item) => {
      const section = (item.seccion || "Otros").trim();
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    }, {});

    const sections = Object.keys(grouped).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.localeCompare(b, "es");
    });

    const sectionIcon = (name) => {
      const n = name.toLowerCase();
      if (n.includes("saxo")) return "🎷";
      if (n.includes("art")) return "🎭";
      if (n.includes("fusión") || n.includes("fusion")) return "🎶";
      if (n.includes("metal")) return "🎺";
      if (n.includes("ritmo") || n.includes("perc")) return "🥁";
      return "🎼";
    };

    target.innerHTML = sections.map((section, index) => {
      const members = grouped[section];
      return `
        <section class="section-group ${index === 0 ? "open" : ""}">
          <button class="section-toggle" type="button" aria-expanded="${index === 0 ? "true" : "false"}">
            <div class="section-toggle-copy">
              <div class="section-toggle-icon">${sectionIcon(section)}</div>
              <div>
                <h2>${CLB.escapeHTML(section)}</h2>
                <p>${members.length} integrante${members.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <span class="section-chevron">⌄</span>
          </button>
          <div class="section-members">
            <div class="section-members-grid">
              ${members.map(i => {
                const initials = `${(i.nombres || "?")[0] || ""}${(i.apellidos || "")[0] || ""}`.toUpperCase();
                const photo = (i.foto_url || "").trim();
                return `
                  <article class="card member-card-section">
                    <div class="member-photo-wrap">
                      ${photo
                        ? `<img class="member-photo" src="${CLB.escapeHTML(photo)}" alt="${CLB.escapeHTML(i.nombres)} ${CLB.escapeHTML(i.apellidos || "")}" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
                           <div class="member-photo-placeholder" style="display:none">${CLB.escapeHTML(initials)}</div>`
                        : `<div class="member-photo-placeholder">${CLB.escapeHTML(initials)}</div>`}
                    </div>
                    <h3>${CLB.escapeHTML(i.nombres)} ${CLB.escapeHTML(i.apellidos || "")}</h3>
                    <div class="instrument">${CLB.escapeHTML(i.instrumentos?.nombre || "Sin instrumento")}</div>
                    <div class="section-name">${CLB.escapeHTML(section)}</div>
                  </article>`;
              }).join("")}
            </div>
          </div>
        </section>`;
    }).join("");

    target.querySelectorAll(".section-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".section-group");
        const isOpen = group.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(isOpen));
      });
    });
  }

  function renderEventos(items, target) {
    if (!items.length) {
      target.innerHTML = `<div class="empty-state">No hay eventos publicados.</div>`;
      return;
    }
    target.innerHTML = items.map(e => {
      const d = CLB.dateBox(e.fecha);
      return `
        <article class="list-item">
          <div class="date-box"><div><strong>${d.day}</strong><span>${d.month}</span></div></div>
          <div>
            <h3>${CLB.escapeHTML(e.nombre)}</h3>
            <div class="meta">
              <span>📍 ${CLB.escapeHTML(e.lugar || "Por definir")}</span>
              <span>🕒 ${CLB.escapeHTML((e.hora || "").slice(0,5) || "Por definir")}</span>
            </div>
            ${e.descripcion ? `<p>${CLB.escapeHTML(e.descripcion)}</p>` : ""}
          </div>
          <span class="tag">Evento</span>
        </article>`;
    }).join("");
  }

  function renderEnsayos(items, target) {
    if (!items.length) {
      target.innerHTML = `<div class="empty-state">No hay ensayos publicados.</div>`;
      return;
    }
    target.innerHTML = items.map(e => {
      const d = CLB.dateBox(e.fecha);
      return `
        <article class="list-item">
          <div class="date-box"><div><strong>${d.day}</strong><span>${d.month}</span></div></div>
          <div>
            <h3>${CLB.escapeHTML(e.titulo || "Ensayo")}</h3>
            <div class="meta">
              <span>📍 ${CLB.escapeHTML(e.lugar || "Por definir")}</span>
              <span>🕒 ${CLB.escapeHTML((e.hora_inicio || "").slice(0,5) || "Por definir")}</span>
            </div>
            ${e.descripcion ? `<p>${CLB.escapeHTML(e.descripcion)}</p>` : ""}
          </div>
          <span class="tag blue">Ensayo</span>
        </article>`;
    }).join("");
  }

  function renderComunicados(items, target) {
    if (!items.length) {
      target.innerHTML = `<div class="empty-state">No hay comunicados publicados.</div>`;
      return;
    }
    target.innerHTML = items.map(c => `
      <article class="card">
        <span class="tag">Comunicado</span>
        <h3 style="margin-top:14px">${CLB.escapeHTML(c.titulo)}</h3>
        <p>${CLB.escapeHTML(c.contenido || "")}</p>
        <div class="meta">📅 ${CLB.formatDate(c.fecha_publicacion || c.created_at)}</div>
      </article>`).join("");
  }


  const FINANCE_MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  let publicDuesMembers = [];

  function initPublicYearSelect() {
    const select = document.getElementById("public-finance-year");
    if (!select) return;

    const current = new Date().getFullYear();
    select.innerHTML = "";

    for (let year = current; year >= current - 5; year--) {
      select.insertAdjacentHTML("beforeend", `<option value="${year}">${year}</option>`);
    }

    select.value = String(current);
    select.addEventListener("change", loadPublicTransparency);

    document.getElementById("public-dues-search")
      ?.addEventListener("input", renderPublicDues);

    document.getElementById("public-dues-sort")
      ?.addEventListener("change", renderPublicDues);
  }

  function getPaidCount(member) {
    let count = 0;
    for (let month = 1; month <= 12; month++) {
      if (member.months.get(month) === true) count++;
    }
    return count;
  }

  function renderPublicDues() {
    const body = document.getElementById("public-dues-body");
    const head = document.getElementById("public-dues-head");
    if (!body || !head) return;

    head.innerHTML =
      `<tr>
        <th>Integrante</th>
        ${FINANCE_MONTHS.map(m => `<th>${m.slice(0,3)}</th>`).join("")}
        <th>Pagados</th>
      </tr>`;

    const search = (document.getElementById("public-dues-search")?.value || "")
      .trim()
      .toLocaleLowerCase("es");

    const sort = document.getElementById("public-dues-sort")?.value || "name-asc";

    let members = publicDuesMembers.filter(member => {
      const text = `${member.nombre || ""} ${member.seccion || ""}`.toLocaleLowerCase("es");
      return !search || text.includes(search);
    });

    members = [...members].sort((a, b) => {
      if (sort === "name-desc") {
        return (b.nombre || "").localeCompare(a.nombre || "", "es", { sensitivity: "base" });
      }

      if (sort === "paid-desc") {
        const diff = getPaidCount(b) - getPaidCount(a);
        return diff || (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
      }

      if (sort === "paid-asc") {
        const diff = getPaidCount(a) - getPaidCount(b);
        return diff || (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
      }

      return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
    });

    if (!members.length) {
      body.innerHTML = `
        <tr>
          <td colspan="14">
            ${search ? "No se encontraron integrantes con esa búsqueda." : "No hay integrantes activos para mostrar."}
          </td>
        </tr>`;
      return;
    }

    body.innerHTML = members.map(member => {
      let paidCount = 0;

      const cells = FINANCE_MONTHS.map((_, idx) => {
        const paid = member.months.get(idx + 1) === true;
        if (paid) paidCount += 1;

        return `
          <td>
            <span class="payment-mark ${paid ? "paid" : "pending"}"
                  title="${paid ? "Pagado" : "Pendiente"}">
              ${paid ? "✓" : "—"}
            </span>
          </td>`;
      }).join("");

      return `
        <tr>
          <td>
            <strong>${CLB.escapeHTML(member.nombre || "")}</strong>
            ${member.seccion
              ? `<br><small style="color:var(--muted)">${CLB.escapeHTML(member.seccion)}</small>`
              : ""}
          </td>
          ${cells}
          <td><strong>${paidCount}/12</strong></td>
        </tr>`;
    }).join("");
  }

  async function loadPublicTransparency() {
    const yearSelect = document.getElementById("public-finance-year");
    if (!yearSelect) return;

    const year = Number(yearSelect.value || new Date().getFullYear());
    const errorBox = document.getElementById("public-finance-error");

    if (errorBox) errorBox.innerHTML = "";

    if (!CLB.client) {
      if (errorBox) {
        errorBox.innerHTML = `
          <div class="notice info" style="margin-bottom:18px">
            Conecta Supabase para mostrar las mensualidades reales.
          </div>`;
      }
      return;
    }

    const { data: dues, error } = await CLB.client.rpc(
      "estado_mensualidades_publico",
      { p_anio: year }
    );

    if (error) {
      console.error(error);
      if (errorBox) {
        errorBox.innerHTML = `
          <div class="notice" style="margin-bottom:18px">
            No se pudo cargar el reporte de mensualidades.
          </div>`;
      }
      return;
    }

    const grouped = new Map();

    (dues || []).forEach(row => {
      if (!grouped.has(row.integrante_id)) {
        grouped.set(row.integrante_id, {
          id: row.integrante_id,
          nombre: row.nombre,
          seccion: row.seccion,
          months: new Map()
        });
      }

      grouped.get(row.integrante_id).months.set(
        Number(row.mes),
        Boolean(row.pagado)
      );
    });

    publicDuesMembers = [...grouped.values()];
    renderPublicDues();
  }

  async function loadPage() {
    const members = document.getElementById("integrantes-list");
    const events = document.getElementById("eventos-list");
    const rehearsals = document.getElementById("ensayos-list");
    const notices = document.getElementById("comunicados-list");

    if (members) {
      const data = await fetchData("integrantes", "*, instrumentos(nombre)", { column: "apellidos", ascending: true });
      renderIntegrantes(data.filter(x => x.activo !== false), members);
    }

    if (events) {
      let data = await fetchData("eventos", "*", { column: "fecha", ascending: true });
      data = data.filter(x => x.publicado !== false);
      renderEventos(data, events);
    }

    if (rehearsals) {
      let data = await fetchData("ensayos", "*", { column: "fecha", ascending: true });
      data = data.filter(x => x.publicado !== false);
      renderEnsayos(data, rehearsals);
    }

    if (notices) {
      let data = await fetchData("comunicados", "*", { column: "fecha_publicacion", ascending: false });
      data = data.filter(x => x.publicado !== false);
      renderComunicados(data, notices);
    }

    const homeEvent = document.getElementById("home-next-event");
    const homeRehearsal = document.getElementById("home-next-rehearsal");
    const homeNotice = document.getElementById("home-latest-notice");

    if (homeEvent) {
      const data = await fetchData("eventos", "*", { column: "fecha", ascending: true });
      const item = data.find(x => x.publicado !== false);
      homeEvent.innerHTML = item ? `
        <div class="card feature-card">
          <div>
            <div class="card-icon">🎺</div>
            <span class="tag">Próximo evento</span>
            <h3 style="margin-top:14px">${CLB.escapeHTML(item.nombre)}</h3>
            <p>${CLB.escapeHTML(item.descripcion || "Actividad de Chorotegas Latin Band.")}</p>
          </div>
          <div class="meta"><span>📅 ${CLB.formatDate(item.fecha)}</span><span>📍 ${CLB.escapeHTML(item.lugar || "Por definir")}</span></div>
        </div>` : `<div class="card"><p>No hay eventos próximos.</p></div>`;
    }

    if (homeRehearsal) {
      const data = await fetchData("ensayos", "*", { column: "fecha", ascending: true });
      const item = data.find(x => x.publicado !== false);
      homeRehearsal.innerHTML = item ? `
        <div class="card feature-card">
          <div>
            <div class="card-icon">🥁</div>
            <span class="tag blue">Próximo ensayo</span>
            <h3 style="margin-top:14px">${CLB.escapeHTML(item.titulo || "Ensayo")}</h3>
            <p>${CLB.escapeHTML(item.descripcion || "Ensayo programado.")}</p>
          </div>
          <div class="meta"><span>📅 ${CLB.formatDate(item.fecha)}</span><span>🕒 ${CLB.escapeHTML((item.hora_inicio || "").slice(0,5) || "Por definir")}</span></div>
        </div>` : `<div class="card"><p>No hay ensayos próximos.</p></div>`;
    }

    if (homeNotice) {
      const data = await fetchData("comunicados", "*", { column: "fecha_publicacion", ascending: false });
      const item = data.find(x => x.publicado !== false);
      homeNotice.innerHTML = item ? `
        <div class="card feature-card">
          <div>
            <div class="card-icon">📢</div>
            <span class="tag">Comunicado</span>
            <h3 style="margin-top:14px">${CLB.escapeHTML(item.titulo)}</h3>
            <p>${CLB.escapeHTML(item.contenido || "")}</p>
          </div>
          <div class="meta">📅 ${CLB.formatDate(item.fecha_publicacion || item.created_at)}</div>
        </div>` : `<div class="card"><p>No hay comunicados recientes.</p></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPublicYearSelect();
    loadPage();
    loadPublicTransparency();
  });
})();
