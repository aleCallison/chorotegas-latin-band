let integranteEditing = null;

document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await CLBAdmin.initAdmin();
  if (!ctx) return;

  await Promise.all([loadInstrumentosSelect(), loadUsuariosSelect()]);
  await loadIntegrantes();

  document.getElementById("integrante-form").addEventListener("submit", saveIntegrante);
  document.getElementById("integrantes-body").addEventListener("click", handleActions);
  document.getElementById("integrante-search").addEventListener("input", loadIntegrantes);
  document.getElementById("nuevo-integrante").addEventListener("click", () => {
    integranteEditing = null;
    document.getElementById("integrante-form").reset();
    document.getElementById("integrante-activo").checked = true;
    document.getElementById("integrante-modal-title").textContent = "Nuevo integrante";
  });
});

async function loadInstrumentosSelect() {
  const { data } = await CLB.client.from("instrumentos").select("*").order("nombre");
  document.getElementById("integrante-instrumento").innerHTML =
    `<option value="">Sin instrumento</option>` +
    (data || []).map(i => `<option value="${i.id}">${CLB.escapeHTML(i.nombre)}</option>`).join("");
}

async function loadUsuariosSelect() {
  const { data } = await CLB.client.from("profiles").select("id,nombre,email,rol").order("nombre");
  document.getElementById("integrante-usuario").innerHTML =
    `<option value="">Sin cuenta vinculada</option>` +
    (data || []).map(p => `<option value="${p.id}">${CLB.escapeHTML(p.nombre || p.email || p.id)} · ${CLB.escapeHTML(p.rol)}</option>`).join("");
}

async function loadIntegrantes() {
  const search = document.getElementById("integrante-search")?.value.trim().toLowerCase() || "";
  const { data, error } = await CLB.client
    .from("integrantes")
    .select("*, instrumentos(nombre)")
    .order("apellidos");
  const body = document.getElementById("integrantes-body");
  if (error) return body.innerHTML = `<tr><td colspan="6">Error al cargar.</td></tr>`;
  const filtered = (data || []).filter(i =>
    `${i.nombres} ${i.apellidos} ${i.seccion || ""} ${i.instrumentos?.nombre || ""}`.toLowerCase().includes(search)
  );
  body.innerHTML = filtered.length ? filtered.map(i => `
    <tr>
      <td><strong>${CLB.escapeHTML(i.nombres)} ${CLB.escapeHTML(i.apellidos || "")}</strong></td>
      <td>${CLB.escapeHTML(i.instrumentos?.nombre || "—")}</td>
      <td>${CLB.escapeHTML(i.seccion || "—")}</td>
      <td>${i.fecha_ingreso ? CLB.formatDate(i.fecha_ingreso) : "—"}</td>
      <td><span class="status ${i.activo ? "active" : "inactive"}">${i.activo ? "Activo" : "Inactivo"}</span></td>
      <td>
        <button class="btn btn-secondary btn-small" data-edit="${i.id}">Editar</button>
        <button class="btn btn-danger btn-small" data-delete="${i.id}" data-admin-only>Eliminar</button>
      </td>
    </tr>`).join("") : `<tr><td colspan="6">No hay integrantes.</td></tr>`;

  const profile = await CLB.getProfile((await CLB.getSession()).user.id);
  if (profile?.rol !== "admin") document.querySelectorAll("[data-admin-only]").forEach(el => el.classList.add("hidden"));
}

async function saveIntegrante(ev) {
  ev.preventDefault();
  const payload = {
    nombres: document.getElementById("integrante-nombres").value.trim(),
    apellidos: document.getElementById("integrante-apellidos").value.trim(),
    alias: document.getElementById("integrante-alias").value.trim() || null,
    foto_url: document.getElementById("integrante-foto").value.trim() || null,
    instrumento_id: document.getElementById("integrante-instrumento").value || null,
    seccion: document.getElementById("integrante-seccion").value.trim() || null,
    fecha_ingreso: document.getElementById("integrante-fecha").value || null,
    usuario_id: document.getElementById("integrante-usuario").value || null,
    activo: document.getElementById("integrante-activo").checked
  };

  const q = integranteEditing
    ? CLB.client.from("integrantes").update(payload).eq("id", integranteEditing)
    : CLB.client.from("integrantes").insert(payload);
  const { error } = await q;
  if (error) return CLB.toast(error.message, "error");

  CLB.toast(integranteEditing ? "Integrante actualizado." : "Integrante registrado.", "success");
  CLBAdmin.closeModal("integrante-modal");
  integranteEditing = null;
  ev.target.reset();
  await loadIntegrantes();
}

async function handleActions(ev) {
  const edit = ev.target.closest("[data-edit]");
  const del = ev.target.closest("[data-delete]");
  if (edit) {
    const { data: i, error } = await CLB.client.from("integrantes").select("*").eq("id", edit.dataset.edit).single();
    if (error) return CLB.toast(error.message, "error");
    integranteEditing = i.id;
    document.getElementById("integrante-modal-title").textContent = "Editar integrante";
    document.getElementById("integrante-nombres").value = i.nombres || "";
    document.getElementById("integrante-apellidos").value = i.apellidos || "";
    document.getElementById("integrante-alias").value = i.alias || "";
    document.getElementById("integrante-foto").value = i.foto_url || "";
    document.getElementById("integrante-instrumento").value = i.instrumento_id || "";
    document.getElementById("integrante-seccion").value = i.seccion || "";
    document.getElementById("integrante-fecha").value = i.fecha_ingreso || "";
    document.getElementById("integrante-usuario").value = i.usuario_id || "";
    document.getElementById("integrante-activo").checked = i.activo !== false;
    CLBAdmin.openModal("integrante-modal");
  }
  if (del && confirm("¿Eliminar este integrante? También podría afectar registros relacionados.")) {
    const { error } = await CLB.client.from("integrantes").delete().eq("id", del.dataset.delete);
    if (error) return CLB.toast(error.message, "error");
    CLB.toast("Integrante eliminado.", "success");
    await loadIntegrantes();
  }
}
