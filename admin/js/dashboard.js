document.addEventListener("DOMContentLoaded", async () => {
  const ctx = await CLBAdmin.initAdmin();
  if (!ctx) return;

  async function count(table) {
    const { count } = await CLB.client.from(table).select("*", { count: "exact", head: true });
    return count || 0;
  }

  const [integrantes, ensayos, eventos, comunicados] = await Promise.all([
    count("integrantes"), count("ensayos"), count("eventos"), count("comunicados")
  ]);

  document.getElementById("stat-integrantes").textContent = integrantes;
  document.getElementById("stat-ensayos").textContent = ensayos;
  document.getElementById("stat-eventos").textContent = eventos;
  document.getElementById("stat-comunicados").textContent = comunicados;

  const { data: nextEvents } = await CLB.client
    .from("eventos")
    .select("*")
    .gte("fecha", new Date().toISOString().slice(0,10))
    .order("fecha", { ascending: true })
    .limit(5);

  const target = document.getElementById("dashboard-events");
  target.innerHTML = nextEvents?.length
    ? nextEvents.map(e => `
      <div class="list-item">
        <div class="date-box"><div><strong>${CLB.dateBox(e.fecha).day}</strong><span>${CLB.dateBox(e.fecha).month}</span></div></div>
        <div><h3>${CLB.escapeHTML(e.nombre)}</h3><div class="meta">${CLB.formatDateTime(e.fecha,e.hora)} · ${CLB.escapeHTML(e.lugar || "")}</div></div>
        <span class="tag">${e.publicado ? "Publicado" : "Borrador"}</span>
      </div>`).join("")
    : `<div class="empty-state">No hay eventos próximos.</div>`;
});
