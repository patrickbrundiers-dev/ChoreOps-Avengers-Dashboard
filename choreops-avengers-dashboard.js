/* ChoreOps Avengers Dashboard — standalone Home Assistant Lovelace card */
const CARD_TAG = "choreops-avengers-dashboard";
const HERO_THEMES = {
  nele: {
    name: "SPIDER-MAN", color: "#e54b55", glow: "rgba(229,75,85,.20)",
    svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 35 10 40 21 37 34 24 43 11 34 8 21 13 10Z" fill="#a92031" stroke="#ff7b84" stroke-width="1.6"/><path d="M24 6V42M10 15 38 33M38 15 10 33M13 10 35 38M35 10 13 38" fill="none" stroke="#ffb1b5" stroke-width="1.1" opacity=".8"/><path d="M13 20 21 22 18 28ZM35 20 27 22 30 28Z" fill="#f4fbff" stroke="#172235" stroke-width="1.5"/></svg>'
  },
  lisa: {
    name: "EISKÖNIGIN", color: "#79d9ff", glow: "rgba(121,217,255,.20)",
    svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 28 15 39 9 34 20 45 24 34 28 39 39 28 33 24 44 20 33 9 39 14 28 3 24 14 20 9 9 20 15Z" fill="#bff4ff" stroke="#e9fcff" stroke-width="1.2"/><path d="M24 11V37M11 24H37M15 15 33 33M33 15 15 33" stroke="#3f9ecb" stroke-width="1.8" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="#f8ffff"/></svg>'
  },
  leonie: {
    name: "HULK", color: "#64dc8b", glow: "rgba(100,220,139,.18)",
    svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 22 13 12 20 9 24 14 28 9 35 12 38 22 35 37 29 41 24 36 19 41 13 37Z" fill="#24864b" stroke="#8effa8" stroke-width="1.7"/><path d="M13 17 20 19 18 24 12 23ZM35 17 28 19 30 24 36 23Z" fill="#eaffef"/><path d="M17 29 22 31 26 31 31 29 29 35 24 37 19 35Z" fill="#173d29"/><path d="M9 28 14 31M39 28 34 31" stroke="#a5ffb6" stroke-width="2.5" stroke-linecap="round"/></svg>'
  },
  jenny: {
    name: "BLACK WIDOW", color: "#f07883", glow: "rgba(240,120,131,.18)",
    svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 29 17 40 12 34 23 42 30 29 30 24 42 19 30 6 30 14 23 8 12 19 17Z" fill="#5a1828" stroke="#ff8797" stroke-width="1.7"/><path d="M24 10V38M12 17 36 31M36 17 12 31" stroke="#ffc0c8" stroke-width="1.2" fill="none"/><path d="M16 23Q24 15 32 23Q24 31 16 23Z" fill="#ff8d9c"/><circle cx="24" cy="23" r="3" fill="#26101a"/></svg>'
  },
  patrick: {
    name: "IRON MAN", color: "#ffb454", glow: "rgba(255,180,84,.18)",
    svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 6 33 6 41 17 37 35 24 43 11 35 7 17Z" fill="#a92c32" stroke="#ffc36d" stroke-width="1.7"/><path d="M15 10 24 14 33 10 35 22 30 34 24 38 18 34 13 22Z" fill="#e84c42" stroke="#ffb454" stroke-width="1.2"/><path d="M13 20 21 22 18 26 12 25ZM35 20 27 22 30 26 36 25Z" fill="#9ef2ff" stroke="#e7fcff" stroke-width="1"/><path d="M20 29 24 27 28 29 26 34 22 34Z" fill="#ffdc87"/><circle cx="24" cy="30" r="2" fill="#fff4bc"/></svg>'
  }
};
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
    this._openActionProfiles = new Set();
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
    // Preserve each profile's disclosure state across Home Assistant state refreshes.
    const previousActions = this.shadowRoot.querySelectorAll("details.actions[data-profile-actions]");
    if (previousActions.length) {
      this._openActionProfiles.clear();
      previousActions.forEach(details => {
        if (details.open) this._openActionProfiles.add(details.dataset.profileActions);
      });
    }
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
        const friendly = this._friendly(entityId, state);
        const name = friendly
          .replace(profile.name + " (ChoreOps) ", "")
          .replace("Aufgabenstatus - ", "")
          .replace("Aufgabenstatus: ", "")
          .replace("ChoreOps - ", "");
        const normalized = val.trim().toLowerCase();
        const unavailable = /^(unknown|unavailable|none|null|n\/a|nicht verfügbar|nicht_verfügbar|—|-)$/.test(normalized);
        const done = !unavailable && /(erledigt|abgeschlossen|completed|complete|done|fertig|genehmigt|approved|^true$|^on$|^yes$|^ja$)/i.test(normalized);
        const pending = !unavailable && !done && /(offen|pending|ausstehend|todo|to do|in arbeit|in bearbeitung|wartet|started|^false$|^off$|^no$|^nein$)/i.test(normalized);
        const statusType = unavailable ? "unavailable" : done ? "done" : pending ? "pending" : "other";
        const statusLabel = unavailable ? "Nicht verfügbar" : done ? "Erledigt" : pending ? "Offen" : val;
        return {
          name: name || entityId.split(".").pop().replace(profile.id + "_choreops_", "").replaceAll("_", " "),
          val,
          statusType,
          statusLabel,
        };
      });
      return { profile, tasks, points, badge, actions, pointButtons, statusItems, score: Number.isFinite(score) ? score : 0 };
    });
    const maxScore = Math.max(1, ...profileData.map(item => item.score));
    const rankById = {};
    let rank = 0;
    let previousScore = null;
    [...profileData].sort((a, b) => b.score - a.score).forEach((item, index) => {
      if (previousScore === null || item.score !== previousScore) rank = index + 1;
      rankById[item.profile.id] = rank;
      previousScore = item.score;
    });
    const profileCards = profileData.map(item => {
      const { profile, tasks, points, badge, actions, pointButtons, statusItems, score } = item;
      const hero = HERO_THEMES[profile.id] || { name: "TEAM AVENGERS", svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 29 18 44 18 32 27 36 42 24 33 12 42 16 27 4 18 19 18Z" fill="#9be9ff"/></svg>', color: "#1aa5d2", glow: "rgba(26,165,210,.16)" };
      const heroStyle = "--hero-color:" + hero.color + ";--hero-glow:" + hero.glow + ";";
      const pendingCount = statusItems.filter(status => status.statusType === "pending").length;
      const doneCount = statusItems.filter(status => status.statusType === "done").length;
      const unavailableCount = statusItems.filter(status => status.statusType === "unavailable").length;
      const otherCount = statusItems.filter(status => status.statusType === "other").length;
      const progress = Math.max(0, Math.min(100, Math.round(score / maxScore * 100)));
      const badgeValue = badge?.state && !["unknown", "unavailable", "None", "none", ""].includes(String(badge.state)) ? String(badge.state) : "Noch keine";
      const statusHtml = statusItems.length
        ? statusItems.slice(0, 5).map(status => `<div class="mission-row"><span class="status-dot ${status.statusType}"></span><span class="mission-name">${this._escape(status.name)}</span><span class="mission-state state-${status.statusType}">${this._escape(status.statusLabel)}</span></div>`).join("")
        : `<div class="empty">Keine Aufgabenstatus-Entitäten gefunden.</div>`;
      const groups = [
        { title: "Aufgaben", items: actions },
        { title: "Punkte", items: pointButtons },
      ].filter(group => group.items.length);
      const controls = groups.map(group => `<div class="action-group"><div class="action-group-title">${this._escape(group.title)}</div><div class="action-list">${group.items.slice(0, 12).map(({ entityId, state }) => {
        const name = this._friendly(entityId, state);
        const lower = entityId.toLowerCase();
        const isPointsAction = group.title === "Punkte";
        const danger = /ablehnen|strafe|verringern|abziehen|löschen|loeschen|entfernen|zurücksetzen|reset|delete|minus|subtract|remove/.test(lower);
        const positive = /genehmigen|beanspruchen|erhöhen|hinzufügen|add|plus/.test(lower);
        const needsConfirm = danger || isPointsAction || /genehmigen|ablehnen|beanspruchen|verringern|erhöhen|abziehen/.test(lower);
        const safeLabel = name.replace(/^[^–-]+[–-]\s*/, "");
        return `<button class="action ${danger ? "danger" : positive ? "positive" : ""} ${needsConfirm ? "confirm-action" : ""}" data-entity="${this._escape(entityId)}" data-label="${this._escape(safeLabel)}" data-confirm="${needsConfirm ? "true" : "false"}" aria-label="${this._escape((danger ? "Achtung: " : "") + safeLabel)}">${danger ? "⚠ " : isPointsAction ? "✦ " : ""}${this._escape(safeLabel)}</button>`;
      }).join("")}</div></div>`).join("");
      return `<article class="profile">
        <div class="profile-top" style="${heroStyle}"><div class="avatar hero-avatar" title="${this._escape(hero.name)}">${hero.svg}</div><div class="profile-title"><h3>${this._escape(profile.name)}</h3><span>${this._escape(profile.role)}</span><div class="hero-title"><span class="hero-dot"></span>${this._escape(hero.name)}</div></div><div class="rank-chip">#${rankById[profile.id] || "—"}<small>RANG</small></div></div>
        <div class="stats"><div class="stat"><span class="stat-icon">✦</span><strong>${this._escape(this._num(points?.state ?? "—"))}</strong><small>Punkte</small></div><div class="stat"><span class="stat-icon">⬡</span><strong class="badge-value">${this._escape(badgeValue)}</strong><small>Abzeichen</small></div></div>
        <div class="score-progress"><div class="progress-caption"><span>PUNKTE-FORTSCHRITT</span><strong>${progress}%</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div><div class="progress-note">Relativer Punktestand innerhalb der Familie</div></div>
        <div class="mission-summary"><div><strong>${pendingCount}</strong><span>Offen</span></div><div><strong>${doneCount}</strong><span>Erledigt</span></div><div><strong>${unavailableCount + otherCount}</strong><span>Unklar / offline</span></div></div>
        <div class="section-label">MISSIONEN · STATUS</div><div class="missions">${statusHtml}</div>
        ${statusItems.length > 5 ? `<div class="more-status">+${statusItems.length - 5} weitere Statussensoren</div>` : ""}
        ${controls ? `<details class="actions" data-profile-actions="${this._escape(profile.id)}"><summary>Missionen & Punkte verwalten <span>${actions.length + pointButtons.length} Aktionen</span></summary>${controls}</details>` : ""}
      </article>`;
    }).join("");
    const openMissions = profiles.reduce((sum, p) => {
      const statuses = this._entities(`${p.id}_choreops_aufgabenstatus_`, "sensor");
      return sum + statuses.filter(({ state }) => {
        const value = String(state.state ?? "unknown").trim().toLowerCase();
        return !/^(unknown|unavailable|none|null|n\/a|nicht verfügbar|nicht_verfügbar|—|-)$/.test(value)
          && /(offen|pending|ausstehend|todo|to do|in arbeit|in bearbeitung|wartet|started|^false$|^off$|^no$|^nein$)/i.test(value)
          && !/(erledigt|abgeschlossen|completed|complete|done|fertig|genehmigt|approved|^true$|^on$|^yes$|^ja$)/i.test(value);
      }).length;
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
        .profile-top { display:flex; align-items:center; gap:9px; min-width:0; } .avatar { display:grid; place-items:center; width:42px; height:42px; flex:0 0 42px; border:1px solid var(--hero-color,#1aa5d2); border-radius:50%; color:var(--hero-color,#9be9ff); background:radial-gradient(circle,var(--hero-glow,rgba(26,165,210,.16)),#071421 72%); box-shadow:0 0 14px var(--hero-glow,rgba(26,165,210,.16)),inset 0 0 10px var(--hero-glow,rgba(26,165,210,.16)); font-size:22px; overflow:hidden; } .avatar svg { display:block; width:100%; height:100%; padding:6px; box-sizing:border-box; filter:drop-shadow(0 0 3px var(--hero-glow,transparent)); } .hero-title { display:flex; align-items:center; gap:5px; margin-top:5px; color:var(--hero-color,#66c8ef); font-size:8px; letter-spacing:1.2px; font-weight:800; } .hero-title .hero-dot { width:5px; height:5px; flex:0 0 5px; border-radius:50%; background:var(--hero-color,#1aa5d2); box-shadow:0 0 7px var(--hero-color,#1aa5d2); }
        .profile-title { min-width:0; flex:1; } h3 { margin:0 0 3px; font-size:14px; color:#f0f8ff; } .profile-title span { color:#79a6c0; font-size:10px; }
        .rank-chip { color:#80e3ff; font-size:18px; font-weight:800; text-align:right; } .rank-chip small { display:block; color:#648ca5; font-size:8px; font-weight:600; }
        .stats { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin:10px 0; } .stat { position:relative; padding:9px; background:#071421; border:1px solid #173247; border-radius:7px; min-width:0; }
        .stat-icon { float:right; color:#38bde9; font-size:15px; } .stat strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:18px; color:#f0f9ff; } .stat strong.badge-value { font-size:12px; } .stat small { display:block; color:#729bb2; font-size:9px; margin-top:2px; }
        .score-progress { margin:8px 0 10px; } .progress-caption { display:flex; justify-content:space-between; gap:8px; color:#70b9d7; font-size:8px; letter-spacing:1px; } .progress-caption strong { color:#a8eaff; font-size:10px; } .progress-track { height:5px; overflow:hidden; margin-top:5px; border-radius:99px; background:#122b3c; } .progress-track span { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,#087fb0,#5be0ff); box-shadow:0 0 9px #23bce777; } .progress-note { margin-top:4px; color:#587e94; font-size:8px; }
        .mission-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; margin:10px 0; } .mission-summary div { padding:7px 5px; text-align:center; border:1px solid #173247; border-radius:6px; background:#071421; } .mission-summary strong { display:block; color:#e9f8ff; font-size:15px; } .mission-summary span { display:block; color:#719bb2; font-size:8px; margin-top:3px; }
        .section-label { margin:8px 0 5px; font-size:9px; letter-spacing:1.6px; font-weight:800; color:#66c8ef; } .missions { display:grid; gap:5px; }
        .mission-row { display:flex; align-items:center; gap:7px; padding:7px 0; border-bottom:1px solid #132b3d; min-width:0; } .status-dot { width:7px; height:7px; flex:0 0 7px; border-radius:50%; background:#55d6a2; box-shadow:0 0 8px #55d6a244; } .status-dot.pending { background:#f2b45e; box-shadow:0 0 8px #f2b45e44; } .status-dot.unavailable { background:#ff6b78; box-shadow:0 0 8px #ff6b7844; } .status-dot.other { background:#8ba7ba; box-shadow:none; }
        .mission-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#c7dce9; font-size:10px; text-transform:capitalize; } .mission-state { color:#7fb3cb; font-size:9px; max-width:42%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .mission-state.state-pending { color:#ffc86f; } .mission-state.state-done { color:#80e6b3; } .mission-state.state-unavailable { color:#ff8d99; } .mission-state.state-other { color:#9bb1bf; }
        .more-status { margin-top:6px; color:#5f91aa; font-size:9px; }
        .empty { color:#62849a; font-size:10px; padding:8px 0; }
        details.actions { margin-top:10px; border-top:1px solid #18364a; padding-top:8px; } summary { cursor:pointer; color:#7edbff; font-size:10px; font-weight:700; } summary span { float:right; color:#668ca2; font-weight:400; } .action-group { margin-top:8px; } .action-group-title { color:#6899b3; font-size:8px; letter-spacing:1px; text-transform:uppercase; } .action-list { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:6px; }
        button.action { min-width:0; min-height:36px; padding:8px 9px; border:1px solid #1a526d; border-radius:7px; background:#0b2638; color:#b9eaff; font-size:10px; line-height:1.25; cursor:pointer; overflow-wrap:anywhere; touch-action:manipulation; } button.action:hover { background:#103c55; } button.action:focus-visible, summary:focus-visible { outline:2px solid #8be2ff; outline-offset:2px; } button.action:disabled { opacity:.55; cursor:wait; } button.action.positive { border-color:#1e745c; color:#a4f0d2; background:#0b2a29; } button.action.danger { border-color:#b34d58; color:#ffd0d4; background:#35151d; box-shadow:inset 3px 0 #ff6575; } button.action.confirm-action { border-style:dashed; }
        .footer { display:flex; justify-content:space-between; gap:10px; padding:10px 14px; border-top:1px solid #18394f; color:#63869d; font-size:9px; letter-spacing:.4px; background:#050d16; }
        .toast { display:none; padding:10px 14px; color:#ffd98d; border-top:1px solid #624d2a; font-size:11px; background:#201a0d; }
        @media (max-width:900px) { .profiles { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:560px) { .hero { padding:14px 12px; } .hero-row { gap:9px; } .mark { width:38px;height:38px;flex-basis:38px;font-size:18px; } .eyebrow { font-size:7px;letter-spacing:1.2px; } .subtitle { font-size:9px; } .clock { font-size:21px; } .date { font-size:8px; } .overview { padding:8px;gap:5px; } .metric { padding:8px; } .metric label { font-size:7px;letter-spacing:.7px; } .metric strong { font-size:18px; } .content { padding:8px; } .profiles { grid-template-columns:1fr; gap:8px; } .profile { padding:10px; } .profile-top { gap:8px; } .avatar { width:38px; height:38px; flex-basis:38px; } .stats { margin:8px 0; gap:6px; } .stat { padding:7px; } .mission-summary { margin:8px 0; } .mission-row { gap:6px; padding:5px 0; } .mission-name { font-size:11px; } .mission-state { max-width:38%; font-size:10px; } .missions .mission-row:nth-child(n+5) { display:none; } details.actions { margin-top:8px; } summary { display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:44px; padding:6px 0; font-size:11px; } summary span { float:none; flex:0 0 auto; } .action-list { grid-template-columns:1fr; gap:7px; } button.action { min-height:44px; padding:10px 12px; text-align:left; font-size:12px; } .footer { font-size:8px; } }
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
          <div class="metric"><label>Offene Missionen</label><strong>${this._escape(this._num(openMissions))}</strong></div>
          <div class="metric"><label>Team-Punkte</label><strong>${this._escape(this._num(totalPoints))}</strong></div>
        </div>
        <main class="content">
          <div class="section-heading">TEAM · MISSIONEN <span>${profiles.length} PROFILE · CHOREOPS LIVE</span></div>
          <div class="profiles">${profileCards}</div>
        </main>
        <div class="toast" role="status"></div>
        <footer class="footer"><span>SHIELD.NET · CHOREOPS VERBUNDEN</span><span>FAMILIENZENTRALE · v1.0.0</span></footer>
      </div>`;

    this.shadowRoot.querySelectorAll("details.actions[data-profile-actions]").forEach(details => {
      const profileId = details.dataset.profileActions;
      details.open = this._openActionProfiles.has(profileId);
      details.addEventListener("toggle", () => {
        if (details.open) this._openActionProfiles.add(profileId);
        else this._openActionProfiles.delete(profileId);
      });
    });

    this.shadowRoot.querySelectorAll("button[data-entity]").forEach(button => {
      button.addEventListener("click", async () => {
        const entityId = button.dataset.entity;
        const label = button.dataset.label || entityId;
        const needsConfirm = button.dataset.confirm === "true";
        if (needsConfirm) {
          const warning = button.classList.contains("danger")
            ? "ACHTUNG: Diese Aktion kann Punkte abziehen oder eine Mission ablehnen."
            : "Bitte bestätige, dass du diese Punkte- oder Verwaltungsaktion ausführen möchtest.";
          if (!window.confirm(`${warning}\n\n${label}\n\nJetzt ausführen?`)) return;
        }
        if (button.disabled) return;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Wird ausgeführt …";
        try {
          const [domain] = entityId.split(".");
          await this._hass.callService(domain, "press", { entity_id: entityId });
          this._showToast(`Aktion ausgelöst: ${label}`);
        } catch (err) {
          this._showToast(`Aktion fehlgeschlagen: ${err?.message || err}`);
        } finally {
          button.disabled = false;
          button.textContent = originalText;
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
