/* ChoreOps Avengers Dashboard — standalone Home Assistant Lovelace card */
const CARD_TAG = "choreops-avengers-dashboard";
const DEFAULT_PROFILES = [
  { id: "patrick", name: "Patrick", role: "Teamleitung" },
  { id: "jenny", name: "Jenny", role: "Mama" },
  { id: "leonie", name: "Leonie", role: "Teammitglied" },
  { id: "lisa", name: "Lisa", role: "Teammitglied" },
  { id: "nele", name: "Nele", role: "Teammitglied" },
];

class ChoreOpsAvengersDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._clock = null;
    this._confirmAction = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Bitte eine gültige Kartenkonfiguration angeben.");
    this._config = {
      title: "AVENGERS",
      subtitle: "Familienzentrale · Gemeinsame Missionen",
      profiles: DEFAULT_PROFILES,
      ...config,
    };
    if (!Array.isArray(this._config.profiles) || !this._config.profiles.length) {
      this._config.profiles = DEFAULT_PROFILES;
    }
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    this._clock = window.setInterval(() => {
      const el = this.shadowRoot?.querySelector("[data-clock]");
      if (el) el.textContent = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      const date = this.shadowRoot?.querySelector("[data-date]");
      if (date) date.textContent = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
    }, 30000);
  }

  disconnectedCallback() {
    if (this._clock) window.clearInterval(this._clock);
  }

  getCardSize() { return 8; }

  _state(entityId) {
    return this._hass?.states?.[entityId] || null;
  }

  _entities(prefix, domain) {
    if (!this._hass?.states) return [];
    return Object.entries(this._hass.states)
      .filter(([id]) => id.startsWith(`${domain}.${prefix}`))
      .map(([entityId, state]) => ({ entityId, state }));
  }

  _find(profile, suffix) {
    return this._state(`sensor.${profile.id}_choreops_${suffix}`);
  }

  _friendly(entityId, state) {
    return state?.attributes?.friendly_name || entityId.split(".").pop().replaceAll("_", " ");
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  _num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n) : (value ?? "—");
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const profiles = (this._config.profiles || DEFAULT_PROFILES).map(p => ({
      id: String(p.id || "").toLowerCase(),
      name: p.name || p.id,
      role: p.role || "Familienmitglied",
    })).filter(p => p.id);

    const profileData = profiles.map(profile => {
      const prefix = `${profile.id}_choreops_`;
      const tasks = this._find(profile, "aufgaben");
      const points = this._find(profile, "points");
      const badge = this._find(profile, "abzeichen");
      const statuses = this._entities(`${prefix}aufgabenstatus_`, "sensor");
      const actions = this._entities(`${prefix}aufgabe_`, "button");
      const pointButtons = this._entities(`${profile.id}_choreops_points_um_`, "button");
      const score = Number(points?.state);
      const statusItems = statuses.map(({ entityId, state }) => {
        const val = String(state.state ?? "unknown");
        return {
          name: this._friendly(entityId, state).replace(/^Aufgabenstatus\s*[-:]?\s*/i, ""),
          val,
          pending: /pend|offen|unknown|unavailable/i.test(val),
        };
      });
      return { profile, tasks, points, badge, actions, pointButtons, statusItems, score: Number.isFinite(score) ? score : 0 };
    });
    const maxScore = Math.max(1, ...profileData.map(item => item.score));
    const ranked = [...profileData].sort((a, b) => b.score - a.score);
    const rankById = Object.fromEntries(ranked.map((item, index) => [item.profile.id, index + 1]));
    const profileCards = profileData.map(item => {
      const { profile, tasks, points, badge, actions, pointButtons, statusItems, score } = item;
      const pendingCount = statusItems.filter(status => status.pending).length;
      const otherCount = statusItems.length - pendingCount;
      const progress = Math.max(0, Math.min(100, Math.round(score / maxScore * 100)));
      const badgeValue = badge?.state && !["unknown", "unavailable", "None", "none", ""].includes(String(badge.state)) ? String(badge.state) : "Noch keine";
      const statusHtml = statusItems.length
        ? statusItems.slice(0, 5).map(status => `<div class="mission-row"><span class="status-dot ${status.pending ? "pending" : "done"}"></span><span class="mission-name">${this._escape(status.name)}</span><span class="mission-state ${status.pending ? "state-pending" : ""}">${this._escape(status.val)}</span></div>`).join("")
        : `<div class="empty">Keine Aufgabenstatus-Entitäten gefunden.</div>`;
      const groups = [
        { title: "Aufgaben", items: actions },
        { title: "Punkte", items: pointButtons },
      ].filter(group => group.items.length);
      const controls = groups.map(group => `<div class="action-group"><div class="action-group-title">${this._escape(group.title)}</div><div class="action-list">${group.items.slice(0, 12).map(({ entityId, state }) => {
        const name = this._friendly(entityId, state);
        const lower = entityId.toLowerCase();
        const danger = /ablehnen|strafe|verringern/.test(lower);
        const positive = /genehmigen|beanspruchen|erhöhen/.test(lower);
        return `<button class="action ${danger ? "danger" : positive ? "positive" : ""}" data-entity="${this._escape(entityId)}" data-label="${this._escape(name)}">${this._escape(name.replace(/^[^–-]+[–-]\s*/, ""))}</button>`;
      }).join("")}</div></div>`).join("");
      return `<article class="profile">
        <div class="profile-top"><div class="avatar">${this._escape(profile.name.slice(0, 1).toUpperCase())}</div><div class="profile-title"><h3>${this._escape(profile.name)}</h3><span>${this._escape(profile.role)}</span></div><div class="rank-chip">#${rankById[profile.id] || "—"}<small>RANG</small></div></div>
        <div class="stats"><div class="stat"><span class="stat-icon">✦</span><strong>${this._escape(this._num(points?.state ?? "—"))}</strong><small>Punkte</small></div><div class="stat"><span class="stat-icon">⬡</span><strong class="badge-value">${this._escape(badgeValue)}</strong><small>Abzeichen</small></div></div>
        <div class="score-progress"><div class="progress-caption"><span>PUNKTE-FORTSCHRITT</span><strong>${progress}%</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><div class="progress-note">Vergleich innerhalb der Familie · kein festes Belohnungsziel</div></div>
        <div class="mission-summary"><div><strong>${statusItems.length}</strong><span>Status</span></div><div><strong>${pendingCount}</strong><span>Offen / prüfen</span></div><div><strong>${otherCount}</strong><span>Andere Status</span></div></div>
        <div class="section-label">MISSIONEN · STATUS</div><div class="missions">${statusHtml}</div>
        ${statusItems.length > 5 ? `<div class="more-status">+${statusItems.length - 5} weitere Statussensoren</div>` : ""}
        ${controls ? `<details class="actions"><summary>Missionen & Punkte verwalten <span>${actions.length + pointButtons.length} Aktionen</span></summary>${controls}</details>` : ""}
      </article>`;
    }).join("");
    const allTasks = profiles.reduce((sum, p) => {
      const s = this._find(p, "aufgaben");
      const n = Number(s?.state);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const totalPoints = profiles.reduce((sum, p) => {
      const s = this._find(p, "points");
      const n = Number(s?.state);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const now = new Date();
    const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; color:#eaf5ff; font-family:var(--primary-font-family,Roboto,"Arial",sans-serif); }
        * { box-sizing:border-box; }
        .shell { overflow:hidden; border-radius:16px; background:#050d17; border:1px solid #173c58; box-shadow:0 8px 28px #0006; }
        .hero { position:relative; padding:18px 20px 16px; background:radial-gradient(ellipse at 80% 0%,#0d4165 0%,transparent 46%),linear-gradient(110deg,#071827,#0a2034 60%,#06111d); border-bottom:1px solid #1b4966; }
        .hero:after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.18; background:repeating-linear-gradient(0deg,transparent 0 5px,#2aa8d7 6px,transparent 7px); }
        .hero-row { position:relative; z-index:1; display:flex; align-items:center; gap:14px; }
        .mark { display:grid; place-items:center; width:48px; height:48px; flex:0 0 48px; border:2px solid #65d7ff; border-radius:50%; color:#7de1ff; font-weight:900; font-size:22px; box-shadow:0 0 18px #0aa5e755,inset 0 0 14px #0aa5e722; }
        .brand { flex:1; min-width:0; } .eyebrow { color:#76d9ff; font-size:9px; letter-spacing:2.2px; font-weight:800; }
        h1 { margin:3px 0 3px; font-size:clamp(19px,3vw,28px); letter-spacing:2px; font-weight:900; } .subtitle { color:#a6c4d8; font-size:11px; }
        .clock { text-align:right; font-size:clamp(22px,4vw,32px); font-weight:800; letter-spacing:-1px; } .date { color:#b7ccdc; font-size:10px; margin-top:3px; }
        .overview { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:12px; background:#071321; border-bottom:1px solid #17354c; }
        .metric { padding:10px 12px; border:1px solid #173b54; border-radius:8px; background:linear-gradient(140deg,#0b1d2d,#081522); min-width:0; }
        .metric label { display:block; color:#83b6d2; font-size:9px; letter-spacing:1.3px; text-transform:uppercase; } .metric strong { display:block; color:#eaf8ff; font-size:22px; margin-top:4px; }
        .content { padding:12px; } .section-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:0 0 10px; color:#a6d9ef; font-size:10px; letter-spacing:1.8px; font-weight:800; } .section-heading span { color:#5e91ad; font-size:9px; letter-spacing:0; }
        .command-grid { display:grid; grid-template-columns:minmax(155px,.78fr) minmax(0,2fr) minmax(170px,.88fr); gap:10px; align-items:start; }
        .side-stack { display:grid; gap:10px; min-width:0; }
        .side-panel { min-width:0; padding:11px; border:1px solid #1a3b51; border-radius:10px; background:linear-gradient(155deg,#0c1b2a,#08121e 70%); }
        .panel-title { margin:0 0 10px; color:#78d7fa; font-size:9px; letter-spacing:1.4px; font-weight:800; }
        .weather-main { display:flex; align-items:center; gap:10px; padding:6px 0; }
        .weather-symbol { display:grid; place-items:center; width:42px; height:42px; border-radius:50%; border:1px solid #24617b; background:#0b2a40; color:#8be2ff; font-size:22px; }
        .weather-main strong { display:block; font-size:22px; color:#effaff; } .weather-main span { display:block; color:#80a9c0; font-size:9px; margin-top:3px; }
        .weather-condition { color:#c0d7e5; font-size:10px; text-transform:capitalize; border-top:1px solid #173247; padding-top:8px; margin-top:7px; }
        .calendar-row { display:grid; gap:4px; padding:8px 0; border-bottom:1px solid #173247; }
        .calendar-row:last-child { border-bottom:0; } .calendar-date { color:#53c6ef; font-size:9px; } .calendar-row strong { color:#d5e7f2; font-size:10px; line-height:1.4; font-weight:600; }
        .climate-row { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid #173247; }
        .climate-row:last-child { border-bottom:0; } .climate-row span { color:#b8d0df; font-size:9px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .climate-row strong { color:#f2f9ff; font-size:12px; white-space:nowrap; }
        .alert-row { display:flex; gap:7px; align-items:flex-start; padding:7px 0; border-bottom:1px solid #173247; } .alert-row div { min-width:0; } .alert-row strong { display:block; color:#d7e9f3; font-size:10px; overflow-wrap:anywhere; } .alert-row div span { display:block; color:#729bb2; font-size:9px; margin-top:3px; }
        .profiles { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .profile { min-width:0; padding:12px; border:1px solid #1a3b51; border-radius:10px; background:linear-gradient(155deg,#0c1b2a,#08121e 70%); box-shadow:inset 0 1px #ffffff05; }
        .profile-top { display:flex; align-items:center; gap:9px; min-width:0; } .avatar { display:grid; place-items:center; width:35px; height:35px; flex:0 0 35px; border:1px solid #1aa5d2; border-radius:50%; color:#9be9ff; background:#0a2b41; font-size:16px; font-weight:800; }
        .profile-title { min-width:0; flex:1; } h3 { margin:0 0 3px; font-size:14px; color:#f0f8ff; } .profile-title span { color:#79a6c0; font-size:10px; }
        .profile-chip { color:#80e3ff; font-size:18px; font-weight:800; text-align:right; } .profile-chip small { display:block; color:#648ca5; font-size:8px; font-weight:600; }
        .stats { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin:12px 0; } .stat { position:relative; padding:9px; background:#071421; border:1px solid #173247; border-radius:7px; min-width:0; }
        .stat-icon { float:right; color:#38bde9; font-size:15px; } .stat strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:18px; color:#f0f9ff; } .stat small { display:block; color:#729bb2; font-size:9px; margin-top:2px; }
        .section-label { margin:8px 0 5px; font-size:9px; letter-spacing:1.6px; font-weight:800; color:#66c8ef; } .missions { display:grid; gap:5px; }
        .mission-row { display:flex; align-items:center; gap:7px; padding:7px 0; border-bottom:1px solid #132b3d; min-width:0; } .status-dot { width:6px; height:6px; flex:0 0 6px; border-radius:50%; background:#55d6a2; box-shadow:0 0 8px #55d6a244; } .status-dot.pending { background:#f2b45e; box-shadow:0 0 8px #f2b45e44; }
        .mission-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#c7dce9; font-size:10px; text-transform:capitalize; } .mission-state { color:#7fb3cb; font-size:9px; max-width:42%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .empty { color:#62849a; font-size:10px; padding:8px 0; }
        details.actions { margin-top:10px; border-top:1px solid #18364a; padding-top:8px; } summary { cursor:pointer; color:#7edbff; font-size:10px; font-weight:700; } summary span { float:right; color:#668ca2; font-weight:400; } .action-list { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:8px; }
        button.action { min-width:0; padding:7px 8px; border:1px solid #1a526d; border-radius:6px; background:#0b2638; color:#b9eaff; font-size:10px; cursor:pointer; overflow-wrap:anywhere; } button.action:hover { background:#103c55; } button.action.positive { border-color:#1e745c; color:#a4f0d2; background:#0b2a29; } button.action.danger { border-color:#77454a; color:#ffb7b7; background:#2a171e; }
        .footer { display:flex; justify-content:space-between; gap:10px; padding:10px 14px; border-top:1px solid #18394f; color:#63869d; font-size:9px; letter-spacing:.4px; background:#050d16; }
        .toast { display:none; padding:10px 14px; color:#ffd98d; border-top:1px solid #624d2a; font-size:11px; background:#201a0d; }
        @media (max-width:900px) { .profiles { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:560px) { .hero { padding:14px 12px; } .hero-row { gap:9px; } .mark { width:38px;height:38px;flex-basis:38px;font-size:18px; } .eyebrow { font-size:7px;letter-spacing:1.2px; } .subtitle { font-size:9px; } .clock { font-size:21px; } .date { font-size:8px; } .overview { padding:8px;gap:5px; } .metric { padding:8px; } .metric label { font-size:7px;letter-spacing:.7px; } .metric strong { font-size:18px; } .content { padding:8px; } .profiles { grid-template-columns:1fr; gap:8px; } .profile { padding:11px; } .profile-chip { font-size:16px; } .footer { font-size:8px; } }
      </style>
      <div class="shell">
        <header class="hero">
          <div class="hero-row">
            <div class="mark">A</div>
            <div class="brand">
              <div class="eyebrow">STARK INDUSTRIES / FAMILY DIVISION</div>
              <h1>${this._escape(this._config.title)}</h1>
              <div class="subtitle">${this._escape(this._config.subtitle)}</div>
            </div>
            <div><div class="clock" data-clock>${time}</div><div class="date" data-date>${this._escape(date)}</div></div>
          </div>
        </header>
        <div class="overview">
          <div class="metric"><label>Familienmitglieder</label><strong>${profiles.length}</strong></div>
          <div class="metric"><label>Aufgaben laut ChoreOps</label><strong>${this._escape(this._num(allTasks))}</strong></div>
          <div class="metric"><label>Team-Punkte</label><strong>${this._escape(this._num(totalPoints))}</strong></div>
        </div>
        <main class="content">
          <div class="section-heading">TEAM · MISSIONEN <span>${profiles.length} PROFILE · CHOREOPS LIVE</span></div>
          <div class="profiles">${profileCards}</div>
        </main>
        <div class="toast" role="status"></div>
        <footer class="footer"><span>SHIELD.NET · CHOREOPS VERBUNDEN</span><span>FAMILIENZENTRALE · v1.0.0</span></footer>
      </div>`;

    this.shadowRoot.querySelectorAll("button[data-entity]").forEach(button => {
      button.addEventListener("click", async () => {
        const entityId = button.dataset.entity;
        const label = button.dataset.label || entityId;
        const needsConfirm = /ablehnen|strafe|verringern|genehmigen/i.test(entityId);
        if (needsConfirm && !window.confirm(`Aktion ausführen?\n\n${label}`)) return;
        try {
          const [domain] = entityId.split(".");
          await this._hass.callService(domain, "press", { entity_id: entityId });
          this._showToast(`Aktion ausgelöst: ${label}`);
        } catch (err) {
          this._showToast(`Aktion fehlgeschlagen: ${err?.message || err}`);
        }
      });
    });
  }

  _showToast(message) {
    const toast = this.shadowRoot.querySelector(".toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => { toast.style.display = "none"; }, 5000);
  }

  static getConfigElement() { return document.createElement("choreops-avengers-dashboard-editor"); }
  static getStubConfig() { return { title: "AVENGERS", subtitle: "Familienzentrale · Gemeinsame Missionen" }; }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, ChoreOpsAvengersDashboard);

class ChoreOpsAvengersDashboardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this.render(); }
  set hass(hass) { this._hass = hass; }
  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>div{display:grid;gap:8px;padding:8px}label{font-size:13px}input{font:inherit;padding:8px;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:6px}</style>
      <div><label>Titel <input id="title" value="${String(this._config?.title || "AVENGERS").replace(/&/g,"&amp;").replace(/"/g,"&quot;")}"></label>
      <label>Untertitel <input id="subtitle" value="${String(this._config?.subtitle || "Familienzentrale · Gemeinsame Missionen").replace(/&/g,"&amp;").replace(/"/g,"&quot;")}"></label></div>`;
    ["title","subtitle"].forEach(id => this.shadowRoot.getElementById(id).addEventListener("change", e => {
      this._config = { ...this._config, [id]: e.target.value };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    }));
  }
}
if (!customElements.get("choreops-avengers-dashboard-editor")) customElements.define("choreops-avengers-dashboard-editor", ChoreOpsAvengersDashboardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: "ChoreOps Avengers Dashboard",
  description: "Stark Industries inspired ChoreOps family command center",
  preview: true,
});
