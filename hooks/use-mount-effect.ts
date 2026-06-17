import { useEffect } from "react";

// Escape hatch para sincronização com sistemas externos no mount
// (ex.: setInterval do countdown). Único uso permitido de useEffect.
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
