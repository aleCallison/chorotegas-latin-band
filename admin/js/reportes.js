const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
let reportesContext = null;

function money(value) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

document.addEventListener("DOMContentLoaded", async () => {
  reportesContext = await CLBAdmin.initAdmin();
  if (!reportesContext) return;

  if (reportesContext.profile.rol !== "admin") {
    document.querySelector(".admin-content").innerHTML =
      `<div class="notice">La sección de reportes de mensualidades está disponible únicamente para administradores.</div>`;
    return;
  }

  const yearSelect = document.getElementById("report-year");
  const current = new Date().getFullYear();
  for (let y = current + 1; y >= current - 5; y--) {
    yearSelect.insertAdjacentHTML("beforeend", `<option value="${y}" ${y === current ? "selected" : ""}>${y}</option>`);
  }

  document.getElementById("pago-mes").innerHTML =
    MONTHS.map((m, i) => `<option value="${i+1}">${m}</option>`).join("");

  await loadIntegrantes();
  await loadReportes();

  yearSelect.addEventListener("change", loadReportes);
  document.getElementById("pago-form").addEventListener("submit", savePago);
  document.getElementById("pagos-body").addEventListener("click", deletePago);
  document.getElementById("nuevo-pago").addEventListener("click", () => {
    const now = new Date();
    document.getElementById("pago-form").reset();
    document.getElementById("pago-anio").value = document.getElementById("report-year").value;
    document.getElementById("pago-mes").value = String(now.getMonth() + 1);
    document.getElementById("pago-fecha").value = now.toISOString().slice(0,10);
  });
});

async function loadIntegrantes() {
  const { data, error } = await CLB.client
    .from("integrantes")
    .select("id,nombres,apellidos")
    .eq("activo", true)
    .order("apellidos");

  if (error) return CLB.toast(error.message, "error");

  document.getElementById("pago-integrante").innerHTML =
    `<option value="">Selecciona un integrante</option>` +
    (data || []).map(i => `<option value="${i.id}">${CLB.escapeHTML(i.nombres)} ${CLB.escapeHTML(i.apellidos || "")}</option>`).join("");
}

async function loadReportes() {
  const year = Number(document.getElementById("report-year").value);

  const [{ data: integrantes, error: err1 }, { data: pagos, error: err2 }] = await Promise.all([
    CLB.client.from("integrantes")
      .select("id,nombres,apellidos,seccion")
      .eq("activo", true)
      .order("apellidos"),
    CLB.client.from("mensualidades")
      .select("id,integrante_id,anio,mes,monto,fecha_pago,metodo_pago,observacion, integrantes(nombres,apellidos)")
      .eq("anio", year)
      .order("fecha_pago", { ascending: false })
  ]);

  if (err1 || err2) {
    CLB.toast((err1 || err2).message, "error");
    return;
  }

  const byMember = new Map();
  (pagos || []).forEach(p => {
    if (!byMember.has(p.integrante_id)) byMember.set(p.integrante_id, new Map());
    byMember.get(p.integrante_id).set(Number(p.mes), p);
  });

  const total = (pagos || []).reduce((sum, p) => sum + Number(p.monto || 0), 0);
  document.getElementById("stat-pagos-total").textContent = money(total);
  document.getElementById("stat-pagos-registros").textContent = String((pagos || []).length);
  const complete = (integrantes || []).filter(i => (byMember.get(i.id)?.size || 0) === 12).length;
  document.getElementById("stat-pagos-completos").textContent = String(complete);

  const head = document.getElementById("report-matrix-head");
  head.innerHTML = `<tr><th>Integrante</th>${MONTHS.map(m => `<th>${m.slice(0,3)}</th>`).join("")}<th>Meses</th><th>Total</th></tr>`;

  const body = document.getElementById("report-matrix-body");
  body.innerHTML = (integrantes || []).length
    ? integrantes.map(i => {
        const months = byMember.get(i.id) || new Map();
        let memberTotal = 0;
        const cells = MONTHS.map((_, idx) => {
          const p = months.get(idx + 1);
          if (!p) return `<td><span class="status inactive" title="Pendiente">—</span></td>`;
          memberTotal += Number(p.monto || 0);
          return `<td><span class="status active" title="${money(p.monto)} · ${CLB.formatDate(p.fecha_pago)}">✓</span></td>`;
        }).join("");
        return `<tr>
          <td><strong>${CLB.escapeHTML(i.nombres)} ${CLB.escapeHTML(i.apellidos || "")}</strong><br><small style="color:var(--muted)">${CLB.escapeHTML(i.seccion || "")}</small></td>
          ${cells}
          <td><strong>${months.size}/12</strong></td>
          <td><strong>${money(memberTotal)}</strong></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="15">No hay integrantes activos.</td></tr>`;

  const pagosBody = document.getElementById("pagos-body");
  pagosBody.innerHTML = (pagos || []).length
    ? pagos.map(p => `<tr>
        <td><strong>${CLB.escapeHTML(p.integrantes?.nombres || "")} ${CLB.escapeHTML(p.integrantes?.apellidos || "")}</strong></td>
        <td>${MONTHS[Number(p.mes)-1] || p.mes} ${p.anio}</td>
        <td>${money(p.monto)}</td>
        <td>${CLB.formatDate(p.fecha_pago)}</td>
        <td>${CLB.escapeHTML(p.metodo_pago || "—")}</td>
        <td><button class="btn btn-danger btn-small" data-delete-pago="${p.id}">Eliminar</button></td>
      </tr>`).join("")
    : `<tr><td colspan="6">No hay pagos registrados para ${year}.</td></tr>`;
}

async function savePago(ev) {
  ev.preventDefault();
  const session = await CLB.getSession();
  const payload = {
    integrante_id: document.getElementById("pago-integrante").value,
    anio: Number(document.getElementById("pago-anio").value),
    mes: Number(document.getElementById("pago-mes").value),
    monto: Number(document.getElementById("pago-monto").value),
    fecha_pago: document.getElementById("pago-fecha").value,
    metodo_pago: document.getElementById("pago-metodo").value.trim() || null,
    observacion: document.getElementById("pago-observacion").value.trim() || null,
    registrado_por: session.user.id
  };

  const { error } = await CLB.client
    .from("mensualidades")
    .upsert(payload, { onConflict: "integrante_id,anio,mes" });

  if (error) return CLB.toast(error.message, "error");

  CLB.toast("Mensualidad guardada.", "success");
  CLBAdmin.closeModal("pago-modal");
  document.getElementById("report-year").value = String(payload.anio);
  await loadReportes();
}

async function deletePago(ev) {
  const btn = ev.target.closest("[data-delete-pago]");
  if (!btn) return;
  if (!confirm("¿Eliminar este pago de mensualidad?")) return;

  const { error } = await CLB.client
    .from("mensualidades")
    .delete()
    .eq("id", btn.dataset.deletePago);

  if (error) return CLB.toast(error.message, "error");
  CLB.toast("Pago eliminado.", "success");
  await loadReportes();
}
