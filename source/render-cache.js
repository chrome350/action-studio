// Keep only the most recent successful result for each rendering stage. Keys are
// shallow snapshots: mutable media and masks need a version/frame key when their
// contents change without replacing the object.
export function createGridRenderCache() {
  const entries = new Map();
  const find = (stage, key) => {
    const previous = entries.get(stage);
    return previous && previous.key.length === key.length && key.every((value, index) => Object.is(value, previous.key[index])) ? previous : null;
  };

  return {
    peek(stage, key) { return find(stage, key)?.value; },
    set(stage, key, value) {
      entries.set(stage, { key: key.slice(), value });
      return value;
    },
    get(stage, key, compute) {
      const previous = entries.get(stage);
      if (previous && previous.key.length === key.length) {
        let matches = true;
        for (let index = 0; index < key.length; index++) {
          if (!Object.is(key[index], previous.key[index])) {
            matches = false;
            break;
          }
        }
        if (matches) return previous.value;
      }

      const snapshot = key.slice();
      const value = compute();
      entries.set(stage, { key: snapshot, value });
      return value;
    },
    clear(stage) {
      if (arguments.length) entries.delete(stage);
      else entries.clear();
    }
  };
}

// Export waits for the newest complete frame, even if an edit supersedes the
// frame it initially waited for. Cancellation releases old waiters immediately.
export function createGridRenderGate() {
  let current = null;
  return {
    begin() {
      current?.finish();
      let resolve;
      const job = { promise: new Promise(done => { resolve = done; }), settled: false,
        finish() { if (!job.settled) { job.settled = true; resolve(); } },
        isCurrent() { return current === job; } };
      current = job;
      return job;
    },
    async wait() {
      for (;;) {
        const job = current;
        if (!job) return;
        await job.promise;
        if (current === job) return;
      }
    },
    cancel() { current?.finish(); }
  };
}
