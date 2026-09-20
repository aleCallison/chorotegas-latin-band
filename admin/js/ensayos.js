let ensayoEditing = null;
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await CLBAdmin.initAdmin();
  if (!ctx) return;
  await loadEnsayos();
  document.getElementById("ensayo-form").addEventListener("submit", saveEnsayo);
  document.getElementById("ensayos-body").addEventListener("click", actionsEnsayo);
  document.getElementById("nuevo-ensayo").addEventListener("click", () => {
    ensayoEditing = null;
    document.getElementById("ensayo-form").reset();
    document.getElementById("ensayo-publicado").checked = true;
    document.getElementById("ensayo-modal-title").textContent = "Nuevo ensayo";
  });
});

async function loadEnsayos() {
  const { data, error } = await CLB.client.from("ensayos").select("*").order("fecha", {ascending:false});
  const body = document.getElementById("ensayos-body");
  if (error) return body.innerHTML = `<tr><td colspan="6">Error al cargar.</td></tr>`;
  body.innerHTML = data?.length ? data.map(e => `
    <tr>
      <td><strong>${CLB.escapeHTML(e.titulo)}</strong></td>
      <td>${CLB.formatDate(e.fecha)}</td>
      <td>${CLB.escapeHTML((e.hora_inicio || "").slice(0,5) || "—")}</td>
      <td>${CLB.escapeHTML(e.lugar || "—")}</td>
      <td><span class="status ${e.publicado ? "active":"inactive"}">${e.publicado ? "Publicado":"Oculto"}</span></td>
      <td>
        <button class="btn btn-secondary btn-small" data-edit="${e.id}">Editar</button>
        <button class="btn btn-danger btn-small" data-delete="${e.id}">Eliminar</button>
      </td>
    </tr>`).join("") : `<tr><td colspan="6">No hay ensayos.</td></tr>`;
}

async function saveEnsayo(ev) {
  ev.preventDefault();
  const payload = {
    titulo: document.getElementById("ensayo-titulo").value.trim(),
    fecha: document.getElementById("ensayo-fecha").value,
    hora_inicio: document.getElementById("ensayo-inicio").value || null,
    hora_fin: document.getElementById("ensayo-fin").value || null,
    lugar: document.getElementById("ensayo-lugar").value.trim() || null,
    descripcion: document.getElementById("ensayo-descripcion").value.trim() || null,
    publicado: document.getElementById("ensayo-publicado").checked
  };
  const q = ensayoEditing ? CLB.client.from("ensayos").update(payload).eq("id",ensayoEditing) : CLB.client.from("ensayos").insert(payload);
  const {error}=await q;
  if(error) return CLB.toast(error.message,"error");
  CLB.toast("Ensayo guardado.","success");
  CLBAdmin.closeModal("ensayo-modal");
  await loadEnsayos();
}

async function actionsEnsayo(ev){
  const edit=ev.target.closest("[data-edit]"), del=ev.target.closest("[data-delete]");
  if(edit){
    const {data:e,error}=await CLB.client.from("ensayos").select("*").eq("id",edit.dataset.edit).single();
    if(error) return CLB.toast(error.message,"error");
    ensayoEditing=e.id;
    document.getElementById("ensayo-modal-title").textContent="Editar ensayo";
    document.getElementById("ensayo-titulo").value=e.titulo||"";
    document.getElementById("ensayo-fecha").value=e.fecha||"";
    document.getElementById("ensayo-inicio").value=(e.hora_inicio||"").slice(0,5);
    document.getElementById("ensayo-fin").value=(e.hora_fin||"").slice(0,5);
    document.getElementById("ensayo-lugar").value=e.lugar||"";
    document.getElementById("ensayo-descripcion").value=e.descripcion||"";
    document.getElementById("ensayo-publicado").checked=e.publicado!==false;
    CLBAdmin.openModal("ensayo-modal");
  }
  if(del && confirm("¿Eliminar este ensayo?")){
    const {error}=await CLB.client.from("ensayos").delete().eq("id",del.dataset.delete);
    if(error) return CLB.toast(error.message,"error");
    CLB.toast("Ensayo eliminado.","success"); await loadEnsayos();
  }
}
