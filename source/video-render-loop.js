O.useLayoutEffect(() => {
  lettersMotion.current.cells = [];
  lettersMotion.current.previousCells = [];
  lettersMotion.current.last = 0;
  let renderSize = 600, renderScale = 1, renderMask = ribbonMask, lastWork = 0, lastRender = 0, renderTimer = 0;
  let videoFrame = -1;
  let at = 0, bt = null, Rt = false, oe = null, Me = null, dotPrepared = null;
  const qe = document.createElement("canvas"), De = document.createElement("canvas");
  qe.width = qe.height = De.width = De.height = renderSize;
  const Al = document.createElement("canvas");
  Al.width = Al.height = renderSize;
  if (Be.current) {
    Be.current.width = Be.current.height = 600;
  }
  lettersMotion.current.scale = 1;
  let ga = performance.now(), fu = 0;
  const su = window.matchMedia("(prefers-reduced-motion: reduce)").matches, Ae = (Mt) => {
    if (Mt.drawImage(Al, 0, 0), oe && Me) {
      const Wt = qe.getContext("2d");
      Wt.clearRect(0, 0, renderSize, renderSize), yb(Wt, oe, su || !actionAnimate ? null : y.current, Q, Lt), Wt.globalCompositeOperation = "destination-in", Wt.drawImage(De, 0, 0), Wt.globalCompositeOperation = "source-over", Mt.save(), Mt.clip(Me), Mt.globalCompositeOperation = "source-over", Mt.drawImage(qe, 0, 0), Mt.restore();
    }
    drawLettersInteraction(Mt, lettersMotion.current, lettersInteractive, lettersRadius, lettersStrength, su, performance.now(), v, _e.current);
    Mt.fillStyle = T, Mt.globalAlpha = v ? b / 100 : 0, Mt.beginPath();
    const El = (Wt, Je) => {
      Mt.moveTo(Wt + 0.5, Je), Mt.arc(Wt, Je, 0.5 * renderScale, 0, Math.PI * 2);
    };
    for (let Wt = 1; Wt < f; Wt++) {
      const Je = Math.floor(Wt * renderSize / f) + 0.5;
      for (let se = 0.5; se < renderSize; se += 8 * renderScale) El(Je, se);
    }
    for (let Wt = 1; Wt < s; Wt++) {
      const Je = Math.floor(Wt * renderSize / s) + 0.5;
      for (let se = 0.5; se < renderSize; se += 8 * renderScale) El(se, Je);
    }
    Mt.fill(), Mt.globalAlpha = 1;
    gridPublishVideoFrame(Ft.current, renderSize);
  }, ya = () => {
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
      renderMask = gridResizeMask(ribbonMask, renderSize);
      for (const target of [Be.current, qe, De, Al]) if (target) {
        target.width = target.height = renderSize;
      }
      Rt = false;
      dotPrepared = null;
      oe = null;
      Me = null;
      lettersMotion.current.scale = renderScale;
    }
    const Mt = Be.current?.getContext("2d", { willReadFrequently: true });
    if (!Mt) return;
    const El = performance.now(), Wt = Math.min(100, El - ga) / 1e3;
    if (ga = El, _e.current && !qualityChanged && !media?.gridNeedsFullFrame && !(media?.paused && !Rt)) {
      at = requestAnimationFrame(ya);
      return;
    }
    const Je = Ft.current?.complete && Ft.current.naturalWidth ? Ft.current : null;
    const videoSource = Ft.current?.tagName === "VIDEO";
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
    if (oe && !su && actionAnimate && !_e.current && (y.current += Wt * actionSpeed / 100), Rt && Je === bt && !dotMoving && !media?.gridNeedsFullFrame) {
      (oe && !su && actionAnimate || lettersMotion.current.cells.length > 0) && El - fu >= 1e3 / 30 && (Ae(Mt), fu = El), at = requestAnimationFrame(ya);
      return;
    }
    if (bt !== Je) dotPrepared = null;
    lettersMotion.current.previousCells = lettersMotion.current.cells;
    lettersMotion.current.cells = [];
    bt = Je, Rt = true, Mt.fillStyle = "#000", Mt.fillRect(0, 0, renderSize, renderSize), Mt.save(), Mt.translate(renderSize / 2, renderSize / 2), Mt.scale(x / 100, x / 100), Mt.translate(-renderSize / 2, -renderSize / 2);
    const se = Ft.current;
    if (se?.complete && se.naturalWidth) {
      const kt = Math.min(renderSize / se.naturalWidth, renderSize / se.naturalHeight), ne = se.naturalWidth * kt, Zt = se.naturalHeight * kt;
      Mt.drawImage(se, (renderSize - ne) / 2, (renderSize - Zt) / 2, ne, Zt);
    }
    if (Mt.restore(), Y !== 100) {
      const kt = Mt.getImageData(0, 0, renderSize, renderSize), ne = Y / 100;
      for (let Zt = 0; Zt < kt.data.length; Zt += 4) kt.data[Zt] *= ne, kt.data[Zt + 1] *= ne, kt.data[Zt + 2] *= ne;
      Mt.putImageData(kt, 0, 0);
    }
    const Fc = P === "clean" || Object.values(K).some((kt) => kt.mode === "clean"), vi = Je && Fc ? Mt.getImageData(0, 0, renderSize, renderSize) : null, Vl = new Path2D();
    let be = false;
    const frameTone=Je?gridAdaptiveTone(Mt.getImageData(0,0,renderSize,renderSize).data,Je,Je.currentTime||0):null;
    const letterColor = Je && (P === "letters" || Object.values(K).some((cell) => cell.mode === "letters")) ? lettersColorField(Mt.getImageData(0, 0, renderSize, renderSize).data, renderSize, renderSize, lettersColors,frameTone) : null;
    const ribbonImage = Je && (P === "ribbons" || Object.values(K).some((cell) => cell.mode === "ribbons")) ? renderRibbonStretch(Mt.getImageData(0, 0, renderSize, renderSize).data, renderSize, renderSize, J.ribbons, ribbonCapture, ribbonBend, ribbonDirection, renderMask, Je, x, Y) : null;
    ribbonExportFrame.current = ribbonImage ? { image: ribbonImage.highResolution, columns: f, rows: s, mode: P, cells: K, grid: v, color: T, opacity: b } : null;
    const dotMatrixImage = Je && (P === "dotmatrix" || Object.values(K).some((cell) => cell.mode === "dotmatrix")) ? (dotPrepared || (dotPrepared = renderDotMatrix(Mt.getImageData(0, 0, renderSize, renderSize).data, renderSize, renderSize, J.dotmatrix * renderScale, W / 100, frameTone, dotColors))).repaintGradient(dotMoving ? El % 2e4 / 2e4 : null) : null;
    const ke = document.createElement("canvas"), Oe = ke.getContext("2d"), gi = [];
    for (let kt = 0; kt < s; kt++) for (let ne = 0; ne < f; ne++) {
      const Zt = Math.round(ne * renderSize / f), il = Math.round(kt * renderSize / s), Ie = Math.round((ne + 1) * renderSize / f) - Zt, Ne = Math.round((kt + 1) * renderSize / s) - il, cl = Mt.getImageData(Zt, il, Ie, Ne);
      if ((K[kt * f + ne]?.mode || P) === "ribbons") {
        if (ribbonImage) {
          Mt.drawImage(ribbonImage, Zt, il, Ie, Ne, Zt, il, Ie, Ne);
          (ib(cl.data, W / 100, j)||cl.data.some((value,index)=>index%4!==3&&value>6)) && gi.push(kt * f + ne);
        }
        continue;
      }
      if ((K[kt * f + ne]?.mode || P) === "dotmatrix") {
        if (dotMatrixImage) {
          Mt.drawImage(dotMatrixImage, Zt, il, Ie, Ne, Zt, il, Ie, Ne);
          (ib(cl.data, W / 100, j)||cl.data.some((value,index)=>index%4!==3&&value>6)) && gi.push(kt * f + ne);
        } else {
          Mt.fillStyle = "#000";
          Mt.fillRect(Zt, il, Ie, Ne);
        }
        continue;
      }
      if (!Je || !ib(cl.data, W / 100, j) && (K[kt * f + ne]?.mode || P) !== "clean" && (K[kt * f + ne]?.mode || P) !== "letters") {
        Mt.fillStyle = B, Mt.fillRect(Zt, il, Ie, Ne);
        continue;
      }
      (ib(cl.data, W / 100, j)||cl.data.some((value,index)=>index%4!==3&&value>6)) && gi.push(kt * f + ne);
      const Xl = K[kt * f + ne], du = Xl && ci.some((yi) => yi.mode === Xl.mode) ? Xl : { mode: P }, ol = { ...du, size: J[du.mode] * renderScale };
      ol.mode === "pixels" ? db(cl.data, Ie, Ne, 1, 1, ol.size, B, Z, W / 100, j) : ol.mode === "dithering" ? fb(cl.data, Ie, Ne, B, Z, W / 100, j) : ol.mode === "clean" && GridCleanStyle.applyBase(cl.data, B, W / 100, j), ol.mode === "clean" && (Vl.rect(Zt, il, Ie, Ne), be = true), ol.mode === "halftone" || ol.mode === "letters" ? (ke.width = Ie, ke.height = Ne, ol.mode === "letters" ? mb(Oe, cl.data, Ie, Ne, ol.size, B, Z, W / 100, j, Zt, il, letterColor) : sb(Oe, cl.data, Ie, Ne, 1, 1, ol.size, B, Z, W / 100, j), ol.mode === "letters" && cacheLettersCell(lettersMotion.current, ke, Zt, il, ol.size, B), Mt.drawImage(ke, Zt, il)) : Mt.putImageData(cl, Zt, il);
    }
    if (Xt.current = gi, Al.getContext("2d").drawImage(Be.current, 0, 0), oe = be && vi ? gb(vi.data, renderSize, renderSize, J.clean, W / 100, j, Z, B, Q, Lt, Je.naturalWidth, Je.naturalHeight, actionClarity) : null, Me = be ? Vl : null, oe) {
      const kt = De.getContext("2d");
      kt.clearRect(0, 0, renderSize, renderSize), kt.fillStyle = "#fff", kt.fill(Vl), hb(De, J.clean * 0.3 * renderScale);
      const ne = kt.getImageData(0, 0, renderSize, renderSize);
      for (let Zt = 3; Zt < ne.data.length; Zt += 4) ne.data[Zt] = Math.max(0, (ne.data[Zt] - 128) * 2);
      kt.putImageData(ne, 0, 0);
    }
    Ae(Mt), fu = El, lastRender = El, lastWork = performance.now() - El, at = requestAnimationFrame(ya);
  };
  return ya(), () => {
    cancelAnimationFrame(at);
    clearTimeout(renderTimer);
  };
}, [f, s, v, T, b, x, Y, W, B, Z, j, rt, P, J, K, Q, Lt, actionClarity, actionAnimate, actionSpeed, dotColors, dotAnimate, dotPalette, ribbonCapture, ribbonBend, ribbonDirection, ribbonMask, lettersPalette, lettersInteractive, lettersRadius, lettersStrength]);
