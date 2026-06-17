import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="w-full rounded-[var(--radius-base)] border-[2.5px] border-border bg-card p-6 shadow-[4px_4px_0_0_var(--brand-black)]">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          Etapa 0 — Scaffold
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground">
          Bolão da Copa 2026
        </h1>
        <p className="mt-3 text-base font-medium text-muted-foreground">
          Next 16 + Tailwind v4 + shadcn (Radix) + tema neobrutalist travado em
          claro. Tudo no lugar.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button>Botão primário</Button>
          <Button variant="secondary">Secundário</Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="size-6 rounded-full border-2 border-border bg-brand-blue" />
          <span className="size-6 rounded-full border-2 border-border bg-brand-green-dark" />
          <span className="size-6 rounded-full border-2 border-border bg-brand-yellow" />
          <span className="size-6 rounded-full border-2 border-border bg-brand-black" />
        </div>
      </div>
    </main>
  );
}
