import React, { useEffect, useRef } from 'react';

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

    // Event handlers
    const updateMousePos = (clientX: number, clientY: number) => {
      mouseRef.current.x = clientX;
      mouseRef.current.y = clientY;
      mouseRef.current.active = true;
      if (!stateRef.current.hasMouseMoved) {
        stateRef.current.hasMouseMoved = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePos(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleClickFlee = (clientX: number, clientY: number) => {
      updateMousePos(clientX, clientY);
      const dx = antRef.current.x - clientX;
      const dy = antRef.current.y - clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
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
      if (e.touches.length > 0) {
        handleClickFlee(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    // Loop
    let now = performance.now();
    let lastTime = now;

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      const ant = antRef.current;
      const mouse = mouseRef.current;
      const state = stateRef.current;
      const trail = trailRef.current;

      // Update trail ages and remove old ones
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age++;
        if (trail[i].age > 600) {
          trail.splice(i, 1);
        }
      }
      // Add current pos
      trail.push({ x: ant.x, y: ant.y, age: 0 });
      if (trail.length > 600) trail.shift();

      // State machine logic
      const dxMouse = mouse.x - ant.x;
      const dyMouse = mouse.y - ant.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

      if (ant.state === 'fleeing') {
        ant.fleeTimer--;
        if (ant.fleeTimer <= 0) {
          ant.state = 'wandering';
          ant.targetSpeed = 1.2;
          ant.lastWanderChange = time;
        }
      } else {
        if (mouse.active && distMouse < 180) {
          // Inside awareness zone
          if (ant.state !== 'aware' && ant.state !== 'orbiting') {
            ant.state = 'aware';
            ant.targetSpeed = 0.5;
            mouse.nearTimeStart = time;
          }

          if (ant.state === 'aware') {
            // Gently turn toward mouse
            let angleToMouse = Math.atan2(dyMouse, dxMouse);
            // Bias target angle
            ant.targetAngle = angleToMouse;
            
            // Check if orbiting should start
            if (time - mouse.nearTimeStart > 3000) {
              ant.state = 'orbiting';
              ant.orbitAngle = Math.atan2(-dyMouse, -dxMouse);
            }
          } else if (ant.state === 'orbiting') {
            ant.orbitAngle += 0.008;
            const targetX = mouse.x + Math.cos(ant.orbitAngle) * 100;
            const targetY = mouse.y + Math.sin(ant.orbitAngle) * 100;
            const dxOrbit = targetX - ant.x;
            const dyOrbit = targetY - ant.y;
            ant.targetAngle = Math.atan2(dyOrbit, dxOrbit);
            ant.targetSpeed = 1.5;
          }
        } else {
          // Outside awareness zone or inactive mouse
          if (ant.state !== 'wandering') {
            ant.state = 'wandering';
            ant.targetSpeed = 1.2;
            ant.lastWanderChange = time;
          }

          if (ant.state === 'wandering') {
            if (time - ant.lastWanderChange > 3000 + Math.random() * 3000) {
              ant.targetAngle += (Math.random() - 0.5) * Math.PI * 1.5;
              ant.lastWanderChange = time;
              
              // Bias toward center if near edge
              const edgeThreshold = 120;
              if (ant.x < edgeThreshold || ant.x > width - edgeThreshold || 
                  ant.y < edgeThreshold || ant.y > height - edgeThreshold) {
                const angleToCenter = Math.atan2(height/2 - ant.y, width/2 - ant.x);
                ant.targetAngle = angleToCenter + (Math.random() - 0.5) * 0.5;
              }
            }
          }
        }
      }

      // Edge avoidance (always active)
      const avoidDist = 100;
      let repX = 0;
      let repY = 0;
      if (ant.x < avoidDist) repX += (avoidDist - ant.x) * 0.01;
      if (ant.x > width - avoidDist) repX -= (ant.x - (width - avoidDist)) * 0.01;
      if (ant.y < avoidDist) repY += (avoidDist - ant.y) * 0.01;
      if (ant.y > height - avoidDist) repY -= (ant.y - (height - avoidDist)) * 0.01;

      if (repX !== 0 || repY !== 0) {
        const repAngle = Math.atan2(repY, repX);
        const repForce = Math.sqrt(repX * repX + repY * repY);
        // Blend target angle
        const targetX = Math.cos(ant.targetAngle) + Math.cos(repAngle) * repForce;
        const targetY = Math.sin(ant.targetAngle) + Math.sin(repAngle) * repForce;
        ant.targetAngle = Math.atan2(targetY, targetX);
      }

      // Smooth turn
      let angleDiff = ant.targetAngle - ant.angle;
      // Normalize angleDiff to -PI to PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      ant.angle += angleDiff * 0.03;
      ant.speed += (ant.targetSpeed - ant.speed) * 0.04;
      
      if (ant.speed > 0.01) {
        ant.walkPhase += ant.speed * 0.15;
      } else {
        // Settle legs when stopping
        ant.walkPhase += (Math.round(ant.walkPhase / (Math.PI*2)) * Math.PI*2 - ant.walkPhase) * 0.1;
      }

      ant.x += Math.cos(ant.angle) * ant.speed;
      ant.y += Math.sin(ant.angle) * ant.speed;

      // Hard clamp bounds
      ant.x = Math.max(0, Math.min(width, ant.x));
      ant.y = Math.max(0, Math.min(height, ant.y));

      // Draw
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw trail
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (trail.length > 1) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p1 = trail[i];
          const p2 = trail[i+1];
          const alpha = (1 - p1.age / 600) * 0.07;
          if (alpha <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw Ant
      ctx.save();
      ctx.translate(ant.x, ant.y);
      
      const bob = Math.sin(ant.walkPhase * 2) * 1.5 * Math.min(1, ant.speed);
      ctx.translate(0, bob);
      
      ctx.rotate(ant.angle);

      // Antennae
      ctx.strokeStyle = 'rgba(200,200,200,0.7)';
      ctx.lineWidth = 1;
      const sway = Math.sin(time * 0.002) * 0.2;
      
      // Left antenna
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.quadraticCurveTo(15, -15 + sway * 5, 25, -8 + sway * 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,200,200,0.7)';
      ctx.beginPath();
      ctx.arc(25, -8 + sway * 8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Right antenna
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.quadraticCurveTo(15, 15 - sway * 5, 25, 8 - sway * 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(25, 8 - sway * 8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(200,200,200,0.85)';
      
      const drawLeg = (index: number, side: number, xBase: number, yBase: number) => {
        const phaseOffset = index * (Math.PI / 3);
        const legPhase = ant.walkPhase + phaseOffset;
        
        // When stopping, legPhase should settle. We handle walkPhase settling above.
        const swing = Math.sin(legPhase) * 10 * Math.min(1, ant.speed + 0.1);
        const lift = Math.max(0, Math.cos(legPhase)) * 4 * Math.min(1, ant.speed + 0.1);
        
        const spread = 22; // max reach
        const xTip = xBase + swing + (index === 0 ? 5 : index === 2 ? -5 : 0);
        const yTip = side * (spread - lift);
        const kneeDist = 12;
        const xKnee = xBase + swing * 0.5;
        const yKnee = side * kneeDist - lift;

        ctx.beginPath();
        ctx.moveTo(xBase, yBase);
        ctx.lineTo(xKnee, yKnee);
        ctx.lineTo(xTip, yTip);
        ctx.stroke();
      };

      // Tripod gait: L0, R1, L2 swing together; R0, L1, R2 swing opposite
      drawLeg(0, -1, 4, -8);  // Front Left
      drawLeg(1, -1, 0, -9);  // Mid Left
      drawLeg(2, -1, -6, -11); // Back Left
      
      drawLeg(3, 1, 4, 8);   // Front Right (opposite phase index 3 = 0+3)
      drawLeg(4, 1, 0, 9);   // Mid Right (index 4 = 1+3)
      drawLeg(5, 1, -6, 11);  // Back Right (index 5 = 2+3)

      // Body Parts
      const drawBodyPart = (x: number, radius: number) => {
        ctx.beginPath();
        ctx.arc(x, 0, radius, 0, Math.PI * 2);
        
        const grad = ctx.createRadialGradient(x - radius*0.3, -radius*0.3, radius*0.1, x, 0, radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(230,230,230,1)');
        
        ctx.fillStyle = grad;
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      // Abdomen
      drawBodyPart(-13, 13);
      // Thorax
      drawBodyPart(0, 10);
      // Head
      drawBodyPart(12, 8);

      ctx.restore();

      // HUD Text
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('ORB ANT', 24, 32);

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '300 10px Inter, sans-serif';
      ctx.fillText('an artificial creature', 24, 50);

      // Bottom hint
      if (state.hasMouseMoved) {
        state.hintAlpha = Math.max(0, state.hintAlpha - 0.2 / 90);
      }
      if (state.hintAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${state.hintAlpha})`;
        ctx.font = '300 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('move your cursor', width / 2, height - 24);
      }

      // Flee notice
      if (state.noticeTimer >= 0) {
        state.noticeTimer++;
        let noticeAlpha = 0;
        const nt = state.noticeTimer;
        
        if (nt < 20) {
          noticeAlpha = nt / 20; // fade in
        } else if (nt < 80) {
          noticeAlpha = 1;       // hold
        } else if (nt < 120) {
          noticeAlpha = 1 - (nt - 80) / 40; // fade out
        } else {
          state.noticeTimer = -1; // done
        }

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
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: 'none',
        background: '#000',
        margin: 0,
        padding: 0
      }}
    />
  );
}
