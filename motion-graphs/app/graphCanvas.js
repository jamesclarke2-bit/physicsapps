/**
 * GraphCanvas: one crisp, responsive motion graph on a <canvas>.
 *
 * Plots a quantity (s, v or a) against time, and layers on whatever the
 * activity needs: a progressive reveal up to the current time, a cursor,
 * shaded areas (positive and negative in different colours), a tangent or
 * chord, highlighted time windows, labelled phases, overlays (a target
 * band, a student's sketch, other curves) and pointer input for drawing
 * and dragging.
 */
(function () {
  const COLORS = { s: '#2a6bd6', v: '#d9480f', a: '#8e44ad' };
  const LABELS = {
    s: { axis: 'displacement s / m', short: 's', unit: 'm', title: 'Displacement–time' },
    v: { axis: 'velocity v / m/s', short: 'v', unit: 'm/s', title: 'Velocity–time' },
    a: { axis: 'acceleration a / m/s²', short: 'a', unit: 'm/s²', title: 'Acceleration–time' },
  };
  const AREA_POS = 'rgba(18, 165, 148, 0.28)';
  const AREA_NEG = 'rgba(224, 49, 49, 0.24)';

  function niceStep(range, maxTicks) {
    const raw = range / Math.max(maxTicks, 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  function fmtTick(x) {
    const r = Math.round(x * 1000) / 1000;
    const str = String(r);
    return r < 0 ? '−' + str.slice(1) : str;
  }

  /** Range for a motion quantity: includes zero, padded, never degenerate. */
  function autoRange(motion, quantity) {
    const ext = window.MotionModel.extents(motion)[quantity];
    let lo = Math.min(ext[0], 0);
    let hi = Math.max(ext[1], 0);
    if (hi - lo < 1e-6) {
      lo = -1;
      hi = 1;
    }
    const pad = (hi - lo) * 0.12;
    if (lo < 0) lo -= pad;
    if (hi > 0) hi += pad;
    if (lo === 0 && hi > 0) lo = -(hi - lo) * 0.04;
    if (hi === 0 && lo < 0) hi = (hi - lo) * 0.04;
    return [lo, hi];
  }

  /** Discontinuity times for a motion graph (acceleration jumps at every boundary; velocity only at idealised jumps). */
  function motionBreaks(motion, quantity) {
    if (quantity === 's') return [];
    // ignore the tiny numerical joins in a drag motion: only real jumps count
    let aMax = 0;
    motion.segments.forEach((sg) => (aMax = Math.max(aMax, Math.abs(sg.a0), Math.abs(sg.a0 + sg.j * sg.duration))));
    const tol = Math.max(1e-9, aMax * 0.01);
    return motion.segments
      .slice(1)
      .filter((seg, i) => {
        if (quantity === 'v') return seg.vJump;
        const prev = motion.segments[i];
        const endA = prev.a0 + prev.j * prev.duration;
        return Math.abs(endA - seg.a0) > tol || seg.vJump;
      })
      .map((seg) => seg.t0);
  }

  function GraphCanvas(canvas, options) {
    const opts = Object.assign({ quantity: 's', cssHeight: 210, schematic: false, title: null }, options || {});
    const ctx = canvas.getContext('2d');
    let tMax = 10;
    let yMin = -1;
    let yMax = 1;
    let fn = null;
    let breaks = [];
    let lastState = {};
    const margin = { l: 50, r: 12, t: 12, b: 34 };
    let cssW = 300;
    let cssH = opts.cssHeight;
    const color = opts.color || COLORS[opts.quantity] || '#333';
    const label = LABELS[opts.quantity] || { axis: opts.quantity, short: opts.quantity, unit: '' };

    canvas.setAttribute('role', 'img');
    if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', label.title + ' graph');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(200, rect.width || canvas.parentElement.clientWidth || 300);
      cssH = opts.cssHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(lastState);
    }

    const plotW = () => cssW - margin.l - margin.r;
    const plotH = () => cssH - margin.t - margin.b;
    const X = (t) => margin.l + (t / tMax) * plotW();
    const Y = (y) => margin.t + ((yMax - y) / (yMax - yMin)) * plotH();
    const T = (px) => ((px - margin.l) / plotW()) * tMax;
    const V = (py) => yMax - ((py - margin.t) / plotH()) * (yMax - yMin);

    function setMotion(motion, range) {
      tMax = motion.duration;
      const q = opts.quantity;
      fn = (t) => window.MotionModel.stateAt(motion, t)[q];
      breaks = motionBreaks(motion, q);
      const r = range || autoRange(motion, q);
      yMin = r[0];
      yMax = r[1];
    }

    function setFunction(f, duration, range, brk) {
      fn = f;
      tMax = duration;
      breaks = brk || [];
      if (range) {
        yMin = range[0];
        yMax = range[1];
      }
    }

    function setRange(r) {
      yMin = r[0];
      yMax = r[1];
    }

    function drawAxes() {
      ctx.save();
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#fbfcfe';
      ctx.fillRect(margin.l, margin.t, plotW(), plotH());
      // grid
      const tStep = niceStep(tMax, Math.max(3, Math.floor(plotW() / 55)));
      const yStep = niceStep(yMax - yMin, Math.max(3, Math.floor(plotH() / 32)));
      ctx.strokeStyle = '#e9edf2';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#5b6370';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let t = 0; t <= tMax + 1e-9; t += tStep) {
        const x = Math.round(X(t)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, margin.t);
        ctx.lineTo(x, margin.t + plotH());
        ctx.stroke();
        ctx.fillText(fmtTick(t), x, Y(0) + 4 > margin.t + plotH() - 12 ? margin.t + plotH() + 4 : margin.t + plotH() + 4);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const yStart = Math.ceil(yMin / yStep) * yStep;
      for (let y = yStart; y <= yMax + 1e-9; y += yStep) {
        const py = Math.round(Y(y)) + 0.5;
        ctx.strokeStyle = Math.abs(y) < 1e-9 ? '#9aa4b1' : '#e9edf2';
        ctx.beginPath();
        ctx.moveTo(margin.l, py);
        ctx.lineTo(margin.l + plotW(), py);
        ctx.stroke();
        if (!opts.schematic || Math.abs(y) < 1e-9) ctx.fillText(fmtTick(y), margin.l - 5, py);
      }
      // time axis (y = 0) drawn strongly; left axis
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin.l, Y(0));
      ctx.lineTo(margin.l + plotW(), Y(0));
      ctx.moveTo(margin.l, margin.t);
      ctx.lineTo(margin.l, margin.t + plotH());
      ctx.stroke();
      // axis labels
      ctx.fillStyle = '#333';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('t / s', margin.l + plotW(), cssH - 2);
      ctx.save();
      ctx.translate(12, margin.t + plotH() / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(label.axis, 0, 0);
      ctx.restore();
      ctx.restore();
    }

    function clipPlot() {
      ctx.beginPath();
      ctx.rect(margin.l, margin.t - 2, plotW(), plotH() + 4);
      ctx.clip();
    }

    /** Trace f over [t0, t1], splitting at discontinuities so steps don't get joined by slanted lines. */
    function tracePath(f, t0, t1, brk, steps) {
      const cuts = [t0].concat((brk || []).filter((b) => b > t0 + 1e-9 && b < t1 - 1e-9)).concat([t1]);
      const pieces = [];
      for (let i = 1; i < cuts.length; i++) {
        const a = cuts[i - 1];
        const b = cuts[i];
        const n = Math.max(2, Math.ceil(((b - a) / tMax) * (steps || 360)));
        const pts = [];
        for (let k = 0; k <= n; k++) {
          let t = a + ((b - a) * k) / n;
          if (k === n && i < cuts.length - 1) t = b - 1e-7; // left limit at a break
          pts.push([t, f(t)]);
        }
        pieces.push(pts);
      }
      return pieces;
    }

    function strokePieces(pieces, col, width, dash, joinBreaks) {
      ctx.save();
      clipPlot();
      ctx.strokeStyle = col;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dash || []);
      pieces.forEach((pts) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
        ctx.stroke();
      });
      if (joinBreaks) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;
        for (let i = 1; i < pieces.length; i++) {
          const a = pieces[i - 1][pieces[i - 1].length - 1];
          const b = pieces[i][0];
          ctx.beginPath();
          ctx.moveTo(X(b[0]), Y(a[1]));
          ctx.lineTo(X(b[0]), Y(b[1]));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function shadeArea(f, t0, t1, brk) {
      ctx.save();
      clipPlot();
      const pieces = tracePath(f, t0, t1, brk, 500);
      pieces.forEach((pts) => {
        for (let i = 1; i < pts.length; i++) {
          const [ta, ya] = pts[i - 1];
          const [tb, yb] = pts[i];
          const mid = (ya + yb) / 2;
          ctx.fillStyle = mid >= 0 ? AREA_POS : AREA_NEG;
          ctx.beginPath();
          ctx.moveTo(X(ta), Y(0));
          ctx.lineTo(X(ta), Y(ya));
          ctx.lineTo(X(tb), Y(yb));
          ctx.lineTo(X(tb), Y(0));
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.restore();
    }

    function render(state) {
      lastState = state || {};
      const st = lastState;
      ctx.clearRect(0, 0, cssW, cssH);
      drawAxes();

      if (st.phases) {
        ctx.save();
        st.phases.forEach((p, i) => {
          ctx.fillStyle = i % 2 ? 'rgba(42,107,214,0.05)' : 'rgba(42,107,214,0.10)';
          ctx.fillRect(X(p.t0), margin.t, X(p.t1) - X(p.t0), plotH());
          ctx.fillStyle = '#173d75';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(p.label, (X(p.t0) + X(p.t1)) / 2, margin.t + 2);
        });
        ctx.restore();
      }
      if (st.highlight) {
        ctx.save();
        ctx.fillStyle = 'rgba(245,166,35,0.18)';
        ctx.fillRect(X(st.highlight[0]), margin.t, X(st.highlight[1]) - X(st.highlight[0]), plotH());
        ctx.restore();
      }
      if (st.markers) {
        ctx.save();
        st.markers.forEach((m) => {
          ctx.strokeStyle = m.color || '#868e96';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(X(m.t), margin.t);
          ctx.lineTo(X(m.t), margin.t + plotH());
          ctx.stroke();
          if (m.label) {
            ctx.setLineDash([]);
            ctx.fillStyle = m.color || '#495057';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = X(m.t) > margin.l + plotW() - 60 ? 'right' : 'left';
            ctx.fillText(m.label, X(m.t) + (ctx.textAlign === 'right' ? -3 : 3), margin.t + plotH() - 6);
          }
        });
        ctx.restore();
      }
      if (st.hlines) {
        ctx.save();
        st.hlines.forEach((hl) => {
          if (hl.y < yMin || hl.y > yMax) return;
          ctx.strokeStyle = hl.color || '#868e96';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(margin.l, Y(hl.y));
          ctx.lineTo(margin.l + plotW(), Y(hl.y));
          ctx.stroke();
          if (hl.label) {
            ctx.setLineDash([]);
            ctx.fillStyle = hl.color || '#495057';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = hl.y >= (yMin + yMax) / 2 ? 'top' : 'bottom';
            ctx.fillText(hl.label, margin.l + plotW() - 4, Y(hl.y) + (ctx.textBaseline === 'top' ? 3 : -3));
          }
        });
        ctx.restore();
      }
      if (fn && st.shade) shadeArea(fn, st.shade.t0, st.shade.t1, breaks);
      if (st.band && fn) {
        // tolerance band around the target curve
        ctx.save();
        clipPlot();
        ctx.fillStyle = 'rgba(42,107,214,0.12)';
        const n = 200;
        ctx.beginPath();
        for (let k = 0; k <= n; k++) {
          const t = (tMax * k) / n;
          const y = fn(t) + st.band;
          k ? ctx.lineTo(X(t), Y(y)) : ctx.moveTo(X(t), Y(y));
        }
        for (let k = n; k >= 0; k--) {
          const t = (tMax * k) / n;
          ctx.lineTo(X(t), Y(fn(t) - st.band));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      if (st.overlays) {
        st.overlays.forEach((ov) => {
          if (ov.fn) strokePieces(tracePath(ov.fn, 0, ov.upTo !== undefined ? ov.upTo : tMax, ov.breaks || [], 300), ov.color || '#333', ov.width || 2, ov.dash, true);
          if (ov.points) {
            const pts = ov.points.filter((p) => p[1] !== null && p[1] !== undefined);
            if (pts.length) strokePieces([pts], ov.color || '#333', ov.width || 2, ov.dash);
          }
        });
      }
      if (fn && !st.hideCurve) {
        const upTo = st.upTo === undefined || st.upTo === null ? tMax : Math.max(0, Math.min(st.upTo, tMax));
        if (upTo > 0) strokePieces(tracePath(fn, 0, upTo, breaks), color, st.faint ? 1.5 : 3, st.faint ? [5, 4] : [], true);
      }
      if (st.sketch) {
        const pts = [];
        const n = st.sketch.length;
        const pieces = [];
        let cur = [];
        st.sketch.forEach((y, k) => {
          if (y === null || y === undefined) {
            if (cur.length) pieces.push(cur);
            cur = [];
          } else cur.push([(tMax * k) / (n - 1), y]);
        });
        if (cur.length) pieces.push(cur);
        strokePieces(pieces, st.sketchColor || '#111', 3);
        if (st.sketchVertices) {
          ctx.save();
          ctx.fillStyle = '#111';
          st.sketchVertices.forEach((p) => {
            ctx.beginPath();
            ctx.arc(X(p[0]), Y(p[1]), 5, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }
        void pts;
      }
      if (fn && st.chord) {
        const { t0, t1 } = st.chord;
        const y0 = fn(t0);
        const y1 = fn(t1);
        ctx.save();
        clipPlot();
        ctx.strokeStyle = '#e8590c';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        const m = (y1 - y0) / (t1 - t0);
        ctx.beginPath();
        ctx.moveTo(X(0), Y(y0 - m * t0));
        ctx.lineTo(X(tMax), Y(y0 + m * (tMax - t0)));
        ctx.stroke();
        ctx.setLineDash([]);
        // rise/run triangle
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(X(t0), Y(y0));
        ctx.lineTo(X(t1), Y(y0));
        ctx.lineTo(X(t1), Y(y1));
        ctx.stroke();
        ctx.restore();
      }
      if (fn && st.tangentAt !== undefined && st.tangentAt !== null) {
        const t = st.tangentAt;
        const dt = Math.max(tMax * 1e-4, 1e-4);
        const m = st.tangentSlope !== undefined ? st.tangentSlope : (fn(Math.min(t + dt, tMax)) - fn(Math.max(t - dt, 0))) / (Math.min(t + dt, tMax) - Math.max(t - dt, 0));
        const y = fn(t);
        const span = tMax * 0.3;
        ctx.save();
        clipPlot();
        ctx.strokeStyle = '#2b8a3e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(X(t - span), Y(y - m * span));
        ctx.lineTo(X(t + span), Y(y + m * span));
        ctx.stroke();
        if (st.tangentTriangle) {
          const run = tMax * 0.15;
          ctx.strokeStyle = '#2b8a3e';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(X(t), Y(y));
          ctx.lineTo(X(t + run), Y(y));
          ctx.lineTo(X(t + run), Y(y + m * run));
          ctx.stroke();
        }
        ctx.restore();
      }
      if (st.points) {
        ctx.save();
        st.points.forEach((p) => {
          ctx.fillStyle = p.color || color;
          ctx.beginPath();
          ctx.arc(X(p.t), Y(p.y), p.r || 5, 0, Math.PI * 2);
          ctx.fill();
          if (p.label) {
            ctx.fillStyle = '#222';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(p.label, X(p.t) + 7, Y(p.y) - 7);
          }
        });
        ctx.restore();
      }
      if (fn && st.cursor !== undefined && st.cursor !== null) {
        const t = Math.max(0, Math.min(st.cursor, tMax));
        ctx.save();
        ctx.strokeStyle = 'rgba(26,26,26,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(X(t), margin.t);
        ctx.lineTo(X(t), margin.t + plotH());
        ctx.stroke();
        if (!st.hideCurve) {
          ctx.fillStyle = color;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(X(t), Y(fn(t)), 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      if (st.message) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(margin.l + 8, margin.t + plotH() / 2 - 14, plotW() - 16, 28);
        ctx.fillStyle = '#495057';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.message, margin.l + plotW() / 2, margin.t + plotH() / 2);
        ctx.restore();
      }
    }

    /** Pointer input in data coordinates: handler(kind: 'down'|'move'|'up', t, y, event). */
    function onPointer(handler) {
      let down = false;
      const toData = (e) => {
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * cssW;
        const py = ((e.clientY - rect.top) / rect.height) * cssH;
        return [Math.max(0, Math.min(tMax, T(px))), Math.max(yMin, Math.min(yMax, V(py)))];
      };
      canvas.addEventListener('pointerdown', (e) => {
        down = true;
        canvas.setPointerCapture(e.pointerId);
        const [t, y] = toData(e);
        handler('down', t, y, e);
      });
      canvas.addEventListener('pointermove', (e) => {
        const [t, y] = toData(e);
        handler(down ? 'move' : 'hover', t, y, e);
      });
      const end = (e) => {
        if (!down) return;
        down = false;
        const [t, y] = toData(e);
        handler('up', t, y, e);
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
    }

    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    } else window.addEventListener('resize', resize);
    requestAnimationFrame(resize);

    return {
      canvas,
      setMotion,
      setFunction,
      setRange,
      render,
      rerender: () => render(lastState),
      onPointer,
      resize,
      get tMax() {
        return tMax;
      },
      get range() {
        return [yMin, yMax];
      },
      toPx: (t, y) => [X(t), Y(y)],
      pixelsPerUnitY: () => plotH() / (yMax - yMin),
      destroy() {
        if (ro) ro.disconnect();
      },
    };
  }

  window.GraphCanvas = { create: GraphCanvas, autoRange, motionBreaks, COLORS, LABELS, niceStep };
})();
