import { FiatBridgeWidget } from "@/components/bridge/FiatBridgeWidget";
import { MetricsDashboard } from "@/components/shared/MetricsDashboard";

export default function BridgePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Fiat Bridge
        </h1>
        <p className="text-zinc-400 mt-2">
          Fill with real EURO, spend with EURD — MiCA-compliant 1:1 peg, settled on Algorand.
        </p>
      </div>
      <FiatBridgeWidget />
      <div className="mt-10">
        <MetricsDashboard />
      </div>
    </div>
  );
}
