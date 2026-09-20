document.addEventListener("DOMContentLoaded", async () => {
  const ctx=await CLBAdmin.initAdmin(); if(!ctx)return;
  if(ctx.profile.rol!=="admin"){
    document.getElementById("usuarios-content").innerHTML=`<div class="notice">Solo un administrador puede cambiar roles de usuario.</div>`;
    return;
  }
  await loadUsuarios();
  document.getElementById("usuarios-body").addEventListener("change",changeRole);
});
async function loadUsuarios(){
  const {data,error}=await CLB.client.from("profiles").select("*").order("created_at",{ascending:false});
  const body=document.getElementById("usuarios-body");
  if(error)return body.innerHTML=`<tr><td colspan="4">Error al cargar.</td></tr>`;
  body.innerHTML=data?.length?data.map(p=>`
    <tr>
      <td><strong>${CLB.escapeHTML(p.nombre||"Sin nombre")}</strong></td>
      <td>${CLB.escapeHTML(p.email||"—")}</td>
      <td>
        <select class="input" data-user="${p.id}" style="min-width:150px">
          ${["integrante","director","admin"].map(r=>`<option value="${r}" ${p.rol===r?"selected":""}>${r}</option>`).join("")}
        </select>
      </td>
      <td>${CLB.formatDate(p.created_at)}</td>
    </tr>`).join(""):`<tr><td colspan="4">No hay usuarios.</td></tr>`;
}
async function changeRole(ev){
  const select=ev.target.closest("[data-user]");if(!select)return;
  const {error}=await CLB.client.from("profiles").update({rol:select.value}).eq("id",select.dataset.user);
  if(error)return CLB.toast(error.message,"error");
  CLB.toast("Rol actualizado.","success");
}
