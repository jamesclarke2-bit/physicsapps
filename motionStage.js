/**
 * MotionStage: the animated "real world" view of a one-dimensional motion.
 *
 * Draws the track (horizontal road or vertical shaft) with a ruler, the
 * origin and the chosen positive direction, an original cartoon of the
 * moving object, signed velocity and acceleration arrows, and a "motion
 * map" trail: a ghost dot at equal time intervals, so spacing shows speed.
 */
(function () {
  const C = { v: '#d9480f', a: '#8e44ad', s: '#2a6bd6', ink: '#1a1a1a', ground: '#cfd8e3', sky: '#eaf2fb' };

  // ---- cartoons: each draws at (0,0) facing +x, roughly 46 px wide ----------------
  function roundRect(ctx, x, y, w, hgt, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hgt, r);
    ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wheel(ctx, x, y, r, spin) {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ced4da';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(spin) * r * 0.7, y + Math.sin(spin) * r * 0.7);
    ctx.stroke();
  }
  function stick(ctx, pose, colour) {
    ctx.strokeStyle = colour || '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#ffd8a8';
    ctx.beginPath();
    ctx.arc(0, -34, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(0, -12);
    const sw = Math.sin(pose) * 7;
    ctx.moveTo(0, -12);
    ctx.lineTo(sw, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(-sw, 0);
    ctx.moveTo(0, -24);
    ctx.lineTo(-sw * 0.9, -16);
    ctx.moveTo(0, -24);
    ctx.lineTo(sw * 0.9, -16);
    ctx.stroke();
  }
  const CARTOONS = {
    car(ctx, s) {
      ctx.fillStyle = '#e03131';
      roundRect(ctx, -26, -22, 52, 14, 6);
      ctx.fill();
      ctx.fillStyle = '#c92a2a';
      roundRect(ctx, -14, -33, 26, 13, 6);
      ctx.fill();
      ctx.fillStyle = '#d0ebff';
      roundRect(ctx, -10, -30, 9, 8, 2);
      ctx.fill();
      roundRect(ctx, 1, -30, 9, 8, 2);
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(22, -19, 4, 4);
      wheel(ctx, -15, -6, 6, s.spin);
      wheel(ctx, 15, -6, 6, s.spin);
    },
    bus(ctx, s) {
      ctx.fillStyle = '#f59f00';
      roundRect(ctx, -32, -36, 64, 28, 5);
      ctx.fill();
      ctx.fillStyle = '#d0ebff';
      for (let i = 0; i < 4; i++) ctx.fillRect(-27 + i * 14, -31, 10, 9);
      wheel(ctx, -20, -6, 6, s.spin);
      wheel(ctx, 20, -6, 6, s.spin);
    },
    train(ctx, s) {
      ctx.fillStyle = '#1c7ed6';
      roundRect(ctx, -36, -34, 72, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#d0ebff';
      for (let i = 0; i < 4; i++) ctx.fillRect(-30 + i * 15, -29, 10, 8);
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(-36, -14, 72, 3);
      wheel(ctx, -24, -6, 5, s.spin);
      wheel(ctx, -10, -6, 5, s.spin);
      wheel(ctx, 10, -6, 5, s.spin);
      wheel(ctx, 24, -6, 5, s.spin);
    },
    person(ctx, s) {
      stick(ctx, s.walk, '#1971c2');
    },
    runner(ctx, s) {
      stick(ctx, s.walk * 1.4, '#e8590c');
    },
    dog(ctx, s) {
      ctx.fillStyle = '#a0522d';
      ctx.beginPath();
      ctx.ellipse(0, -14, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, -22, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c2e0e';
      ctx.beginPath();
      ctx.ellipse(14, -27, 3, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a0522d';
      ctx.lineWidth = 3;
      const sw = Math.sin(s.walk * 1.5) * 5;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-10 + sw, 0);
      ctx.moveTo(10, -8);
      ctx.lineTo(10 - sw, 0);
      ctx.moveTo(-15, -16);
      ctx.lineTo(-22, -24);
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(19, -23, 1.5, 0, Math.PI * 2);
      ctx.fill();
    },
    cyclist(ctx, s) {
      ctx.strokeStyle = '#343a40';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-13, -9, 9, 0, Math.PI * 2);
      ctx.arc(13, -9, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-13, -9);
      ctx.lineTo(-2, -22);
      ctx.lineTo(10, -22);
      ctx.lineTo(13, -9);
      ctx.moveTo(-2, -22);
      ctx.lineTo(0, -9);
      ctx.stroke();
      ctx.save();
      ctx.translate(-2, -14);
      ctx.scale(0.8, 0.8);
      stick(ctx, s.walk * 2, '#2f9e44');
      ctx.restore();
    },
    ball(ctx, s) {
      ctx.fillStyle = '#f76707';
      ctx.beginPath();
      ctx.arc(0, -12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -12, 12, s.spin, s.spin + Math.PI);
      ctx.stroke();
    },
    trolley(ctx, s) {
      ctx.fillStyle = '#37b24d';
      roundRect(ctx, -22, -24, 44, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#2b8a3e';
      ctx.fillRect(-22, -12, 44, 4);
      wheel(ctx, -13, -5, 5, s.spin);
      wheel(ctx, 13, -5, 5, s.spin);
    },
    robot(ctx, s) {
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.ellipse(0, -10, 20, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#74c0fc';
      ctx.beginPath();
      ctx.arc(10, -13, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -10, 14, s.spin, s.spin + 1);
      ctx.stroke();
    },
    lift(ctx) {
      ctx.fillStyle = '#868e96';
      roundRect(ctx, -18, -40, 36, 40, 3);
      ctx.fill();
      ctx.fillStyle = '#dee2e6';
      ctx.fillRect(-14, -36, 13, 32);
      ctx.fillRect(1, -36, 13, 32);
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(0, -400);
      ctx.stroke();
    },
    drone(ctx, s) {
      ctx.fillStyle = '#343a40';
      roundRect(ctx, -12, -22, 24, 10, 4);
      ctx.fill();
      ctx.strokeStyle = '#343a40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -20);
      ctx.lineTo(-22, -26);
      ctx.moveTo(12, -20);
      ctx.lineTo(22, -26);
      ctx.stroke();
      ctx.fillStyle = 'rgba(52,58,64,0.35)';
      const w = 10 + Math.abs(Math.sin(s.spin * 4)) * 4;
      ctx.fillRect(-22 - w / 2, -29, w, 3);
      ctx.fillRect(22 - w / 2, -29, w, 3);
      ctx.fillStyle = '#f08c00';
      ctx.fillRect(-5, -12, 10, 8);
    },
    rocket(ctx, s) {
      if (s.a > 0.05) {
        ctx.fillStyle = '#ffa94d';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(0, 10 + Math.min(18, s.a * 4) + Math.sin(s.spin * 9) * 3);
        ctx.lineTo(6, 0);
        ctx.fill();
      }
      ctx.fillStyle = '#e9ecef';
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.quadraticCurveTo(10, -32, 8, 0);
      ctx.lineTo(-8, 0);
      ctx.quadraticCurveTo(-10, -32, 0, -46);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e03131';
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(-15, 2);
      ctx.lineTo(-8, 0);
      ctx.moveTo(8, -10);
      ctx.lineTo(15, 2);
      ctx.lineTo(8, 0);
      ctx.fill();
      ctx.fillStyle = '#74c0fc';
      ctx.beginPath();
      ctx.arc(0, -28, 4, 0, Math.PI * 2);
      ctx.fill();
    },
    bullet(ctx, s) {
      // nose points the way it is moving
      ctx.save();
      ctx.translate(0, -14);
      if (s.v < 0) ctx.rotate(Math.PI);
      ctx.fillStyle = '#b08d57';
      ctx.beginPath();
      ctx.moveTo(-4, 8);
      ctx.lineTo(-4, -4);
      ctx.quadraticCurveTo(0, -14, 4, -4);
      ctx.lineTo(4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(-4, 4, 8, 4);
      ctx.restore();
    },
    shuttlecock(ctx, s) {
      // cork leads, feathers trail: it flips over at the top
      ctx.save();
      ctx.translate(0, -14);
      if (s.v < 0) ctx.rotate(Math.PI);
      ctx.fillStyle = '#f1f3f5';
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-12, 14);
      ctx.lineTo(12, 14);
      ctx.lineTo(4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff3bf';
      ctx.strokeStyle = '#e67700';
      ctx.beginPath();
      ctx.arc(0, -7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    skydiver(ctx) {
      ctx.save();
      ctx.rotate(Math.PI / 2);
      ctx.translate(16, 0);
      stick(ctx, 1.2, '#7048e8');
      ctx.restore();
    },
  };

  const FIXED_FACING = ['reversing-steady', 'reverse-speeding-up', 'reverse-braking', 'overshoot', 'parking'];

  function MotionStage(canvas, scenario, options) {
    const opts = Object.assign({ cssHeight: scenario.orientation === 'vertical' ? 280 : 170, showArrows: true, showTrail: true, showLabels: true }, options || {});
    const ctx = canvas.getContext('2d');
    const MM = window.MotionModel;
    const motion = scenario.motion;
    const vertical = scenario.orientation === 'vertical';
    let cssW = 300;
    let cssH = opts.cssHeight;
    let lastT = 0;
    let lastExtra = {};
    let facing = 1;
    const ext = MM.extents(motion);
    let sLo = Math.min(ext.s[0], 0, opts.sRange ? opts.sRange[0] : 0);
    let sHi = Math.max(ext.s[1], 0, opts.sRange ? opts.sRange[1] : 0);
    if (sHi - sLo < 1) {
      sLo -= 1;
      sHi += 1;
    }
    const sPad = (sHi - sLo) * 0.1;
    sLo -= sPad;
    sHi += sPad;
    const vMax = Math.max(Math.abs(ext.v[0]), Math.abs(ext.v[1]), 0.5);
    const aMax = Math.max(Math.abs(ext.a[0]), Math.abs(ext.a[1]), 0.5);
    const fixedFacing = FIXED_FACING.indexOf(scenario.id) >= 0;

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Animation of the motion: ' + scenario.title + '. Positive is ' + scenario.pos + '.');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(200, rect.width || 300);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(lastT, lastExtra);
    }

    // position → pixel along the track
    function P(s) {
      if (vertical) {
        const top = 26;
        const bottom = cssH - 30;
        return bottom - ((s - sLo) / (sHi - sLo)) * (bottom - top);
      }
      const left = 40;
      const right = cssW - 40;
      return left + ((s - sLo) / (sHi - sLo)) * (right - left);
    }

    function arrow(x0, y0, x1, y1, colour, lbl) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 2) return;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 - Math.cos(ang) * 6, y1 - Math.sin(ang) * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - Math.cos(ang - 0.45) * 11, y1 - Math.sin(ang - 0.45) * 11);
      ctx.lineTo(x1 - Math.cos(ang + 0.45) * 11, y1 - Math.sin(ang + 0.45) * 11);
      ctx.closePath();
      ctx.fill();
      if (lbl) {
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lbl, x1 + Math.cos(ang) * 10, y1 + Math.sin(ang) * 10 - (vertical ? 0 : 1));
      }
      ctx.restore();
    }

    function ruler() {
      const step = window.GraphCanvas.niceStep(sHi - sLo, vertical ? 6 : Math.max(4, Math.floor(cssW / 70)));
      ctx.save();
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#5b6370';
      ctx.strokeStyle = '#9aa4b1';
      ctx.lineWidth = 1;
      const start = Math.ceil(sLo / step) * step;
      for (let s = start; s <= sHi + 1e-9; s += step) {
        const p = P(s);
        const label = (Math.round(s * 100) / 100).toString().replace('-', '−');
        if (vertical) {
          ctx.beginPath();
          ctx.moveTo(44, p);
          ctx.lineTo(52, p);
          ctx.stroke();
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 40, p);
        } else {
          ctx.beginPath();
          ctx.moveTo(p, cssH - 38);
          ctx.lineTo(p, cssH - 32);
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(label, p, cssH - 29);
        }
      }
      ctx.textAlign = vertical ? 'left' : 'right';
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 10px system-ui, sans-serif';
      if (vertical) ctx.fillText('s / m', 8, 12);
      else ctx.fillText('s / m', cssW - 6, cssH - 12);
      // origin marker
      const o = P(0);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(52, o);
        ctx.lineTo(cssW - 20, o);
      } else {
        ctx.moveTo(o, 24);
        ctx.lineTo(o, cssH - 38);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 11px system-ui, sans-serif';
      if (vertical) {
        ctx.textAlign = 'right';
        ctx.fillText('s = 0', cssW - 22, o - 8);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText('s = 0', o + 4, 30);
      }
      // positive direction
      ctx.fillStyle = C.s;
      ctx.font = 'bold 11px system-ui, sans-serif';
      if (vertical) {
        arrow(cssW - 16, 70, cssW - 16, 30, C.s, '');
        ctx.textAlign = 'right';
        ctx.fillText('+ ' + scenario.posShort, cssW - 24, 40);
      } else {
        arrow(cssW - 70, 14, cssW - 18, 14, C.s, '');
        ctx.textAlign = 'right';
        ctx.fillText('positive', cssW - 74, 18);
      }
      ctx.restore();
    }

    function render(t, extra) {
      lastT = t;
      lastExtra = extra || {};
      const st = MM.stateAt(motion, t);
      ctx.clearRect(0, 0, cssW, cssH);
      // scenery
      ctx.fillStyle = C.sky;
      ctx.fillRect(0, 0, cssW, cssH);
      if (vertical) {
        ctx.fillStyle = '#dde5ee';
        ctx.fillRect(cssW / 2 - 40, 0, 80, cssH);
        ctx.fillStyle = C.ground;
        ctx.fillRect(0, cssH - 16, cssW, 16);
      } else {
        ctx.fillStyle = C.ground;
        ctx.fillRect(0, cssH - 52, cssW, 13);
      }
      ruler();

      // motion map trail: ghost dots at equal time intervals
      if (opts.showTrail) {
        const n = 20;
        const dt = motion.duration / n;
        ctx.save();
        for (let k = 0; k * dt <= t + 1e-9; k++) {
          const sk = MM.stateAt(motion, k * dt).s;
          ctx.fillStyle = 'rgba(42,107,214,0.45)';
          ctx.beginPath();
          if (vertical) ctx.arc(cssW / 2 - 52, P(sk), 3.2, 0, Math.PI * 2);
          else ctx.arc(P(sk), cssH - 45.5, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (lastExtra.ghostS !== undefined) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        if (vertical) ctx.translate(-96, 0);
        drawObject(lastExtra.ghostS, lastExtra.ghostState || st, 1);
        ctx.restore();
        if (lastExtra.ghostLabel) {
          ctx.save();
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillStyle = '#5b6370';
          ctx.textAlign = 'center';
          const gp = P(lastExtra.ghostS);
          if (vertical) ctx.fillText(lastExtra.ghostLabel, cssW / 2 - 96, Math.max(12, gp - 34));
          else ctx.fillText(lastExtra.ghostLabel, gp, cssH - 104);
          ctx.restore();
        }
      }
      if (!fixedFacing) {
        if (st.v > 0.05) facing = 1;
        else if (st.v < -0.05) facing = -1;
      }
      drawObject(st.s, st, fixedFacing ? 1 : facing);

      if (opts.showArrows) {
        const L = vertical ? 70 : Math.min(90, cssW / 6);
        const p = P(st.s);
        if (vertical) {
          const cx = cssW / 2 + 36;
          if (Math.abs(st.v) > 1e-3) arrow(cx, p - 20, cx, p - 20 - (st.v / vMax) * L, C.v, 'v');
          const ax = cssW / 2 + 64;
          if (Math.abs(st.a) > 1e-3) arrow(ax, p - 20, ax, p - 20 - (st.a / aMax) * L * 0.8, C.a, 'a');
        } else {
          const vy = 44;
          if (Math.abs(st.v) > 1e-3) arrow(p, vy, p + (st.v / vMax) * L, vy, C.v, 'v');
          const ay = 62;
          if (Math.abs(st.a) > 1e-3) arrow(p, ay, p + (st.a / aMax) * L * 0.8, ay, C.a, 'a');
        }
      }
      if (opts.showLabels) {
        ctx.save();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('t = ' + st.t.toFixed(1) + ' s', vertical ? 56 : 8, vertical ? cssH - 14 : 8);
        ctx.restore();
      }
    }

    function drawObject(s, st, dir) {
      const p = P(s);
      const spin = (s / 0.35) % (Math.PI * 2);
      const walk = s * 1.6;
      ctx.save();
      if (vertical) ctx.translate(cssW / 2, p + (scenario.object === 'lift' ? 20 : 12));
      else ctx.translate(p, cssH - 52);
      if (!vertical) ctx.scale(dir, 1);
      const draw = CARTOONS[scenario.object] || CARTOONS.trolley;
      draw(ctx, { spin, walk, a: st.a, v: st.v });
      ctx.restore();
    }

    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    }
    requestAnimationFrame(resize);

    return {
      render,
      resize,
      /** Change a display option (showArrows, showTrail, showLabels) and redraw. */
      set(key, value) {
        opts[key] = value;
        render(lastT, lastExtra);
      },
      destroy() {
        if (ro) ro.disconnect();
      },
    };
  }

  window.MotionStage = { create: MotionStage, CARTOONS };
})();
