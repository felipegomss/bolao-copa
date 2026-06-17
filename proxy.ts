// Next.js 16: middleware.ts foi renomeado pra proxy.ts.
// Importamos auth.config (edge-safe), nunca auth.ts (que puxa Node pro edge).
import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/jogos/:path*", "/historico/:path*", "/tabela/:path*"],
};
