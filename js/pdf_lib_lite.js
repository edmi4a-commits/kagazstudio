// ProPDF & Cyber Tools — Self-Contained Pure-JS Multi-Page PDF Engine
(function (global) {
  function strToBytes(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xff;
    return arr;
  }

  function concatUint8(chunks) {
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  }

  function escPdf(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, " ");
  }

  // Convert array of { jpgBytes: Uint8Array, w: number, h: number } into valid Multi-Page A4 PDF
  function imagesToPdf(pages, opts = {}) {
    const pageW = opts.pageW || 595, pageH = opts.pageH || 842, margin = opts.margin ?? 20;
    const chunks = [];
    const offsets = [0];
    let byteLen = 0;

    const pushStr = s => { const b = strToBytes(s); chunks.push(b); byteLen += b.length; };
    const pushBytes = b => { chunks.push(b); byteLen += b.length; };
    const startObj = id => { offsets[id] = byteLen; pushStr(`${id} 0 obj\n`); };

    pushStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    const pageIds = [];
    let nextId = 3;
    const pageMeta = pages.map((pg, idx) => {
      const pId = nextId++, cId = nextId++, iId = nextId++;
      pageIds.push(pId);
      return { pg, pId, cId, iId, idx };
    });

    startObj(1);
    pushStr("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    startObj(2);
    pushStr(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`);

    pageMeta.forEach(m => {
      const availW = pageW - margin * 2, availH = pageH - margin * 2;
      const scale = Math.min(availW / (m.pg.w || 595), availH / (m.pg.h || 842));
      const dw = (m.pg.w * scale).toFixed(2), dh = (m.pg.h * scale).toFixed(2);
      const dx = ((pageW - dw) / 2).toFixed(2), dy = ((pageH - dh) / 2).toFixed(2);
      let stream = `q\n${dw} 0 0 ${dh} ${dx} ${dy} cm\n/Im0 Do\nQ\n`;
      if (opts.watermark) {
        stream += `BT\n/F1 28 Tf\n0.85 0.15 0.25 rg\n150 400 Td\n(${escPdf(opts.watermark)}) Tj\nET\n`;
      }
      if (opts.pageNumbers) {
        stream += `BT\n/F1 11 Tf\n0.3 0.3 0.3 rg\n275 20 Td\n(Page ${m.idx + 1} of ${pageMeta.length}) Tj\nET\n`;
      }

      startObj(m.pId);
      pushStr(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 ${m.iId} 0 R >> /Font << /F1 ${nextId} 0 R >> >> /Contents ${m.cId} 0 R >>\nendobj\n`);

      startObj(m.cId);
      pushStr(`<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`);

      startObj(m.iId);
      pushStr(`<< /Type /XObject /Subtype /Image /Width ${m.pg.w} /Height ${m.pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${m.pg.jpgBytes.length} >>\nstream\n`);
      pushBytes(m.pg.jpgBytes);
      pushStr("\nendstream\nendobj\n");
    });

    const fontId = nextId++;
    startObj(fontId);
    pushStr("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

    const xrefPos = byteLen;
    pushStr(`xref\n0 ${nextId}\n0000000000 65535 f \n`);
    for (let i = 1; i < nextId; i++) {
      pushStr(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
    }
    pushStr(`trailer << /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
    return concatUint8(chunks);
  }

  function textToPdf(title, lines) {
    const chunks = [];
    const safe = [title, "------------------------------------------------------------"].concat(lines || []);
    let stream = "BT\n/F1 14 Tf\n42 790 Td\n16 TL\n";
    safe.slice(0, 45).forEach((ln, i) => {
      if (i === 0) stream += `/F1 16 Tf\n(${escPdf(ln)}) Tj\nT*\n/F1 10.5 Tf\n`;
      else stream += `(${escPdf(ln)}) Tj\nT*\n`;
    });
    stream += "ET";
    const objs = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
      `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
    ];
    let pdf = "%PDF-1.4\n";
    const off = [0];
    objs.forEach(o => { off.push(pdf.length); pdf += o + "\n"; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < off.length; i++) pdf += String(off[i]).padStart(10, "0") + " 00000 n \n";
    pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return strToBytes(pdf);
  }

  function inspectPdf(uint8) {
    let txt = "";
    const len = Math.min(uint8.length, 400000);
    for (let i = 0; i < len; i++) txt += String.fromCharCode(uint8[i]);
    const pages = (txt.match(/\/Type\s*\/Page\b/g) || []).length;
    const encrypted = /\/Encrypt\b/.test(txt);
    const ver = (txt.match(/%PDF-(\d\.\d)/) || [null, "1.4"])[1];
    const fonts = (txt.match(/\/Type\s*\/Font\b/g) || []).length;
    const images = (txt.match(/\/Subtype\s*\/Image\b/g) || []).length;
    const asciiStrings = (txt.match(/\(([A-Za-z0-9 ,.\-:;!?\n]{4,})\)/g) || []).map(s => s.slice(1, -1));
    return { sizeBytes: uint8.length, version: ver, pages: Math.max(1, pages), encrypted, fonts, images, extractedText: asciiStrings.join("\n") };
  }

  function dataUrlToUint8(dataUrl) {
    const b64 = dataUrl.split(",")[1];
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  global.PdfLite = { imagesToPdf, textToPdf, inspectPdf, dataUrlToUint8 };
})(typeof window !== "undefined" ? window : global);
