import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";

// Globo do Kronos — o tempo percorrendo o mundo.
// Base navy, pontos e brilho dourados (identidade Kronos). Gira sozinho e
// pode ser arrastado. Sem rótulos de CDN nem CSS Anchor Positioning (não
// suportado na maioria dos navegadores) — só o essencial, robusto.

// Grandes praças/fusos horários (o "tempo" ao redor do mundo).
const MARKERS: { location: [number, number]; size: number }[] = [
  { location: [40.71, -74.0], size: 0.05 }, // Nova York
  { location: [51.51, -0.13], size: 0.05 }, // Londres
  { location: [48.85, 2.35], size: 0.04 }, // Paris
  { location: [35.68, 139.69], size: 0.05 }, // Tóquio
  { location: [-23.55, -46.63], size: 0.06 }, // São Paulo
  { location: [1.35, 103.82], size: 0.04 }, // Singapura
  { location: [28.61, 77.21], size: 0.045 }, // Nova Délhi
  { location: [-33.87, 151.21], size: 0.045 }, // Sydney
  { location: [55.75, 37.62], size: 0.04 }, // Moscou
  { location: [37.77, -122.42], size: 0.045 }, // São Francisco
  { location: [30.04, 31.24], size: 0.04 }, // Cairo
  { location: [-34.6, -58.38], size: 0.04 }, // Buenos Aires
];

interface GlobeCdnProps {
  className?: string;
  /** Velocidade da rotação automática. Padrão 0.004. */
  speed?: number;
}

export function GlobeCdn({ className = "", speed = 0.004 }: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let phi = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sem WebGL o globo viraria um disco preto — melhor não desenhar nada.
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl") && !probe.getContext("experimental-webgl")) return;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: canvas.offsetWidth * 2,
      height: canvas.offsetWidth * 2,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.22, 0.29, 0.5], // navy Kronos
      markerColor: [1, 0.8, 0.38], // ouro Kronos
      glowColor: [0.5, 0.41, 0.2], // halo dourado
      markers: MARKERS,
      onRender: (state: Record<string, number>) => {
        const w = canvas.offsetWidth;
        if (pointerInteracting.current === null && !reduce) phi += speed;
        state.phi = phi + pointerMovement.current;
        state.width = w * 2;
        state.height = w * 2;
      },
    });

    const t = window.setTimeout(() => {
      canvas.style.opacity = "1";
    }, 0);

    return () => {
      window.clearTimeout(t);
      globe.destroy();
    };
  }, [speed]);

  const onDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerInteracting.current = e.clientX - pointerMovement.current * 100;
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  const onUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerInteracting.current = null;
    e.currentTarget.style.cursor = "grab";
  }, []);

  const onMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerInteracting.current !== null) {
      pointerMovement.current = (e.clientX - pointerInteracting.current) / 100;
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerOut={onUp}
      onPointerMove={onMove}
      className={className}
      aria-label="Globo do Kronos — o tempo ao redor do mundo"
      role="img"
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1",
        cursor: "grab",
        opacity: 0,
        transition: "opacity 1s ease",
        contain: "layout paint size",
        touchAction: "none",
      }}
    />
  );
}

export default GlobeCdn;
