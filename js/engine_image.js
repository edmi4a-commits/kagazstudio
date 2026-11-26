// ProPDF & Cyber Tools — Image & Exam Photo Engine (Pi7-Style Tools)
(function (global) {
  function loadImg(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = r.result; };
      r.readAsDataURL(file);
    });
  }

  function dlDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl; a.download = filename; a.click();
  }

  function dataUrlBytes(u) { return Math.round((u.split(",")[1].length * 3) / 4); }

  function setJpegDpi(dataUrl, dpi) {
    const b64 = dataUrl.split(",")[1], bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    if (arr[2] === 0xff && arr[3] === 0xe0) {
      arr[13] = 1; arr[14] = (dpi >> 8) & 0xff; arr[15] = dpi & 0xff;
      arr[16] = (dpi >> 8) & 0xff; arr[17] = dpi & 0xff;
    }
    let out = ""; for (let i = 0; i < arr.length; i++) out += String.fromCharCode(arr[i]);
    return "data:image/jpeg;base64," + btoa(out);
  }

  function renderImageTool(tool, body, toast) {
    const m = tool.mode;

    // Multi-Image Tools: Photo+Sign Joiner, MPPEB Template, Joint/Couple Photo
    if (m === "join_ps" || m === "mppeb" || m === "joint") {
      body.innerHTML = `
        <div class="row-2 form-group">
          <div><label class="form-label">${m === "joint" ? "Photo 1" : "Passport Photo"}</label><input type="file" class="input" id="im1" accept="image/*" /></div>
          <div><label class="form-label">${m === "joint" ? "Photo 2" : "Signature Image"}</label><input type="file" class="input" id="im2" accept="image/*" /></div>
        </div>
        ${m === "mppeb" ? `<div class="form-group"><label class="form-label">Self-Declaration Text</label><input class="input" id="mpDecl" value="I hereby declare that all information provided is true." /></div>` : ""}
        <button class="btn btn-primary" id="jnGo">Generate Combined Image</button>
        <div id="jnOut" class="preview-box hidden"></div>`;
      body.querySelector("#jnGo").onclick = async () => {
        const f1 = body.querySelector("#im1").files[0], f2 = body.querySelector("#im2").files[0];
        if (!f1 || !f2) return toast("Please select both images!");
        const [i1, i2] = await Promise.all([loadImg(f1), loadImg(f2)]);
        const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
        if (m === "joint") {
          cv.width = 800; cv.height = 500; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 800, 500);
          ctx.drawImage(i1, 20, 20, 370, 460); ctx.drawImage(i2, 410, 20, 370, 460);
        } else if (m === "join_ps") {
          cv.width = 400; cv.height = 600; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 400, 600);
          ctx.drawImage(i1, 25, 20, 350, 420); ctx.strokeStyle = "#cbd5e1"; ctx.strokeRect(25, 455, 350, 120);
          ctx.drawImage(i2, 30, 460, 340, 110);
        } else {
          cv.width = 500; cv.height = 700; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 500, 700);
          ctx.drawImage(i1, 75, 20, 350, 380); ctx.drawImage(i2, 75, 415, 350, 110);
          ctx.fillStyle = "#0f172a"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(body.querySelector("#mpDecl").value, 250, 580, 460);
        }
        const url = cv.toDataURL("image/jpeg", 0.92);
        const out = body.querySelector("#jnOut"); out.classList.remove("hidden");
        out.innerHTML = `<img src="${url}" /><div style="margin-top:10px;"><button class="btn btn-blue btn-sm" id="jnDl">Download JPG</button></div>`;
        out.querySelector("#jnDl").onclick = () => dlDataUrl(url, `ProPDF_${m}.jpg`);
      };
      return;
    }

    // Single Image Tools (Desktop Split-Screen Centered Preview)
    body.innerHTML = `
      <div class="ws-split">
        <div>
          <div class="dropzone" id="sgDrop"><b>Click to Upload Image (JPG, PNG, WebP)</b><div style="font-size:12px;color:var(--muted);margin-top:4px;">Instant browser canvas processing</div></div>
          <input type="file" id="sgIn" accept="image/*" class="hidden" />
          <div id="sgControls"></div>
        </div>
        <div id="sgOut" class="live-pane"><div style="color:var(--muted);font-size:13.5px;font-weight:700;">Live Image Preview will appear centered here</div></div>
      </div>`;

    const ctrl = body.querySelector("#sgControls");
    if (m === "exact_kb") ctrl.innerHTML = `<div class="form-group"><label class="form-label">Target File Size (KB)</label><input class="input" id="kbTarget" type="number" value="50" min="5" max="2000" /></div>`;
    else if (m === "resize" || m === "presets") ctrl.innerHTML = `
      ${m === "presets" ? `<div class="form-group"><label class="form-label">Official Exam Preset</label><select class="select" id="prSel"><option value="213,213">PAN Card (213×213 px)</option><option value="413,531">Passport India 3.5×4.5cm (413×531 px)</option><option value="300,370">SSC / UPSC Photo (300×370 px)</option><option value="300,120">Official Signature (300×120 px)</option></select></div>` : ""}
      <div class="row-2"><div class="form-group"><label class="form-label">Width (px)</label><input class="input" id="rsW" type="number" value="413" /></div><div class="form-group"><label class="form-label">Height (px)</label><input class="input" id="rsH" type="number" value="531" /></div></div>`;
    else if (m === "passport") ctrl.innerHTML = `<div class="form-group"><label class="form-label">Copies on A4 Sheet</label><select class="select" id="ppCnt"><option value="8">8 Photos (2×4)</option><option value="12" selected>12 Photos (3×4)</option><option value="24">24 Photos (4×6)</option></select></div>`;
    else if (m === "namedate") ctrl.innerHTML = `<div class="row-2"><input class="input" id="ndName" value="RAHUL SHARMA" placeholder="Full Name" /><input class="input" id="ndDate" value="DOP: 26-11-2026" placeholder="Date of Photo" /></div>`;
    else if (m === "dpi") ctrl.innerHTML = `<div class="form-group"><label class="form-label">Target DPI</label><select class="select" id="dpiVal"><option value="300">300 DPI (Print / Govt Form)</option><option value="200">200 DPI</option><option value="600">600 DPI</option></select></div>`;
    else if (m === "format") ctrl.innerHTML = `<div class="form-group"><label class="form-label">Convert To</label><select class="select" id="fmtSel"><option value="image/jpeg">JPEG (.jpg)</option><option value="image/png">PNG (.png)</option><option value="image/webp">WebP (.webp)</option></select></div>`;
    else if (m === "rotflip") ctrl.innerHTML = `<div class="row-2"><select class="select" id="rfRot"><option value="90">Rotate 90°</option><option value="180">Rotate 180°</option><option value="270">Rotate 270°</option><option value="0">0°</option></select><select class="select" id="rfFlip"><option value="none">No Flip</option><option value="h">Flip Horizontal</option><option value="v">Flip Vertical</option></select></div>`;
    else if (m === "filters") ctrl.innerHTML = `<div class="form-group"><select class="select" id="fltSel"><option value="grayscale(100%)">Grayscale</option><option value="grayscale(100%) contrast(175%)">Document B&amp;W Scan</option><option value="sepia(90%)">Sepia</option></select></div>`;
    else if (m === "blur") ctrl.innerHTML = `<div class="form-group"><label class="form-label">Blur Intensity (px)</label><input class="input" id="blVal" type="number" value="8" min="1" max="30" /></div>`;
    else if (m === "textimg") ctrl.innerHTML = `<div class="row-2"><input class="input" id="tiTxt" value="SAMPLE WATERMARK" /><input class="input" id="tiCol" type="color" value="#e11d48" /></div>`;
    else if (m === "enhance") ctrl.innerHTML = `<div class="row-2"><div class="form-group"><label class="form-label">Brightness %</label><input class="input" id="enBr" type="number" value="115" /></div><div class="form-group"><label class="form-label">Contrast %</label><input class="input" id="enCt" type="number" value="125" /></div></div>`;
    else if (m === "border") ctrl.innerHTML = `<div class="form-group"><label class="form-label">White Border Width (px)</label><input class="input" id="bdPx" type="number" value="24" /></div>`;
    else if (m === "crop") ctrl.innerHTML = `<div class="form-group"><label class="form-label">Aspect Ratio</label><select class="select" id="crRat"><option value="1">1:1 Square</option><option value="0.777">3.5 × 4.5 Passport</option><option value="1.333">4:3 Standard</option><option value="1.777">16:9 Widescreen</option></select></div>`;

    if (m === "presets") {
      ctrl.querySelector("#prSel").onchange = e => {
        const [w, h] = e.target.value.split(",");
        ctrl.querySelector("#rsW").value = w; ctrl.querySelector("#rsH").value = h;
      };
    }

    let curImg = null, origSize = 0;
    const process = () => {
      if (!curImg) return;
      const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
      let outUrl = "", ext = "jpg";

      if (m === "exact_kb") {
        const targetBytes = (+ctrl.querySelector("#kbTarget").value || 50) * 1024;
        cv.width = curImg.width; cv.height = curImg.height;
        ctx.fillStyle = "#fff"; ctx.drawImage(curImg, 0, 0);
        let lo = 0.05, hi = 0.95;
        outUrl = cv.toDataURL("image/jpeg", 0.7);
        for (let k = 0; k < 8; k++) {
          const mid = (lo + hi) / 2, cand = cv.toDataURL("image/jpeg", mid);
          if (dataUrlBytes(cand) > targetBytes) hi = mid; else { lo = mid; outUrl = cand; }
        }
      } else if (m === "resize" || m === "presets") {
        cv.width = +ctrl.querySelector("#rsW").value || curImg.width;
        cv.height = +ctrl.querySelector("#rsH").value || curImg.height;
        ctx.drawImage(curImg, 0, 0, cv.width, cv.height);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "passport") {
        const cnt = +ctrl.querySelector("#ppCnt").value;
        const cols = cnt === 24 ? 4 : cnt === 12 ? 3 : 2, rows = Math.ceil(cnt / cols);
        cv.width = 1240; cv.height = 1754; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1240, 1754);
        const pw = 240, ph = 300, gx = Math.floor((1240 - cols * pw) / (cols + 1)), gy = 40;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const x = gx + c * (pw + gx), y = gy + r * (ph + gy);
          ctx.drawImage(curImg, x, y, pw, ph); ctx.strokeStyle = "#cbd5e1"; ctx.strokeRect(x, y, pw, ph);
        }
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "namedate") {
        cv.width = curImg.width; cv.height = curImg.height; ctx.drawImage(curImg, 0, 0);
        const bh = Math.max(54, Math.round(cv.height * 0.16));
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, cv.height - bh, cv.width, bh);
        ctx.fillStyle = "#0f172a"; ctx.textAlign = "center";
        ctx.font = `bold ${Math.round(bh * 0.36)}px sans-serif`;
        ctx.fillText(ctrl.querySelector("#ndName").value.toUpperCase(), cv.width / 2, cv.height - bh * 0.52);
        ctx.font = `bold ${Math.round(bh * 0.3)}px sans-serif`;
        ctx.fillText(ctrl.querySelector("#ndDate").value, cv.width / 2, cv.height - bh * 0.15);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "circle") {
        const s = Math.min(curImg.width, curImg.height);
        cv.width = s; cv.height = s;
        ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(curImg, (curImg.width - s) / 2, (curImg.height - s) / 2, s, s, 0, 0, s, s);
        outUrl = cv.toDataURL("image/png"); ext = "png";
      } else if (m === "border") {
        const b = +ctrl.querySelector("#bdPx").value || 20;
        cv.width = curImg.width + b * 2; cv.height = curImg.height + b * 2;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(curImg, b, b);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "dpi") {
        cv.width = curImg.width; cv.height = curImg.height; ctx.drawImage(curImg, 0, 0);
        outUrl = setJpegDpi(cv.toDataURL("image/jpeg", 0.94), +ctrl.querySelector("#dpiVal").value);
      } else if (m === "format") {
        const mime = ctrl.querySelector("#fmtSel").value;
        cv.width = curImg.width; cv.height = curImg.height; ctx.drawImage(curImg, 0, 0);
        outUrl = cv.toDataURL(mime, 0.92); ext = mime.split("/")[1].replace("jpeg", "jpg");
      } else if (m === "rotflip") {
        const rot = +ctrl.querySelector("#rfRot").value, fl = ctrl.querySelector("#rfFlip").value;
        const swap = rot === 90 || rot === 270;
        cv.width = swap ? curImg.height : curImg.width; cv.height = swap ? curImg.width : curImg.height;
        ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate((rot * Math.PI) / 180);
        ctx.scale(fl === "h" ? -1 : 1, fl === "v" ? -1 : 1);
        ctx.drawImage(curImg, -curImg.width / 2, -curImg.height / 2);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "filters" || m === "blur" || m === "enhance") {
        cv.width = curImg.width; cv.height = curImg.height;
        if (m === "filters") ctx.filter = ctrl.querySelector("#fltSel").value;
        else if (m === "blur") ctx.filter = `blur(${ctrl.querySelector("#blVal").value}px)`;
        else ctx.filter = `brightness(${ctrl.querySelector("#enBr").value}%) contrast(${ctrl.querySelector("#enCt").value}%)`;
        ctx.drawImage(curImg, 0, 0);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "textimg") {
        cv.width = curImg.width; cv.height = curImg.height; ctx.drawImage(curImg, 0, 0);
        ctx.fillStyle = ctrl.querySelector("#tiCol").value;
        ctx.font = `bold ${Math.max(24, Math.round(cv.width / 14))}px sans-serif`;
        ctx.textAlign = "center"; ctx.fillText(ctrl.querySelector("#tiTxt").value, cv.width / 2, cv.height / 2);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "crop") {
        const rat = +ctrl.querySelector("#crRat").value;
        let cw = curImg.width, ch = Math.round(cw / rat);
        if (ch > curImg.height) { ch = curImg.height; cw = Math.round(ch * rat); }
        cv.width = cw; cv.height = ch;
        ctx.drawImage(curImg, (curImg.width - cw) / 2, (curImg.height - ch) / 2, cw, ch, 0, 0, cw, ch);
        outUrl = cv.toDataURL("image/jpeg", 0.92);
      } else if (m === "colorpick") {
        cv.width = curImg.width; cv.height = curImg.height; ctx.drawImage(curImg, 0, 0);
        const out = body.querySelector("#sgOut"); out.classList.remove("hidden");
        out.innerHTML = `<div style="margin-bottom:8px;font-weight:700;">Click anywhere on the image to pick color:</div><canvas id="cpCv"></canvas><div id="cpRes" class="result-pre">HEX: #000000</div>`;
        const cp = out.querySelector("#cpCv"); cp.width = cv.width; cp.height = cv.height; cp.getContext("2d").drawImage(cv, 0, 0);
        cp.onclick = ev => {
          const r = cp.getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) * (cp.width / r.width)), y = Math.floor((ev.clientY - r.top) * (cp.height / r.height));
          const p = cp.getContext("2d").getImageData(x, y, 1, 1).data;
          const hex = "#" + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
          out.querySelector("#cpRes").textContent = `HEX: ${hex} | RGB: rgb(${p[0]}, ${p[1]}, ${p[2]})`;
        };
        return;
      }

      const newKb = (dataUrlBytes(outUrl) / 1024).toFixed(1);
      const out = body.querySelector("#sgOut"); out.classList.remove("hidden");
      out.innerHTML = `<img src="${outUrl}" /><div style="margin:10px 0;font-size:13px;font-weight:700;">Original: ${(origSize / 1024).toFixed(1)} KB ➔ Output: ${newKb} KB</div><button class="btn btn-primary btn-sm" id="sgDl">Download ${ext.toUpperCase()}</button>`;
      out.querySelector("#sgDl").onclick = () => dlDataUrl(outUrl, `ProPDF_${m}.${ext}`);
    };

    body.querySelector("#sgDrop").onclick = () => body.querySelector("#sgIn").click();
    body.querySelector("#sgIn").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      origSize = f.size; curImg = await loadImg(f); process();
    };
    ctrl.querySelectorAll("input, select").forEach(el => { el.addEventListener("input", process); el.addEventListener("change", process); });
  }

  global.ENGINES = global.ENGINES || {};
  global.ENGINES.image = renderImageTool;
})(typeof window !== "undefined" ? window : global);
