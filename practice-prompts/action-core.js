// Static Action algorithm extracted from Grid Studio. Use ActionEffect.renderAction(frame, options).
var ActionEffect = (() => {
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
    PRESETS: () => PRESETS,
    applyBase: () => applyBase,
    gridBlurPlane: () => gridBlurPlane,
    preparePixels: () => preparePixels,
    renderAction: () => renderAction
  });
  var PRESETS = [
    { name: "\u0421\u0432\u0435\u0442\u043B\u044B\u0439", ink: "#07080B", paper: "#FFFFFF" },
    { name: "\u041E\u0440\u0430\u043D\u0436\u0435\u0432\u044B\u0439", ink: "#07080B", paper: "#FF6E14" },
    { name: "\u0413\u043E\u043B\u0443\u0431\u043E\u0439", ink: "#07080B", paper: "#34A4FA" },
    { name: "\u0421\u0438\u043D\u0438\u0439", ink: "#07080B", paper: "#3E6BFF" }
  ];
  var clamp = (x) => Math.max(0, Math.min(1, x));
  var smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  var rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  var actionGeometry = null;
  function geometry(width, height, sourceWidth, sourceHeight, sw, sh, ox, oy, cx, cy, unit) {
    const key = [width, height, sourceWidth, sourceHeight];
    if (actionGeometry && key.every((v, i) => v === actionGeometry.key[i])) return actionGeometry;
    const dx = Float64Array.from({ length: width }, (_, x) => x - cx), dy = Float64Array.from({ length: height }, (_, y) => y - cy);
    const radius = new Float64Array(width * height), phase = new Float64Array(width * height);
    const right = Float64Array.from({ length: width }, (_, x) => smooth(ox + 240 * unit, ox + 520 * unit, x));
    const upper = Float64Array.from({ length: height }, (_, y) => 1 - smooth(oy + 190 * unit, oy + 400 * unit, y));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = y * width + x;
      radius[p] = Math.hypot(dx[x] / (sw * 0.4), dy[y] / (sh * 0.49));
      phase[p] = Math.sin(Math.atan2(dy[y], dx[x]) * 3 + 0.4) * 0.18 + 1;
    }
    return actionGeometry = { key, dx, dy, radius, phase, right, upper };
  }
  function applyBase(data, ink, contrast, gamma) {
    const bg = rgb(ink);
    for (let i = 0; i < data.length; i += 4) {
      const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const gain = l > 1e-3 ? Math.pow(clamp((l - 0.5) * contrast + 0.5), 1 / gamma) / l : 0;
      const coverage = smooth(8e-3, 0.045, Math.max(data[i], data[i + 1], data[i + 2]) / 255);
      for (let c = 0; c < 3; c++) data[i + c] = bg[c] * (1 - coverage) + Math.min(255, data[i + c] * gain) * coverage;
    }
  }
  function preparePixels(data, width, height, radius, contrast, gamma, blur, accent = "#FFFFFF", ink = "#07080B", intensity = 80, trail = 16, sourceWidth = width, sourceHeight = height, clarity = 16) {
    const fit = Math.min(width / sourceWidth, height / sourceHeight);
    const sw = sourceWidth * fit, sh = sourceHeight * fit, ox = (width - sw) / 2, oy = (height - sh) / 2;
    const cx = ox + sw * 0.5, cy = oy + sh * 0.45, unit = sw / 754;
    const size = Math.max(0, radius / 24), strength = Math.max(0, intensity / 80);
    const clearRadius = clamp(clarity / 100);
    const split = 0.095 * size * strength, streak = 0.12 * (trail / 16) * strength;
    const coordinates = geometry(width, height, sourceWidth, sourceHeight, sw, sh, ox, oy, cx, cy, unit);
    const bg = rgb(ink), pixels = new Float32Array(data.length), result = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const level = clamp((l - 0.5) * contrast + 0.5), gain = l > 1e-3 ? (gamma === 1 ? level : Math.pow(level, 1 / gamma)) / l : 0;
      for (let c = 0; c < 3; c++) pixels[i + c] = Math.min(255, data[i + c] * gain) * data[i + 3] / 255;
      pixels[i + 3] = data[i + 3];
    }
    const sample = (x, y, c) => {
      if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 0;
      const ix = Math.floor(x), iy = Math.floor(y), jx = Math.min(width - 1, ix + 1), jy = Math.min(height - 1, iy + 1), fx = x - ix, fy = y - iy;
      const top = iy * width * 4, bottom = jy * width * 4, left = ix * 4 + c, right = jx * 4 + c;
      return (pixels[top + left] * (1 - fx) + pixels[top + right] * fx) * (1 - fy) + (pixels[bottom + left] * (1 - fx) + pixels[bottom + right] * fx) * fy;
    };
    const times = [], weights = [];
    let weight = 0;
    for (let k = 0; k < 7; k++) {
      const t = k / 6, wt = k === 0 ? 3 : 1 - t * 0.65;
      times.push(t);
      weights.push(wt);
      weight += wt;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = y * width + x, dx = coordinates.dx[x], dy = coordinates.dy[y], gate = smooth(clearRadius, clearRadius + 0.59, coordinates.radius[p]), i = p * 4;
      const phase = coordinates.phase[p];
      for (let c = 0; c < 3; c++) {
        const scale = 1 + split * gate * (c === 0 ? -0.14 : c === 1 ? 0.4 : 1);
        let sum = 0;
        for (let k = 0; k < 7; k++) {
          const s = scale + times[k] * streak * gate * phase;
          sum += sample(cx + dx / s, cy + dy / s, c) * weights[k];
        }
        const blend = gate * 0.95;
        result[i + c] = Math.min(255, (pixels[i + c] * (1 - blend) + sum / weight * blend) * (1 + 0.08 * Math.min(1, strength)));
      }
      result[i + 3] = 255;
    }
    const screen = (i, c, light, alpha) => {
      result[i + c] = 255 - (255 - result[i + c]) * (1 - light / 255 * clamp(alpha));
    };
    const bloomPlanes = Array.from({ length: 3 }, () => new Uint8ClampedArray(width * height));
    for (let p = 0; p < width * height; p++) {
      const i = p * 4, peak = Math.max(result[i], result[i + 1], result[i + 2]) / 255, coverage = smooth(0.22, 0.8, peak);
      for (let c = 0; c < 3; c++) bloomPlanes[c][p] = result[i + c] * coverage * 150 / 255;
    }
    for (const [r, a] of [[8, 0.6], [2, 0.35]]) for (let c = 0; c < 3; c++) {
      const plane = bloomPlanes[c];
      const spread = blur(plane, width, height, r * unit * size);
      for (let p = 0; p < plane.length; p++) screen(p * 4, c, spread[p], a * strength);
    }
    const lit = result.slice(), tint = accent.toUpperCase() === "#FFFFFF" ? null : rgb(accent);
    const fieldSeed = new Float64Array(width * height), warmProtection = new Float64Array(width * height), coldProtection = new Float64Array(width * height);
    for (let p = 0; p < fieldSeed.length; p++) {
      const i = p * 4, peak = Math.max(lit[i], lit[i + 1], lit[i + 2]) / 255, inside = smooth(0.04, 0.22, peak), warmth = smooth(0.025, 0.16, (lit[i] - lit[i + 2]) / 255);
      fieldSeed[p] = smooth(0.25, 0.82, peak);
      const protect = (1 - 0.9 * smooth(0.65, 1, peak)) * (1 - 0.65 * inside);
      warmProtection[p] = protect;
      coldProtection[p] = protect * (1 - 0.8 * warmth);
    }
    const fields = [
      { color: [255, 63, 9], radius: 15, dx: 12, dy: 3, gain: 1.2, kind: "warm" },
      { color: [12, 28, 255], radius: 22, dx: -6, dy: -8, gain: 1.05, kind: "blue" },
      { color: [0, 245, 255], radius: 7, dx: -4, dy: -10, gain: 0.7, kind: "cyan" }
    ];
    for (const field of fields) {
      const seed = new Uint8ClampedArray(width * height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const p = y * width + x, right = coordinates.right[x], upper = coordinates.upper[y];
        const zone = field.kind === "warm" ? 0.2 + 0.8 * right : field.kind === "blue" ? 0.35 + 0.65 * upper : upper * (0.9 - 0.4 * right);
        seed[p] = 255 * fieldSeed[p] * zone;
      }
      const spread = blur(seed, width, height, field.radius * unit * size), color = tint || field.color;
      const dx = Math.round(field.dx * unit * size), dy = Math.round(field.dy * unit * size);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const sx = x - dx, sy = y - dy;
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        const p = y * width + x, i = p * 4, protect = field.kind === "warm" ? warmProtection[p] : coldProtection[p];
        const alpha = spread[sy * width + sx] / 255 * protect * field.gain * strength;
        for (let c = 0; c < 3; c++) screen(i, c, color[c], alpha);
      }
    }
    for (let i = 0; i < result.length; i += 4) {
      const r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255, l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const shadow = smooth(0.015, 0.14, l) * (1 - smooth(0.48, 0.84, l));
      const warmth = smooth(0.015, 0.15, r - b), cold = smooth(0.06, 0.3, (result[i + 2] - result[i]) / 255);
      const amount = shadow * (data[i + 3] / 255) * (0.38 + 0.62 * warmth) * (1 - 0.72 * cold) * Math.min(strength, 1.5);
      result[i] += (255 - result[i]) * 0.56 * amount;
      result[i + 1] *= 1 - 0.13 * amount;
      result[i + 2] *= 1 - 0.24 * amount;
      for (let c = 0; c < 3; c++) result[i + c] = 255 - (255 - bg[c]) * (1 - result[i + c] / 255);
    }
    return result;
  }
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
  function renderAction(frame, options = {}) {
    const { size = 24, intensity = 80, trail = 16, clarity = 16, sourceWidth = frame.width, sourceHeight = frame.height } = options;
    const data = preparePixels(frame.data, frame.width, frame.height, size, 1, 1, gridBlurPlane, "#FFFFFF", "#07080B", intensity, trail, sourceWidth, sourceHeight, clarity);
    return new ImageData(data, frame.width, frame.height);
  }
  return __toCommonJS(stdin_exports);
})();
