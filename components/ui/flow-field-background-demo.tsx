import FlowFieldBackground from "@/components/ui/flow-field-background";

/**
 * Demo isolada do fundo de campo de fluxo.
 * O container precisa de uma altura definida (aqui, h-screen).
 */
export default function FlowFieldDemo() {
  return (
    <div className="relative h-screen w-full bg-bg">
      <FlowFieldBackground
        color="#C9A24B" // Dourado Kronos
        trailColor="8, 13, 26" // navy
        trailOpacity={0.1} // menor = rastros mais longos
        speed={0.8}
        particleCount={520}
      />
    </div>
  );
}
