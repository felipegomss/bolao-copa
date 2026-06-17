import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

// Placeholder protegido — só pra validar auth/proxy nesta etapa.
// A tela real de jogos vem na Etapa 4.
export default async function JogosPage() {
  const session = await auth();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
      <div className="rounded-[var(--radius-base)] border-[2.5px] border-border bg-card p-6 shadow-[4px_4px_0_0_var(--brand-black)]">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          Logado
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">
          E aí, {session?.user?.name}!
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Rota protegida funcionando. A tela de jogos vem na Etapa 4.
        </p>

        <form action={logout} className="mt-6">
          <Button
            type="submit"
            variant="secondary"
            className="h-11 w-full border-2 border-border font-extrabold shadow-[3px_3px_0_0_var(--brand-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Sair
          </Button>
        </form>
      </div>
    </main>
  );
}
