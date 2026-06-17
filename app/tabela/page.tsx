import { auth } from "@/auth";
import { agendarApuracao } from "@/lib/apuracao";
import { calcularRanking } from "@/lib/ranking";
import { TabelaRanking } from "@/components/tabela-ranking";

export const dynamic = "force-dynamic";

export default async function TabelaPage() {
  agendarApuracao();
  const session = await auth();
  const ranking = await calcularRanking();

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-5 px-4 py-5">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Tabela</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Ranking do bolão e os critérios de desempate.
        </p>
      </header>

      <TabelaRanking ranking={ranking} jogadorId={session?.user?.id} />

      <p className="text-xs font-medium text-muted-foreground">
        Desempate: pontos → placares exatos → resultados (1X2) → jogos cheios →
        nome.
      </p>
    </div>
  );
}
