let instrumentoEditing = null;

document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await CLBAdmin.initAdmin();
  if (!ctx) return;
  await loadInstrumentos();

  document.getElementById("instrumento-form").addEventListener("submit", saveInstrumento);
  document.getElementById("instrumentos-body").addEventListener("click", handleActions);
});

async function loadInstrumentos() {
  const { data, error } = await CLB.client.from("instrumentos").select("*").order("nombre");
  const body = document.getElementById("instrumentos-body");
  if (error) return body.innerHTML = `<tr><td colspan="3">Error al cargar.</td></tr>`;
  body.innerHTML = data?.length ? data.map(i => `
    <tr>
      <td>${CLB.escapeHTML(i.nombre)}</td>
      <td>${CLB.escapeHTML(i.seccion || "")}</td>
      <td>
        <button class="btn btn-secondary btn-small" data-edit='${JSON.stringify(i).replaceAll("'","&#39;")}'>Editar</button>
        <button class="btn btn-danger btn-small" data-delete="${i.id}">Eliminar</button>
      </td>
    </tr>`).join("") : `<tr><td colspan="3">No hay instrumentos.</td></tr>`;
}

async function saveInstrumento(ev) {
  ev.preventDefault();
  const payload = {
    nombre: document.getElementById("instrumento-nombre").value.trim(),
    seccion: document.getElementById("instrumento-seccion").value.trim() || null
  };
  const q = instrumentoEditing
    ? CLB.client.from("instrumentos").update(payload).eq("id", instrumentoEditing)
    : CLB.client.from("instrumentos").insert(payload);
  const { error } = await q;
  if (error) return CLB.toast(error.message, "error");
  CLB.toast(instrumentoEditing ? "Instrumento actualizado." : "Instrumento creado.", "success");
  instrumentoEditing = null;
  ev.target.reset();
  document.getElementById("instrumento-submit").textContent = "Guardar";
  await loadInstrumentos();
}

async function handleActions(ev) {
  const edit = ev.target.closest("[data-edit]");
  const del = ev.target.closest("[data-delete]");
  if (edit) {
    const item = JSON.parse(edit.dataset.edit.replaceAll("&#39;","'"));
    instrumentoEditing = item.id;
    document.getElementById("instrumento-nombre").value = item.nombre || "";
    document.getElementById("instrumento-seccion").value = item.seccion || "";
    document.getElementById("instrumento-submit").textContent = "Actualizar";
  }
  if (del && confirm("¿Eliminar este instrumento?")) {
    const { error } = await CLB.client.from("instrumentos").delete().eq("id", del.dataset.delete);
    if (error) return CLB.toast(error.message, "error");
    CLB.toast("Instrumento eliminado.", "success");
    await loadInstrumentos();
  }
}
