(function () {
  function fullName(profile, fallback = "integrante") {
    const name = `${profile?.nombre || ""} ${profile?.apellido || ""}`.trim();
    return name || fallback;
  }

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

    let profile = await CLB.getProfile(session.user.id);

    document.getElementById("member-name").textContent =
      fullName(profile, session.user.email);

    const accountName = document.getElementById("account-name");
    const accountLastname = document.getElementById("account-lastname");
    const accountEmail = document.getElementById("account-email");
    const accountForm = document.getElementById("account-form");
    const accountStatus = document.getElementById("account-status");

    accountName.value = profile?.nombre || "";
    accountLastname.value = profile?.apellido || "";
    accountEmail.value = session.user.email || profile?.email || "";

    accountForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();

      const btn = document.getElementById("account-save");
      const nombre = accountName.value.trim();
      const apellido = accountLastname.value.trim();
      const email = accountEmail.value.trim().toLowerCase();

      if (!nombre || !apellido || !email) {
        CLB.toast("Nombre, apellido y correo son obligatorios.", "error");
        return;
      }

      CLB.setLoading(btn, true);
      accountStatus.textContent = "Guardando…";

      try {
        const { error: profileError } = await CLB.client.rpc("update_my_profile", {
          p_nombre: nombre,
          p_apellido: apellido
        });

        if (profileError) throw profileError;

        const currentEmail = (session.user.email || "").toLowerCase();

        if (email !== currentEmail) {
          const { data: authData, error: authError } = await CLB.client.auth.updateUser({
            email,
            data: {
              nombre,
              apellido,
              seccion: profile?.seccion || null
            }
          });

          if (authError) throw authError;

          if ((authData.user?.email || "").toLowerCase() !== email) {
            accountStatus.textContent = "Nombre guardado. Revisa tu correo para confirmar el cambio de email.";
            CLB.toast("Cambios guardados. Falta confirmar el nuevo correo.", "success");
          } else {
            accountStatus.textContent = "Cambios guardados.";
            CLB.toast("Cuenta actualizada.", "success");
          }
        } else {
          await CLB.client.auth.updateUser({
            data: {
              nombre,
              apellido,
              seccion: profile?.seccion || null
            }
          });

          accountStatus.textContent = "Cambios guardados.";
          CLB.toast("Cuenta actualizada.", "success");
        }

        profile = await CLB.getProfile(session.user.id);
        document.getElementById("member-name").textContent =
          fullName(profile, email);

      } catch (error) {
        console.error(error);
        accountStatus.textContent = "";
        CLB.toast(error.message || "No se pudo actualizar la cuenta.", "error");
      } finally {
        CLB.setLoading(btn, false);
      }
    });

    if (profile && ["admin", "director", "director_banda"].includes(profile.rol)) {
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
          <strong>Sección registrada:</strong> ${CLB.escapeHTML(profile?.seccion || "Sin sección")}<br>
          Tu cuenta todavía no está vinculada a una ficha de integrante. Un administrador puede vincularla desde
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
          <div>
            <strong>${CLB.dateBox(a.ensayos?.fecha).day}</strong>
            <span>${CLB.dateBox(a.ensayos?.fecha).month}</span>
          </div>
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
