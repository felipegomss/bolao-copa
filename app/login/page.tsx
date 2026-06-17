import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Já logado? Vai direto pros jogos.
  const session = await auth();
  if (session?.user) redirect("/jogos");

  const { erro } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        nome: formData.get("nome"),
        senha: formData.get("senha"),
        redirectTo: "/jogos",
      });
    } catch (error) {
      // Credenciais inválidas — volta pro login com flag de erro.
      if (error instanceof AuthError) {
        redirect("/login?erro=1");
      }
      // signIn lança um NEXT_REDIRECT em caso de sucesso — precisa propagar.
      throw error;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold text-foreground">
          Bolão da Tropa ⚽️
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Entra com teu nome e a senha do grupo.
        </p>
      </header>

      <form
        action={login}
        className="flex flex-col gap-4 rounded-[var(--radius-base)] border-[2.5px] border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome" className="font-bold">
            Nome
          </Label>
          <Input
            id="nome"
            name="nome"
            autoComplete="username"
            required
            placeholder="ex: felipe"
            className="border-2 border-border"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha" className="font-bold">
            Senha do bolão
          </Label>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="border-2 border-border"
          />
        </div>

        {erro ? (
          <p
            role="alert"
            className="rounded-md border-2 border-border bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground"
          >
            Nome ou senha incorretos.
          </p>
        ) : null}

        <Button
          type="submit"
          className="mt-1 h-11 border-2 border-border text-base font-extrabold shadow-[3px_3px_0_0_var(--border)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          Entrar
        </Button>
      </form>
    </main>
  );
}
