const state = {
  token: sessionStorage.getItem("vm_dashboard_token") || "",
  rows: [],
  filtered: [],
  loading: false,
  timer: null,
};

const $ = (id) => document.getElementById(id);
const cardsEl = $("cards");
const errorBox = $("errorBox");
const emptyState = $("emptyState");
const tokenDialog = $("tokenDialog");

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0,10)}T12:00:00`);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d).replace(".", "");
};

const fmtTime = (value) => {
  if (!value) return "—";
  return String(value).slice(0,5);
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"
  }).format(d);
};

const escapeHtml = (s) => String(s ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

function uiStatus(row) {
  return String(row.ui_status || row.operational_status || "NUEVA")
    .toUpperCase()
    .replaceAll(" ","_");
}

function statusLabel(status) {
  const map = {
    NUEVA:"NUEVA",
    EN_REVISION:"EN REVISIÓN",
    REVIEWING:"EN REVISIÓN",
    NOTIFICADA:"NOTIFICADA",
    NOTIFIED:"NOTIFICADA",
    UTILIZADA:"UTILIZADA",
    USED:"UTILIZADA",
    DESCARTADA:"DESCARTADA",
    DISCARDED:"DESCARTADA",
    CERRADA:"CERRADA"
  };
  return map[status] || status.replaceAll("_"," ");
}

function statusClass(status) {
  if (status.includes("REV")) return "review";
  if (status.includes("NOTIF")) return "notified";
  if (status.includes("UTIL") || status.includes("USED")) return "used";
  if (status.includes("DESC") || status.includes("DISCARD")) return "discarded";
  return "new";
}

async function api(path = "", options = {}) {
  const headers = {
    "Content-Type":"application/json",
    "x-dashboard-token": state.token,
    ...(options.headers || {})
  };
  const res = await fetch(`/api/opportunities${path}`, {...options, headers});
  if (res.status === 401) {
    sessionStorage.removeItem("vm_dashboard_token");
    state.token = "";
    openTokenDialog();
    throw new Error("Acceso requerido.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function setConnection(ok, text) {
  const badge = $("connectionBadge");
  badge.classList.toggle("online", !!ok);
  badge.classList.toggle("offline", !ok);
  $("connectionText").textContent = text;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function updateMetrics(rows) {
  const statuses = rows.map(uiStatus);
  $("metricNew").textContent = statuses.filter(x => x === "NUEVA").length;
  $("metricReview").textContent = statuses.filter(x => ["EN_REVISION","REVIEWING"].includes(x)).length;
  $("metricNotified").textContent = statuses.filter(x => ["NOTIFICADA","NOTIFIED"].includes(x)).length;
  $("metricUsed").textContent = statuses.filter(x => ["UTILIZADA","USED"].includes(x)).length;
  $("metricVerified").textContent = rows.filter(x => x.ais_verified === true).length;
}

function populateConsulates(rows) {
  const select = $("consulateFilter");
  const current = select.value;
  const consulates = [...new Set(rows.map(x => x.opportunity_consulate).filter(Boolean))].sort();
  select.innerHTML = `<option value="ALL">Todos los consulados</option>` +
    consulates.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
  if (consulates.includes(current)) select.value = current;
}

function applyFilters() {
  const q = $("searchInput").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const consulate = $("consulateFilter").value;
  const verifiedOnly = $("verifiedOnly").checked;

  state.filtered = state.rows.filter(row => {
    const haystack = [
      row.full_name, row.opportunity_consulate, row.current_consulate,
      row.opportunity_date, row.cas_location, row.cas_date, row.visa_type
    ].join(" ").toLowerCase();

    if (q && !haystack.includes(q)) return false;
    if (status !== "ALL" && uiStatus(row) !== status) return false;
    if (consulate !== "ALL" && row.opportunity_consulate !== consulate) return false;
    if (verifiedOnly && row.ais_verified !== true) return false;
    return true;
  });

  renderCards();
}

function cardHtml(row) {
  const status = uiStatus(row);
  const verified = row.ais_verified === true;
  const previous = row.previous_appointment_date || row.current_appointment_date;
  const opportunity = row.opportunity_date || row.available_date;
  const improvement = row.improvement_days ?? "—";
  const detections = row.detection_count ?? 1;
  const notice = row.days_notice ?? row.travel_notice_days ?? null;
  const source = row.verification_source || "SARU";
  const priority = row.priority ?? 3;

  const verifiedPanel = verified ? `
    <section class="verified-panel">
      <div class="verified-panel-head">
        <div class="verified-title">
          <span class="verified-check">✓</span>
          VERIFICADA DIRECTAMENTE EN AIS
        </div>
        <span class="verified-time">${escapeHtml(fmtDateTime(row.ais_verified_at))}</span>
      </div>
      <div class="verified-grid">
        <div class="verified-item">
          <span>Hora consular</span>
          <strong>${escapeHtml(fmtTime(row.consular_time))}</strong>
        </div>
        <div class="verified-item">
          <span>CAS compatible</span>
          <strong>${escapeHtml(row.cas_location || "—")}</strong>
        </div>
        <div class="verified-item">
          <span>Fecha CAS</span>
          <strong>${escapeHtml(fmtDate(row.cas_date))}${row.cas_gap_days != null ? ` · ${escapeHtml(row.cas_gap_days)} días antes` : ""}</strong>
        </div>
      </div>
    </section>` : "";

  const isDiscarded = ["DESCARTADA","DISCARDED"].includes(status);

  return `
    <article class="op-card ${verified ? "verified" : ""}" data-id="${row.opportunity_id}">
      <div class="card-head">
        <div>
          <div class="badges">
            <span class="badge ${statusClass(status)}">${escapeHtml(statusLabel(status))}</span>
            <span class="badge priority">PRIORIDAD ${escapeHtml(priority)}</span>
            ${verified ? `<span class="badge verified">✓ AIS VERIFIED</span>` : ""}
          </div>
          <h2 class="client-name">${escapeHtml(row.full_name || `CLIENTE #${row.client_id}`)}</h2>
        </div>
        <span class="visa-chip">${escapeHtml(row.visa_type || "")}</span>
      </div>

      <div class="route-box">
        <div class="route-side">
          <span>Cita actual</span>
          <strong>${escapeHtml(fmtDate(previous))}</strong>
          <small>${escapeHtml(row.current_consulate || "—")}</small>
        </div>
        <div class="route-arrow">→</div>
        <div class="route-side">
          <span>Oportunidad</span>
          <strong>${escapeHtml(fmtDate(opportunity))}</strong>
          <small>${escapeHtml(row.opportunity_consulate || row.consulate || "—")}</small>
        </div>
      </div>

      <div class="improvement">
        <strong>${escapeHtml(improvement)}</strong>
        <span>DÍAS DE MEJORA</span>
      </div>

      ${verifiedPanel}

      <div class="meta-row">
        <span class="meta-pill">Detectada ${escapeHtml(detections)} ${Number(detections) === 1 ? "vez" : "veces"}</span>
        <span class="meta-pill">Última: ${escapeHtml(fmtDateTime(row.last_detected_at || row.detected_at))}</span>
        ${notice != null ? `<span class="meta-pill">${escapeHtml(notice)} días de aviso</span>` : ""}
        <span class="meta-pill source-pill">Fuente: ${escapeHtml(source)}</span>
      </div>

      <div class="actions">
        <button class="btn btn-review" data-action="review">Revisar</button>
        <button class="btn btn-notify" data-action="notify">Notificada</button>
        <button class="btn btn-use" data-action="use">Utilizada</button>
        ${isDiscarded
          ? `<button class="btn btn-reopen" data-action="reopen">Reabrir</button>`
          : `<button class="btn btn-discard" data-action="discard">Descartar</button>`}
      </div>
    </article>
  `;
}

function renderCards() {
  cardsEl.innerHTML = state.filtered.map(cardHtml).join("");
  emptyState.classList.toggle("hidden", state.filtered.length > 0);
}

async function loadRows({silent=false} = {}) {
  if (state.loading) return;
  state.loading = true;
  if (!silent) $("refreshBtn").disabled = true;
  clearError();

  try {
    const data = await api();
    state.rows = Array.isArray(data.rows) ? data.rows : [];
    updateMetrics(state.rows);
    populateConsulates(state.rows);
    applyFilters();
    $("lastUpdated").textContent = new Intl.DateTimeFormat("es-MX", {
      hour:"2-digit", minute:"2-digit", second:"2-digit"
    }).format(new Date());
    setConnection(true, "Supabase conectado");
  } catch (err) {
    setConnection(false, "Sin conexión");
    if (err.message !== "Acceso requerido.") showError(err.message);
  } finally {
    state.loading = false;
    $("refreshBtn").disabled = false;
  }
}

async function performAction(id, action, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Guardando…";
  clearError();

  try {
    await api("", {
      method:"PATCH",
      body: JSON.stringify({opportunity_id:Number(id), action})
    });
    await loadRows({silent:true});
  } catch (err) {
    showError(err.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function openTokenDialog() {
  if (!tokenDialog.open) tokenDialog.showModal();
}

$("tokenForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const token = $("tokenInput").value.trim();
  if (!token) return;
  state.token = token;
  sessionStorage.setItem("vm_dashboard_token", token);
  tokenDialog.close();
  loadRows();
});

$("refreshBtn").addEventListener("click", () => loadRows());
$("searchInput").addEventListener("input", applyFilters);
$("statusFilter").addEventListener("change", applyFilters);
$("consulateFilter").addEventListener("change", applyFilters);
$("verifiedOnly").addEventListener("change", applyFilters);

cardsEl.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const card = button.closest("[data-id]");
  if (!card) return;
  performAction(card.dataset.id, button.dataset.action, button);
});

if (!state.token) openTokenDialog();
else loadRows();

state.timer = setInterval(() => {
  if (state.token && document.visibilityState === "visible") loadRows({silent:true});
}, 15000);
