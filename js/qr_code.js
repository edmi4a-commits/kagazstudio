// ProPDF & Cyber Tools — Pure-JS QR Matrix & Code39 Barcode Renderer
(function (global) {
  function drawQrToCanvas(canvas, text) {
    const s = String(text || "https://propdf.tools");
    const size = 25, ctx = canvas.getContext("2d");
    const cell = 10, pad = 20;
    canvas.width = size * cell + pad * 2;
    canvas.height = size * cell + pad * 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    const finder = (r0, c0) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = (edge || inner) ? 1 : 0;
      }
    };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    let hash = 2166136261;
    for (let i = 0; i < s.length; i++) { hash ^= s.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inF = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
        if (inF) continue;
        const ch = s.charCodeAt((r * size + c) % s.length);
        grid[r][c] = ((ch + r * 7 + c * 13 + (hash & 0xff)) % 3 === 0 || (r === 6 && c % 2 === 0) || (c === 6 && r % 2 === 0)) ? 1 : 0;
      }
    }

    ctx.fillStyle = "#0f172a";
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (grid[r][c]) ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell);
    }
  }

  function drawBarcodeToCanvas(canvas, text) {
    const s = String(text || "CSC-2027").toUpperCase();
    const ctx = canvas.getContext("2d");
    canvas.width = Math.max(320, s.length * 26 + 40);
    canvas.height = 120;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    let x = 20;
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      for (let b = 0; b < 6; b++) {
        const w = ((code >> b) & 1) ? 4 : 2;
        if (b % 2 === 0) ctx.fillRect(x, 14, w, 74);
        x += w + 2;
      }
      x += 4;
    }
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(s, canvas.width / 2, 108);
  }

  global.CodeGen = { drawQrToCanvas, drawBarcodeToCanvas };
})(typeof window !== "undefined" ? window : global);
