"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  // next-themes só resolve o tema no cliente — evita mismatch de hidratação.
  useMountEffect(() => setMontado(true));

  const escuro = montado && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      onClick={() => setTheme(escuro ? "light" : "dark")}
      className={cn(
        "flex size-9 items-center justify-center rounded-md border-2 border-border bg-secondary-background text-foreground shadow-[2px_2px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        className,
      )}
    >
      {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
