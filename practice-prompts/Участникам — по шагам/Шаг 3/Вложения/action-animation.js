var ActionAnimation = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    draw: () => draw,
    prepare: () => prepare
  });

  // source/clean-effect.ts
  var clamp = (x) => Math.max(0, Math.min(1, x));
  var smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  var rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  function prepareGlow(result, data, width, height, contrast, gamma, blur, ink = "#07080B") {
    const bg = rgb(ink), pixels = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const gain = l > 1e-3 ? Math.pow(clamp((l - 0.5) * contrast + 0.5), 1 / gamma) / l : 0;
      for (let c = 0; c < 3; c++) pixels[i + c] = Math.min(255, data[i + c] * gain) * data[i + 3] / 255;
    }
    const image = document.createElement("canvas");
    image.width = width;
    image.height = height;
    const context = image.getContext("2d"), frame = context.createImageData(width, height);
    frame.data.set(result);
    context.putImageData(frame, 0, 0);
    const base = document.createElement("canvas");
    base.width = width;
    base.height = height;
    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const bc = base.getContext("2d"), baseFrame = bc.createImageData(width, height);
    const mc = mask.getContext("2d"), maskFrame = mc.createImageData(width, height);
    for (let i = 0; i < result.length; i += 4) {
      for (let c = 0; c < 3; c++) baseFrame.data[i + c] = 255 - (255 - bg[c]) * (1 - pixels[i + c] / 255);
      baseFrame.data[i + 3] = 255;
      const peak = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) / 255;
      maskFrame.data[i + 3] = 255 * smooth(8e-3, 0.06, peak);
    }
    const coverage = new Uint8ClampedArray(width * height);
    for (let p = 0; p < coverage.length; p++) coverage[p] = maskFrame.data[p * 4 + 3];
    const softCoverage = blur(coverage, width, height, 2 * width / 600);
    for (let p = 0; p < coverage.length; p++) maskFrame.data[p * 4 + 3] = softCoverage[p];
    bc.putImageData(baseFrame, 0, 0);
    mc.putImageData(maskFrame, 0, 0);
    const foreground = document.createElement("canvas");
    foreground.width = width;
    foreground.height = height;
    const fc = foreground.getContext("2d"), ff = fc.createImageData(width, height);
    for (let i = 0; i < result.length; i += 4) {
      let alpha = maskFrame.data[i + 3] / 255;
      for (let c = 0; c < 3; c++) {
        const delta = result[i + c] - bg[c];
        alpha = Math.max(alpha, delta >= 0 ? delta / Math.max(1, 255 - bg[c]) : -delta / Math.max(1, bg[c]));
      }
      alpha = clamp(alpha);
      for (let c = 0; c < 3; c++) ff.data[i + c] = alpha > 0 ? (result[i + c] - bg[c] * (1 - alpha)) / alpha : 0;
      ff.data[i + 3] = Math.round(alpha * 255);
    }
    fc.putImageData(ff, 0, 0);
    const layer = document.createElement("canvas");
    layer.width = layer.height = 150;
    const lc = layer.getContext("2d");
    lc.filter = "blur(2px)";
    lc.drawImage(image, 0, 0, 150, 150);
    lc.filter = "none";
    const texture = lc.getImageData(0, 0, 150, 150).data;
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    return { image, base, foreground, background: ink, mask, texture, layer, output, frame: lc.createImageData(150, 150) };
  }
  function draw(ctx, glow, time, intensity, trail) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    if (time === null || intensity <= 0) {
      ctx.drawImage(glow.image, 0, 0);
      ctx.restore();
      return;
    }
    ctx.fillStyle = glow.background;
    ctx.fillRect(0, 0, glow.image.width, glow.image.height);
    const phase = (time ?? 0) * Math.PI / 8 * 0.7, w = glow.base.width, h = glow.base.height;
    const breath = 0.5 + 0.5 * Math.sin(time * Math.PI / 9);
    const out = glow.frame.data, tex = glow.texture, n = 150;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x - 75, dy = y - 75, angle = Math.atan2(dy, dx), p = angle - phase;
      const lead = Math.pow(0.5 + 0.5 * Math.cos(p), 12);
      const second = 0.68 * Math.pow(0.5 + 0.5 * Math.cos(p - 2.15), 18);
      const third = 0.42 * Math.pow(0.5 + 0.5 * Math.cos(p - 4.35), 9);
      const segments = Math.min(1, lead + second + third);
      const perimeter = 0.025 + 0.04 * breath;
      const extension = 0.12 * segments * (0.85 + 0.15 * breath);
      const stretch = 1 + (0.015 + (perimeter + extension) * (0.5 + trail / 32)) * 0.7;
      const sx = 75 + dx / stretch, sy = 75 + dy / stretch;
      const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy, i = (y * n + x) * 4;
      const gain = (0.38 + 0.38 * segments) * (0.78 + 0.22 * breath) * intensity / 100;
      for (let c = 0; c < 3; c++) {
        const sample = (xx, yy) => xx >= 0 && yy >= 0 && xx < n && yy < n ? tex[(yy * n + xx) * 4 + c] : 0;
        out[i + c] = ((sample(ix, iy) * (1 - fx) + sample(ix + 1, iy) * fx) * (1 - fy) + (sample(ix, iy + 1) * (1 - fx) + sample(ix + 1, iy + 1) * fx) * fy) * gain;
      }
      out[i + 3] = 255;
    }
    glow.layer.getContext("2d").putImageData(glow.frame, 0, 0);
    const oc = glow.output.getContext("2d");
    oc.globalCompositeOperation = "source-over";
    oc.clearRect(0, 0, w, h);
    oc.drawImage(glow.layer, 0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(glow.output, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(glow.foreground, 0, 0);
    ctx.restore();
  }

  // source/blur-plane.js
  function gridBlurPlane(i, o, f, r) {
    if (i.length !== o * f || o < 1 || f < 1) throw new Error("Invalid alpha plane");
    if (r <= 0) return i.slice();
    let s = Math.floor(Math.sqrt(4 * r * r + 1));
    s % 2 === 0 && s--, s = Math.max(1, s);
    const h = Math.round((12 * r * r - 3 * s * s - 12 * s - 9) / (-4 * s - 4));
    let v = Float32Array.from(i);
    const S = new Float32Array(i.length), T = new Float32Array(i.length), columnSums = new Float64Array(o);
    for (let _ = 0; _ < 3; _++) {
      const b = ((_ < h ? s : s + 2) - 1) / 2;
      if (b === 0) continue;
      const m = b * 2 + 1;
      for (let x = 0; x < f; x++) {
        const D = x * o;
        let Y = 0;
        for (let V = -b; V <= b; V++) Y += v[D + Math.max(0, Math.min(o - 1, V))];
        for (let V = 0; V < o; V++) {
          S[D + V] = Y / m;
          Y += v[D + Math.min(o - 1, V + b + 1)] - v[D + Math.max(0, V - b)];
        }
      }
      for (let x = 0; x < o; x++) {
        let D = 0;
        for (let Y = -b; Y <= b; Y++) D += S[Math.max(0, Math.min(f - 1, Y)) * o + x];
        columnSums[x] = D;
      }
      for (let Y = 0; Y < f; Y++) {
        const row = Y * o, add = Math.min(f - 1, Y + b + 1) * o, remove = Math.max(0, Y - b) * o;
        for (let x = 0; x < o; x++) {
          const D = columnSums[x];
          T[row + x] = D / m;
          columnSums[x] = D + (S[add + x] - S[remove + x]);
        }
      }
      v.set(T);
    }
    return Uint8ClampedArray.from(v);
  }

  // <stdin>
  function prepare(frame, pixels, contrast = 100) {
    return prepareGlow(pixels, frame.data, frame.width, frame.height, contrast / 100, 1, gridBlurPlane, "#07080B");
  }
  return __toCommonJS(stdin_exports);
})();
