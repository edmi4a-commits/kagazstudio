// KumailDoc Studio — Admin Panel & Global Site Config Manager
(function (global) {
  const CFG_KEY = "kagazstudio_site_cfg_v1";
  const PIN_KEY = "kagazstudio_admin_pin_v2";
  const DEFAULT_PIN_HASH = "3979f942-14a09ff8";
  let currentCfg = null;

  const DEFAULT_CFG = {
    brandName: "KagazStudio",
    brandTag: "PDF • Image • CSC Studio",
    heroChip: "✨ 60-in-1 Studio • Live A4 & Canvas Preview • 100% Free",
    heroTitle: "Every PDF, Image & CSC Tool in One Beautiful Studio",
    heroDesc: "Merge PDFs, compress photos to exact KB, print Passport & PVC A4 sheets, and generate instant GST Invoices & Resumes — right in your browser.",
    ownerCredit: "Crafted & Owned by Kumail • KagazStudio",
    ownerLink: "",
    announcementOn: false,
    announcementText: "Welcome to KagazStudio — 60+ Free PDF, Image & CSC Tools!",
    disabledTools: []
  };

  function hashPin(p) {
    let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
    const s = "kagazstudio::" + p + "::v2";
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 0x01000193);
      h2 ^= c + i; h2 = Math.imul(h2, 0x85ebca6b);
    }
    return (h1 >>> 0).toString(16).padStart(8, "0") + "-" + (h2 >>> 0).toString(16).padStart(8, "0");
  }

  function verifyPin(input) {
    try {
      const stored = global.localStorage && global.localStorage.getItem(PIN_KEY);
      return hashPin(input) === (stored || DEFAULT_PIN_HASH);
    } catch (_) {
      return hashPin(input) === DEFAULT_PIN_HASH;
    }
  }

  function loadConfigSync() {
    if (currentCfg) return currentCfg;
    try {
      const raw = global.localStorage && global.localStorage.getItem(CFG_KEY);
      if (raw) { currentCfg = Object.assign({}, DEFAULT_CFG, JSON.parse(raw)); return currentCfg; }
    } catch (_) {}
    currentCfg = Object.assign({}, DEFAULT_CFG);
    return currentCfg;
  }

  async function initRemoteConfig(onApply) {
    try {
      if (typeof fetch === "function") {
        const res = await fetch("site-config.json", { cache: "no-store" });
        if (res.ok) {
          const remote = await res.json();
          const localRaw = global.localStorage && global.localStorage.getItem(CFG_KEY);
          currentCfg = localRaw ? Object.assign({}, DEFAULT_CFG, remote, JSON.parse(localRaw)) : Object.assign({}, DEFAULT_CFG, remote);
        }
      }
    } catch (_) {}
    if (onApply) onApply(loadConfigSync());
  }

  function saveConfig(patch) {
    currentCfg = Object.assign({}, loadConfigSync(), patch);
    try { if (global.localStorage) global.localStorage.setItem(CFG_KEY, JSON.stringify(currentCfg)); } catch (_) {}
    return currentCfg;
  }

  function applyBrandingToDom(cfg) {
    if (typeof document === "undefined") return;
    const $ = id => document.getElementById(id);
    if ($("brandNameEl")) $("brandNameEl").textContent = cfg.brandName;
    if ($("brandTagEl")) $("brandTagEl").textContent = cfg.brandTag;
    if ($("heroChipEl")) $("heroChipEl").textContent = cfg.heroChip;
    if ($("heroDescEl")) $("heroDescEl").textContent = cfg.heroDesc;
    if ($("ownerBadgeEl")) {
      $("ownerBadgeEl").innerHTML = cfg.ownerLink
        ? `<b>${cfg.ownerCredit}</b> • <a href="${cfg.ownerLink}" target="_blank" rel="noopener" style="color:var(--blue);">Contact</a>`
        : `<b>${cfg.ownerCredit}</b>`;
    }
    const bar = $("announceBar");
    if (bar) {
      bar.textContent = cfg.announcementText || "";
      bar.classList.toggle("hidden", !cfg.announcementOn || !cfg.announcementText);
    }
    document.title = `${cfg.brandName} — All-in-One PDF, Image & CSC Studio`;
  }

  function openAdminModal(onRefresh, toast) {
    const modal = document.getElementById("adminModal");
    const body = document.getElementById("adminBody");
    if (!modal || !body) return;
    modal.classList.remove("hidden");

    const drawLogin = () => {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Enter Admin Password / PIN</label>
          <input class="input" id="admPinIn" type="password" placeholder="Enter Admin PIN..." autocomplete="current-password" />
        </div>
        <button class="btn btn-primary" id="admLoginBtn">Unlock Admin Panel</button>`;
      const submitLogin = () => {
        if (verifyPin(body.querySelector("#admPinIn").value)) drawDashboard();
        else toast("Incorrect Admin PIN!");
      };
      body.querySelector("#admLoginBtn").onclick = submitLogin;
      body.querySelector("#admPinIn").addEventListener("keydown", e => { if (e.key === "Enter") submitLogin(); });
    };

    const drawDashboard = () => {
      const cfg = loadConfigSync();
      const tools = global.PRO_TOOLS || [];
      body.innerHTML = `
        <div class="form-group"><label class="form-label">Website Brand Name</label><input class="input" id="acBrand" value="${cfg.brandName}" /></div>
        <div class="form-group"><label class="form-label">Owner / Footer Identity</label><input class="input" id="acOwner" value="${cfg.ownerCredit}" /></div>
        <div class="form-group"><label class="form-label">Owner Contact / Social Link (optional)</label><input class="input" id="acLink" value="${cfg.ownerLink || ""}" placeholder="https://instagram.com/... or mailto:..." /></div>
        <div class="form-group">
          <label class="form-label">Announcement Banner (${cfg.announcementOn ? "ON" : "OFF"})</label>
          <div class="row-2">
            <input class="input" id="acAnnTxt" value="${cfg.announcementText}" />
            <button class="btn btn-outline" id="acAnnTog">${cfg.announcementOn ? "Turn OFF" : "Turn ON"}</button>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Change Admin PIN</label><input class="input" id="acNewPin" placeholder="New PIN (leave blank to keep)" /></div>
        <div class="row-2" style="margin-bottom:14px;">
          <button class="btn btn-primary" id="acSave">Save Changes</button>
          <button class="btn btn-blue" id="acExport">Export site-config.json</button>
        </div>
        <div class="form-label">Manage Tools Visibility (${tools.length - cfg.disabledTools.length}/${tools.length} Active)</div>
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:8px;">
          ${tools.map(t => {
            const off = cfg.disabledTools.includes(t.id);
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px;">
              <span>${t.title}</span>
              <button class="btn btn-outline btn-sm" onclick="window._admTogTool('${t.id}')">${off ? "Hidden (Show)" : "Active ✓"}</button>
            </div>`;
          }).join("")}
        </div>`;

      body.querySelector("#acAnnTog").onclick = () => {
        saveConfig({ announcementOn: !loadConfigSync().announcementOn, announcementText: body.querySelector("#acAnnTxt").value });
        applyBrandingToDom(loadConfigSync());
        drawDashboard();
      };
      body.querySelector("#acSave").onclick = () => {
        const np = body.querySelector("#acNewPin").value.trim();
        if (np) {
          if (np.length < 6) {
            toast("New PIN must be at least 6 characters!");
            return;
          }
          if (global.localStorage) global.localStorage.setItem(PIN_KEY, hashPin(np));
        }
        const updated = saveConfig({
          brandName: body.querySelector("#acBrand").value.trim() || "KumailDoc Studio",
          ownerCredit: body.querySelector("#acOwner").value.trim() || "Crafted & Owned by Kumail",
          ownerLink: body.querySelector("#acLink").value.trim(),
          announcementText: body.querySelector("#acAnnTxt").value.trim()
        });
        applyBrandingToDom(updated);
        if (onRefresh) onRefresh();
        toast("Admin Settings Saved!");
      };
      body.querySelector("#acExport").onclick = () => {
        const json = JSON.stringify(loadConfigSync(), null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "site-config.json"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        toast("site-config.json exported!");
      };
      window._admTogTool = tid => {
        const c = loadConfigSync(), idx = c.disabledTools.indexOf(tid);
        if (idx >= 0) c.disabledTools.splice(idx, 1); else c.disabledTools.push(tid);
        saveConfig({ disabledTools: c.disabledTools });
        if (onRefresh) onRefresh();
        drawDashboard();
      };
    };

    drawLogin();
  }

  global.SiteAdmin = { loadConfigSync, initRemoteConfig, applyBrandingToDom, openAdminModal };
})(typeof window !== "undefined" ? window : global);
