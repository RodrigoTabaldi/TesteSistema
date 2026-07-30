import { lazy, Suspense } from "react";
import { KronosGlobe2D } from "@/components/ui/kronos-globe-2d";

// Globo do Kronos.
//
// PADRÃO: renderizador em canvas 2D (kronos-globe-2d) — não depende de WebGL
// e funciona em qualquer máquina. O globo COBE (WebGL) fica disponível via
// `engine="cobe"`, mas em drivers que só têm WebGL por software ele pinta um
// disco preto, por isso não é o padrão.
const GlobeCdn = lazy(() =>
  import("@/components/ui/cobe-globe-cdn").then((m) => ({ default: m.GlobeCdn }))
);

export function KronosGlobe({
  className = "",
  speed = 0.0035,
  engine = "2d",
}: {
  className?: string;
  speed?: number;
  /** "2d" (padrão, sempre funciona) | "cobe" (WebGL, exige GPU) */
  engine?: "2d" | "cobe";
}) {
  if (engine === "cobe") {
    return (
      <Suspense fallback={<KronosGlobe2D className={className} speed={speed} />}>
        <GlobeCdn className={className} speed={speed} />
      </Suspense>
    );
  }
  return <KronosGlobe2D className={className} speed={speed} />;
}

export default KronosGlobe;
