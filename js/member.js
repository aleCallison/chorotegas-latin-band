(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    if (!CLB.configured) {
      document.getElementById("member-content").innerHTML = `
        <div class="notice info">Configura Supabase en <code>js/config.js</code> para usar el área privada.</div>`;
      return;
    }

    const session = await CLB.getSession();
    if (!session) {
      location.href = "login.html?return=mi-cuenta.html";
      return;
    }

    const profile = await CLB.getProfile(session.user.id);
    document.getElementById("member-name").textContent = profile?.nombre || session.user.email;

    if (profile && ["admin","director"].includes(profile.rol)) {
      document.getElementById("admin-link").classList.remove("hidden");
    }

    const { data: integrante } = await CLB.client
      .from("integrantes")
      .select("*, instrumentos(nombre)")
      .eq("usuario_id", session.user.id)
      .maybeSingle();

    const profileBox = document.getElementById("member-profile");
    if (!integrante) {
      profileBox.innerHTML = `
        <div class="notice">
          Tu cuenta todavía no está vinculada a un integrante. Un administrador puede vincularla desde
          <strong>Panel administrativo → Integrantes</strong>.
        </div>`;
      document.getElementById("attendance-list").innerHTML =
        `<div class="empty-state">No hay asistencia asociada a esta cuenta.</div>`;
      return;
    }

    profileBox.innerHTML = `
      <div class="card">
        <span class="tag">${CLB.escapeHTML(integrante.seccion || "Integrante")}</span>
        <h2>${CLB.escapeHTML(integrante.nombres)} ${CLB.escapeHTML(integrante.apellidos || "")}</h2>
        <p>${CLB.escapeHTML(integrante.instrumentos?.nombre || "Sin instrumento asignado")}</p>
        <div class="meta"><span>Estado: ${integrante.activo ? "Activo" : "Inactivo"}</span></div>
      </div>`;

    const { data: attendance, error } = await CLB.client
      .from("asistencia")
      .select("*, ensayos(titulo,fecha,hora_inicio)")
      .eq("integrante_id", integrante.id)
      .order("created_at", { ascending: false });

    const target = document.getElementById("attendance-list");
    if (error || !attendance?.length) {
      target.innerHTML = `<div class="empty-state">Aún no hay registros de asistencia.</div>`;
      return;
    }

    target.innerHTML = attendance.map(a => `
      <article class="list-item">
        <div class="date-box">
          <div><strong>${CLB.dateBox(a.ensayos?.fecha).day}</strong><span>${CLB.dateBox(a.ensayos?.fecha).month}</span></div>
        </div>
        <div>
          <h3>${CLB.escapeHTML(a.ensayos?.titulo || "Ensayo")}</h3>
          <div class="meta">${CLB.formatDateTime(a.ensayos?.fecha, a.ensayos?.hora_inicio)}</div>
          ${a.observacion ? `<p>${CLB.escapeHTML(a.observacion)}</p>` : ""}
        </div>
        <span class="status ${CLB.escapeHTML(a.estado)}">${CLB.escapeHTML(a.estado)}</span>
      </article>`).join("");
  });
})();
