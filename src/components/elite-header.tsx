import { Link, useRouterState } from "@tanstack/react-router";
import { useCompetencia } from "@/lib/competencia-context";
import { ConfiguracoesDialog } from "@/components/configuracoes-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const nav = [
  { to: "/", label: "Painel Mensal" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/empregados", label: "Empregados" },
];

export function EliteHeader() {
  const { competencias, selectedId, setSelectedId } = useCompetencia();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header
      className="text-white"
      style={{
        background:
          "linear-gradient(90deg, var(--elite-navy) 0%, var(--elite-navy-2) 100%)",
        borderBottom: "3px solid var(--elite-gold)",
      }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--elite-gold)" }}>
            Elite Consultores
          </div>
          <div className="text-lg font-bold">Controle de Domésticas</div>
        </div>

        <nav className="flex flex-1 justify-center gap-1">
          {nav.map((n) => {
            const active =
              n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: active ? "var(--elite-gold)" : "transparent",
                  color: active ? "var(--elite-navy)" : "white",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80">Competência</span>
          <Select
            value={selectedId ?? undefined}
            onValueChange={(v) => setSelectedId(v)}
          >
            <SelectTrigger
              className="w-[140px] border-0 font-bold"
              style={{
                backgroundColor: "var(--elite-gold)",
                color: "var(--elite-navy)",
              }}
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {competencias.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma competência
                </div>
              )}
              {competencias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ConfiguracoesDialog />
        </div>
      </div>
    </header>
  );
}