import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FlowFieldBackgroundProps {
  className?: string;
  /** Cor das partículas. Padrão: dourado Kronos. */
  color?: string;
  /**
   * Cor usada para o "rastro" (fade a cada frame). Deve casar com o
   * fundo do container. Padrão: navy translúcido do Kronos.
   * O canal alpha aqui é multiplicado por `trailOpacity`.
   */
  trailColor?: string;
  /**
   * Opacidade dos rastros (0.0 a 1.0).
   * Menor = rastros mais longos. Maior = rastros mais curtos. Padrão: 0.12
   */
  trailOpacity?: number;
  /** Número de partículas. Padrão: 600 */
  particleCount?: number;
  /** Multiplicador de velocidade. Padrão: 1 */
  speed?: number;
}

export default function FlowFieldBackground({
  className,
  color = "#C9A24B", // Dourado Kronos
  trailColor = "10, 16, 30", // navy (--bg) em RGB
  trailOpacity = 0.12,
  particleCount = 600,
  speed = 1,
}: FlowFieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Com "reduzir movimento" o campo NÃO congela — só flui mais devagar.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vel = reduceMotion ? speed * 0.4 : speed;

    // --- CONFIGURATION ---
    let width = container.clientWidth;
    let height = container.clientHeight;
    let particles: Particle[] = [];
    let animationFrameId = 0;
    const mouse = { x: -1000, y: -1000 }; // Começa fora da tela

    // --- PARTICLE CLASS ---
    class Particle {
      x = Math.random() * width;
      y = Math.random() * height;
      vx = 0;
      vy = 0;
      age = 0;
      life = Math.random() * 200 + 100; // vida útil aleatória (reciclagem natural)

      update() {
        // 1. Campo de fluxo (ruído pseudo-simplex) — gera o "flow"
        const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

        // 2. Força do campo
        this.vx += Math.cos(angle) * 0.2 * vel;
        this.vy += Math.sin(angle) * 0.2 * vel;

        // 3. Repulsão pelo mouse
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150;
        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius;
          this.vx -= dx * force * 0.05;
          this.vy -= dy * force * 0.05;
        }

        // 4. Velocidade + atrito
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;

        // 5. Envelhecimento
        this.age++;
        if (this.age > this.life) this.reset();

        // 6. Wrap na borda
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 200 + 100;
      }

      draw(context: CanvasRenderingContext2D) {
        context.fillStyle = color;
        // Fade in/out pela idade
        const alpha = 1 - Math.abs(this.age / this.life - 0.5) * 2;
        context.globalAlpha = alpha;
        context.fillRect(this.x, this.y, 1.5, 1.5); // pontinhos são mais rápidos que arcs
      }
    }

    // --- INITIALIZATION ---
    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reseta antes de escalar (evita acúmulo em resize)
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    // --- ANIMATION LOOP ---
    const animate = () => {
      // Em vez de limpar, desenha um retângulo semitransparente = rastros.
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${trailColor}, ${trailOpacity})`;
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        p.update();
        p.draw(ctx);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // --- EVENT LISTENERS ---
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      init();
    };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    // Start — sempre anima (com "reduzir movimento" o fluxo já está mais lento).
    init();
    animate();

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, trailColor, trailOpacity, particleCount, speed]);

  return (
    <div ref={containerRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
