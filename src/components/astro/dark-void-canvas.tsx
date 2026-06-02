"use client";
import { useRef, useEffect } from "react";

export function DarkVoidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement!.clientWidth);
    let height = (canvas.height = canvas.parentElement!.clientHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement!.clientWidth;
      height = canvas.height = canvas.parentElement!.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Stars
    interface Star {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      pulseSpeed: number;
      orbitRadius: number;
      angle: number;
      speed: number;
    }
    const stars: Star[] = [];
    const starCount = 60;
    let angle = 0;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        pulseSpeed: Math.random() * 0.02 + 0.005,
        orbitRadius: Math.random() * 200 + 50,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.002 + 0.0005,
      });
    }

    const mouse = { x: width / 2, y: height / 2, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = "rgba(127, 119, 221, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Central astrolabe
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.4;

      angle += 0.001;

      // Outer orbit
      ctx.strokeStyle = "rgba(127, 119, 221, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner orbit
      ctx.strokeStyle = "rgba(77, 238, 234, 0.08)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.strokeStyle = "rgba(127, 119, 221, 0.06)";
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius - 20, centerY);
      ctx.lineTo(centerX + maxRadius + 20, centerY);
      ctx.moveTo(centerX, centerY - maxRadius - 20);
      ctx.lineTo(centerX, centerY + maxRadius + 20);
      ctx.stroke();

      // Rotating pointers
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      ctx.strokeStyle = "rgba(229, 193, 88, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius, 0);
      ctx.stroke();

      ctx.rotate(Math.PI / 1.5);
      ctx.strokeStyle = "rgba(77, 238, 234, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius * 0.73, 0);
      ctx.stroke();

      ctx.restore();

      // Central nebula
      const pulseScale = 1 + Math.sin(angle * 4) * 0.04;
      const nebulaGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        150 * pulseScale
      );
      nebulaGrad.addColorStop(0, "rgba(60, 52, 137, 0.22)");
      nebulaGrad.addColorStop(0.5, "rgba(127, 119, 221, 0.07)");
      nebulaGrad.addColorStop(1, "rgba(10, 7, 24, 0)");
      ctx.fillStyle = nebulaGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 150 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Stars
      stars.forEach((star) => {
        star.alpha += star.pulseSpeed;
        if (star.alpha > 1 || star.alpha < 0.2) star.pulseSpeed = -star.pulseSpeed;

        star.angle += star.speed;
        const targetX = centerX + Math.cos(star.angle) * star.orbitRadius;
        const targetY = centerY + Math.sin(star.angle) * star.orbitRadius;

        star.x += (targetX - star.x) * 0.05;
        star.y += (targetY - star.y) * 0.05;

        if (mouse.active) {
          const dx = mouse.x - star.x;
          const dy = mouse.y - star.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            star.x -= (dx / dist) * force * 3;
            star.y -= (dy / dist) * force * 3;
          }
        }

        ctx.fillStyle = `rgba(226, 225, 236, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        if (mouse.active) {
          const dx = mouse.x - star.x;
          const dy = mouse.y - star.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.strokeStyle = `rgba(127, 119, 221, ${0.12 * (1 - dist / 90)})`;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(star.x, star.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
