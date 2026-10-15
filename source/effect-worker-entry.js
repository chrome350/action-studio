import { preparePixels } from "./clean-effect.ts";
import { gridBlurPlane } from "./blur-plane.js";
import { ribbonPixels } from "./ribbon-stretch.js";

const frameCanvas = (rgba, width, height) => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  const frame = context.createImageData(width, height);
  frame.data.set(rgba);
  context.putImageData(frame, 0, 0);
  return canvas;
};
const pixelsFromCanvas = (canvas) => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;

// Pixel functions are shared with the synchronous renderer, including the blur.
// Source fitting stays on the main canvas so image decoding, zoom and brightness
// produce exactly the same input for both paths.
export function processGridEffectJob(job) {
  const started = performance.now();
  const { generation, width, height, rgba, action, ribbons } = job;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba?.length !== width * height * 4) throw new Error("Invalid effect frame");
  const result = { generation };
  if (action) {
    result.action = {
      width,
      height,
      rgba: preparePixels(rgba, width, height, action.radius, action.contrast, action.gamma, gridBlurPlane, action.accent, action.ink, action.intensity, action.trail, action.sourceWidth, action.sourceHeight, action.clarity),
    };
  }
  if (ribbons) {
    let high = ribbons.highResolution;
    if (!high) {
      const source = frameCanvas(rgba, width, height);
      const scaled = new OffscreenCanvas(width * 2, height * 2);
      scaled.getContext("2d").drawImage(source, 0, 0, scaled.width, scaled.height);
      high = { width: scaled.width, height: scaled.height, rgba: pixelsFromCanvas(scaled) };
    }
    if (high.rgba?.length !== high.width * high.height * 4) throw new Error("Invalid high-resolution ribbon frame");
    const mask = high.mask || new Uint8ClampedArray(high.width * high.height);
    if (!high.mask && ribbons.mask) for (let y = 0; y < high.height; y++) for (let x = 0; x < high.width; x++) {
      mask[y * high.width + x] = ribbons.mask[Math.floor(y * height / high.height) * width + Math.floor(x * width / high.width)];
    }
    const highPixels = ribbonPixels(high.rgba, high.width, high.height, ribbons.length, ribbons.capture, ribbons.bend, ribbons.direction, mask);
    const highCanvas = frameCanvas(highPixels, high.width, high.height);
    const preview = new OffscreenCanvas(width, height), context = preview.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(highCanvas, 0, 0, width, height);
    result.ribbons = { width, height, rgba: pixelsFromCanvas(preview), highResolution: { width: high.width, height: high.height, rgba: highPixels } };
  }
  result.durationMs = performance.now() - started;
  return result;
}

if (typeof self !== "undefined") {
  self.onmessage = (event) => {
    const message = event.data;
    if (message?.type !== "render") return;
    try {
      const result = processGridEffectJob(message.job), transfers = [];
      if (result.action) transfers.push(result.action.rgba.buffer);
      if (result.ribbons) transfers.push(result.ribbons.rgba.buffer, result.ribbons.highResolution.rgba.buffer);
      self.postMessage({ type: "result", id: message.id, result }, transfers);
    } catch (error) {
      self.postMessage({ type: "error", id: message.id, message: String(error?.message || error) });
    }
  };
  self.postMessage({ type: "ready" });
}
