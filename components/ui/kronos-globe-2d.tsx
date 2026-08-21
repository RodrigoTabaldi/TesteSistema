import { useEffect, useRef } from "react";

// Globo do Kronos em canvas 2D — o tempo girando ao redor do mundo.
// Não depende de WebGL: serve de fallback garantido para o globo COBE.
// Malha de meridianos/paralelos em ouro, marcadores pulsantes nas grandes
// praças e arcos de conexão viajando entre elas.

const CIDADES: { lat: number; lon: number }[] = [
  { lat: 40.71, lon: -74.0 }, // Nova York
  { lat: 51.51, lon: -0.13 }, // Londres
  { lat: 48.85, lon: 2.35 }, // Paris
  { lat: 35.68, lon: 139.69 }, // Tóquio
  { lat: -23.55, lon: -46.63 }, // São Paulo
  { lat: 1.35, lon: 103.82 }, // Singapura
  { lat: 28.61, lon: 77.21 }, // Nova Délhi
  { lat: -33.87, lon: 151.21 }, // Sydney
  { lat: 55.75, lon: 37.62 }, // Moscou
  { lat: 37.77, lon: -122.42 }, // São Francisco
  { lat: 30.04, lon: 31.24 }, // Cairo
  { lat: -34.6, lon: -58.38 }, // Buenos Aires
];

const ARCOS: [number, number][] = [
  [0, 1], // NY – Londres
  [9, 3], // SF – Tóquio
  [2, 5], // Paris – Singapura
  [0, 4], // NY – São Paulo
  [3, 7], // Tóquio – Sydney
  [2, 6], // Paris – Délhi
];

const RAD = Math.PI / 180;
const OURO = "201, 162, 75";
const OURO_CLARO = "228, 200, 127";

interface Props {
  className?: string;
  /** Velocidade da rotação (rad/frame). Padrão 0.0035. */
  speed?: number;
}

export function KronosGlobe2D({ className = "", speed = 0.0035 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Com "reduzir movimento" o globo NÃO congela — apenas gira mais devagar.
    // (Congelar deixaria a tela inicial estática; a rotação lenta e contínua
    // é movimento ambiente, não uma transição brusca.)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vel = reduce ? speed * 0.45 : speed;
    let phi = 0;
    let raf = 0;
    let size = 0;
    let R = 0;
    let cx = 0;
    let cy = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth || 400;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = size * 0.42;
      cx = size / 2;
      cy = size / 2;
    };

    /** Projeta (lat, lon) na esfera girada por `phi`. z>0 = face visível. */
    const proj = (lat: number, lon: number, elev = 0) => {
      const la = lat * RAD;
      const lo = lon * RAD + phi;
      const r = R * (1 + elev);
      const x = Math.cos(la) * Math.sin(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.cos(lo);
      // leve inclinação do eixo (23°) para dar tridimensionalidade
      const tilt = 23 * RAD;
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return { sx: cx + r * x, sy: cy - r * y2, z: z2 };
    };

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Halo externo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.28);
      halo.addColorStop(0, `rgba(${OURO}, 0.16)`);
      halo.addColorStop(1, `rgba(${OURO}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
      ctx.fill();

      // Corpo da esfera (navy com luz superior-esquerda)
      const corpo = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      corpo.addColorStop(0, "rgba(38, 52, 92, 0.95)");
      corpo.addColorStop(0.65, "rgba(18, 27, 54, 0.95)");
      corpo.addColorStop(1, "rgba(8, 12, 24, 0.98)");
      ctx.fillStyle = corpo;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Aro
      ctx.strokeStyle = `rgba(${OURO}, 0.5)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // Meridianos
      for (let lon = 0; lon < 180; lon += 15) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = proj(lat, lon);
          if (p.z > 0) {
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          } else started = false;
        }
        ctx.strokeStyle = `rgba(${OURO}, 0.22)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Paralelos
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath();
        let started = false;
        for (let lon = 0; lon <= 360; lon += 3) {
          const p = proj(lat, lon);
          if (p.z > 0) {
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          } else started = false;
        }
        ctx.strokeStyle = `rgba(${OURO}, ${lat === 0 ? 0.34 : 0.18})`;
        ctx.lineWidth = lat === 0 ? 1.1 : 0.8;
        ctx.stroke();
      }

      // Arcos de conexão (rota do tempo entre praças)
      const t = (Date.now() % 3000) / 3000;
      ARCOS.forEach(([a, b], i) => {
        const A = CIDADES[a];
        const B = CIDADES[b];
        const pts: { sx: number; sy: number; z: number }[] = [];
        for (let s = 0; s <= 1.0001; s += 0.04) {
          const lat = A.lat + (B.lat - A.lat) * s;
          let dLon = B.lon - A.lon;
          if (dLon > 180) dLon -= 360;
          if (dLon < -180) dLon += 360;
          const lon = A.lon + dLon * s;
          const elev = Math.sin(s * Math.PI) * 0.22;
          pts.push(proj(lat, lon, elev));
        }
        ctx.beginPath();
        let started = false;
        for (const p of pts) {
          if (p.z > -0.15) {
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          } else started = false;
        }
        ctx.strokeStyle = `rgba(${OURO_CLARO}, 0.4)`;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Pulso viajando pelo arco
        const k = (t + i / ARCOS.length) % 1;
        const p = pts[Math.floor(k * (pts.length - 1))];
        if (p && p.z > -0.15) {
          ctx.fillStyle = `rgba(${OURO_CLARO}, 0.95)`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Marcadores das cidades (só na face visível)
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 700);
      for (const c of CIDADES) {
        const p = proj(c.lat, c.lon);
        if (p.z <= 0) continue;
        const fade = Math.min(1, p.z * 2.2);
        ctx.fillStyle = `rgba(${OURO_CLARO}, ${0.9 * fade})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${OURO}, ${0.4 * fade * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 5 + 3 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Brilho especular
      const spec = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx - R * 0.4, cy - R * 0.45, R * 0.75);
      spec.addColorStop(0, "rgba(180, 205, 255, 0.10)");
      spec.addColorStop(1, "rgba(180, 205, 255, 0)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = () => {
      phi += vel;
      draw();
      raf = requestAnimationFrame(loop);
    };

    resize();
    loop();

    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [speed]);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label="Globo do Kronos — o tempo ao redor do mundo"
      style={{ width: "100%", aspectRatio: "1", display: "block" }}
    />
  );
}

export default KronosGlobe2D;
