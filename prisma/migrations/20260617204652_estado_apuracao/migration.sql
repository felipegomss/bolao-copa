-- CreateTable
CREATE TABLE "EstadoApuracao" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "rodadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoApuracao_pkey" PRIMARY KEY ("id")
);
