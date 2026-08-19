import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompetencia } from "@/lib/competencia-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import { daysUntil } from "@/lib/domain";
import { nthDiaUtil, formatBr } from "@/lib/vencimento";
import { Trash2, X, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Empregador, Processamento, Empregado, EventoDp } from "@/lib/domain";
import { feriasAlerta, eventoTocaMes, eventoBadgeLabel, eventoTipoColor } from "@/lib/domain";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Callout({
  tone,
  title,
  children,
}: {
  tone: "crit" | "warn" | "info" | "ok";
  title: string;
  children?: React.ReactNode;
}) {
  const map = {
    crit: { bg: "#FCEAEC", border: "var(--elite-crit)", fg: "var(--elite-crit)" },
    warn: { bg: "#FEF6E6", border: "var(--elite-warn)", fg: "#8a5a00" },
    info: { bg: "#E7EEF3", border: "var(--elite-info)", fg: "var(--elite-info)" },
    ok: { bg: "#E6F3EC", border: "var(--elite-ok)", fg: "var(--elite-ok)" },
  }[tone];
  return (
    <div
      className="rounded-md border-l-4 p-3 text-sm"
      style={{ backgroundColor: map.bg, borderLeftColor: map.border, color: map.fg }}
    >
      <div className="font-bold">{title}</div>
      {children ? <div className="mt-1 text-foreground">{children}</div> : null}
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <Card style={accent ? { borderTop: "3px solid var(--elite-gold)" } : undefined}>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold" style={{ color: "var(--elite-navy)" }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function AbrirCompetenciaDialog() {
  return <AbrirCompetenciaDialogInner />;
}

/** Competência sugerida por hoje: a partir do dia 20 já aponta para o mês seguinte. */
function competenciaSugerida(hoje: Date) {
  const d = hoje.getDate();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth() + 1;
  if (d >= 20) {
    if (mes === 12) {
      mes = 1;
      ano += 1;
    } else mes += 1;
  }
  return { ano, mes };
}

function AbrirCompetenciaDialogInner() {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const sugerida = competenciaSugerida(now);
  const [ano, setAno] = useState(sugerida.ano);
  const [mes, setMes] = useState(sugerida.mes);
  const [importar, setImportar] = useState(true);
  const qc = useQueryClient();
  const { refetch, setSelectedId } = useCompetencia();

  const { data: cfgDia = 20 } = useQuery({
    queryKey: ["configuracoes", "dia_vencimento_dae"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("dia_vencimento_dae")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data?.dia_vencimento_dae ?? 20;
    },
  });
  const diaVenc = cfgDia;

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("abrir_competencia", {
        p_ano: ano,
        p_mes: mes,
        p_importar_variavel: importar,
      } as never);
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (newId) => {
      toast.success("Competência aberta");
      refetch();
      qc.invalidateQueries({ queryKey: ["processamentos"] });
      qc.invalidateQueries({ queryKey: ["checklist-status"] });
      if (typeof newId === "string") setSelectedId(newId);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          style={{ backgroundColor: "var(--elite-gold)", color: "var(--elite-navy)" }}
          className="font-bold hover:opacity-90"
        >
          + Abrir nova competência
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir nova competência</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mês</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Ano</Label>
            <Input
              type="number"
              min={2020}
              max={2100}
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            />
          </div>
        </div>
        <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
          <Checkbox
            checked={importar}
            onCheckedChange={(v) => setImportar(v === true)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">
              Herdar "Variável" e observação de cálculo das empresas com variável
            </span>
            <span className="block text-xs text-muted-foreground">
              Empresas que tinham variável na competência anterior nascem com Variável = Sim e
              com a observação de cálculo copiada. Empresas sem variável começam em branco.
            </span>
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          Cria uma linha para cada empregador ativo, herdando o movimento da competência
          anterior. Vencimento do DAE = dia {diaVenc} do mês seguinte (antecipado para o
          último dia útil anterior quando cair em fim de semana ou feriado).
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
          >
            {mutation.isPending ? "Abrindo..." : "Abrir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirCompetenciaDialog() {
  const { selected, refetch, setSelectedId, competencias } = useCompetencia();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [cienteFechada, setCienteFechada] = useState(false);
  const qc = useQueryClient();

  const { data: nProcs = 0 } = useQuery({
    queryKey: ["processamentos_count", selected?.id],
    enabled: !!selected?.id && open,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("processamentos")
        .select("id", { count: "exact", head: true })
        .eq("competencia_id", selected!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("excluir_competencia", {
        p_competencia_id: selected!.id,
        p_forcar: selected!.status === "fechada",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Competência excluída");
      const resto = competencias.filter((c) => c.id !== selected?.id);
      if (resto[0]) setSelectedId(resto[0].id);
      refetch();
      qc.invalidateQueries({ queryKey: ["processamentos"] });
      qc.invalidateQueries({ queryKey: ["checklist-status"] });
      setOpen(false);
      setConfirmText("");
      setCienteFechada(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!selected) return null;
  const fechada = selected.status === "fechada";
  const podeExcluir =
    confirmText.trim().toUpperCase() === "EXCLUIR" && (!fechada || cienteFechada);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" style={{ color: "var(--elite-crit)" }}>
          <Trash2 className="h-4 w-4" /> Excluir competência
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir competência {selected.rotulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Callout tone="crit" title="Ação irreversível">
            Isto remove a competência {selected.rotulo} e seus {nProcs} processamentos e
            marcações de checklist. Empregadores, empregados e modelos de checklist não são
            afetados.
          </Callout>
          {fechada && (
            <label className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox
                checked={cienteFechada}
                onCheckedChange={(v) => setCienteFechada(v === true)}
                className="mt-0.5"
              />
              <span>
                Esta competência está <b>fechada</b>. Estou ciente de que vou apagar
                histórico já publicado.
              </span>
            </label>
          )}
          <div>
            <Label>Digite EXCLUIR para confirmar</Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!podeExcluir || excluir.isPending}
            onClick={() => excluir.mutate()}
            style={{ backgroundColor: "var(--elite-crit)", color: "white" }}
          >
            {excluir.isPending ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard() {
  return <DashboardInner />;
}

function CicloCompetencia({
  competencias,
  feriadosExtras,
}: {
  competencias: { ano: number; mes: number }[];
  feriadosExtras: string[];
}) {
  const hoje = new Date();
  const alvo = competenciaSugerida(hoje);
  const rotulo = (a: number, m: number) => `${String(m).padStart(2, "0")}/${a}`;
  const existe = (a: number, m: number) => competencias.some((c) => c.ano === a && c.mes === m);

  const antecipada = hoje.getDate() >= 20 && !existe(alvo.ano, alvo.mes);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const quintoDiaUtil = nthDiaUtil(anoAtual, mesAtual, 5, feriadosExtras);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {antecipada && (
        <Callout tone="info" title={`Já é possível abrir a competência ${rotulo(alvo.ano, alvo.mes)}`}>
          Você pode começar pelas empresas SEM variável.
        </Callout>
      )}
      <Callout tone="info" title={`A competência ${rotulo(anoAtual, mesAtual)} começou`}>
        Já pode iniciar as validações das empresas SEM movimentação.
      </Callout>
      <Callout
        tone="warn"
        title={`Limite para pagamento do cliente (5º dia útil): ${formatBr(quintoDiaUtil)}`}
      >
        Data considera feriados nacionais, estaduais do RN e municipais de Natal — confira
        feriados locais.
      </Callout>
    </div>
  );
}

function DashboardInner() {
  const { selected, competencias } = useCompetencia();
  const qc = useQueryClient();
  const [editEmp, setEditEmp] = useState<{ id: string; nome: string; texto: string } | null>(null);
  const { data: ocultos = [] } = useQuery({
    queryKey: ["dashboard_ocultos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dashboard_ocultos").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ocultoId = (tipo: string, empregadorId: string, chave: string) =>
    ocultos.find((o) => o.tipo === tipo && o.empregador_id === empregadorId && o.chave === chave)?.id;

  const ocultar = useMutation({
    mutationFn: async (rows: { tipo: string; empregador_id: string; chave: string }[]) => {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("dashboard_ocultos")
        .upsert(rows, { onConflict: "tipo,empregador_id,chave" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_ocultos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reexibir = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("dashboard_ocultos").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_ocultos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarObs = useMutation({
    mutationFn: async (v: { id: string; texto: string }) => {
      const { error } = await supabase
        .from("empregadores")
        .update({ observacoes_fixas: v.texto.trim() || null })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observação atualizada no cadastro");
      qc.invalidateQueries({ queryKey: ["empregadores"] });
      setEditEmp(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: feriadosExtras = [] } = useQuery({
    queryKey: ["configuracoes", "feriados_extras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("feriados_extras")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return ((data as { feriados_extras?: string[] } | null)?.feriados_extras ?? []) as string[];
    },
  });

  const { data: empregadores = [] } = useQuery({
    queryKey: ["empregadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empregadores").select("*");
      if (error) throw error;
      return (data ?? []) as Empregador[];
    },
  });

  const { data: procs = [] } = useQuery({
    queryKey: ["processamentos", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processamentos")
        .select("*")
        .eq("competencia_id", selected!.id);
      if (error) throw error;
      return (data ?? []) as Processamento[];
    },
  });

  const { data: empregados = [] } = useQuery({
    queryKey: ["empregados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empregados").select("*");
      if (error) throw error;
      return (data ?? []) as Empregado[];
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos_dp_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos_dp").select("*");
      if (error) throw error;
      return (data ?? []) as EventoDp[];
    },
  });

  const eventosByEmpregado = new Map<string, EventoDp[]>();
  eventos.forEach((ev) => {
    const arr = eventosByEmpregado.get(ev.empregado_id) ?? [];
    arr.push(ev);
    eventosByEmpregado.set(ev.empregado_id, arr);
  });

  const feriasVencidas: { emp: Empregado; empregador?: Empregador; limite: Date }[] = [];
  const feriasAVencer: { emp: Empregado; empregador?: Empregador; limite: Date }[] = [];
  empregados.forEach((emp) => {
    const { level, limite } = feriasAlerta(emp, eventosByEmpregado.get(emp.id) ?? []);
    if (!level || !limite) return;
    const item = { emp, empregador: empregadores.find((e) => e.id === emp.empregador_id), limite };
    if (level === "vencidas") feriasVencidas.push(item);
    else feriasAVencer.push(item);
  });

  const eventosDoMes: { emp: Empregado; empregador?: Empregador; ev: EventoDp }[] = [];
  if (selected) {
    eventos.forEach((ev) => {
      if (!eventoTocaMes(ev, selected.ano, selected.mes)) return;
      const emp = empregados.find((e) => e.id === ev.empregado_id);
      if (!emp) return;
      eventosDoMes.push({ ev, emp, empregador: empregadores.find((e) => e.id === emp.empregador_id) });
    });
  }

  const ativos = empregadores.filter((e) => e.status === "ativo").length;
  const total = procs.length;
  const concluidos = procs.filter((p) => p.concluido).length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const comMov = procs.filter((p) => p.possui_movimento === "com_movimento").length;
  const semMov = procs.filter((p) => p.possui_movimento === "sem_movimento").length;
  const folhaPend = procs.filter((p) => p.status_folha === "pendente").length;
  const daePend = procs.filter((p) => p.status_dae === "pendente").length;
  const dias = selected ? daysUntil(selected.vencimento_dae) : null;

  const empMap = new Map(empregadores.map((e) => [e.id, e]));
  const semMovAll = procs.filter(
    (p) => p.possui_movimento === "sem_movimento" && !p.justificado_portal,
  );
  const semMovChave = selected?.id ?? "";
  const semMovOcultosIds = semMovAll
    .map((p) => ocultoId("sem_mov", p.empregador_id, semMovChave))
    .filter((x): x is string => !!x);
  const semMovNaoJust = semMovAll.filter(
    (p) => !ocultoId("sem_mov", p.empregador_id, semMovChave),
  );
  const situacoesEspeciais = procs.filter((p) => p.situacao && p.situacao.trim().length > 0);
  const lembretesAll = procs
    .map((p) => ({ p, e: empMap.get(p.empregador_id) }))
    .filter((x) => !!x.e?.observacoes_fixas);
  const lembretesOcultosIds = lembretesAll
    .map((x) => ocultoId("lembrete", x.p.empregador_id, x.e!.observacoes_fixas!))
    .filter((v): v is string => !!v);
  const lembretes = lembretesAll.filter(
    (x) => !ocultoId("lembrete", x.p.empregador_id, x.e!.observacoes_fixas!),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--elite-navy)" }}>
            Dashboard{selected ? ` — ${selected.rotulo}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {competencias.length === 0
              ? "Nenhuma competência cadastrada. Abra a primeira para começar."
              : "Panorama da competência selecionada."}
          </p>
        </div>
        <AbrirCompetenciaDialog />
      </div>

      <CicloCompetencia competencias={competencias} feriadosExtras={feriadosExtras} />

      {selected && (
        <>
          <div className="flex justify-end">
            <ExcluirCompetenciaDialog />
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "var(--elite-navy)" }}>
                  Conclusão da competência
                </span>
                <span className="text-sm font-bold">{pct}% ({concluidos}/{total})</span>
              </div>
              <Progress
                value={pct}
                className="h-3"
                style={{ backgroundColor: "var(--elite-zebra)" }}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <KpiCard label="Empregadores ativos" value={ativos} />
            <KpiCard label="% Concluído" value={`${pct}%`} accent />
            <KpiCard label="Com movimento" value={comMov} />
            <KpiCard label="Sem movimento" value={semMov} />
            <KpiCard label="Folha pendente" value={folhaPend} />
            <KpiCard label="DAE pendente" value={daePend} />
            <KpiCard
              label="DAE vence em"
              value={
                <span style={{ color: dias !== null && dias <= 2 ? "var(--elite-crit)" : undefined }}>
                  {dias !== null ? `${dias}d` : "—"}
                </span>
              }
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(semMovNaoJust.length > 0 || semMovOcultosIds.length > 0) && (
              <Callout
                tone="warn"
                title={`${semMovNaoJust.length} sem movimento sem justificativa no Portal`}
              >
                {semMovNaoJust.length > 0 && (
                  <div className="mb-1 flex justify-end">
                    <button
                      className="text-[11px] underline text-muted-foreground"
                      onClick={() => {
                        if (!confirm("Ocultar todos os avisos do Dashboard? Nada é alterado nos processamentos."))
                          return;
                        ocultar.mutate(
                          semMovNaoJust.map((p) => ({
                            tipo: "sem_mov",
                            empregador_id: p.empregador_id,
                            chave: semMovChave,
                          })),
                        );
                      }}
                    >
                      Limpar todas
                    </button>
                  </div>
                )}
                {semMovNaoJust.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-start gap-1 text-xs">
                    <span className="flex-1">
                      #{empMap.get(p.empregador_id)?.codigo} — {empMap.get(p.empregador_id)?.nome}
                    </span>
                    <button
                      title="Ocultar do Dashboard"
                      className="opacity-60 hover:opacity-100"
                      onClick={() =>
                        ocultar.mutate([
                          { tipo: "sem_mov", empregador_id: p.empregador_id, chave: semMovChave },
                        ])
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {semMovOcultosIds.length > 0 && (
                  <button
                    className="mt-1 text-[11px] underline text-muted-foreground"
                    onClick={() => reexibir.mutate(semMovOcultosIds)}
                  >
                    mostrar ocultos ({semMovOcultosIds.length})
                  </button>
                )}
              </Callout>
            )}
            {situacoesEspeciais.length > 0 && (
              <Callout tone="info" title={`${situacoesEspeciais.length} situações especiais`}>
                {situacoesEspeciais.slice(0, 5).map((p) => (
                  <div key={p.id} className="text-xs">
                    #{empMap.get(p.empregador_id)?.codigo} — {p.situacao}
                  </div>
                ))}
              </Callout>
            )}
            {(lembretes.length > 0 || lembretesOcultosIds.length > 0) && (
              <Callout tone="warn" title={`${lembretes.length} lembretes recorrentes`}>
                {lembretes.length > 0 && (
                  <div className="mb-1 flex justify-end">
                    <button
                      className="text-[11px] underline text-muted-foreground"
                      onClick={() => {
                        if (
                          !confirm(
                            "Ocultar todos os lembretes do Dashboard? Eles continuam salvos no cadastro dos empregadores.",
                          )
                        )
                          return;
                        ocultar.mutate(
                          lembretes.map((x) => ({
                            tipo: "lembrete",
                            empregador_id: x.p.empregador_id,
                            chave: x.e!.observacoes_fixas!,
                          })),
                        );
                      }}
                    >
                      Limpar todas
                    </button>
                  </div>
                )}
                {lembretes.slice(0, 5).map((x) => (
                  <div key={x.p.id} className="flex items-start gap-1 text-xs">
                    <button
                      className="flex-1 text-left hover:underline"
                      title="Editar observação no cadastro"
                      onClick={() =>
                        setEditEmp({
                          id: x.e!.id,
                          nome: x.e!.nome,
                          texto: x.e!.observacoes_fixas ?? "",
                        })
                      }
                    >
                      #{x.e?.codigo} — {x.e?.observacoes_fixas}
                    </button>
                    <Pencil className="mt-0.5 h-3 w-3 opacity-50" />
                    <button
                      title="Ocultar do Dashboard"
                      className="opacity-60 hover:opacity-100"
                      onClick={() =>
                        ocultar.mutate([
                          {
                            tipo: "lembrete",
                            empregador_id: x.p.empregador_id,
                            chave: x.e!.observacoes_fixas!,
                          },
                        ])
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {lembretesOcultosIds.length > 0 && (
                  <button
                    className="mt-1 text-[11px] underline text-muted-foreground"
                    onClick={() => reexibir.mutate(lembretesOcultosIds)}
                  >
                    mostrar ocultos ({lembretesOcultosIds.length})
                  </button>
                )}
              </Callout>
            )}
            {dias !== null && dias <= 2 && (
              <Callout tone="crit" title={`DAE vence em ${dias} dia(s)`}>
                Vencimento: {new Date(selected.vencimento_dae + "T00:00:00").toLocaleDateString("pt-BR")}
              </Callout>
            )}
            {feriasVencidas.length > 0 && (
              <Callout tone="crit" title={`${feriasVencidas.length} férias vencidas — risco de dobra`}>
                {feriasVencidas.slice(0, 5).map((x) => (
                  <div key={x.emp.id} className="text-xs">
                    {x.emp.nome} · #{x.empregador?.codigo} {x.empregador?.nome} · limite {x.limite.toLocaleDateString("pt-BR")}
                  </div>
                ))}
              </Callout>
            )}
            {feriasAVencer.length > 0 && (
              <Callout tone="warn" title={`${feriasAVencer.length} férias a vencer (60 dias)`}>
                {feriasAVencer.slice(0, 5).map((x) => (
                  <div key={x.emp.id} className="text-xs">
                    {x.emp.nome} · #{x.empregador?.codigo} {x.empregador?.nome} · limite {x.limite.toLocaleDateString("pt-BR")}
                  </div>
                ))}
              </Callout>
            )}
            {eventosDoMes.length > 0 && (
              <Callout tone="info" title={`${eventosDoMes.length} eventos neste mês`}>
                <div className="flex flex-wrap gap-1 mt-1">
                  {eventosDoMes.slice(0, 12).map((x) => {
                    const c = eventoTipoColor[x.ev.tipo];
                    return (
                      <span
                        key={x.ev.id}
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: c.bg, color: c.fg }}
                        title={`${x.emp.nome}${x.empregador ? ` · #${x.empregador.codigo}` : ""}`}
                      >
                        {eventoBadgeLabel(x.ev)}
                      </span>
                    );
                  })}
                </div>
              </Callout>
            )}
          </div>
        </>
      )}

      <Dialog open={!!editEmp} onOpenChange={(o) => !o && setEditEmp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação fixa — {editEmp?.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Este texto é o campo do cadastro do empregador. Salvar altera o cadastro.
          </p>
          <Textarea
            className="min-h-[160px]"
            value={editEmp?.texto ?? ""}
            onChange={(e) => setEditEmp((s) => (s ? { ...s, texto: e.target.value } : s))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmp(null)}>
              Cancelar
            </Button>
            <Button
              disabled={salvarObs.isPending}
              onClick={() => editEmp && salvarObs.mutate({ id: editEmp.id, texto: editEmp.texto })}
              style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
            >
              Salvar no cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
