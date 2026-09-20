let eventoEditing = null;
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await CLBAdmin.initAdmin();
  if (!ctx) return;
  await loadEventos();
  document.getElementById("evento-form").addEventListener("submit", saveEvento);
  document.getElementById("eventos-body").addEventListener("click", actionsEvento);
  document.getElementById("nuevo-evento").addEventListener("click", () => {
    eventoEditing = null; document.getElementById("evento-form").reset();
    document.getElementById("evento-publicado").checked = true;
    document.getElementById("evento-modal-title").textContent = "Nuevo evento";
  });
});
async function loadEventos(){
  const {data,error}=await CLB.client.from("eventos").select("*").order("fecha",{ascending:false});
  const body=document.getElementById("eventos-body");
  if(error) return body.innerHTML=`<tr><td colspan="6">Error al cargar.</td></tr>`;
  body.innerHTML=data?.length?data.map(e=>`
  <tr>
    <td><strong>${CLB.escapeHTML(e.nombre)}</strong></td><td>${CLB.formatDate(e.fecha)}</td>
    <td>${CLB.escapeHTML((e.hora||"").slice(0,5)||"—")}</td><td>${CLB.escapeHTML(e.lugar||"—")}</td>
    <td><span class="status ${e.publicado?"active":"inactive"}">${e.publicado?"Publicado":"Borrador"}</span></td>
    <td><button class="btn btn-secondary btn-small" data-edit="${e.id}">Editar</button>
    <button class="btn btn-danger btn-small" data-delete="${e.id}">Eliminar</button></td>
  </tr>`).join(""):`<tr><td colspan="6">No hay eventos.</td></tr>`;
}
async function saveEvento(ev){
  ev.preventDefault();
  const payload={
    nombre:document.getElementById("evento-nombre").value.trim(),
    fecha:document.getElementById("evento-fecha").value,
    hora:document.getElementById("evento-hora").value||null,
    lugar:document.getElementById("evento-lugar").value.trim()||null,
    descripcion:document.getElementById("evento-descripcion").value.trim()||null,
    publicado:document.getElementById("evento-publicado").checked
  };
  const q=eventoEditing?CLB.client.from("eventos").update(payload).eq("id",eventoEditing):CLB.client.from("eventos").insert(payload);
  const {error}=await q; if(error)return CLB.toast(error.message,"error");
  CLB.toast("Evento guardado.","success"); CLBAdmin.closeModal("evento-modal"); await loadEventos();
}
async function actionsEvento(ev){
  const edit=ev.target.closest("[data-edit]"),del=ev.target.closest("[data-delete]");
  if(edit){
    const {data:e,error}=await CLB.client.from("eventos").select("*").eq("id",edit.dataset.edit).single();
    if(error)return CLB.toast(error.message,"error");
    eventoEditing=e.id; document.getElementById("evento-modal-title").textContent="Editar evento";
    document.getElementById("evento-nombre").value=e.nombre||"";
    document.getElementById("evento-fecha").value=e.fecha||"";
    document.getElementById("evento-hora").value=(e.hora||"").slice(0,5);
    document.getElementById("evento-lugar").value=e.lugar||"";
    document.getElementById("evento-descripcion").value=e.descripcion||"";
    document.getElementById("evento-publicado").checked=e.publicado!==false;
    CLBAdmin.openModal("evento-modal");
  }
  if(del&&confirm("¿Eliminar este evento?")){
    const {error}=await CLB.client.from("eventos").delete().eq("id",del.dataset.delete);
    if(error)return CLB.toast(error.message,"error"); CLB.toast("Evento eliminado.","success"); await loadEventos();
  }
}
