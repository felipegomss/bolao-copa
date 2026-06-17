"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, History, Trophy, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/app/logout/actions";
import { ThemeToggle } from "@/components/theme-toggle";

const TABS = [
  { href: "/jogos", label: "Jogos", Icon: CalendarDays },
  { href: "/historico", label: "Histórico", Icon: History },
  { href: "/tabela", label: "Tabela", Icon: Trophy },
] as const;

export function AppShell({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  const path = usePathname();
  const ativo = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar mobile */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b-[2.5px] border-border bg-card px-4 py-3 lg:hidden">
        <span className="text-base font-extrabold text-foreground">
          Bolão da Copa 2026
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sair"
              className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-secondary-background text-foreground shadow-[2px_2px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Top nav desktop */}
      <header className="hidden border-b-[2.5px] border-border bg-card lg:block">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-3">
          <span className="text-lg font-extrabold text-foreground">
            Bolão da Copa 2026
          </span>
          <nav className="flex items-center gap-2">
            {TABS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md border-2 border-border px-3 py-1.5 text-sm font-bold transition-all",
                  ativo(href)
                    ? "bg-main text-main-foreground shadow-none"
                    : "bg-secondary-background text-foreground shadow-[2px_2px_0_0_var(--border)] hover:translate-x-[1px] hover:translate-y-[1px]",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-md border-2 border-border bg-secondary-background px-3 py-1.5 text-sm font-bold text-foreground shadow-[2px_2px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 pb-24 lg:pb-10">
        {aside ? (
          <div className="mx-auto grid w-full max-w-[980px] grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-6">
            <div className="mx-auto w-full max-w-[460px] lg:max-w-none">
              {children}
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-6 pt-5">{aside}</div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[460px] px-4">{children}</div>
        )}
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t-[2.5px] border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-[460px]">
          {TABS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={ativo(href) ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-bold",
                ativo(href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-6", ativo(href) && "stroke-[2.5]")} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
