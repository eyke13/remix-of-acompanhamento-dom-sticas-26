import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompetencia } from "@/lib/competencia-context";
import {
  type Empregador,
  type Processamento,
  type Responsavel,
  type StatusEtapa,
  type PossuiMovimento,
  type Empregado,
  type EventoDp,
  type EventoTipo,
  eventoIncideNaComp,
  eventoTipoColor,
  eventoTipoAccent,
  eventoPrioridade,
  formatDia,
  isSegundaFolhaAdmissao,
  eventoTipoLabel,
} from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, StickyNote, X, Trash2, Users, ChevronDown } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChecklistChip,
  ChecklistBody,
  type ChecklistStatusRow,
} from "@/components/checklist";

export const Route = createFileRoute("/")({
  component: Painel,
  head: () => ({ meta: [{ title: "Painel Mensal — Domésticas" }] }),
});

const STATUS_COLOR: Record<StatusEtapa, { bg: string; fg: string }> = {
  pendente: { bg: "#E5E7EB", fg: "#374151" },
  ok: { bg: "#DCFCE7", fg: "#166534" },
  validado: { bg: "#DBEAFE", fg: "#1E3A8A" },
  nao_aplicavel: { bg: "#F3F4F6", fg: "#9CA3AF" },
};

const STATUS_LABEL: Record<StatusEtapa, string> = {
  pendente: "Pendente",
  ok: "OK",
  validado: "Validado",
  nao_aplicavel: "N/A",
};

function StatusChip({
  value,
  onChange,
  disabled,
}: {
  value: StatusEtapa;
  onChange: (v: StatusEtapa) => void;
  disabled?: boolean;
}) {
  const c = STATUS_COLOR[value];
  const options: StatusEtapa[] = ["pendente", "ok", "validado", "nao_aplicavel"];
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          onClick={(evt) => evt.stopPropagation()}
          className="inline-flex w-full items-center justify-center rounded-full px-2 py-1 text-[12px] font-bold leading-none transition disabled:cursor-not-allowed"
          style={{
            backgroundColor: c.bg,
            color: c.fg,
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {STATUS_LABEL[value]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-32 p-1">
        {options.map((o) => {
          const oc = STATUS_COLOR[o];
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className="mb-1 flex w-full items-center justify-center rounded-full px-2 py-1 text-[12px] font-bold last:mb-0"
              style={{ backgroundColor: oc.bg, color: oc.fg }}
            >
              {STATUS_LABEL[o]}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

const MOV_STYLE: Record<PossuiMovimento, { bg: string; fg: string; label: string }> = {
  com_movimento: { bg: "#DCFCE7", fg: "#166534", label: "Com" },
  sem_movimento: { bg: "#F3F4F6", fg: "#4B5563", label: "Sem" },
  indefinido: { bg: "#FEF3C7", fg: "#92400E", label: "—" },
};

function MovimentoChip({
  value,
  onChange,
}: {
  value: PossuiMovimento;
  onChange: (v: PossuiMovimento) => void;
}) {
  const c = MOV_STYLE[value];
  const options: PossuiMovimento[] = ["com_movimento", "sem_movimento", "indefinido"];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(evt) => evt.stopPropagation()}
          className="inline-flex w-full items-center justify-center rounded-full px-2 py-1 text-[12px] font-bold leading-none"
          style={{ backgroundColor: c.bg, color: c.fg }}
        >
          {c.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-32 p-1">
        {options.map((o) => {
          const oc = MOV_STYLE[o];
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className="mb-1 flex w-full items-center justify-center rounded-full px-2 py-1 text-[12px] font-bold last:mb-0"
              style={{ backgroundColor: oc.bg, color: oc.fg }}
            >
              {oc.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function maskCpf(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

type AddEventoState = {
  open: boolean;
  empregador: Empregador | null;
  empregados: Empregado[];
  empregadoId: string;
  tipo: EventoTipo | null;
  dataInicio: string;
  dataFim: string;
};

const EMPTY_ADD: AddEventoState = {
  open: false,
  empregador: null,
  empregados: [],
  empregadoId: "",
  tipo: null,
  dataInicio: "",
  dataFim: "",
};

const TIPO_OPCOES: EventoTipo[] = ["afastamento", "ferias", "rescisao", "admissao"];

function chipLabel(ev: EventoDp, ano: number, mes: number): string {
  const base = eventoTipoLabel[ev.tipo];
  if (ev.tipo === "admissao") {
    const seg = isSegundaFolhaAdmissao(ev, ano, mes);
    return `${base} ${formatDia(ev.data_inicio)}${seg ? " · 2ª folha" : ""}`;
  }
  if (ev.tipo === "rescisao") {
    return `${base} ${formatDia(ev.data_inicio)}`;
  }
  if (ev.data_fim && ev.data_fim !== ev.data_inicio) {
    return `${base} ${formatDia(ev.data_inicio)}–${formatDia(ev.data_fim)}`;
  }
  return `${base} ${formatDia(ev.data_inicio)}`;
}

function Painel() {
  const { selected } = useCompetencia();
  const qc = useQueryClient();

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("CPF copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const { data: empregadores = [] } = useQuery({
    queryKey: ["empregadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empregadores").select("*");
      if (error) throw error;
      return (data ?? []) as Empregador[];
    },
  });
  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("responsaveis").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Responsavel[];
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

  const { data: cfg } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as { checklist_ativo: boolean } | null;
    },
  });

  const checklistAtivo = !!cfg?.checklist_ativo;
  const colCount = checklistAtivo ? 9 : 11;
  const respNomeMap = useMemo(
    () => new Map(responsaveis.map((r) => [r.id, r.nome])),
    [responsaveis],
  );
  const responsaveisAtivos = useMemo(
    () => responsaveis.filter((r) => r.ativo !== false),
    [responsaveis],
  );

  // Acesso compartilhado: reflete alterações de outras pessoas em tempo real
  useEffect(() => {
    const channel = supabase
      .channel("painel-mensal-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "processamentos" },
        () => {
          qc.invalidateQueries({ queryKey: ["processamentos"] });
          qc.invalidateQueries({ queryKey: ["checklist-status"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_competencia_itens" },
        () => {
          qc.invalidateQueries({ queryKey: ["checklist"] });
          qc.invalidateQueries({ queryKey: ["checklist-status"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: chkStatus = [] } = useQuery({
    queryKey: ["checklist-status", selected?.id],
    enabled: !!selected?.id && checklistAtivo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "checklist_status_competencia",
        { p_competencia_id: selected!.id },
      );
      if (error) throw error;
      return (data ?? []) as ChecklistStatusRow[];
    },
  });

  const chkByEmpregador = useMemo(
    () => new Map(chkStatus.map((s) => [s.empregador_id, s])),
    [chkStatus],
  );

  // Silent reapply — at most once per (mount, competencia)
  const silentReapplyKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selected?.id || !checklistAtivo) return;
    const key = selected.id;
    if (silentReapplyKeyRef.current === key) return;
    if (chkStatus.length === 0) return;
    const alguem = chkStatus.some((s) => s.pode_reaplicar_silencioso);
    if (!alguem) return;
    silentReapplyKeyRef.current = key;
    (async () => {
      const { error } = await supabase.rpc(
        "aplicar_checklist_competencia_lote",
        { p_competencia_id: key, p_forcar: false },
      );
      if (error) {
        console.warn("Silent reapply falhou:", error.message);
        return;
      }
      const { data: newStatus } = await supabase.rpc(
        "checklist_status_competencia",
        { p_competencia_id: key },
      );
      const rest = (newStatus ?? []).some(
        (s: ChecklistStatusRow) => s.pode_reaplicar_silencioso,
      );
      if (rest) {
        console.warn(
          "Ainda há empregadores com pode_reaplicar_silencioso após reaplicação silenciosa — não repetindo.",
        );
      }
      qc.invalidateQueries({ queryKey: ["checklist-status", key] });
      qc.invalidateQueries({ queryKey: ["processamentos", key] });
    })();
  }, [selected?.id, checklistAtivo, chkStatus, qc]);

  const empregadosPorEmpregador = useMemo(() => {
    const m = new Map<string, Empregado[]>();
    empregados.forEach((e) => {
      const arr = m.get(e.empregador_id) ?? [];
      arr.push(e);
      m.set(e.empregador_id, arr);
    });
    return m;
  }, [empregados]);

  const eventosAtivosPorEmpregador = useMemo(() => {
    const m = new Map<string, EventoDp[]>();
    if (!selected) return m;
    const empToEmpregador = new Map(empregados.map((e) => [e.id, e.empregador_id]));
    eventos.forEach((ev) => {
      if (!eventoIncideNaComp(ev, selected.ano, selected.mes)) return;
      const emprId = empToEmpregador.get(ev.empregado_id);
      if (!emprId) return;
      const arr = m.get(emprId) ?? [];
      arr.push(ev);
      m.set(emprId, arr);
    });
    // ordena por prioridade
    m.forEach((arr) =>
      arr.sort((a, b) => eventoPrioridade[a.tipo] - eventoPrioridade[b.tipo]),
    );
    return m;
  }, [eventos, empregados, selected]);

  const empMap = useMemo(
    () => new Map(empregadores.map((e) => [e.id, e])),
    [empregadores],
  );
  const empregadoMap = useMemo(
    () => new Map(empregados.map((e) => [e.id, e])),
    [empregados],
  );

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Processamento> }) => {
      const { error } = await supabase.from("processamentos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processamentos", selected?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEmpregador = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Empregador> }) => {
      const { error } = await supabase.from("empregadores").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empregadores"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkResp = useMutation({
    mutationFn: async ({ ids, responsavel_id }: { ids: string[]; responsavel_id: string }) => {
      const { error } = await supabase
        .from("empregadores")
        .update({ responsavel_id })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empregadores"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{ open: boolean; respId: string | null; respNome: string }>(
    { open: false, respId: null, respNome: "" },
  );

  // ============= Filtros =============
  const [fMov, setFMov] = useState<string>("all");
  const [fConcl, setFConcl] = useState<string>("all");
  const [fResp, setFResp] = useState<string>("all");
  const [fSearch, setFSearch] = useState("");

  const rows = useMemo(() => {
    const q = fSearch.toLowerCase().trim();
    return procs
      .map((p) => {
        const e = empMap.get(p.empregador_id);
        const evs = eventosAtivosPorEmpregador.get(p.empregador_id) ?? [];
        const topPrio = evs.length > 0 ? eventoPrioridade[evs[0].tipo] : 99;
        return { p, e, evs, topPrio };
      })
      .filter((x) => x.e)
      .filter((x) => {
        if (fMov !== "all" && x.p.possui_movimento !== fMov) return false;
        if (fConcl === "conc" && !x.p.concluido) return false;
        if (fConcl === "pend" && x.p.concluido) return false;
        if (fResp !== "all" && x.e!.responsavel_id !== fResp) return false;
        if (q) {
          const s = `${x.e!.codigo} ${x.e!.nome}`.toLowerCase();
          if (!s.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // grupo por movimento: com > indefinido > sem
        const gmap: Record<PossuiMovimento, number> = {
          com_movimento: 0,
          indefinido: 1,
          sem_movimento: 2,
        };
        const g = gmap[a.p.possui_movimento] - gmap[b.p.possui_movimento];
        if (g !== 0) return g;
        // dentro de com_movimento: eventos primeiro
        if (a.topPrio !== b.topPrio) return a.topPrio - b.topPrio;
        return a.e!.codigo - b.e!.codigo;
      });
  }, [procs, empMap, eventosAtivosPorEmpregador, fMov, fConcl, fResp, fSearch]);

  const total = procs.length;
  const done = procs.filter((p) => p.concluido).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ============= Eventos: add/remove =============
  const [addSt, setAddSt] = useState<AddEventoState>(EMPTY_ADD);
  const [rescisaoConfirm, setRescisaoConfirm] = useState<{ open: boolean; empregador: Empregador | null }>({
    open: false,
    empregador: null,
  });
  const [obsCalc, setObsCalc] = useState<{
    open: boolean;
    proc: Processamento | null;
    text: string;
    editing: boolean;
  }>({
    open: false,
    proc: null,
    text: "",
    editing: false,
  });

  const addEvento = useMutation({
    mutationFn: async () => {
      if (!addSt.empregadoId || !addSt.tipo || !addSt.dataInicio) throw new Error("Preencha os dados");
      const needFim = addSt.tipo === "ferias" || addSt.tipo === "afastamento";
      const dataFim = needFim ? (addSt.dataFim || null) : null;
      if (needFim && !addSt.dataFim) throw new Error("Informe a data final");
      const { error } = await supabase.from("eventos_dp").insert({
        empregado_id: addSt.empregadoId,
        tipo: addSt.tipo,
        data_inicio: addSt.dataInicio,
        data_fim: dataFim,
      });
      if (error) throw error;
      return { tipo: addSt.tipo, empregador: addSt.empregador };
    },
    onSuccess: async (info) => {
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
      // efeito no movimento: linha indefinido → com_movimento
      const proc = procs.find((p) => p.empregador_id === info.empregador?.id);
      if (proc && proc.possui_movimento === "indefinido") {
        await supabase
          .from("processamentos")
          .update({ possui_movimento: "com_movimento" })
          .eq("id", proc.id);
        qc.invalidateQueries({ queryKey: ["processamentos", selected?.id] });
      }
      // Admissão: aviso
      if (info.tipo === "admissao") {
        toast.info("Nova admissão — confirmar com o cliente as especificidades da folha (proventos, descontos, VT, jornada).");
      }
      // Rescisão do único colaborador → confirmar inativar empresa
      if (info.tipo === "rescisao" && info.empregador) {
        const ativos = (empregadosPorEmpregador.get(info.empregador.id) ?? []).filter(
          (e) => e.situacao !== "desligado" && e.id !== addSt.empregadoId,
        );
        if (ativos.length === 0) {
          setRescisaoConfirm({ open: true, empregador: info.empregador });
        }
      }
      setAddSt(EMPTY_ADD);
      toast.success("Evento registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos_dp").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
      toast.success("Evento removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!selected) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Selecione ou crie uma competência para começar.
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3 mx-[calc(50%-50vw)] w-screen px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "var(--elite-navy)" }}>
            Folha Mensal — {selected.rotulo}
          </h1>
        </div>

        <Card>
          <CardContent className="space-y-3 p-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold" style={{ color: "var(--elite-navy)" }}>
                Progresso da competência
              </span>
              <Progress value={pct} className="h-3 flex-1" style={{ backgroundColor: "var(--elite-zebra)" }} />
              <span className="text-xs font-bold">{pct}% ({done}/{total})</span>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <Input placeholder="Buscar por código ou nome…" value={fSearch} onChange={(e) => setFSearch(e.target.value)} className="h-8" />
              <Select value={fMov} onValueChange={setFMov}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Movimento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os movimentos</SelectItem>
                  <SelectItem value="com_movimento">Com movimento</SelectItem>
                  <SelectItem value="sem_movimento">Sem movimento</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fConcl} onValueChange={setFConcl}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Conclusão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pend">Pendentes</SelectItem>
                  <SelectItem value="conc">Concluídos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fResp} onValueChange={setFResp}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos responsáveis</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md border overflow-auto max-h-[calc(100vh-260px)]">
          <table
            className="w-full text-[14px]"
            style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", minWidth: checklistAtivo ? 980 : 1140 }}
          >
            <colgroup>
              <col style={{ width: 52 }} />
              <col style={{ width: "24%", minWidth: 220 }} />
              <col style={{ width: 168, minWidth: 168 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: checklistAtivo ? "26%" : "18%", minWidth: 180 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 48 }} />
              {!checklistAtivo && <col style={{ width: 92 }} />}
              {!checklistAtivo && <col style={{ width: 92 }} />}
              <col style={{ width: 92 }} />
              <col style={{ width: 84 }} />
            </colgroup>
            <thead
              className="sticky top-0 z-20"
              style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
            >
              <tr>
                <Th sticky left={0} zIndex={30}>Cód</Th>
                <Th sticky left={52} zIndex={30}>Empregador</Th>
                <Th>
                  <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                    <span>Responsável</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                          aria-label="Alterar responsável em massa"
                          title="Alterar responsável em massa"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-48 p-1">
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                          Definir p/ todos exibidos
                        </div>
                        {responsaveisAtivos.map((r) => (
                          <button
                            key={r.id}
                            className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                            onClick={() =>
                              setBulkConfirm({ open: true, respId: r.id, respNome: r.nome })
                            }
                          >
                            {r.nome}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </Th>
                <Th>Movimento</Th>
                <Th>Situação</Th>
                <Th>Variável</Th>
                <Th>Obs.</Th>
                {!checklistAtivo && <Th>Folha</Th>}
                {!checklistAtivo && <Th>DAE</Th>}
                <Th>FGTS/DCTFWeb</Th>
                <Th>Concluído</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, e, evs }, idx) => {
                const empregadosDoEmpr = empregadosPorEmpregador.get(e!.id) ?? [];
                const accent = evs[0] ? eventoTipoAccent[evs[0].tipo] : null;
                const bg = idx % 2 === 0 ? "white" : "var(--elite-zebra)";
                const rowStyle: React.CSSProperties = {
                  height: 54,
                  backgroundColor: bg,
                  borderLeft: accent ? `3px solid ${accent}` : "3px solid transparent",
                };
                const fgtsDisabled = e!.eh_domestico && p.status_fgts_dctfweb === "nao_aplicavel";
                const cpfDigits = (e!.documento ?? "").replace(/\D/g, "");
                const hasCpf = cpfDigits.length > 0;
                const semMovComEvento = p.possui_movimento === "sem_movimento" && evs.length > 0;
                const chkRow = chkByEmpregador.get(e!.id) ?? null;
                const chkVisivel = checklistAtivo && chkRow && chkRow.checklist_aplicavel;
                const expanded = expandedId === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr
                      style={{
                        ...rowStyle,
                        backgroundColor: expanded ? "#F0F7FF" : bg,
                        cursor: "pointer",
                      }}
                      className="border-t hover:brightness-95"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                    >
                      <Td sticky left={0} bg={expanded ? "#F0F7FF" : bg}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[13px]">{e!.codigo}</span>
                          <ChevronDown
                            className={`h-4 w-4 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </Td>
                      <Td sticky left={52} bg={expanded ? "#F0F7FF" : bg}>
                        <div className="flex flex-col leading-tight">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="truncate text-[14px] font-bold"
                                style={{ color: "var(--elite-navy)" }}
                              >
                                {e!.nome}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{e!.nome}</TooltipContent>
                          </Tooltip>
                          {hasCpf ? (
                            <button
                              className="mt-0.5 self-start font-mono text-[12px] text-muted-foreground hover:underline"
                              onClick={(evt) => { evt.stopPropagation(); copyToClipboard(cpfDigits); }}
                              title="Clique para copiar"
                            >
                              {maskCpf(cpfDigits)}
                            </button>
                          ) : (
                            <span className="mt-0.5 text-[12px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div onClick={(evt) => evt.stopPropagation()}>
                          <Select
                            value={e!.responsavel_id ?? "none"}
                            onValueChange={(v) =>
                              updateEmpregador.mutate({
                                id: e!.id,
                                patch: { responsavel_id: v === "none" ? null : v },
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {responsaveis
                                .filter((r) => r.ativo !== false || r.id === e!.responsavel_id)
                                .map((r) => (
                                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </Td>
                      <Td>
                        <div onClick={(evt) => evt.stopPropagation()}>
                          <MovimentoChip
                            value={p.possui_movimento}
                            onChange={(v) => update.mutate({ id: p.id, patch: { possui_movimento: v } })}
                          />
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1" onClick={(evt) => evt.stopPropagation()}>
                          {evs.map((ev) => {
                            const c = eventoTipoColor[ev.tipo];
                            const emp = empregadoMap.get(ev.empregado_id);
                            return (
                              <Tooltip key={ev.id}>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-default"
                                    style={{ backgroundColor: c.bg, color: c.fg }}
                                  >
                                    {chipLabel(ev, selected.ano, selected.mes)}
                                    <button
                                      className="ml-0.5 opacity-70 hover:opacity-100"
                                      onClick={(evt) => { evt.stopPropagation(); if (confirm("Remover este evento?")) delEvento.mutate(ev.id); }}
                                      title="Remover"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {emp?.nome ?? "—"} · {eventoTipoLabel[ev.tipo]}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-1.5"
                                onClick={(evt) => {
                                  evt.stopPropagation();
                                  setAddSt({
                                    ...EMPTY_ADD,
                                    open: true,
                                    empregador: e!,
                                    empregados: empregadosDoEmpr,
                                  });
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                          </Popover>
                          {semMovComEvento && (
                            <span className="text-[10px]" style={{ color: "#8a5a00" }} title="Há evento neste mês, revise o movimento">
                              ⚠︎ revisar movimento
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1" onClick={(evt) => evt.stopPropagation()}>
                          <Switch
                            checked={p.tem_variavel}
                            onCheckedChange={(v) => update.mutate({ id: p.id, patch: { tem_variavel: v } })}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {p.tem_variavel ? "Sim" : "Não"}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={(evt) => { evt.stopPropagation(); setObsCalc({ open: true, proc: p, text: p.observacao_calculo ?? "", editing: !p.observacao_calculo }); }}
                          title={p.observacao_calculo ? "Ver/editar observação" : "Adicionar observação"}
                          className="rounded p-1 hover:bg-muted"
                          style={{ color: p.observacao_calculo ? "var(--elite-gold)" : "#9CA3AF" }}
                        >
                          {p.observacao_calculo ? <StickyNote className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </Td>
                      {!checklistAtivo && (
                        <Td>
                          <div onClick={(evt) => evt.stopPropagation()}>
                            <StatusChip
                              value={p.status_folha}
                              onChange={(v) => update.mutate({ id: p.id, patch: { status_folha: v } })}
                            />
                          </div>
                        </Td>
                      )}
                      {!checklistAtivo && (
                        <Td>
                          <div onClick={(evt) => evt.stopPropagation()}>
                            <StatusChip
                              value={p.status_dae}
                              onChange={(v) => update.mutate({ id: p.id, patch: { status_dae: v } })}
                            />
                          </div>
                        </Td>
                      )}
                      <Td>
                        <div onClick={(evt) => evt.stopPropagation()}>
                          <StatusChip
                            value={p.status_fgts_dctfweb}
                            disabled={fgtsDisabled}
                            onChange={(v) => update.mutate({ id: p.id, patch: { status_fgts_dctfweb: v } })}
                          />
                        </div>
                      </Td>
                      <Td>
                        <ConcluidoCell
                          proc={p}
                          chk={chkRow}
                          checklistAtivo={checklistAtivo}
                          onClick={() => setExpandedId(expanded ? null : p.id)}
                        />
                      </Td>
                    </tr>
                    {expanded && chkRow && (
                      <tr className="border-b" style={{ backgroundColor: "#F0F7FF" }}>
                        <td colSpan={colCount} className="p-0">
                          <ChecklistBody
                            status={chkRow}
                            autorNome={
                              e!.responsavel_id
                                ? respNomeMap.get(e!.responsavel_id) ?? null
                                : null
                            }
                            observacaoCalculo={p.observacao_calculo}
                            competenciaFechada={false}
                            onOpenObs={() =>
                              setObsCalc({
                                open: true,
                                proc: p,
                                text: p.observacao_calculo ?? "",
                                editing: !p.observacao_calculo,
                              })
                            }
                            inline
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="p-8 text-center text-muted-foreground">
                    Nenhuma linha para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dialog: adicionar evento */}
        <Dialog open={addSt.open} onOpenChange={(o) => !o && setAddSt(EMPTY_ADD)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Nova situação — {addSt.empregador?.nome}
              </DialogTitle>
            </DialogHeader>
            {addSt.empregados.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-center space-y-2">
                <div className="text-muted-foreground">Nenhum colaborador cadastrado para este empregador.</div>
                <Link
                  to="/empregados"
                  className="inline-block text-xs font-semibold underline"
                  style={{ color: "var(--elite-navy)" }}
                  onClick={() => setAddSt(EMPTY_ADD)}
                >
                  Cadastrar colaborador →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Colaborador</Label>
                  <Select
                    value={addSt.empregadoId}
                    onValueChange={(v) => setAddSt((s) => ({ ...s, empregadoId: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {addSt.empregados.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome}{emp.cargo ? ` — ${emp.cargo}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {TIPO_OPCOES.map((t) => {
                      const c = eventoTipoColor[t];
                      const active = addSt.tipo === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAddSt((s) => ({ ...s, tipo: t }))}
                          className="rounded-md border px-3 py-2 text-sm font-semibold transition"
                          style={{
                            backgroundColor: active ? c.bg : "white",
                            color: c.fg,
                            borderColor: active ? c.fg : "#e5e7eb",
                          }}
                        >
                          {eventoTipoLabel[t]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {addSt.tipo && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">
                        {addSt.tipo === "admissao" ? "Data admissão"
                          : addSt.tipo === "rescisao" ? "Data rescisão"
                          : "Início"}
                      </Label>
                      <Input
                        type="date"
                        value={addSt.dataInicio}
                        onChange={(e) => setAddSt((s) => ({ ...s, dataInicio: e.target.value }))}
                      />
                    </div>
                    {(addSt.tipo === "ferias" || addSt.tipo === "afastamento") && (
                      <div>
                        <Label className="text-xs">Fim</Label>
                        <Input
                          type="date"
                          value={addSt.dataFim}
                          onChange={(e) => setAddSt((s) => ({ ...s, dataFim: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSt(EMPTY_ADD)}>Cancelar</Button>
              {addSt.empregados.length > 0 && (
                <Button
                  disabled={
                    addEvento.isPending || !addSt.empregadoId || !addSt.tipo || !addSt.dataInicio
                  }
                  onClick={() => addEvento.mutate()}
                  style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
                >
                  Salvar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: rescisão do único colaborador */}
        <Dialog
          open={rescisaoConfirm.open}
          onOpenChange={(o) => !o && setRescisaoConfirm({ open: false, empregador: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Único colaborador desligado</DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              A empresa <b>{rescisaoConfirm.empregador?.nome}</b> ficou sem colaboradores ativos.
              Deseja inativar o cadastro da empresa? O histórico é preservado.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRescisaoConfirm({ open: false, empregador: null })}
              >
                Manter ativa
              </Button>
              <Button
                onClick={() => {
                  if (rescisaoConfirm.empregador) {
                    updateEmpregador.mutate(
                      { id: rescisaoConfirm.empregador.id, patch: { status: "inativo" } },
                      {
                        onSuccess: () => {
                          toast.success("Empresa inativada");
                          setRescisaoConfirm({ open: false, empregador: null });
                        },
                      },
                    );
                  }
                }}
                style={{ backgroundColor: "var(--elite-crit)", color: "white" }}
              >
                Inativar empresa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: observação de cálculo */}
        <Dialog
          open={obsCalc.open}
          onOpenChange={(o) =>
            !o && setObsCalc({ open: false, proc: null, text: "", editing: false })
          }
        >
          <DialogContent className="max-w-2xl sm:max-w-2xl flex max-h-[85vh] flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Observação de cálculo</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {obsCalc.editing ? (
                <Textarea
                  autoFocus
                  placeholder="Descreva o procedimento de cálculo desta empresa (passo a passo, se necessário)…"
                  value={obsCalc.text}
                  onChange={(e) => setObsCalc((s) => ({ ...s, text: e.target.value }))}
                  className="min-h-[380px] w-full resize-y text-[14px] leading-[1.5] whitespace-pre-wrap"
                />
              ) : (
                <div className="min-h-[380px] whitespace-pre-wrap rounded-md border p-3 text-[14px] leading-[1.5]">
                  {obsCalc.text || (
                    <span className="text-muted-foreground">Nenhuma observação registrada.</span>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="shrink-0">
              {obsCalc.proc?.observacao_calculo && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (obsCalc.proc) {
                      update.mutate({ id: obsCalc.proc.id, patch: { observacao_calculo: null } });
                    }
                    setObsCalc({ open: false, proc: null, text: "", editing: false });
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Limpar
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  setObsCalc({ open: false, proc: null, text: "", editing: false })
                }
              >
                Cancelar
              </Button>
              {obsCalc.editing ? (
              <Button
                onClick={() => {
                  if (obsCalc.proc) {
                    update.mutate({
                      id: obsCalc.proc.id,
                      patch: { observacao_calculo: obsCalc.text.replace(/\s+$/, "") || null },
                    });
                  }
                  setObsCalc((s) => ({
                    ...s,
                    text: s.text.replace(/\s+$/, ""),
                    editing: false,
                  }));
                }}
                style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
              >
                Salvar
              </Button>
              ) : (
                <Button
                  onClick={() => setObsCalc((s) => ({ ...s, editing: true }))}
                  style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
                >
                  Editar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: bulk responsável */}
        <Dialog
          open={bulkConfirm.open}
          onOpenChange={(o) => !o && setBulkConfirm({ open: false, respId: null, respNome: "" })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar responsável a todos exibidos</DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              Aplicar <b>{bulkConfirm.respNome}</b> como responsável de{" "}
              <b>{rows.length}</b> empregador(es) atualmente exibido(s)?
            </p>
            <p className="text-xs text-muted-foreground">
              Observação: o responsável é dado do cadastro do empregador — a alteração vale para
              todas as competências (atual e futuras).
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkConfirm({ open: false, respId: null, respNome: "" })}
              >
                Cancelar
              </Button>
              <Button
                disabled={bulkResp.isPending || !bulkConfirm.respId}
                onClick={() => {
                  const ids = rows.map((r) => r.e!.id);
                  if (!bulkConfirm.respId || ids.length === 0) return;
                  bulkResp.mutate(
                    { ids, responsavel_id: bulkConfirm.respId },
                    {
                      onSuccess: () => {
                        toast.success(`Responsável aplicado a ${ids.length} empregador(es)`);
                        setBulkConfirm({ open: false, respId: null, respNome: "" });
                      },
                    },
                  );
                }}
                style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function Th({
  children,
  sticky,
  left,
  zIndex,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  left?: number;
  zIndex?: number;
}) {
  const style: React.CSSProperties = {
    padding: "8px 10px",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    overflow: "hidden",
    whiteSpace: "nowrap",
  };
  if (sticky) {
    style.position = "sticky";
    style.left = left ?? 0;
    style.zIndex = zIndex ?? 20;
    style.backgroundColor = "var(--elite-navy)";
  }
  return <th style={style}>{children}</th>;
}

function Td({
  children,
  sticky,
  left,
  bg,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  left?: number;
  bg?: string;
}) {
  const style: React.CSSProperties = {
    padding: "8px 10px",
    verticalAlign: "middle",
    overflow: "hidden",
  };
  if (sticky) {
    style.position = "sticky";
    style.left = left ?? 0;
    style.zIndex = 10;
    style.backgroundColor = bg ?? "white";
  }
  return <td style={style}>{children}</td>;
}

function ConcluidoCell({
  proc,
  chk,
  checklistAtivo,
  onClick,
}: {
  proc: Processamento;
  chk: ChecklistStatusRow | null;
  checklistAtivo: boolean;
  onClick?: () => void;
}) {
  const showChip =
    checklistAtivo && chk && chk.checklist_aplicavel;
  const pendentes =
    showChip && chk ? Math.max(chk.total - chk.concluidos, 0) : 0;
  const bloqueado = !!showChip && !proc.concluido && pendentes > 0;
  return (
    <div className="flex items-center gap-1.5">
      {showChip && chk && (
        <ChecklistChip status={chk} onClick={onClick} />
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="rounded-full px-2 py-0.5 text-[12px] font-bold"
            style={{
              backgroundColor: proc.concluido ? "#DCFCE7" : "#E5E7EB",
              color: proc.concluido ? "#166534" : "#4B5563",
            }}
          >
            {proc.concluido ? "SIM" : "NÃO"}
          </span>
        </TooltipTrigger>
        {bloqueado && (
          <TooltipContent>
            Faltam {pendentes} {pendentes === 1 ? "item" : "itens"} do checklist
            para concluir este empregador
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}