// The Blob contains the complete bundled worker so the offline HTML needs no
// companion file or HTTP server. Keep only one calculation and the newest wait.
export function createGridEffectWorker(options = {}) {
  if (typeof options === "string") options = { source: options };
  const WorkerType = options.Worker ?? globalThis.Worker;
  const BlobType = options.Blob ?? globalThis.Blob;
  const URLApi = options.URL ?? globalThis.URL;
  const CanvasType = options.OffscreenCanvas ?? globalThis.OffscreenCanvas;
  const source = options.source ?? (typeof GRID_EFFECT_WORKER_SOURCE === "string" ? GRID_EFFECT_WORKER_SOURCE : "");
  const timeoutMs = options.timeoutMs ?? 60000;
  let disabled = !WorkerType || !BlobType || !URLApi?.createObjectURL || !URLApi?.revokeObjectURL || !CanvasType || !source;
  let disposed = false, worker = null, workerURL = null, active = null, waiting = null, nextId = 0, timer = 0;
  const settle = (request, value) => {
    if (!request || request.settled) return;
    request.settled = true;
    request.resolve(value);
  };
  const release = () => {
    clearTimeout(timer);
    timer = 0;
    if (worker) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      try { worker.terminate(); } catch {}
      worker = null;
    }
    if (workerURL) {
      try { URLApi.revokeObjectURL(workerURL); } catch {}
      workerURL = null;
    }
  };
  const fail = () => {
    disabled = true;
    release();
    settle(active, null);
    settle(waiting, null);
    active = waiting = null;
  };
  const copyJob = (job) => {
    const transfers = [];
    const pixels = (data) => {
      const copy = new Uint8ClampedArray(data);
      transfers.push(copy.buffer);
      return copy;
    };
    const copy = { ...job, rgba: pixels(job.rgba) };
    if (job.action) copy.action = { ...job.action };
    if (job.ribbons) {
      copy.ribbons = { ...job.ribbons, mask: job.ribbons.mask ? pixels(job.ribbons.mask) : null };
      const high = job.ribbons.highResolution;
      if (high) copy.ribbons.highResolution = { width: high.width, height: high.height, rgba: pixels(high.rgba), mask: high.mask ? pixels(high.mask) : null };
    }
    return { copy, transfers };
  };
  const start = (request) => {
    if (!request || disposed || disabled) {
      settle(request, null);
      return;
    }
    active = request;
    try {
      if (!worker) {
        workerURL = URLApi.createObjectURL(new BlobType([source], { type: "text/javascript" }));
        worker = new WorkerType(workerURL);
        worker.onmessage = (event) => {
          const message = event.data;
          if (message?.type === "ready") return;
          if (!active || message?.id !== active.id) return;
          if (message.type !== "result") {
            fail();
            return;
          }
          clearTimeout(timer);
          timer = 0;
          const completed = active;
          active = null;
          settle(completed, completed.stale ? null : message.result);
          const latest = waiting;
          waiting = null;
          if (latest) start(latest);
        };
        worker.onerror = (event) => {
          event?.preventDefault?.();
          fail();
        };
        worker.onmessageerror = fail;
      }
      const { copy, transfers } = copyJob(request.job);
      timer = setTimeout(fail, timeoutMs);
      worker.postMessage({ type: "render", id: request.id, job: copy }, transfers);
    } catch {
      fail();
    }
  };
  return {
    get available() { return !disabled && !disposed; },
    get status() { return disposed ? "disposed" : disabled ? "disabled" : active ? "working" : "idle"; },
    run(job) {
      if (disposed || disabled) return Promise.resolve(null);
      return new Promise((resolve) => {
        const request = { id: ++nextId, job, resolve, stale: false, settled: false };
        if (active) {
          active.stale = true;
          settle(active, null);
          settle(waiting, null);
          waiting = request;
        } else start(request);
      });
    },
    invalidate() {
      if (active) {
        active.stale = true;
        settle(active, null);
      }
      settle(waiting, null);
      waiting = null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
      settle(active, null);
      settle(waiting, null);
      active = waiting = null;
    },
  };
}
