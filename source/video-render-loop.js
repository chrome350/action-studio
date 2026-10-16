// Keep prepared image stages across property-panel updates. Each stage retains
// only its latest inputs/result; video time and working size are part of the key.
const gridRenderCache = O.useRef(null);
if (!gridRenderCache.current) gridRenderCache.current = createGridRenderCache();
const gridEffectWorker = O.useRef(null), gridRenderGate = O.useRef(null);
if (!gridRenderGate.current) gridRenderGate.current = createGridRenderGate();
async function waitForGridRender() { await gridRenderGate.current.wait(); }
O.useEffect(() => () => {
  gridEffectWorker.current?.dispose();
  gridEffectWorker.current = null;
  gridRenderGate.current.cancel();
}, []);
O.useLayoutEffect(() => {
  const stages = gridRenderCache.current;
  const worker = gridEffectWorker.current || (gridEffectWorker.current = createGridEffectWorker());
  let disposed = false, ready = gridRenderGate.current.begin();
  if (Be.current?.dataset) Be.current.dataset.gridRenderPending = "true";
  lettersMotion.current.cells = [];
  lettersMotion.current.previousCells = [];
  lettersMotion.current.last = 0;
  let renderSize = 1080, renderScale = 1080 / 600, renderMask = stages.get("render-mask", [ribbonMask, 1080], () => gridResizeMask(ribbonMask, 1080)), lastWork = 0, lastRender = 0, renderTimer = 0;
  let videoFrame = -1;
  let at = 0, bt = null, Rt = false, oe = null, Me = null, dotPrepared = null;
  let Al = null, De = null, dotCells = [], firstRender = true;
  const qe = document.createElement("canvas"), work = document.createElement("canvas");
  qe.width = qe.height = work.width = work.height = renderSize;
  let frameSource = null, publishedTime = 0, transparentForeground=false,effectBackdrop=null,hasTransparentLetters=false,actionCoverage=null;
  lettersMotion.current.scale = renderScale;
  let ga = performance.now(), fu = 0;
  const su = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const repaintDots = (time, moving) => {
    if (!dotPrepared || !Al) return;
    dotPrepared.repaintGradient(moving ? time % 2e4 / 2e4 : null);
    const context = Al.getContext("2d");
    for (const [left, top, width, height] of dotCells) {
      if(effectBackdrop)context.drawImage(effectBackdrop,left,top,width,height,left,top,width,height);
      context.drawImage(dotPrepared, left, top, width, height, left, top, width, height);
    }
  };
  const Ae = (Mt) => {
    if (Mt.drawImage(Al, 0, 0), oe && Me) {
      const Wt = qe.getContext("2d");
      Wt.clearRect(0, 0, renderSize, renderSize), yb(Wt, oe, su || !actionAnimate ? null : y.current, Q, Lt), Wt.globalCompositeOperation = "destination-in", actionCoverage&&Wt.drawImage(actionCoverage,0,0), Wt.drawImage(De, 0, 0), Wt.globalCompositeOperation = "source-over", Mt.save(), Mt.clip(Me), Mt.globalCompositeOperation = "source-over", Mt.drawImage(qe, 0, 0), Mt.restore();
    }
    drawLettersInteraction(Mt, lettersMotion.current, lettersInteractive, lettersRadius, lettersStrength, su, performance.now(), v, _e.current);
    if (v && b > 0) {
      const grid = stages.get("grid-path", [f, s, renderSize, renderScale], () => {
        const path = new Path2D();
        const dot = (left, top) => {
          path.moveTo(left + 0.5 * renderScale, top); path.arc(left, top, 0.5 * renderScale, 0, Math.PI * 2);
        };
        for (let column = 1; column < f; column++) {
          const left = Math.floor(column * renderSize / f) + 0.5;
          for (let top = 0.5; top < renderSize; top += 8 * renderScale) dot(left, top);
        }
        for (let row = 1; row < s; row++) {
          const top = Math.floor(row * renderSize / s) + 0.5;
          for (let left = 0.5; left < renderSize; left += 8 * renderScale) dot(left, top);
        }
        return path;
      });
      Mt.fillStyle = T; Mt.globalAlpha = b / 100; Mt.fill(grid);
    }
    Mt.globalAlpha = 1;
    gridPublishVideoFrame(frameSource, renderSize, publishedTime);
  };
  const present = () => {
    const output = Be.current;
    if (!output || disposed) return;
    if (output.width !== renderSize || output.height !== renderSize) output.width = output.height = renderSize;
    const outputContext=output.getContext("2d", { willReadFrequently: true });
    if(transparentForeground)outputContext.clearRect(0,0,renderSize,renderSize);
    if(output.parentElement?.dataset)output.parentElement.dataset.transparentBackground=String(hasTransparentLetters);
    Ae(outputContext);
    if (output.dataset) {
      output.dataset.gridRenderPending = "false";
      output.dataset.gridFrameReady = frameSource ? "true" : "false";
      output.dataset.gridWorker = worker.status;
    }
    if (frameSource || Ft.current?.complete) ready.finish();
  };
  const pixelsCanvas = (frame) => {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width; canvas.height = frame.height;
    const context = canvas.getContext("2d"), image = context.createImageData(frame.width, frame.height);
    image.data.set(frame.rgba); context.putImageData(image, 0, 0);
    return canvas;
  };
  const ya = async () => {
    if (disposed) return;
    const media = Ft.current, policy = gridVideoPolicy(media, lastWork), qualityChanged = renderSize !== policy.size;
    if(media?.tagName==='VIDEO'&&(!media.complete)){
      renderTimer=setTimeout(()=>{at=requestAnimationFrame(ya)},50);return;
    }
    if (document.hidden && !videoTools.isRecording()) {
      renderTimer = setTimeout(() => {
        at = requestAnimationFrame(ya);
      }, 200);
      return;
    }
    if (!qualityChanged && policy.preview && performance.now() - lastRender < policy.interval) {
      renderTimer = setTimeout(() => {
        at = requestAnimationFrame(ya);
      }, Math.max(8, policy.interval - (performance.now() - lastRender)));
      return;
    }
    if (qualityChanged) {
      renderSize = policy.size;
      renderScale = renderSize / 600;
      renderMask = stages.get("render-mask", [ribbonMask, renderSize], () => gridResizeMask(ribbonMask, renderSize));
      for (const target of [work, qe]) if (target) {
        target.width = target.height = renderSize;
      }
      Rt = false;
      dotPrepared = null;
      oe = null;
      Me = null;
      lettersMotion.current.scale = renderScale;
    }
    const Mt = work.getContext("2d");
    if (!Mt) return;
    const El = performance.now(), Wt = Math.min(100, El - ga) / 1e3;
    if (ga = El, _e.current && !firstRender && !qualityChanged && !media?.gridNeedsFullFrame && !(media?.paused && !Rt)) {
      at = requestAnimationFrame(ya);
      return;
    }
    const Je = Ft.current?.complete && Ft.current.naturalWidth ? Ft.current : null;
    const videoSource = Ft.current?.tagName === "VIDEO";
    const animatedImage = !videoSource && Je?.gridAnimated === true;
    if (videoSource && Je && Je.currentTime !== videoFrame) {
      if (Rt && El - fu < policy.interval) {
        at = requestAnimationFrame(ya);
        return;
      }
      videoFrame = Je.currentTime;
      Rt = false;
      dotPrepared = null;
    }
    const dotMoving = dotAnimate && !su && dotPalette !== "mono" && (P === "dotmatrix" || Object.values(K).some((cell) => cell.mode === "dotmatrix"));
    if (dotMoving && Rt && Je === bt && El - fu < 1e3 / 30) {
      at = requestAnimationFrame(ya);
      return;
    }
    if (oe && !su && actionAnimate && !_e.current) y.current += Wt * actionSpeed / 100;
    if (Rt && Je === bt && !media?.gridNeedsFullFrame && !(animatedImage && dotMoving)) {
      if ((oe && !su && actionAnimate || dotMoving || lettersInteractive && !su && lettersMotion.current.cells.length > 0) && El - fu >= 1e3 / 30) {
        if (dotMoving) repaintDots(El, true);
        present();
        fu = El;
      }
      at = requestAnimationFrame(ya);
      return;
    }
    if (ready.settled) ready = gridRenderGate.current.begin();
    if (Be.current?.dataset) Be.current.dataset.gridRenderPending = "true";
    bt = Je, Rt = true;
    const frameTime = videoSource ? Je?.currentTime || 0 : animatedImage ? El : 0;
    const rasterFrame = stages.get("raster", [Je, frameTime, renderSize, x], () => {
      // Isolate source rasterization from cell readbacks and image-load timing.
      // Reusing the composition canvas can switch Chromium's drawing backend
      // before a replacement image decodes, changing otherwise identical pixels.
      const raster = document.createElement("canvas");
      raster.width = raster.height = renderSize;
      const rasterContext = raster.getContext("2d");
      rasterContext.fillStyle = "#000", rasterContext.fillRect(0, 0, renderSize, renderSize), rasterContext.save(), rasterContext.translate(renderSize / 2, renderSize / 2), rasterContext.scale(x / 100, x / 100), rasterContext.translate(-renderSize / 2, -renderSize / 2);
      if (Je) {
        const fit = Math.min(renderSize / Je.naturalWidth, renderSize / Je.naturalHeight), width = Je.naturalWidth * fit, height = Je.naturalHeight * fit;
        rasterContext.drawImage(Je, (renderSize - width) / 2, (renderSize - height) / 2, width, height);
      }
      rasterContext.restore();
      return rasterContext.getImageData(0, 0, renderSize, renderSize);
    });
    const foregroundFrame=stages.get("foreground",[rasterFrame,Je,renderSize,x],()=>{
      if(!Je)return rasterFrame;
      const fit=Math.min(renderSize/Je.naturalWidth,renderSize/Je.naturalHeight)*x/100;
      const w=Je.naturalWidth*fit,h=Je.naturalHeight*fit;
      const metadata={};
      const data=gridForegroundForEffects(rasterFrame.data,renderSize,renderSize,{left:(renderSize-w)/2,top:(renderSize-h)/2,right:(renderSize+w)/2-1,bottom:(renderSize+h)/2-1},metadata);
      if(data===rasterFrame.data)return rasterFrame;
      const frame=new ImageData(data,renderSize,renderSize);frame.effectBackground=metadata.background;
      frame.effectOriginal=new Uint8ClampedArray(rasterFrame.data);
      for(let py=0;py<renderSize;py++)for(let px=0;px<renderSize;px++){
        if(px<(renderSize-w)/2||px>=(renderSize+w)/2||py<(renderSize-h)/2||py>=(renderSize+h)/2){
          const offset=(py*renderSize+px)*4;
          frame.effectOriginal.set(metadata.background.subarray(offset,offset+4),offset);
        }
      }
      return frame;
    });
    const adaptedForeground=foregroundFrame!==rasterFrame;
    transparentForeground=adaptedForeground;
    effectBackdrop=adaptedForeground?stages.get("effect-backdrop",[foregroundFrame,Y],()=>{
      const canvas=document.createElement("canvas");canvas.width=canvas.height=renderSize;
      const pixels=new Uint8ClampedArray(foregroundFrame.effectBackground);
      if(Y!==100)for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)pixels[i+c]*=Y/100;
      canvas.getContext("2d").putImageData(new ImageData(pixels,renderSize,renderSize),0,0);
      return canvas;
    }):null;
    actionCoverage=adaptedForeground?stages.get("action-object-coverage",[foregroundFrame],()=>{
      const canvas=document.createElement("canvas");canvas.width=canvas.height=renderSize;
      canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(foregroundFrame.data),renderSize,renderSize),0,0);
      return canvas;
    }):null;
    const lettersBackdrop=effectBackdrop;
    const effectBackground=adaptedForeground?"#00000000":B;

    const ribbonSource=adaptedForeground?null:Je;
    const sourceFrame = stages.get("source", [foregroundFrame, Y], () => {
      if (Y === 100) return foregroundFrame;
      const frame = new ImageData(new Uint8ClampedArray(foregroundFrame.data), renderSize, renderSize), gain = Y / 100;
      for (let i = 0; i < frame.data.length; i += 4) frame.data[i] *= gain, frame.data[i + 1] *= gain, frame.data[i + 2] *= gain;
      return frame;
    });
    const actionFrame=stages.get("action-original-source",[rasterFrame,Y],()=>{
      if(Y===100)return rasterFrame;
      const pixels=new Uint8ClampedArray(rasterFrame.data);
      for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)pixels[i+c]*=Y/100;
      return new ImageData(pixels,renderSize,renderSize);
    });
    const ribbonFrame=adaptedForeground?stages.get("ribbon-colour-source",[foregroundFrame,Y],()=>{
      const pixels=new Uint8ClampedArray(foregroundFrame.effectOriginal);
      if(Y!==100)for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)pixels[i+c]*=Y/100;
      return new ImageData(pixels,renderSize,renderSize);
    }):sourceFrame;
    const modes = new Set(Array.from({ length: f * s }, (_, index) => K[index]?.mode || P));
    hasTransparentLetters=false;
    lettersMotion.current.fullFrameLetters = modes.size === 1 && modes.has("letters");
    // Keep video exposure history advancing even while Action/Ribbons is shown.
    const frameTone = Je && (videoSource || modes.has("letters") || modes.has("dotmatrix")) ? stages.get("tone", [sourceFrame], () => gridAdaptiveTone(sourceFrame.data, Je, frameTime)) : null;
    const letterColor = Je && modes.has("letters") ? stages.get("letters-color", [sourceFrame, frameTone, ...lettersColors], () => lettersColorField(sourceFrame.data, renderSize, renderSize, lettersColors, frameTone)) : null;
    const ribbonKey = [ribbonFrame, J.ribbons, ribbonCapture, ribbonBend, ribbonDirection, renderMask];
    const actionKey = [actionFrame, J.clean, W, j, Z, B, Q, Lt, actionClarity];
    const needsRibbon = Je && modes.has("ribbons"), needsAction = Je && modes.has("clean");
    let ribbonImage = needsRibbon ? stages.peek("ribbons", ribbonKey) : null;
    let actionImage = needsAction ? stages.peek("action", actionKey) : null;
    if (worker.available && (needsRibbon && !ribbonImage || needsAction && !actionImage)) {
      const job = { generation: 0, width: renderSize, height: renderSize, rgba: actionFrame.data };
      if (needsAction && !actionImage) job.action = { radius:J.clean,contrast:W/100,gamma:j,accent:Z,ink:B,intensity:Q,trail:Lt,sourceWidth:Je.naturalWidth,sourceHeight:Je.naturalHeight,clarity:actionClarity };
      if (needsRibbon && !ribbonImage) {
        const highResolution = stages.get("ribbon-source", [ribbonFrame, renderMask], () => prepareRibbonSource(ribbonFrame.data, renderSize, renderSize, renderMask, ribbonSource, x, Y));
        job.ribbons = { length: J.ribbons, capture: ribbonCapture, bend: ribbonBend, direction: ribbonDirection, highResolution };
      }
      const result = await worker.run(job);
      if (disposed || !ready.isCurrent()) return;
      // Playback may advance while a worker is running. A paused/seek/export
      // frame and its resolution must still match before they can be published.
      if (Ft.current !== Je || gridVideoPolicy(Je, lastWork).size !== renderSize || videoSource && (!Je.complete || Je.paused && Math.abs(Je.currentTime - frameTime) > .001)) {
        Rt = false; at = requestAnimationFrame(ya); return;
      }
      if (result?.action) actionImage = stages.set("action",actionKey,GridCleanStyle.prepareGlow(result.action.rgba,actionFrame.data,renderSize,renderSize,W/100,j,qf,B));
      if (result?.ribbons) {
        ribbonImage = pixelsCanvas(result.ribbons);
        ribbonImage.highResolution = pixelsCanvas(result.ribbons.highResolution);
        stages.set("ribbons", ribbonKey, ribbonImage);
      }
      if (result && Be.current?.dataset) {
        Be.current.dataset.gridWorkerFrames = String(Number(Be.current.dataset.gridWorkerFrames || 0) + 1);
        Be.current.dataset.gridWorkerDuration = String(result.durationMs);
      }
    }
    if (needsRibbon && !ribbonImage) ribbonImage = stages.get("ribbons", ribbonKey, () => renderRibbonStretch(ribbonFrame.data, renderSize, renderSize, J.ribbons, ribbonCapture, ribbonBend, ribbonDirection, renderMask, ribbonSource, x, Y));
    if (needsAction && !actionImage) actionImage=stages.get("action",actionKey,()=>gb(actionFrame.data,renderSize,renderSize,J.clean,W/100,j,Z,B,Q,Lt,Je.naturalWidth,Je.naturalHeight,actionClarity));
    ribbonExportFrame.current = ribbonImage ? { image: ribbonImage.highResolution, columns: f, rows: s, mode: P, cells: K, grid: v, color: T, opacity: b } : null;
    const dotSource = Je && modes.has("dotmatrix") ? stages.get("dot-source", [sourceFrame], () => prepareDotMatrixSource(sourceFrame.data, renderSize, renderSize)) : null;
    dotPrepared = dotSource ? stages.get("dots", [sourceFrame, J.dotmatrix * renderScale, W, frameTone, ...dotColors], () => renderDotMatrix(sourceFrame.data, renderSize, renderSize, J.dotmatrix * renderScale, W / 100, frameTone, dotColors, null, dotSource, adaptedForeground)) : null;
    const composition = stages.get("composition", [sourceFrame, f, s, P, K, W, j, B, Z, J.clean, J.letters, J.pixels, J.dithering, J.halftone, letterColor, ribbonImage, dotPrepared, actionFrame], () => {
      lettersMotion.current.previousCells = lettersMotion.current.cells;
      lettersMotion.current.cells = [];
      Mt.putImageData(sourceFrame, 0, 0);
      const Vl = new Path2D();
      let be = false;
      const dotRects = [];
      const ke = document.createElement("canvas"), Oe = ke.getContext("2d"), gi = [];
      for (let kt = 0; kt < s; kt++) for (let ne = 0; ne < f; ne++) {
        const Zt = Math.round(ne * renderSize / f), il = Math.round(kt * renderSize / s), Ie = Math.round((ne + 1) * renderSize / f) - Zt, Ne = Math.round((kt + 1) * renderSize / s) - il;
        // Preserve canvas readback order: Chromium may switch drawing backends
        // after repeated reads, which affects antialiasing and PNG resampling.
        const cl = Mt.getImageData(Zt, il, Ie, Ne), visible = Je && ib(cl.data, W / 100, j);
        let active = visible;
        if (!active) for (let index = 0; index < cl.data.length; index += 4) {
          if (cl.data[index] > 6 || cl.data[index + 1] > 6 || cl.data[index + 2] > 6) { active = true; break; }
        }
        if ((K[kt * f + ne]?.mode || P) === "ribbons") {
          if (ribbonImage) {
            if(effectBackdrop)Mt.drawImage(effectBackdrop,Zt,il,Ie,Ne,Zt,il,Ie,Ne);
            Mt.drawImage(ribbonImage, Zt, il, Ie, Ne, Zt, il, Ie, Ne);
            active && gi.push(kt * f + ne);
          }
          continue;
        }
        if ((K[kt * f + ne]?.mode || P) === "dotmatrix") {
          dotRects.push([Zt, il, Ie, Ne]);
          if (dotPrepared) {
            if(effectBackdrop)Mt.drawImage(effectBackdrop,Zt,il,Ie,Ne,Zt,il,Ie,Ne);
            Mt.drawImage(dotPrepared, Zt, il, Ie, Ne, Zt, il, Ie, Ne);
            active && gi.push(kt * f + ne);
          } else {
            Mt.fillStyle = "#000";
            Mt.fillRect(Zt, il, Ie, Ne);
          }
          continue;
        }
        if (!Je || !visible && (K[kt * f + ne]?.mode || P) !== "clean" && (K[kt * f + ne]?.mode || P) !== "letters") {
          if(effectBackdrop)Mt.drawImage(effectBackdrop,Zt,il,Ie,Ne,Zt,il,Ie,Ne);else {Mt.fillStyle = B;Mt.fillRect(Zt, il, Ie, Ne);}
          continue;
        }
        active && gi.push(kt * f + ne);
        const Xl = K[kt * f + ne], du = Xl && ci.some((yi) => yi.mode === Xl.mode) ? Xl : { mode: P }, ol = { ...du, size: J[du.mode] * renderScale };
        // Action's feathered cell mask reveals its base at the boundary. Keep
        // that base on the original input too, rather than the light-source signal.
        if(ol.mode==="clean"&&adaptedForeground){
          for(let row=0;row<Ne;row++){
            const start=((il+row)*renderSize+Zt)*4;
            cl.data.set(foregroundFrame.effectBackground.subarray(start,start+Ie*4),row*Ie*4);
            if(Y!==100)for(let i=row*Ie*4;i<(row+1)*Ie*4;i+=4)for(let c=0;c<3;c++)cl.data[i+c]*=Y/100;
          }
        }
        ol.mode === "pixels" ? db(cl.data, Ie, Ne, 1, 1, ol.size, B, Z, W / 100, j) : ol.mode === "dithering" ? fb(cl.data, Ie, Ne, B, Z, W / 100, j) : ol.mode === "clean" && !adaptedForeground && GridCleanStyle.applyBase(cl.data, B, W / 100, j), ol.mode === "clean" && (Vl.rect(Zt, il, Ie, Ne), be = true), ol.mode === "halftone" || ol.mode === "letters" ? (ke.width = Ie, ke.height = Ne, ol.mode === "letters" ? mb(Oe, cl.data, Ie, Ne, ol.size, effectBackground, Z, W / 100, j, Zt, il, letterColor) : sb(Oe, cl.data, Ie, Ne, 1, 1, ol.size, B, Z, W / 100, j), ol.mode === "letters" && cacheLettersCell(lettersMotion.current, ke, Zt, il, ol.size, effectBackground, lettersBackdrop), adaptedForeground&&ol.mode==="letters"&&(Mt.clearRect(Zt,il,Ie,Ne),lettersBackdrop&&Mt.drawImage(lettersBackdrop,Zt,il,Ie,Ne,Zt,il,Ie,Ne)), Mt.drawImage(ke, Zt, il)) : Mt.putImageData(cl, Zt, il);
      }
      const base = document.createElement("canvas"), mask = document.createElement("canvas");
      base.width = base.height = mask.width = mask.height = renderSize;
      base.getContext("2d").drawImage(work, 0, 0);
      if (be) {
        const kt = mask.getContext("2d");
        kt.clearRect(0, 0, renderSize, renderSize), kt.fillStyle = "#fff", kt.fill(Vl), hb(mask, J.clean * 0.3 * renderScale);
        const ne = kt.getImageData(0, 0, renderSize, renderSize);
        for (let Zt = 3; Zt < ne.data.length; Zt += 4) ne.data[Zt] = Math.max(0, (ne.data[Zt] - 128) * 2);
        kt.putImageData(ne, 0, 0);
      }
      return { base, mask, path: be ? Vl : null, cells: lettersMotion.current.cells, active: gi, dots: dotRects };
    });
    Al = composition.base, De = composition.mask, oe = composition.path ? actionImage : null, Me = composition.path, dotCells = composition.dots;
    lettersMotion.current.cells = composition.cells;
    if (firstRender) {
      // Preserve the existing reset on property changes, including cache hits.
      for (const cell of composition.cells) for (const tile of cell.tiles) tile.ox = tile.oy = tile.vx = tile.vy = 0;
      firstRender = false;
    }
    Xt.current = composition.active;
    repaintDots(El, dotMoving);
    frameSource = Je; publishedTime = frameTime;
    present(), fu = El, lastRender = El, lastWork = performance.now() - El, at = requestAnimationFrame(ya);
  };
  // Give the input update a paint before source preparation. Heavy pixel work
  // runs in the worker; the visible canvas changes only after a complete result.
  at = requestAnimationFrame(() => { renderTimer = setTimeout(ya, 0); });
  return () => {
    disposed = true;
    ready.finish();
    worker.invalidate();
    cancelAnimationFrame(at);
    clearTimeout(renderTimer);
  };
}, [f, s, v, T, b, x, Y, W, B, Z, j, rt, P, J, K, Q, Lt, actionClarity, actionAnimate, actionSpeed, dotColors, dotAnimate, dotPalette, ribbonCapture, ribbonBend, ribbonDirection, ribbonMask, lettersPalette, lettersInteractive, lettersRadius, lettersStrength]);
