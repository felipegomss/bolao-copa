import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        nome: { label: "Nome", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const nome = (credentials?.nome as string | undefined)?.trim();
        const senha = credentials?.senha as string | undefined;

        if (!nome || !senha) return null;
        // Senha única compartilhada do bolão.
        if (senha !== process.env.SENHA_BOLAO) return null;

        // Login case-insensitive (mais amigável pros amigos).
        const jogador = await prisma.jogador.findFirst({
          where: { nome: { equals: nome, mode: "insensitive" } },
        });
        if (!jogador) return null;

        return { id: jogador.id, name: jogador.nome };
      },
    }),
  ],
});
