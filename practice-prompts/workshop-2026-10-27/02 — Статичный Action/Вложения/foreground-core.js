var ForegroundEffect = (() => {
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
    prepare: () => gridForegroundForEffects,
    removePaperGlow: () => gridRemovePaperGlow
  });

  // source/adaptive-tone.js
  function gridForegroundForEffects(data, width, height, bounds = null, metadata = null) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const smooth = (a, b, v) => {
      const t = clamp((v - a) / (b - a));
      return t * t * (3 - 2 * t);
    };
    const left = Math.max(0, Math.min(width - 1, Math.ceil(bounds?.left ?? 0)));
    const top = Math.max(0, Math.min(height - 1, Math.ceil(bounds?.top ?? 0)));
    const right = Math.max(left, Math.min(width - 1, Math.floor(bounds?.right ?? width - 1)));
    const bottom = Math.max(top, Math.min(height - 1, Math.floor(bounds?.bottom ?? height - 1)));
    const inset = Math.max(1, Math.floor(Math.min(right - left + 1, bottom - top + 1) * 0.018));
    const probeLeft = Math.min(right, left + inset), probeRight = Math.max(probeLeft, right - inset), probeTop = Math.min(bottom, top + inset), probeBottom = Math.max(probeTop, bottom - inset);
    const samples = [[], [], []], border = [], positions = [];
    const add = (x, y) => {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 240) return;
      const color = [data[i], data[i + 1], data[i + 2]];
      border.push(color);
      positions.push([x, y]);
      for (let c = 0; c < 3; c++) samples[c].push(color[c]);
    };
    const step = Math.max(1, Math.floor(Math.max(right - left, bottom - top) / 180));
    for (let x = left; x <= right; x += step) {
      add(x, probeTop);
      add(x, probeBottom);
    }
    for (let y = top; y <= bottom; y += step) {
      add(probeLeft, y);
      add(probeRight, y);
    }
    if (border.length < 4) return data;
    const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const bg = samples.map(median), light = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
    const consistent = border.filter((color) => Math.max(...color.map((v, c) => Math.abs(v - bg[c]))) < 48).length / border.length;
    const borderLights = border.map((color) => (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255).sort((a, b) => a - b);
    const flatBackdrop = border.filter((color) => Math.max(...color.map((v, c) => Math.abs(v - bg[c]))) < 4).length / border.length > 0.95;
    const brightEdge = borderLights[Math.floor((borderLights.length - 1) * 0.85)];
    const patch = Math.max(1, Math.min(probeRight - probeLeft + 1, probeBottom - probeTop + 1, Math.floor(Math.min(right - left + 1, bottom - top + 1) * 0.025)));
    const corner = (cx, cy, dx, dy) => [0, 1, 2].map((c) => {
      const values = [];
      for (let y = 0; y < patch; y++) for (let x = 0; x < patch; x++) values.push(data[((cy + y * dy) * width + cx + x * dx) * 4 + c]);
      return median(values);
    });
    const corners = [corner(probeLeft, probeTop, 1, 1), corner(probeRight, probeTop, -1, 1), corner(probeLeft, probeBottom, 1, -1), corner(probeRight, probeBottom, -1, -1)];
    if (light < 0.55 && !(light > 0.32 && brightEdge > 0.65)) return data;
    if (consistent < 0.55) {
      const errors = border.map((color, index) => {
        const [x, y] = positions[index], tx = clamp((x - probeLeft) / Math.max(1, probeRight - probeLeft)), ty = clamp((y - probeTop) / Math.max(1, probeBottom - probeTop));
        return Math.max(...color.map((value, c) => Math.abs(value - ((corners[0][c] * (1 - tx) + corners[1][c] * tx) * (1 - ty) + (corners[2][c] * (1 - tx) + corners[3][c] * tx) * ty))));
      }).sort((a, b) => a - b);
      if (errors[Math.floor(errors.length * 0.75)] > 24) return data;
    }
    const horizontal = [probeTop, probeBottom].map((row) => Array.from({ length: width }, (_, x) => [0, 1, 2].map((c) => {
      const values = [];
      for (let dx = -3; dx <= 3; dx++) values.push(data[(row * width + Math.max(left, Math.min(right, x + dx))) * 4 + c]);
      return median(values);
    })));
    const backdrop = metadata ? new Uint8ClampedArray(data.length) : null;
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      const edge = (x) => [0, 1, 2].map((c) => {
        const values = [];
        for (let dy = -3; dy <= 3; dy++) values.push(data[(Math.max(top, Math.min(bottom, y + dy)) * width + x) * 4 + c]);
        return median(values);
      });
      const fy = clamp((y - top) / Math.max(1, bottom - top));
      const predicted = [0, 1].map((side) => corners[side].map((v, c) => v * (1 - fy) + corners[side + 2][c] * fy));
      const edges = [edge(probeLeft), edge(probeRight)];
      const [a, b] = edges.map((color, side) => {
        const distance = Math.max(...color.map((v, c) => Math.abs(v - predicted[side][c]))), weight = 1 - smooth(24, 64, distance);
        return color.map((v, c) => v * weight + predicted[side][c] * (1 - weight));
      });
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        out[i + 3] = data[i + 3];
        if (x < left || x > right || y < top || y > bottom) {
          out[i + 3] = 0;
          if (backdrop) backdrop.set([...bg, 255], i);
          continue;
        }
        const t = (x - left) / Math.max(1, right - left);
        const background = flatBackdrop ? bg : a.map((v, c) => {
          const bilinear = predicted[0][c] * (1 - t) + predicted[1][c] * t;
          const topExpected = corners[0][c] * (1 - t) + corners[1][c] * t, bottomExpected = corners[2][c] * (1 - t) + corners[3][c] * t;
          const upper = horizontal[0][x][c], lower = horizontal[1][x][c];
          const vertical = (Math.abs(upper - topExpected) < 64 ? upper : topExpected) * (1 - fy) + (Math.abs(lower - bottomExpected) < 64 ? lower : bottomExpected) * fy;
          return Math.max(0, Math.min(255, v * (1 - t) + b[c] * t + vertical - bilinear));
        });
        if (backdrop) backdrop.set([...background, 255], i);
        const delta = Math.max(...background.map((v, c) => Math.abs(data[i + c] - v) / Math.max(128, v, 255 - v)));
        const coverage = smooth(8e-3, 0.065, delta) * data[i + 3] / 255;
        out[i + 3] = Math.round(255 * coverage);
        const energy = coverage > 0 ? Math.pow(clamp(delta), 0.6) : 0;
        const peak = Math.max(data[i], data[i + 1], data[i + 2]), low = Math.min(data[i], data[i + 1], data[i + 2]);
        const saturation = (peak - low) / Math.max(1, peak), retain = smooth(0.08, 0.35, saturation);
        for (let c = 0; c < 3; c++) out[i + c] = 255 * energy * (1 - retain + retain * data[i + c] / Math.max(1, peak));
      }
    }
    if (metadata) {
      metadata.background = backdrop;
      metadata.lightMode = light >= 0.55 || light > 0.32 && brightEdge > 0.65;
    }
    return out;
  }
  function gridRemovePaperGlow(frame, reference, paper) {
    for (let i = 0; i < frame.length; i += 4) {
      for (let c = 0; c < 3; c++) frame[i + c] = Math.max(0, Math.min(255, paper[i + c] + frame[i + c] - reference[i + c]));
      frame[i + 3] = 255;
    }
    return frame;
  }
  return __toCommonJS(stdin_exports);
})();
