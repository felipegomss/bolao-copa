import type { NextAuthConfig } from "next-auth";

// Config edge-safe: NÃO importa Prisma nem nada de Node.
// É o que o proxy.ts usa. O provider Credentials (que toca o banco)
// é adicionado só no auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  },
  providers: [],
  callbacks: {
    // Usado pelo proxy.ts pra proteger as rotas do matcher.
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      // No login, guarda o Jogador.id no token.
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
