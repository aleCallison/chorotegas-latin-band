const ECON_MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
let economiaContext = null;

function money(value) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

document.addEventListener("DOMContentLoaded", async () => {
  economiaContext = await CLBAdmin.initAdmin();
  if (!economiaContext) return;

  if (economiaContext.profile.rol !== "admin") {
    document.querySelector(".admin-content").innerHTML =
      `<div class="notice">La información económica está disponible únicamente para administradores.</div>`;
    return;
  }

  const yearSelect = document.getElementById("economia-year");
  const current = new Date().getFullYear();
  for (let y = current + 1; y >= current - 5; y--) {
    yearSelect.insertAdjacentHTML("beforeend", `<option value="${y}" ${y === current ? "selected" : ""}>${y}</option>`);
  }

  document.getElementById("movimiento-fecha").value = new Date().toISOString().slice(0,10);
  yearSelect.addEventListener("change", loadEconomia);
  document.getElementById("movimiento-form").addEventListener("submit", saveMovimiento);
  document.getElementById("movimientos-body").addEventListener("click", deleteMovimiento);
  document.getElementById("nuevo-movimiento").addEventListener("click", () => {
    document.getElementById("movimiento-form").reset();
    document.getElementById("movimiento-fecha").value = new Date().toISOString().slice(0,10);
  });

  await loadEconomia();
});

async function loadEconomia() {
  const year = Number(document.getElementById("economia-year").value);
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [{ data: pagos, error: err1 }, { data: movs, error: err2 }] = await Promise.all([
    CLB.client.from("mensualidades")
      .select("id,monto,fecha_pago")
      .gte("fecha_pago", from)
      .lte("fecha_pago", to),
    CLB.client.from("movimientos_financieros")
      .select("*")
      .gte("fecha", from)
      .lte("fecha", to)
      .order("fecha", { ascending: false })
  ]);

  if (err1 || err2) {
    CLB.toast((err1 || err2).message, "error");
    return;
  }

  const monthly = Array.from({ length: 12 }, () => ({
    cuotas: 0, ingresos: 0, egresos: 0
  }));

  (pagos || []).forEach(p => {
    const month = new Date(`${p.fecha_pago}T12:00:00`).getMonth();
    monthly[month].cuotas += Number(p.monto || 0);
  });

  (movs || []).forEach(m => {
    const month = new Date(`${m.fecha}T12:00:00`).getMonth();
    if (m.tipo === "ingreso") monthly[month].ingresos += Number(m.monto || 0);
    else monthly[month].egresos += Number(m.monto || 0);
  });

  const totalCuotas = monthly.reduce((s, m) => s + m.cuotas, 0);
  const otrosIngresos = monthly.reduce((s, m) => s + m.ingresos, 0);
  const egresos = monthly.reduce((s, m) => s + m.egresos, 0);
  const ingresos = totalCuotas + otrosIngresos;
  const balance = ingresos - egresos;

  document.getElementById("econ-ingresos").textContent = money(ingresos);
  document.getElementById("econ-cuotas").textContent = money(totalCuotas);
  document.getElementById("econ-egresos").textContent = money(egresos);
  document.getElementById("econ-balance").textContent = money(balance);

  document.getElementById("economia-meses-body").innerHTML =
    monthly.map((m, idx) => {
      const totalIn = m.cuotas + m.ingresos;
      const bal = totalIn - m.egresos;
      return `<tr>
        <td><strong>${ECON_MONTHS[idx]}</strong></td>
        <td>${money(m.cuotas)}</td>
        <td>${money(m.ingresos)}</td>
        <td>${money(m.egresos)}</td>
        <td><strong>${money(bal)}</strong></td>
      </tr>`;
    }).join("");

  const body = document.getElementById("movimientos-body");
  body.innerHTML = (movs || []).length
    ? movs.map(m => `<tr>
        <td>${CLB.formatDate(m.fecha)}</td>
        <td><span class="status ${m.tipo === "ingreso" ? "active" : "inactive"}">${CLB.escapeHTML(m.tipo)}</span></td>
        <td>${CLB.escapeHTML(m.categoria || "—")}</td>
        <td>${CLB.escapeHTML(m.concepto)}</td>
        <td><strong>${money(m.monto)}</strong></td>
        <td><button class="btn btn-danger btn-small" data-delete-mov="${m.id}">Eliminar</button></td>
      </tr>`).join("")
    : `<tr><td colspan="6">No hay movimientos financieros registrados para ${year}.</td></tr>`;
}

async function saveMovimiento(ev) {
  ev.preventDefault();
  const session = await CLB.getSession();

  const payload = {
    tipo: document.getElementById("movimiento-tipo").value,
    categoria: document.getElementById("movimiento-categoria").value.trim() || null,
    concepto: document.getElementById("movimiento-concepto").value.trim(),
    monto: Number(document.getElementById("movimiento-monto").value),
    fecha: document.getElementById("movimiento-fecha").value,
    observacion: document.getElementById("movimiento-observacion").value.trim() || null,
    registrado_por: session.user.id
  };

  const { error } = await CLB.client.from("movimientos_financieros").insert(payload);
  if (error) return CLB.toast(error.message, "error");

  CLB.toast("Movimiento financiero guardado.", "success");
  CLBAdmin.closeModal("movimiento-modal");
  document.getElementById("economia-year").value = payload.fecha.slice(0,4);
  await loadEconomia();
}

async function deleteMovimiento(ev) {
  const btn = ev.target.closest("[data-delete-mov]");
  if (!btn) return;
  if (!confirm("¿Eliminar este movimiento financiero?")) return;

  const { error } = await CLB.client
    .from("movimientos_financieros")
    .delete()
    .eq("id", btn.dataset.deleteMov);

  if (error) return CLB.toast(error.message, "error");
  CLB.toast("Movimiento eliminado.", "success");
  await loadEconomia();
}
