let comunicadoEditing = null;
document.addEventListener("DOMContentLoaded", async () => {
  const ctx=await CLBAdmin.initAdmin(); if(!ctx)return;
  await loadComunicados();
  document.getElementById("comunicado-form").addEventListener("submit",saveComunicado);
  document.getElementById("comunicados-body").addEventListener("click",actionsComunicado);
  document.getElementById("nuevo-comunicado").addEventListener("click",()=>{
    comunicadoEditing=null;document.getElementById("comunicado-form").reset();
    document.getElementById("comunicado-publicado").checked=true;
    document.getElementById("comunicado-fecha").value=new Date().toISOString().slice(0,10);
    document.getElementById("comunicado-modal-title").textContent="Nuevo comunicado";
  });
});
async function loadComunicados(){
  const {data,error}=await CLB.client.from("comunicados").select("*").order("fecha_publicacion",{ascending:false});
  const body=document.getElementById("comunicados-body");
  if(error)return body.innerHTML=`<tr><td colspan="5">Error al cargar.</td></tr>`;
  body.innerHTML=data?.length?data.map(c=>`
  <tr><td><strong>${CLB.escapeHTML(c.titulo)}</strong></td>
  <td>${CLB.formatDate(c.fecha_publicacion)}</td>
  <td>${CLB.escapeHTML((c.contenido||"").slice(0,90))}${(c.contenido||"").length>90?"…":""}</td>
  <td><span class="status ${c.publicado?"active":"inactive"}">${c.publicado?"Publicado":"Borrador"}</span></td>
  <td><button class="btn btn-secondary btn-small" data-edit="${c.id}">Editar</button>
  <button class="btn btn-danger btn-small" data-delete="${c.id}">Eliminar</button></td></tr>`).join(""):`<tr><td colspan="5">No hay comunicados.</td></tr>`;
}
async function saveComunicado(ev){
  ev.preventDefault();
  const session=await CLB.getSession();
  const payload={
    titulo:document.getElementById("comunicado-titulo").value.trim(),
    contenido:document.getElementById("comunicado-contenido").value.trim(),
    fecha_publicacion:document.getElementById("comunicado-fecha").value,
    publicado:document.getElementById("comunicado-publicado").checked,
    autor_id:session.user.id
  };
  const q=comunicadoEditing?CLB.client.from("comunicados").update(payload).eq("id",comunicadoEditing):CLB.client.from("comunicados").insert(payload);
  const {error}=await q;if(error)return CLB.toast(error.message,"error");
  CLB.toast("Comunicado guardado.","success");CLBAdmin.closeModal("comunicado-modal");await loadComunicados();
}
async function actionsComunicado(ev){
  const edit=ev.target.closest("[data-edit]"),del=ev.target.closest("[data-delete]");
  if(edit){
    const {data:c,error}=await CLB.client.from("comunicados").select("*").eq("id",edit.dataset.edit).single();
    if(error)return CLB.toast(error.message,"error");
    comunicadoEditing=c.id;document.getElementById("comunicado-modal-title").textContent="Editar comunicado";
    document.getElementById("comunicado-titulo").value=c.titulo||"";
    document.getElementById("comunicado-contenido").value=c.contenido||"";
    document.getElementById("comunicado-fecha").value=c.fecha_publicacion||"";
    document.getElementById("comunicado-publicado").checked=c.publicado!==false;
    CLBAdmin.openModal("comunicado-modal");
  }
  if(del&&confirm("¿Eliminar este comunicado?")){
    const {error}=await CLB.client.from("comunicados").delete().eq("id",del.dataset.delete);
    if(error)return CLB.toast(error.message,"error");CLB.toast("Comunicado eliminado.","success");await loadComunicados();
  }
}
