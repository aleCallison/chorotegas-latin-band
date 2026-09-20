document.addEventListener("DOMContentLoaded", async () => {
  const ctx=await CLBAdmin.initAdmin(); if(!ctx)return;
  await loadEnsayosSelect();
  document.getElementById("asistencia-ensayo").addEventListener("change",loadAsistencia);
  document.getElementById("guardar-asistencia").addEventListener("click",saveAsistencia);
});

async function loadEnsayosSelect(){
  const {data}=await CLB.client.from("ensayos").select("id,titulo,fecha").order("fecha",{ascending:false});
  const select=document.getElementById("asistencia-ensayo");
  select.innerHTML=`<option value="">Selecciona un ensayo</option>`+(data||[]).map(e=>`<option value="${e.id}">${CLB.escapeHTML(e.titulo)} · ${CLB.formatDate(e.fecha)}</option>`).join("");
}
async function loadAsistencia(){
  const ensayoId=document.getElementById("asistencia-ensayo").value;
  const target=document.getElementById("asistencia-list");
  document.getElementById("guardar-asistencia").disabled=!ensayoId;
  if(!ensayoId){target.innerHTML=`<div class="empty-state">Selecciona un ensayo.</div>`;return;}
  const [{data:integrantes},{data:registros}]=await Promise.all([
    CLB.client.from("integrantes").select("id,nombres,apellidos").eq("activo",true).order("apellidos"),
    CLB.client.from("asistencia").select("*").eq("ensayo_id",ensayoId)
  ]);
  const map=new Map((registros||[]).map(a=>[a.integrante_id,a]));
  target.innerHTML=(integrantes||[]).map(i=>{
    const a=map.get(i.id)||{};
    return `<div class="attendance-row" data-integrante="${i.id}">
      <strong>${CLB.escapeHTML(i.nombres)} ${CLB.escapeHTML(i.apellidos||"")}</strong>
      <select class="input attendance-status">
        ${["presente","ausente","tarde","justificado"].map(s=>`<option value="${s}" ${(a.estado||"presente")===s?"selected":""}>${s}</option>`).join("")}
      </select>
      <input class="input attendance-note" value="${CLB.escapeHTML(a.observacion||"")}" placeholder="Observación (opcional)">
    </div>`;
  }).join("")||`<div class="empty-state">No hay integrantes activos.</div>`;
}
async function saveAsistencia(){
  const ensayoId=document.getElementById("asistencia-ensayo").value;if(!ensayoId)return;
  const rows=[...document.querySelectorAll("[data-integrante]")];
  const payload=rows.map(row=>({
    ensayo_id:ensayoId,
    integrante_id:row.dataset.integrante,
    estado:row.querySelector(".attendance-status").value,
    observacion:row.querySelector(".attendance-note").value.trim()||null
  }));
  const {error}=await CLB.client.from("asistencia").upsert(payload,{onConflict:"ensayo_id,integrante_id"});
  if(error)return CLB.toast(error.message,"error");
  CLB.toast("Asistencia guardada.","success");
}
