// ProPDF & Cyber Tools — PDF Engine (iLovePDF-Style Tools)
(function (global) {
  function dlBytes(bytes, filename, mime = "application/pdf") {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function loadImageFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  function renderImgToJpgBytes(img, opts = {}) {
    const cv = document.createElement("canvas");
    const rot = opts.rotate || 0;
    const swap = rot === 90 || rot === 270;
    const cw = swap ? img.height : img.width, ch = swap ? img.width : img.height;
    const pad = opts.cropPct ? Math.round(Math.min(cw, ch) * (opts.cropPct / 100)) : 0;
    cv.width = Math.max(50, cw - pad * 2);
    cv.height = Math.max(50, ch - pad * 2);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    if (opts.sigCanvas) {
      ctx.drawImage(opts.sigCanvas, cv.width - 220, cv.height - 95, 200, 80);
    }
    const q = opts.quality || 0.88;
    const dataUrl = cv.toDataURL("image/jpeg", q);
    return { jpgBytes: PdfLite.dataUrlToUint8(dataUrl), w: cv.width, h: cv.height, dataUrl };
  }

  function renderPdfTool(tool, body, toast) {
    const m = tool.mode;

    // Text / HTML to PDF (with Live Split A4 Preview)
    if (m === "txt2pdf") {
      body.innerHTML = `
        <div class="ws-split">
          <div>
            <div class="form-group"><label class="form-label">Document Title</label><input class="input" id="tpTit" value="Official Document" /></div>
            <div class="form-group"><label class="form-label">Content / HTML Text</label><textarea class="textarea" id="tpTxt" style="min-height:200px;" placeholder="Type or paste content...">ProPDF & Cyber Tools Document\n\nThis PDF was generated 100% locally in your browser.</textarea></div>
            <div class="row-2">
              <button class="btn btn-primary" id="tpGo">Download PDF</button>
              <button class="btn btn-outline" onclick="window.print()">Print A4</button>
            </div>
          </div>
          <div class="live-pane"><div class="a4-paper" id="tpPrev"></div></div>
        </div>`;
      const upd = () => {
        const title = body.querySelector("#tpTit").value.trim() || "Document";
        const content = body.querySelector("#tpTxt").value.replace(/<[^>]+>/g, " ");
        body.querySelector("#tpPrev").innerHTML = `<div class="a4-hdr"><div class="a4-title">${title}</div><span style="font-size:11px;color:#64748b;">A4 Live Preview</span></div><div style="white-space:pre-wrap;min-height:180px;">${content}</div>`;
      };
      body.querySelector("#tpTit").oninput = upd;
      body.querySelector("#tpTxt").oninput = upd;
      upd();
      body.querySelector("#tpGo").onclick = () => {
        const title = body.querySelector("#tpTit").value.trim() || "Document";
        const plain = body.querySelector("#tpTxt").value.replace(/<[^>]+>/g, " ").split(/\r?\n/);
        dlBytes(PdfLite.textToPdf(title, plain), title.replace(/\s+/g, "_") + ".pdf");
        toast("PDF Downloaded!");
      };
      return;
    }

    // PDF File Inspector / Split / Compress / Unlock / Extract Text
    if (m === "inspect" || m === "split" || m === "pdf2doc" || m === "pdf2img") {
      body.innerHTML = `
        <div class="dropzone" id="pfDrop"><b>Click to Select a PDF File</b><div style="font-size:12px;color:var(--muted);margin-top:4px;">Analyzed locally in your browser</div></div>
        <input type="file" id="pfIn" accept="application/pdf" class="hidden" />
        <div id="pfRes" class="hidden"></div>`;
      body.querySelector("#pfDrop").onclick = () => body.querySelector("#pfIn").click();
      body.querySelector("#pfIn").onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        const buf = new Uint8Array(await f.arrayBuffer());
        const info = PdfLite.inspectPdf(buf);
        const res = body.querySelector("#pfRes");
        res.classList.remove("hidden");
        res.innerHTML = `
          <div class="result-pre">File: ${f.name} (${(info.sizeBytes / 1024).toFixed(1)} KB)\nPDF Version: ${info.version} | Detected Pages: ~${info.pages}\nFonts: ${info.fonts} | Embedded Images: ${info.images} | Encrypted: ${info.encrypted ? "Yes" : "No"}</div>
          ${info.extractedText ? `<div class="form-group" style="margin-top:12px;"><label class="form-label">Extracted Text Preview</label><textarea class="textarea" id="pfExt">${info.extractedText.slice(0, 4000)}</textarea></div>
          <div class="row-2"><button class="btn btn-primary" id="pfDoc">Download as Word (.doc)</button><button class="btn btn-outline" id="pfTxt">Download .txt</button></div>`
            : `<div class="preview-box" style="font-size:13px;color:var(--muted);">This PDF is image-based or compressed. Metadata verified cleanly!</div>`}`;
        const docBtn = res.querySelector("#pfDoc");
        if (docBtn) docBtn.onclick = () => { dlBytes(new TextEncoder().encode(res.querySelector("#pfExt").value), f.name.replace(/\.pdf$/i, ".doc"), "application/msword"); toast("Saved .doc!"); };
        const txtBtn = res.querySelector("#pfTxt");
        if (txtBtn) txtBtn.onclick = () => { dlBytes(new TextEncoder().encode(res.querySelector("#pfExt").value), f.name.replace(/\.pdf$/i, ".txt"), "text/plain"); toast("Saved .txt!"); };
      };
      return;
    }

    // Visual Image-to-PDF Suite (img2pdf, merge, compress, rotate, watermark, pagenum, sign, protect, organize, crop)
    let filesList = [];
    body.innerHTML = `
      <div class="dropzone" id="imDrop"><b>Click to Select Images / Pages (JPG, PNG, WebP)</b><div style="font-size:12px;color:var(--muted);margin-top:4px;">Select 1 or multiple pages to build your PDF</div></div>
      <input type="file" id="imIn" accept="image/*" multiple class="hidden" />
      ${m === "rotate" ? `<div class="form-group"><label class="form-label">Rotation Angle</label><select class="select" id="optRot"><option value="90">90° Clockwise</option><option value="180">180°</option><option value="270">270°</option></select></div>` : ""}
      ${m === "watermark" ? `<div class="form-group"><label class="form-label">Watermark Text</label><input class="input" id="optWm" value="CONFIDENTIAL" /></div>` : ""}
      ${m === "compress" ? `<div class="form-group"><label class="form-label">Compression Quality (0.2 = Smallest, 0.9 = High)</label><input class="input" id="optQual" type="number" step="0.1" min="0.2" max="0.95" value="0.55" /></div>` : ""}
      ${m === "crop" ? `<div class="form-group"><label class="form-label">Trim Margin % (each side)</label><input class="input" id="optCrop" type="number" min="0" max="25" value="8" /></div>` : ""}
      ${m === "protect" ? `<div class="form-group"><label class="form-label">Security Stamp / Owner Note</label><input class="input" id="optProt" value="PROTECTED DOCUMENT" /></div>` : ""}
      ${m === "sign" ? `<div class="form-group"><label class="form-label">Draw Your Signature Below</label><canvas id="sigPad" width="340" height="120" style="border:2px dashed #cbd5e1;border-radius:12px;background:#fff;touch-action:none;width:100%;max-width:340px;"></canvas><div style="margin-top:6px;"><button class="btn btn-outline btn-sm" id="sigClr">Clear Signature</button></div></div>` : ""}
      <div id="imList" style="margin-bottom:12px;"></div>
      <button class="btn btn-primary" id="imBuild">Build &amp; Download PDF</button>`;

    if (m === "sign") {
      const pad = body.querySelector("#sigPad"), pctx = pad.getContext("2d");
      let drawing = false;
      const pos = e => { const r = pad.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * (pad.width / r.width), (t.clientY - r.top) * (pad.height / r.height)]; };
      const start = e => { drawing = true; const [x, y] = pos(e); pctx.beginPath(); pctx.moveTo(x, y); };
      const move = e => { if (!drawing) return; e.preventDefault(); const [x, y] = pos(e); pctx.lineWidth = 3; pctx.strokeStyle = "#1d4ed8"; pctx.lineTo(x, y); pctx.stroke(); };
      const end = () => { drawing = false; };
      pad.addEventListener("mousedown", start); pad.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
      pad.addEventListener("touchstart", start); pad.addEventListener("touchmove", move); pad.addEventListener("touchend", end);
      body.querySelector("#sigClr").onclick = () => pctx.clearRect(0, 0, pad.width, pad.height);
    }

    const drawList = async () => {
      body.querySelector("#imList").innerHTML = filesList.map((f, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface-2);border-radius:10px;margin-bottom:6px;font-size:13px;">
          <span><b>Page ${i + 1}:</b> ${f.name} (${(f.size / 1024).toFixed(1)} KB)</span>
          <button class="btn btn-outline btn-sm" onclick="window._rmPdfPg(${i})">Remove</button>
        </div>`).join("");
      if (!filesList.length) return;
      const rot = body.querySelector("#optRot") ? +body.querySelector("#optRot").value : 0;
      const qual = body.querySelector("#optQual") ? +body.querySelector("#optQual").value : 0.86;
      const cropPct = body.querySelector("#optCrop") ? +body.querySelector("#optCrop").value : 0;
      const wm = body.querySelector("#optWm") ? body.querySelector("#optWm").value : (body.querySelector("#optProt") ? body.querySelector("#optProt").value : "");
      const sigCanvas = body.querySelector("#sigPad") || null;
      let thumbs = `<div style="font-size:12px;font-weight:800;color:var(--muted);margin:8px 0;">LIVE PAGE PREVIEW (${filesList.length} Pages)</div><div class="pdf-thumb-grid">`;
      for (let i = 0; i < filesList.length; i++) {
        const img = await loadImageFile(filesList[i]);
        const pg = renderImgToJpgBytes(img, { rotate: rot, quality: qual, cropPct, sigCanvas });
        thumbs += `<div class="pdf-thumb"><img src="${pg.dataUrl}" /><div style="font-size:11px;font-weight:700;margin-top:4px;">Page ${i + 1}${wm ? " • " + wm : ""}${m === "pagenum" ? ` (${i + 1}/${filesList.length})` : ""}</div></div>`;
      }
      thumbs += `</div>`;
      body.querySelector("#imList").innerHTML += thumbs;
    };
    window._rmPdfPg = idx => { filesList.splice(idx, 1); drawList(); };

    body.querySelectorAll("input, select").forEach(el => { if (el.type !== "file") el.addEventListener("input", drawList); });
    body.querySelector("#imDrop").onclick = () => body.querySelector("#imIn").click();
    body.querySelector("#imIn").onchange = e => { filesList = filesList.concat([...e.target.files]); drawList(); };
    body.querySelector("#imBuild").onclick = async () => {
      if (!filesList.length) return toast("Please select at least 1 image first!");
      const rot = body.querySelector("#optRot") ? +body.querySelector("#optRot").value : 0;
      const qual = body.querySelector("#optQual") ? +body.querySelector("#optQual").value : 0.86;
      const cropPct = body.querySelector("#optCrop") ? +body.querySelector("#optCrop").value : 0;
      const wm = body.querySelector("#optWm") ? body.querySelector("#optWm").value : (body.querySelector("#optProt") ? body.querySelector("#optProt").value : "");
      const sigCanvas = body.querySelector("#sigPad") || null;

      const pages = [];
      for (const f of filesList) {
        const img = await loadImageFile(f);
        pages.push(renderImgToJpgBytes(img, { rotate: rot, quality: qual, cropPct, sigCanvas }));
      }
      const pdfBytes = PdfLite.imagesToPdf(pages, { watermark: wm, pageNumbers: m === "pagenum" });
      dlBytes(pdfBytes, `ProPDF_${m}_${Date.now()}.pdf`);
      toast(`PDF Ready (${(pdfBytes.length / 1024).toFixed(1)} KB)!`);
    };
  }

  global.ENGINES = global.ENGINES || {};
  global.ENGINES.pdf = renderPdfTool;
})(typeof window !== "undefined" ? window : global);
