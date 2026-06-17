-- CreateTable
CREATE TABLE "Jogador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogo" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "fase" TEXT NOT NULL,
    "grupo" TEXT,
    "time1" TEXT NOT NULL,
    "time2" TEXT NOT NULL,
    "sigla1" TEXT NOT NULL,
    "sigla2" TEXT NOT NULL,
    "estadio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendado',
    "gols1" INTEGER,
    "gols2" INTEGER,
    "valePontos" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Jogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Palpite" (
    "id" TEXT NOT NULL,
    "jogadorId" TEXT NOT NULL,
    "jogoId" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "ambasMarcam" BOOLEAN NOT NULL,
    "overDoisMeio" BOOLEAN NOT NULL,
    "placar1" INTEGER,
    "placar2" INTEGER,
    "pontos" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Palpite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Jogador_nome_key" ON "Jogador"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Jogo_externalId_key" ON "Jogo"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Palpite_jogadorId_jogoId_key" ON "Palpite"("jogadorId", "jogoId");

-- AddForeignKey
ALTER TABLE "Palpite" ADD CONSTRAINT "Palpite_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Palpite" ADD CONSTRAINT "Palpite_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
