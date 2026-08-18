import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { loadSettings, type AppSettings } from '@/lib/settings';
import { useAuth, GUEST_SCORE_KEY } from '@/contexts/auth-context';

type ScorePopup = {
  x: number;
  y: number;
  value: number;
  age: number;
  isFlee: boolean;
};

type AntState = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetAngle: number;
  targetSpeed: number;
  walkPhase: number;
  state: 'wandering' | 'aware' | 'fleeing' | 'orbiting';
  fleeTimer: number;
  orbitAngle: number;
  lastWanderChange: number;
};

type MouseState = {
  x: number;
  y: number;
  active: boolean;
  nearTimeStart: number;
};

type TrailPoint = {
  x: number;
  y: number;
  age: number;
};

export default function OrbAnt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreScale, setScoreScale] = useState(1);
  const scoreRef = useRef(0);
  const popupsRef = useRef<ScorePopup[]>([]);
  const comboRef = useRef({ count: 0, timer: 0, displayTimer: 0, lastX: 0, lastY: 0 });
  const shakeRef = useRef({ timer: 0 });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, loading: authLoading, signOut, saveScore } = useAuth();

  const antRef = useRef<AntState>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
    angle: 0,
    speed: 0,
    targetAngle: 0,
    targetSpeed: 1.2,
    walkPhase: 0,
    state: 'wandering',
    fleeTimer: 0,
    orbitAngle: 0,
    lastWanderChange: 0,
  });

  const mouseRef = useRef<MouseState>({
    x: 0,
    y: 0,
    active: false,
    nearTimeStart: 0,
  });

  const trailRef = useRef<TrailPoint[]>([]);

  const stateRef = useRef({
    hasMouseMoved: false,
    hintAlpha: 0.2,
    noticeTimer: -1,
  });

  const settingsRef = useRef<AppSettings>(loadSettings());

  // Guest score carryover: if the user navigated from '/' to '/login',
  // '/' saves the current score to sessionStorage before unmounting.
  useEffect(() => {
    const stored = sessionStorage.getItem(GUEST_SCORE_KEY);
    if (stored) {
      const n = parseInt(stored, 10) || 0;
      if (n > 0) {
        setDisplayScore(n);
        scoreRef.current = n;
      }
      sessionStorage.removeItem(GUEST_SCORE_KEY);
    }
    fetch('/api/analytics/visit', { method: 'POST' }).catch(() => {});
  }, []);

  // Debounced score save to Firebase (3 s after last change, logged-in only)
  useEffect(() => {
    if (!user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const best = Math.max(user.profile.bestScore ?? 0, displayScore);
      saveScore(displayScore, best);
    }, 3000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayScore, user?.uid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resize);
    resize();

    const updateMousePos = (clientX: number, clientY: number) => {
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
      mouseRef.current.active = true;
      if (!stateRef.current.hasMouseMoved) {
        stateRef.current.hasMouseMoved = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => updateMousePos(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleClickFlee = (clientX: number, clientY: number) => {
      updateMousePos(clientX, clientY);
      const dx = antRef.current.x - clientX;
      const dy = antRef.current.y - clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Score: hitting the ant
      // HIT_RADIUS 60px — ant body is ~50px wide; at flee speed 6.5px/frame
      // a 35px radius was too tight and missed most clicks on a moving ant.
      const HIT_RADIUS = 60;
      if (dist < HIT_RADIUS) {
        const isFlee = antRef.current.state === 'fleeing';
        const points = isFlee ? 10 : 1;
        // Mutate ref FIRST (synchronous, no batching) then push the exact
        // accumulated value to React state.  Never use functional-update form
        // here — prev inside the updater can be stale when React batches or
        // replays the updater (Strict Mode).
        const newScore = Math.min(scoreRef.current + points, 99999);
        scoreRef.current = newScore;
        setDisplayScore(newScore);
        // SCORE number pulse
        setScoreScale(isFlee ? 1.5 : 1.3);
        setTimeout(() => setScoreScale(1), 180);
        // Score popup
        popupsRef.current.push({
          x: antRef.current.x,
          y: antRef.current.y,
          value: points,
          isFlee,
          age: 0,
        });
        if (isFlee) {
          const combo = comboRef.current;
          combo.count++;
          combo.timer = 150;           // ~2.5s window before combo resets
          combo.displayTimer = 70;
          combo.lastX = antRef.current.x;
          combo.lastY = antRef.current.y;
          shakeRef.current.timer = 5; // 5 frames shake ≈ 0.08s
        }
      }

      // Existing flee trigger (unchanged)
      if (dist < 250) {
        antRef.current.state = 'fleeing';
        antRef.current.targetAngle = Math.atan2(dy, dx);
        antRef.current.targetSpeed = 6.5;
        antRef.current.fleeTimer = 180;
        stateRef.current.noticeTimer = 0;
      }
    };

    const handleClick = (e: MouseEvent) => handleClickFlee(e.clientX, e.clientY);
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) handleClickFlee(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    let lastTime = performance.now();

    const loop = (time: number) => {
      lastTime = time;

      const s = settingsRef.current;
      const ant = antRef.current;
      const mouse = mouseRef.current;
      const state = stateRef.current;
      const trail = trailRef.current;

      const maxTrail = Math.max(0, Math.round(s.ant.trailLength));

      // Update trail
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age++;
        if (trail[i].age > maxTrail) trail.splice(i, 1);
      }
      trail.push({ x: ant.x, y: ant.y, age: 0 });
      if (trail.length > maxTrail + 10) trail.shift();

      const awarenessRadius = s.ant.awarenessRadius;
      const dxMouse = mouse.x - ant.x;
      const dyMouse = mouse.y - ant.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

      // Combo timer tick
      const combo = comboRef.current;
      if (combo.timer > 0) {
        combo.timer--;
        if (combo.timer === 0) combo.count = 0; // timeout reset
      }
      if (combo.displayTimer > 0) combo.displayTimer--;

      if (ant.state === 'fleeing') {
        ant.fleeTimer--;
        if (ant.fleeTimer <= 0) {
          ant.state = 'wandering';
          ant.targetSpeed = 1.2 * s.ant.speedMultiplier;
          ant.lastWanderChange = time;
          // Flee state ended — reset combo
          combo.count = 0;
          combo.timer = 0;
          combo.displayTimer = 0;
        }
      } else {
        if (mouse.active && distMouse < awarenessRadius) {
          if (ant.state !== 'aware' && ant.state !== 'orbiting') {
            ant.state = 'aware';
            ant.targetSpeed = 0.5 * s.ant.speedMultiplier;
            mouse.nearTimeStart = time;
          }
          if (ant.state === 'aware') {
            ant.targetAngle = Math.atan2(dyMouse, dxMouse);
            if (time - mouse.nearTimeStart > 3000) {
              ant.state = 'orbiting';
              ant.orbitAngle = Math.atan2(-dyMouse, -dxMouse);
            }
          } else if (ant.state === 'orbiting') {
            ant.orbitAngle += 0.008;
            const targetX = mouse.x + Math.cos(ant.orbitAngle) * 100;
            const targetY = mouse.y + Math.sin(ant.orbitAngle) * 100;
            ant.targetAngle = Math.atan2(targetY - ant.y, targetX - ant.x);
            ant.targetSpeed = 1.5 * s.ant.speedMultiplier;
          }
        } else {
          if (ant.state !== 'wandering') {
            ant.state = 'wandering';
            ant.targetSpeed = 1.2 * s.ant.speedMultiplier;
            ant.lastWanderChange = time;
          }
          if (ant.state === 'wandering') {
            if (time - ant.lastWanderChange > 3000 + Math.random() * 3000) {
              ant.targetAngle += (Math.random() - 0.5) * Math.PI * 1.5;
              ant.lastWanderChange = time;
              const edgeThreshold = 120;
              if (ant.x < edgeThreshold || ant.x > width - edgeThreshold ||
                  ant.y < edgeThreshold || ant.y > height - edgeThreshold) {
                const angleToCenter = Math.atan2(height / 2 - ant.y, width / 2 - ant.x);
                ant.targetAngle = angleToCenter + (Math.random() - 0.5) * 0.5;
              }
            }
          }
        }
      }

      // Edge avoidance
      const avoidDist = 100;
      let repX = 0, repY = 0;
      if (ant.x < avoidDist) repX += (avoidDist - ant.x) * 0.01;
      if (ant.x > width - avoidDist) repX -= (ant.x - (width - avoidDist)) * 0.01;
      if (ant.y < avoidDist) repY += (avoidDist - ant.y) * 0.01;
      if (ant.y > height - avoidDist) repY -= (ant.y - (height - avoidDist)) * 0.01;
      if (repX !== 0 || repY !== 0) {
        const repAngle = Math.atan2(repY, repX);
        const repForce = Math.sqrt(repX * repX + repY * repY);
        const tx = Math.cos(ant.targetAngle) + Math.cos(repAngle) * repForce;
        const ty = Math.sin(ant.targetAngle) + Math.sin(repAngle) * repForce;
        ant.targetAngle = Math.atan2(ty, tx);
      }

      let angleDiff = ant.targetAngle - ant.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      ant.angle += angleDiff * 0.03;
      ant.speed += (ant.targetSpeed - ant.speed) * 0.04;

      if (ant.speed > 0.01) {
        ant.walkPhase += ant.speed * 0.15;
      } else {
        ant.walkPhase += (Math.round(ant.walkPhase / (Math.PI * 2)) * Math.PI * 2 - ant.walkPhase) * 0.1;
      }

      ant.x += Math.cos(ant.angle) * ant.speed;
      ant.y += Math.sin(ant.angle) * ant.speed;
      ant.x = Math.max(0, Math.min(width, ant.x));
      ant.y = Math.max(0, Math.min(height, ant.y));

      // Canvas shake (+10 only)
      const shake = shakeRef.current;
      let shakeX = 0, shakeY = 0;
      if (shake.timer > 0) {
        shake.timer--;
        const mag = shake.timer * 0.6; // decaying magnitude
        shakeX = (Math.random() - 0.5) * mag * 2;
        shakeY = (Math.random() - 0.5) * mag * 2;
      }

      // Draw
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      if (shakeX || shakeY) { ctx.save(); ctx.translate(shakeX, shakeY); }

      // Trail
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (trail.length > 1 && maxTrail > 0) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p1 = trail[i];
          const p2 = trail[i + 1];
          const alpha = (1 - p1.age / maxTrail) * s.visual.trailOpacity;
          if (alpha <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Ant
      const sz = s.ant.sizeMultiplier;
      const brt = Math.round(s.visual.antBrightness * 255);
      const antColor = `rgb(${brt},${brt},${brt})`;
      const antColorAlpha = (a: number) => `rgba(${brt},${brt},${brt},${a})`;

      ctx.save();
      ctx.translate(ant.x, ant.y);
      const bob = Math.sin(ant.walkPhase * 2) * 1.5 * Math.min(1, ant.speed);
      ctx.translate(0, bob);
      ctx.rotate(ant.angle);

      // Antennae
      ctx.strokeStyle = antColorAlpha(0.7);
      ctx.lineWidth = 1;
      const sway = Math.sin(time * 0.002) * 0.2;

      ctx.beginPath();
      ctx.moveTo(8 * sz, -2 * sz);
      ctx.quadraticCurveTo(15 * sz, (-15 + sway * 5) * sz, 25 * sz, (-8 + sway * 8) * sz);
      ctx.stroke();
      ctx.fillStyle = antColorAlpha(0.7);
      ctx.beginPath();
      ctx.arc(25 * sz, (-8 + sway * 8) * sz, 2 * sz, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(8 * sz, 2 * sz);
      ctx.quadraticCurveTo(15 * sz, (15 - sway * 5) * sz, 25 * sz, (8 - sway * 8) * sz);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(25 * sz, (8 - sway * 8) * sz, 2 * sz, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = antColorAlpha(0.85);

      const drawLeg = (index: number, side: number, xBase: number, yBase: number) => {
        const phaseOffset = index * (Math.PI / 3);
        const legPhase = ant.walkPhase + phaseOffset;
        const swing = Math.sin(legPhase) * 10 * sz * Math.min(1, ant.speed + 0.1);
        const lift = Math.max(0, Math.cos(legPhase)) * 4 * sz * Math.min(1, ant.speed + 0.1);
        const spread = 22 * sz;
        const xTip = xBase * sz + swing + (index === 0 ? 5 * sz : index === 2 ? -5 * sz : 0);
        const yTip = side * (spread - lift);
        const xKnee = xBase * sz + swing * 0.5;
        const yKnee = side * 12 * sz - lift;
        ctx.beginPath();
        ctx.moveTo(xBase * sz, yBase * sz);
        ctx.lineTo(xKnee, yKnee);
        ctx.lineTo(xTip, yTip);
        ctx.stroke();
      };

      drawLeg(0, -1, 4, -8);
      drawLeg(1, -1, 0, -9);
      drawLeg(2, -1, -6, -11);
      drawLeg(3, 1, 4, 8);
      drawLeg(4, 1, 0, 9);
      drawLeg(5, 1, -6, 11);

      // Body
      const drawBodyPart = (x: number, radius: number) => {
        const bx = x * sz, br = radius * sz;
        ctx.beginPath();
        ctx.arc(bx, 0, br, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(bx - br * 0.3, -br * 0.3, br * 0.1, bx, 0, br);
        grad.addColorStop(0, antColorAlpha(0.5));
        grad.addColorStop(1, antColor);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = antColorAlpha(0.15);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      drawBodyPart(-13, 13);
      drawBodyPart(0, 10);
      drawBodyPart(12, 8);

      ctx.restore();

      // HUD
      if (s.visual.showHUD) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(s.visual.hudTitle, 24, 32);

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '300 10px Inter, sans-serif';
        ctx.fillText(s.visual.hudSubtitle, 24, 50);
      }

      // Hint
      if (state.hasMouseMoved) {
        state.hintAlpha = Math.max(0, state.hintAlpha - 0.2 / 90);
      }
      if (state.hintAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${state.hintAlpha})`;
        ctx.font = '300 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('move your cursor', width / 2, height - 24);
      }

      // Score popups (+1 / +10) with spring animation
      const popups = popupsRef.current;
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.age++;

        if (p.isFlee) {
          // +10: 50 frames (~0.83s), spring bounce scale
          if (p.age > 50) { popups.splice(i, 1); continue; }
          const a = p.age;
          // spring scale: 0.7 → 1.4 → 0.85 → 1.03 → 1.0
          let sc = 1;
          if (a < 5)       sc = 0.7 + 0.7 * (a / 5);
          else if (a < 12) sc = 1.4 - 0.55 * ((a - 5) / 7);
          else if (a < 18) sc = 0.85 + 0.18 * ((a - 12) / 6);
          else if (a < 22) sc = 1.03 - 0.03 * ((a - 18) / 4);
          // alpha: fade in 0-5, hold, fade out 40-50
          let pa = a < 5 ? a / 5 : a > 40 ? 1 - (a - 40) / 10 : 1;
          const floatY = p.y - a * 0.35;
          ctx.save();
          ctx.globalAlpha = pa;
          ctx.translate(p.x, floatY);
          ctx.scale(sc, sc);
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 20px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+10', 0, 0);
          ctx.restore();
        } else {
          // +1: 36 frames (~0.6s), quick pop then float
          if (p.age > 36) { popups.splice(i, 1); continue; }
          const a = p.age;
          // scale: 1.2 → 1.0 over first 6 frames, then 1.0
          const sc = a < 6 ? 1.2 - 0.2 * (a / 6) : 1.0;
          // alpha: fade in 0-4, hold, fade out 28-36
          let pa = a < 4 ? a / 4 : a > 28 ? 1 - (a - 28) / 8 : 1;
          const floatY = p.y - a * 0.85;
          ctx.save();
          ctx.globalAlpha = pa;
          ctx.translate(p.x, floatY);
          ctx.scale(sc, sc);
          ctx.fillStyle = '#ffffff';
          ctx.font = '400 14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+1', 0, 0);
          ctx.restore();
        }
      }

      // Combo display
      if (combo.displayTimer > 0 && combo.count >= 2) {
        const dt = combo.displayTimer;
        const ca = dt > 20 ? 1 : dt / 20;
        // Scale-in on first few frames
        const elapsed = 70 - dt;
        const csc = elapsed < 6 ? 0.6 + 0.4 * (elapsed / 6) : 1.0;
        ctx.save();
        ctx.globalAlpha = ca * 0.75;
        ctx.translate(combo.lastX, combo.lastY + 32);
        ctx.scale(csc, csc);
        ctx.fillStyle = '#ffffff';
        ctx.font = '300 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '0.12em';
        ctx.fillText(`COMBO ×${combo.count}`, 0, 0);
        ctx.restore();
      }

      // End shake translate
      if (shakeX || shakeY) ctx.restore();

      // Flee notice
      if (state.noticeTimer >= 0) {
        state.noticeTimer++;
        let noticeAlpha = 0;
        const nt = state.noticeTimer;
        if (nt < 20) noticeAlpha = nt / 20;
        else if (nt < 80) noticeAlpha = 1;
        else if (nt < 120) noticeAlpha = 1 - (nt - 80) / 40;
        else state.noticeTimer = -1;

        if (noticeAlpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${noticeAlpha * 0.6})`;
          ctx.font = '300 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('it noticed you', width / 2, height * 0.72);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouchStart);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          cursor: 'none',
          background: '#000',
          margin: 0, padding: 0,
        }}
      />
      {/* ── Top-right panel ─────────────────────────────────────────── */}
      {!authLoading && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            textAlign: 'right',
            fontFamily: 'Inter, sans-serif',
            userSelect: 'none',
            zIndex: 9998,
          }}
        >
          {user ? (
            /* ── 로그인 상태 ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
              {/* Profile row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {user.profile.photoURL ? (
                  <img
                    src={user.profile.photoURL}
                    alt=""
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      opacity: 0.65, border: '1px solid rgba(255,255,255,0.2)',
                      order: 2,
                    }}
                  />
                ) : (
                  /* Initials avatar for email users */
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600,
                    order: 2,
                  }}>
                    {user.profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ order: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.02em' }}>
                    {user.profile.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 300, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>
                    {user.profile.email}
                  </p>
                  {user.profile.role === 'admin' && (
                    <p style={{ margin: '1px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Admin
                    </p>
                  )}
                </div>
              </div>

              {/* Scores */}
              <div style={{ pointerEvents: 'none' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
                  SCORE&nbsp;&nbsp;<span
                    style={{
                      display: 'inline-block',
                      transform: `scale(${scoreScale})`,
                      transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transformOrigin: 'right center',
                      color: scoreScale > 1 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
                    }}
                  >{displayScore}</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>
                  BEST&nbsp;&nbsp;{user.profile.bestScore ?? 0}
                </p>
              </div>

              {/* Log out */}
              <button
                onClick={() => signOut()}
                style={{
                  marginTop: 10,
                  background: 'none', border: 'none',
                  fontSize: 9, color: 'rgba(255,255,255,0.18)',
                  cursor: 'pointer', letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: 0,
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
              >
                Log out
              </button>
            </div>
          ) : (
            /* ── Guest 상태 ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0, pointerEvents: 'none' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>
                GUEST
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
                SCORE&nbsp;&nbsp;<span
                  style={{
                    display: 'inline-block',
                    transform: `scale(${scoreScale})`,
                    transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transformOrigin: 'right center',
                    color: scoreScale > 1 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
                  }}
                >{displayScore}</span>
              </p>
              <Link href="/login">
                <span
                  onClick={() => sessionStorage.setItem(GUEST_SCORE_KEY, String(displayScore))}
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    fontSize: 9, color: 'rgba(255,255,255,0.2)',
                    cursor: 'pointer', letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    pointerEvents: 'auto',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                >
                  Sign in →
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
