// ProPDF & Cyber Tools — Main Web Portal Controller
(function () {
  const $ = id => document.getElementById(id);

  const CAT_STYLE = {
    pdf: { bg: "#FFF1F2", fg: "#E11D48", label: "PDF Tool", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
    image: { bg: "#EFF6FF", fg: "#1D4ED8", label: "Image & Photo", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` },
    csc: { bg: "#F0FDFA", fg: "#0D9488", label: "CSC & Docs", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` }
  };

  let activeCat = "all", query = "";

  function toast(msg) {
    const t = $("toast"); if (!t) return;
    t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => t.classList.add("hidden"), 2400);
  }

  function renderGrid() {
    const disabled = (window.SiteAdmin && SiteAdmin.loadConfigSync().disabledTools) || [];
    const list = window.PRO_TOOLS.filter(t => {
      if (disabled.includes(t.id)) return false;
      const catOk = activeCat === "all" || t.cat === activeCat;
      const qOk = !query || t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query);
      return catOk && qOk;
    });

    const titles = { all: "All 60 Tools", pdf: "PDF Tools (iLovePDF Suite)", image: "Image & Exam Photo Tools (Pi7 Suite)", csc: "CSC & Cyber Cafe Tools" };
    $("gridTitle").textContent = titles[activeCat] || "Tools";
    $("gridCount").textContent = `${list.length} tools available`;

    $("toolsGrid").innerHTML = list.map(t => {
      const st = CAT_STYLE[t.cat] || CAT_STYLE.pdf;
      return `<div class="tool-card" data-id="${t.id}">
        <div class="t-top">
          <div class="t-ico" style="background:${st.bg};color:${st.fg};">${st.svg}</div>
          <span class="t-cat" style="background:${st.bg};color:${st.fg};">${st.label}</span>
        </div>
        <div>
          <div class="t-title">${t.title}</div>
          <div class="t-desc">${t.desc}</div>
        </div>
      </div>`;
    }).join("");

    $("toolsGrid").querySelectorAll(".tool-card").forEach(c => c.onclick = () => openTool(c.dataset.id));
  }

  function openTool(id) {
    const tool = window.PRO_TOOLS.find(t => t.id === id);
    if (!tool) return;
    const st = CAT_STYLE[tool.cat] || CAT_STYLE.pdf;
    $("homeView").classList.add("hidden");
    $("workspaceView").classList.remove("hidden");
    $("wsTitle").textContent = tool.title;
    $("wsDesc").textContent = tool.desc;
    $("wsCatBadge").textContent = st.label;
    $("wsCatBadge").style.background = st.bg;
    $("wsCatBadge").style.color = st.fg;

    const body = $("wsBody");
    body.innerHTML = "";
    const handler = window.ENGINES && window.ENGINES[tool.engine];
    if (handler) handler(tool, body, toast);
    else body.innerHTML = `<div class="result-pre">Tool engine missing for ${tool.id}</div>`;
    window.scrollTo(0, 0);
  }

  function goHome(e) {
    if (e) e.preventDefault();
    $("workspaceView").classList.add("hidden");
    $("homeView").classList.remove("hidden");
  }

  function init() {
    renderGrid();
    $("navHome").onclick = goHome;
    $("btnBackHome").onclick = goHome;
    document.querySelectorAll(".nav-pill[data-cat]").forEach(p => p.onclick = () => {
      activeCat = p.dataset.cat;
      document.querySelectorAll(".nav-pill[data-cat]").forEach(x => x.classList.toggle("active", x === p));
      goHome();
      renderGrid();
    });
    const tb = $("btnTheme");
    if (tb) {
      if (localStorage.getItem("propdf_dark") === "1") { document.body.classList.add("dark"); tb.textContent = "☀️"; }
      tb.onclick = () => {
        const d = document.body.classList.toggle("dark");
        tb.textContent = d ? "☀️" : "🌙";
        localStorage.setItem("propdf_dark", d ? "1" : "0");
      };
    }
    document.querySelectorAll(".q-pill[data-open]").forEach(q => q.onclick = () => openTool(q.dataset.open));
    if (window.SiteAdmin) {
      SiteAdmin.initRemoteConfig(cfg => { SiteAdmin.applyBrandingToDom(cfg); renderGrid(); });
      if ($("btnAdmin")) $("btnAdmin").onclick = () => SiteAdmin.openAdminModal(renderGrid, toast);
      if ($("admClose")) $("admClose").onclick = () => $("adminModal").classList.add("hidden");
      if (new URLSearchParams(window.location.search).get("admin") === "1") {
        SiteAdmin.openAdminModal(renderGrid, toast);
      }
    }
    $("searchInput").oninput = e => {
      query = e.target.value.trim().toLowerCase();
      $("clearSearch").classList.toggle("hidden", !query);
      renderGrid();
    };
    $("clearSearch").onclick = () => { $("searchInput").value = ""; query = ""; $("clearSearch").classList.add("hidden"); renderGrid(); };
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", init);
})();
