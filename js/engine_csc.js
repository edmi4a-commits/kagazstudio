// ProPDF & Cyber Tools — CSC, Cyber Cafe, Document & Utility Engine (SmartCSCTools-Style)
(function (global) {
  function dlBytes(bytes, filename, mime = "application/pdf") {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function loadImg(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = r.result; };
      r.readAsDataURL(file);
    });
  }

  function numToIndianWords(num) {
    num = Math.floor(Math.abs(+num || 0));
    if (num === 0) return "Zero";
    const o = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const t = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const two = n => n < 20 ? o[n] : t[Math.floor(n / 10)] + (n % 10 ? " " + o[n % 10] : "");
    let s = "";
    const cr = Math.floor(num / 10000000); num %= 10000000;
    const lk = Math.floor(num / 100000); num %= 100000;
    const th = Math.floor(num / 1000); num %= 1000;
    const hn = Math.floor(num / 100); num %= 100;
    if (cr) s += two(cr) + " Crore ";
    if (lk) s += two(lk) + " Lakh ";
    if (th) s += two(th) + " Thousand ";
    if (hn) s += o[hn] + " Hundred ";
    if (num) s += two(num);
    return s.trim();
  }

  function renderCscTool(tool, body, toast) {
    const m = tool.mode;

    // 1. PVC / ID Card A4 Print Sheet
    if (m === "pvcsheet") {
      body.innerHTML = `
        <div class="row-2 form-group">
          <div><label class="form-label">Card Front Image</label><input type="file" class="input" id="pvF" accept="image/*" /></div>
          <div><label class="form-label">Card Back Image</label><input type="file" class="input" id="pvB" accept="image/*" /></div>
        </div>
        <button class="btn btn-primary" id="pvGo">Generate A4 Print Sheet (PDF &amp; JPG)</button>
        <div id="pvOut" class="preview-box hidden"></div>`;
      body.querySelector("#pvGo").onclick = async () => {
        const f1 = body.querySelector("#pvF").files[0], f2 = body.querySelector("#pvB").files[0];
        if (!f1 || !f2) return toast("Upload both Front & Back images!");
        const [i1, i2] = await Promise.all([loadImg(f1), loadImg(f2)]);
        const cv = document.createElement("canvas"); cv.width = 1240; cv.height = 1754;
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1240, 1754);
        ctx.drawImage(i1, 90, 100, 505, 318); ctx.strokeStyle = "#94a3b8"; ctx.strokeRect(90, 100, 505, 318);
        ctx.drawImage(i2, 645, 100, 505, 318); ctx.strokeRect(645, 100, 505, 318);
        const url = cv.toDataURL("image/jpeg", 0.94);
        const out = body.querySelector("#pvOut"); out.classList.remove("hidden");
        out.innerHTML = `<img src="${url}" /><div class="row-2" style="margin-top:10px;"><button class="btn btn-primary btn-sm" id="pvPdf">Download A4 PDF</button><button class="btn btn-outline btn-sm" id="pvJpg">Download JPG</button></div>`;
        out.querySelector("#pvPdf").onclick = () => dlBytes(PdfLite.imagesToPdf([{ jpgBytes: PdfLite.dataUrlToUint8(url), w: 1240, h: 1754 }]), "PVC_ID_A4_Sheet.pdf");
        out.querySelector("#pvJpg").onclick = () => { const a = document.createElement("a"); a.href = url; a.download = "PVC_ID_A4_Sheet.jpg"; a.click(); };
      };
      return;
    }

    // 2. CSC Rubber Stamp Maker
    if (m === "stamp") {
      body.innerHTML = `
        <div class="row-2"><input class="input" id="stTop" value="JAN SEVA KENDRA • CSC" placeholder="Top Ring Text" /><input class="input" id="stBot" value="UTTAR PRADESH • INDIA" placeholder="Bottom Text" /></div>
        <div class="row-2" style="margin-top:10px;"><input class="input" id="stMid" value="VERIFIED" placeholder="Center Text" /><input class="input" id="stCol" type="color" value="#1d4ed8" /></div>
        <div class="preview-box"><canvas id="stCv" width="280" height="280"></canvas><div><button class="btn btn-primary btn-sm" id="stDl" style="margin-top:10px;">Download Transparent PNG</button></div></div>`;
      const drawSt = () => {
        const cv = body.querySelector("#stCv"), ctx = cv.getContext("2d"), col = body.querySelector("#stCol").value;
        ctx.clearRect(0, 0, 280, 280);
        ctx.strokeStyle = col; ctx.fillStyle = col;
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(140, 140, 122, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(140, 140, 112, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(140, 140, 74, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(body.querySelector("#stTop").value.slice(0, 24), 140, 52);
        ctx.fillText(body.querySelector("#stBot").value.slice(0, 24), 140, 238);
        ctx.font = "900 22px sans-serif"; ctx.fillText(body.querySelector("#stMid").value.slice(0, 14), 140, 148);
      };
      ["stTop", "stBot", "stMid", "stCol"].forEach(id => body.querySelector("#" + id).oninput = drawSt);
      drawSt();
      body.querySelector("#stDl").onclick = () => { const a = document.createElement("a"); a.href = body.querySelector("#stCv").toDataURL("image/png"); a.download = "CSC_Stamp.png"; a.click(); };
      return;
    }

    // 3. QR Code & Barcode Generators
    if (m === "qr" || m === "barcode") {
      body.innerHTML = `
        <div class="form-group"><label class="form-label">${m === "qr" ? "URL, Text or UPI ID" : "Product / ID Code"}</label><input class="input" id="cdIn" value="${m === "qr" ? "https://propdf.tools" : "CSC-2027-01"}" /></div>
        <div class="preview-box"><canvas id="cdCv"></canvas><div><button class="btn btn-primary btn-sm" id="cdDl" style="margin-top:10px;">Download PNG</button></div></div>`;
      const upd = () => {
        const cv = body.querySelector("#cdCv"), v = body.querySelector("#cdIn").value;
        if (m === "qr") CodeGen.drawQrToCanvas(cv, v); else CodeGen.drawBarcodeToCanvas(cv, v);
      };
      body.querySelector("#cdIn").oninput = upd; upd();
      body.querySelector("#cdDl").onclick = () => { const a = document.createElement("a"); a.href = body.querySelector("#cdCv").toDataURL("image/png"); a.download = `${m}.png`; a.click(); };
      return;
    }

    // 4. Online Typing Speed Test
    if (m === "typing") {
      const sample = "The quick brown fox jumps over the lazy dog while practicing typing speed for government exams and cyber cafe work.";
      let t0 = 0;
      body.innerHTML = `
        <div class="result-pre" style="font-size:15px;font-weight:700;color:var(--blue);">${sample}</div>
        <textarea class="textarea" id="tpBox" style="margin-top:12px;" placeholder="Start typing the paragraph above..."></textarea>
        <div class="result-pre" id="tpStat">WPM: 0 | Accuracy: 100%</div>`;
      body.querySelector("#tpBox").oninput = e => {
        if (!t0) t0 = Date.now();
        const typed = e.target.value, mins = Math.max(0.02, (Date.now() - t0) / 60000);
        const words = typed.trim() ? typed.trim().split(/\s+/).length : 0;
        let ok = 0; for (let i = 0; i < typed.length; i++) if (typed[i] === sample[i]) ok++;
        const acc = typed.length ? Math.round((ok / typed.length) * 100) : 100;
        body.querySelector("#tpStat").textContent = `Speed: ${Math.round(words / mins)} WPM | Accuracy: ${acc}% | Chars: ${typed.length}/${sample.length}`;
      };
      return;
    }

    // 5. Document PDF Makers (Resume, Biodata, Invoice, Salary, Rate List, Cover, Bank App, Affidavit, Admit Card, Question Paper, Receipt)
    const DOC_TEMPLATES = {
      resume: { title: "CURRICULUM VITAE / RESUME", fields: [["name", "Full Name", "Aarav Sharma"], ["phone", "Phone & Email", "+91 9876543210 | aarav@email.com"], ["edu", "Education", "B.Tech / B.Sc (2024) - 82%"], ["skills", "Skills", "MS Office, Tally Prime, Web Design, Typing"], ["exp", "Experience / Objective", "Seeking a growth-oriented role in IT & Administration."]] },
      biodata: { title: "MARRIAGE BIODATA", fields: [["name", "Full Name", "Priya Verma"], ["dob", "DOB & Height", "15 Aug 1999 | 5 ft 4 in"], ["edu", "Qualification & Job", "M.A., B.Ed | Asst. Teacher"], ["family", "Father & Mother", "Mr. Rajesh Verma (Business) & Mrs. Sunita Verma"], ["addr", "Address & Contact", "Civil Lines, Lucknow | +91 9811002233"]] },
      invoice: { title: "TAX INVOICE / BILL", fields: [["shop", "Shop / Business Name", "ProPDF Cyber & CSC Center"], ["cust", "Customer Name", "Walk-in Customer"], ["item", "Service / Item Description", "Form Filling + Printout + Lamination"], ["amt", "Base Amount (Rs.)", "500"], ["gst", "GST % (0, 5, 12, 18)", "18"]] },
      salary: { title: "MONTHLY SALARY SLIP", fields: [["emp", "Employee Name & ID", "Manoj Kumar (EMP-102)"], ["month", "Pay Month", "November 2026"], ["basic", "Basic Salary (Rs.)", "25000"], ["hra", "HRA + Allowances (Rs.)", "5000"], ["ded", "PF + TDS Deductions (Rs.)", "1800"]] },
      ratelist: { title: "CSC / JAN SEVA KENDRA RATE LIST", fields: [["shop", "Center Name", "Digital Jan Seva Kendra"], ["r1", "Aadhaar Print / PVC Card", "Rs. 50"], ["r2", "PAN Card New / Correction", "Rs. 150"], ["r3", "Income / Caste / Domicile Cert", "Rs. 100"], ["r4", "Govt Exam Form + Photo/Sign", "Rs. 100"]] },
      cover: { title: "JOB COVER LETTER", fields: [["to", "To (HR / Manager)", "The HR Manager, Tech Solutions"], ["role", "Position Applied", "Computer Operator / Data Analyst"], ["name", "Your Name", "Rohan Singh"], ["body", "Letter Body", "I am writing to express my strong interest in the above position. With strong computer and communication skills, I can contribute effectively."]] },
      bankapp: { title: "BANK / LEAVE APPLICATION", fields: [["to", "To (Branch Manager / Principal)", "The Branch Manager, State Bank of India"], ["sub", "Subject", "Application for KYC Update / Passbook Issue"], ["name", "Applicant Name & Account No", "Suresh Patel | A/C: XXXX1234"], ["body", "Application Details", "Respectfully, I request you to kindly update my KYC / issue a new passbook for my savings account at the earliest."]] },
      affidavit: { title: "SELF-DECLARATION / AFFIDAVIT", fields: [["name", "Deponent Name & S/o", "Anil Kumar S/o Ramesh Kumar"], ["addr", "Resident Of", "Sector 12, Noida, UP"], ["stmt", "Declaration Statement", "I do hereby solemnly affirm and declare that the above stated facts and residential details are true to the best of my knowledge."]] },
      admit: { title: "EXAMINATION ADMIT CARD", fields: [["exam", "Exam Name", "Annual / Entrance Examination 2027"], ["cand", "Candidate Name & Roll No", "Zoya Khan | Roll: 2027045"], ["center", "Exam Center & Date", "City Public School | 15 Feb 2027 (09:30 AM)"]] },
      qpaper: { title: "PRACTICE QUESTION PAPER", fields: [["head", "School / Coaching & Subject", "Genius Academy | General Science (Max: 20)"], ["q1", "Q1", "What is the SI unit of Force? (a) Joule (b) Newton (c) Watt"], ["q2", "Q2", "Which gas do plants absorb during photosynthesis? (a) O2 (b) CO2 (c) N2"]] },
      receipt: { title: "CYBER CAFE SERVICE RECEIPT", fields: [["shop", "Center Name", "ProPDF Cyber Point"], ["cust", "Customer Name", "Customer"], ["srv", "Services Rendered", "Online Application + Scan + 4 Prints"], ["paid", "Total Paid (Rs.)", "180"]] }
    };

    if (DOC_TEMPLATES[m]) {
      const tpl = DOC_TEMPLATES[m];
      body.innerHTML = `
        <div class="ws-split">
          <div>
            ${tpl.fields.map(([id, lbl, val]) => `<div class="form-group"><label class="form-label">${lbl}</label><input class="input" id="df_${id}" value="${val}" /></div>`).join("")}
            <div class="row-2">
              <button class="btn btn-primary" id="dfPdf">Download PDF</button>
              <button class="btn btn-outline" onclick="window.print()">Print A4</button>
            </div>
          </div>
          <div class="live-pane"><div class="a4-paper" id="dfPrev"></div></div>
        </div>`;

      const getLines = () => {
        const rows = tpl.fields.map(([id, lbl]) => [lbl, body.querySelector("#df_" + id).value]);
        if (m === "invoice") {
          const a = +body.querySelector("#df_amt").value || 0, g = +body.querySelector("#df_gst").value || 0;
          rows.push([`GST (${g}%)`, `Rs. ${(a * g / 100).toFixed(2)}`], [`Grand Total`, `Rs. ${(a * (1 + g / 100)).toFixed(2)}`]);
        } else if (m === "salary") {
          const net = (+body.querySelector("#df_basic").value || 0) + (+body.querySelector("#df_hra").value || 0) - (+body.querySelector("#df_ded").value || 0);
          rows.push(["Net Payable Salary", `Rs. ${net}`]);
        }
        return rows;
      };

      const updatePrev = () => {
        const rows = getLines();
        body.querySelector("#dfPrev").innerHTML = `
          <div class="a4-hdr"><div class="a4-title">${tpl.title}</div><span style="font-size:11px;color:#64748b;">Live A4 Preview</span></div>
          ${rows.map(([k, v]) => `<div class="a4-row"><span class="a4-lbl">${k}</span><span class="a4-val">${v}</span></div>`).join("")}
          <div style="margin-top:20px;padding-top:10px;border-top:1px dashed #cbd5e1;display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
            <span>Date: ${new Date().toLocaleDateString()}</span><span>Authorized Signature</span>
          </div>`;
      };

      tpl.fields.forEach(([id]) => { body.querySelector("#df_" + id).oninput = updatePrev; });
      updatePrev();

      body.querySelector("#dfPdf").onclick = () => {
        const lines = getLines().map(([k, v]) => `${k}: ${v}`);
        dlBytes(PdfLite.textToPdf(tpl.title, lines), `${m}_${Date.now()}.pdf`);
        toast("PDF Downloaded!");
      };
      return;
    }

    // 6. Calculators (Age, Date, Word Count, GST, EMI, CGPA, Gold, Land, Number to Words)
    const CALCS = {
      age: { fields: [["dob", "Date of Birth", "2000-05-15", "date"], ["asof", "As on Date (Cutoff)", new Date().toISOString().slice(0, 10), "date"]], calc: v => {
        const d1 = new Date(v.dob), d2 = new Date(v.asof);
        let y = d2.getFullYear() - d1.getFullYear(), mo = d2.getMonth() - d1.getMonth(), dy = d2.getDate() - d1.getDate();
        if (dy < 0) { dy += 30; mo--; } if (mo < 0) { mo += 12; y--; }
        return `Exact Age: ${y} Years, ${mo} Months, ${dy} Days\nTotal Days: ${Math.floor((d2 - d1) / 86400000)}`;
      }},
      datecalc: { fields: [["d1", "Start Date", "2026-01-01", "date"], ["d2", "End Date", new Date().toISOString().slice(0, 10), "date"], ["add", "Add Days to Start", "90", "number"]], calc: v => {
        const a = new Date(v.d1), b = new Date(v.d2), fut = new Date(a.getTime() + (+v.add || 0) * 86400000);
        return `Difference: ${Math.round((b - a) / 86400000)} Days\n${v.d1} + ${v.add} days = ${fut.toISOString().slice(0, 10)}`;
      }},
      wordcnt: { fields: [["txt", "Paste Text", "Hello ProPDF & Cyber Tools! Fast browser utilities.", "textarea"]], calc: v => {
        const s = v.txt || "", w = s.trim() ? s.trim().split(/\s+/).length : 0;
        return `Words: ${w}\nCharacters: ${s.length} (No spaces: ${s.replace(/\s/g, "").length})\nLines: ${s.split(/\r?\n/).length}`;
      }},
      gst: { fields: [["amt", "Amount (₹)", "1000", "number"], ["rate", "GST %", "18", "number"]], calc: v => {
        const a = +v.amt || 0, r = +v.rate || 0, g = a * r / 100;
        return `Exclusive: Base ₹${a} + GST ₹${g.toFixed(2)} (CGST ₹${(g/2).toFixed(2)} + SGST ₹${(g/2).toFixed(2)}) = ₹${(a + g).toFixed(2)}\nInclusive: Base ₹${(a / (1 + r / 100)).toFixed(2)} + GST ₹${(a - a / (1 + r / 100)).toFixed(2)}`;
      }},
      emi: { fields: [["p", "Loan Amount (₹)", "500000", "number"], ["r", "Rate % p.a.", "9.5", "number"], ["m", "Tenure (Months)", "60", "number"]], calc: v => {
        const P = +v.p || 0, r = (+v.r || 0) / 1200, n = Math.max(1, +v.m || 1);
        const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        return `Monthly EMI: ₹${emi.toFixed(2)}\nTotal Interest: ₹${(emi * n - P).toFixed(2)}\nTotal Payable: ₹${(emi * n).toFixed(2)}`;
      }},
      cgpa: { fields: [["cgpa", "CGPA (out of 10)", "8.4", "number"], ["obt", "Obtained Marks", "425", "number"], ["tot", "Total Marks", "500", "number"]], calc: v => `CGPA % (×9.5): ${((+v.cgpa || 0) * 9.5).toFixed(2)}%\nMarks %: ${(((+v.obt || 0) / (+v.tot || 1)) * 100).toFixed(2)}%` },
      gold: { fields: [["wt", "Weight (grams)", "10", "number"], ["rate", "24K Rate/g (₹)", "7800", "number"], ["mk", "Making Charge %", "10", "number"]], calc: v => {
        const g22 = (+v.wt || 0) * (+v.rate || 0) * 0.916, mk = g22 * (+v.mk || 0) / 100, tot = (g22 + mk) * 1.03;
        return `22K Gold Value: ₹${g22.toFixed(2)}\nMaking: ₹${mk.toFixed(2)}\nFinal Bill (+3% GST): ₹${tot.toFixed(2)}`;
      }},
      land: { fields: [["sqft", "Area in Sq.Feet", "1361.25", "number"]], calc: v => {
        const s = +v.sqft || 0;
        return `Sq.Meter: ${(s * 0.092903).toFixed(2)}\nSq.Yard (Gaj): ${(s / 9).toFixed(2)}\nAcre: ${(s / 43560).toFixed(4)}\nHectare: ${(s / 107639.1).toFixed(4)}\nBigha (27225 sqft): ${(s / 27225).toFixed(4)}`;
      }},
      numwords: { fields: [["num", "Enter Amount", "125400", "number"]], calc: v => `Indian Words: ${numToIndianWords(v.num)} Rupees Only` }
    };

    if (CALCS[m]) {
      const c = CALCS[m];
      body.innerHTML = c.fields.map(([id, lbl, val, type]) =>
        type === "textarea"
          ? `<div class="form-group"><label class="form-label">${lbl}</label><textarea class="textarea" id="cf_${id}">${val}</textarea></div>`
          : `<div class="form-group"><label class="form-label">${lbl}</label><input class="input" id="cf_${id}" type="${type}" value="${val}" /></div>`
      ).join("") + `<div class="result-pre" id="cfOut"></div>`;
      const run = () => {
        const vals = {};
        c.fields.forEach(([id]) => vals[id] = body.querySelector("#cf_" + id).value);
        body.querySelector("#cfOut").textContent = c.calc(vals);
      };
      c.fields.forEach(([id]) => { body.querySelector("#cf_" + id).oninput = run; body.querySelector("#cf_" + id).onchange = run; });
      run();
    }
  }

  global.ENGINES = global.ENGINES || {};
  global.ENGINES.csc = renderCscTool;
})(typeof window !== "undefined" ? window : global);
