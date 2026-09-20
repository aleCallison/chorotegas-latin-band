document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await CLBAdmin.initAdmin();
  if (!ctx) return;

  if (ctx.profile.rol !== "admin") {
    document.getElementById("usuarios-content").innerHTML =
      `<div class="notice">Solo un administrador puede cambiar roles de usuario.</div>`;
    return;
  }

  await loadUsuarios();
  document.getElementById("usuarios-body").addEventListener("change", changeRole);
});

function roleLabel(role) {
  const labels = {
    integrante: "Integrante",
    director: "Director / Junta",
    director_banda: "Director de la banda",
    admin: "Administrador"
  };
  return labels[role] || role;
}

async function loadUsuarios() {
  const { data, error } = await CLB.client
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const body = document.getElementById("usuarios-body");

  if (error) {
    body.innerHTML = `<tr><td colspan="5">Error al cargar.</td></tr>`;
    return;
  }

  const roles = ["integrante", "director", "director_banda", "admin"];

  body.innerHTML = data?.length
    ? data.map(p => {
        const nombreCompleto =
          `${p.nombre || ""} ${p.apellido || ""}`.trim() || "Sin nombre";

        return `
          <tr>
            <td><strong>${CLB.escapeHTML(nombreCompleto)}</strong></td>
            <td>${CLB.escapeHTML(p.email || "—")}</td>
            <td>${CLB.escapeHTML(p.seccion || "—")}</td>
            <td>
              <select class="input" data-user="${p.id}" style="min-width:190px">
                ${roles.map(r => `
                  <option value="${r}" ${p.rol === r ? "selected" : ""}>
                    ${roleLabel(r)}
                  </option>`).join("")}
              </select>
            </td>
            <td>${CLB.formatDate(p.created_at)}</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="5">No hay usuarios.</td></tr>`;
}

async function changeRole(ev) {
  const select = ev.target.closest("[data-user]");
  if (!select) return;

  const previous = select.dataset.previous || "";
  select.dataset.previous = select.value;

  const { error } = await CLB.client
    .from("profiles")
    .update({ rol: select.value })
    .eq("id", select.dataset.user);

  if (error) {
    CLB.toast(error.message, "error");
    if (previous) select.value = previous;
    return;
  }

  CLB.toast(`Rol actualizado a ${roleLabel(select.value)}.`, "success");
}
