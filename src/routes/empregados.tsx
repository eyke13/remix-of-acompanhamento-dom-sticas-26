import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Empregado,
  type Empregador,
  type Responsavel,
  empregadoSituacaoLabel,
  empregadoSituacaoColor,
  maskDoc,
} from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, CalendarClock, Ban, Building2, Plus, FolderArchive } from "lucide-react";
import { EmpregadoForm } from "@/components/empregado-form";
import { EmpregadorForm } from "@/components/empregador-form";
import { EventosDialog } from "@/components/eventos-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/empregados")({
  component: EmpregadosPage,
  head: () => ({ meta: [{ title: "Empregados — Elite" }] }),
});

const situacaoOrder: Record<string, number> = {
  ativo: 0,
  ferias: 1,
  afastado: 2,
  aviso_previo: 3,
  desligado: 4,
};

function EmpregadosPage() {
  const qc = useQueryClient();

  const { data: empregadores = [] } = useQuery({
    queryKey: ["empregadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empregadores").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as Empregador[];
    },
  });

  const { data: empregados = [] } = useQuery({
    queryKey: ["empregados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empregados").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Empregado[];
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
  const respMap = new Map(responsaveis.map((r) => [r.id, r]));

  const [fSituacao, setFSituacao] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Empregado | null>(null);
  const [eventosOf, setEventosOf] = useState<Empregado | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Empregador | null>(null);
  const [newForEmpresa, setNewForEmpresa] = useState<string | null>(null);
  const [openNewEmpresa, setOpenNewEmpresa] = useState(false);
  const [desligarOf, setDesligarOf] = useState<Empregado | null>(null);
  const [desligarMotivo, setDesligarMotivo] = useState<"rescisao" | "erro">("rescisao");
  const [desligarData, setDesligarData] = useState<string>("");
  const [confirmInativarEmpresa, setConfirmInativarEmpresa] = useState<Empregador | null>(null);

  const rescindir = useMutation({
    mutationFn: async ({ emp, data }: { emp: Empregado; data: string }) => {
      const { error } = await supabase
        .from("empregados")
        .update({ situacao: "desligado", data_desligamento: data })
        .eq("id", emp.id);
      if (error) throw error;
      await supabase.from("eventos_dp").insert({
        empregado_id: emp.id,
        tipo: "rescisao",
        data_inicio: data,
      });
      return emp;
    },
    onSuccess: (emp) => {
      toast.success("Empregado desligado");
      qc.invalidateQueries({ queryKey: ["empregados"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
      const empresa = empregadores.find((e) => e.id === emp.empregador_id);
      const ativosRestantes = empregados.filter(
        (x) => x.empregador_id === emp.empregador_id && x.id !== emp.id && x.situacao === "ativo",
      ).length;
      if (empresa && empresa.status === "ativo" && ativosRestantes === 0) {
        setConfirmInativarEmpresa(empresa);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerCadastro = useMutation({
    mutationFn: async (emp: Empregado) => {
      await supabase.from("eventos_dp").delete().eq("empregado_id", emp.id);
      const { error } = await supabase.from("empregados").delete().eq("id", emp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro removido");
      qc.invalidateQueries({ queryKey: ["empregados"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inativarEmpresa = useMutation({
    mutationFn: async (emp: Empregador) => {
      const { error } = await supabase
        .from("empregadores")
        .update({ status: "inativo" })
        .eq("id", emp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa inativada");
      qc.invalidateQueries({ queryKey: ["empregadores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const empregadorById = useMemo(() => {
    const map = new Map<string, Empregador>();
    for (const emp of empregadores) map.set(emp.id, emp);
    return map;
  }, [empregadores]);

  const grouped = useMemo(() => {
    const norm = (s: unknown) =>
      (s ?? "").toString()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim().replace(/\s+/g, " ");
    const digits = (s: unknown) => (s ?? "").toString().replace(/\D/g, "");
    const rawTerm = search.trim();
    const qNorm = norm(rawTerm);
    const qDigits = digits(rawTerm);
    const hasQuery = qNorm.length > 0;

    const empregadoMatches = (e: Empregado) => {
      if (!hasQuery) return true;
      if (norm(e.nome).includes(qNorm)) return true;
      if (norm(e.cargo).includes(qNorm)) return true;
      if (norm(e.situacao).includes(qNorm)) return true;
      if (norm(empregadoSituacaoLabel[e.situacao]).includes(qNorm)) return true;
      if (norm((e as unknown as { observacoes?: string }).observacoes).includes(qNorm)) return true;
      if (qDigits && digits(e.cpf).includes(qDigits)) return true;
      return false;
    };

    const empresaMatches = (emp: Empregador | undefined) => {
      if (!hasQuery) return true;
      if (!emp) return false;
      if (norm(emp.nome).includes(qNorm)) return true;
      const codeStr = (emp.codigo ?? "").toString();
      if (norm(codeStr).includes(qNorm.replace(/^#/, ""))) return true;
      if (qDigits && digits(codeStr).includes(qDigits)) return true;
      if (qDigits && digits(emp.documento).includes(qDigits)) return true;
      if (norm(emp.status).includes(qNorm)) return true;
      if (norm((emp as unknown as { canal_dados?: string }).canal_dados).includes(qNorm)) return true;
      if (norm((emp as unknown as { email?: string }).email).includes(qNorm)) return true;
      if (qDigits && digits((emp as unknown as { telefone?: string }).telefone).includes(qDigits)) return true;
      if (norm((emp as unknown as { telefone?: string }).telefone).includes(qNorm)) return true;
      if (norm((emp as unknown as { observacoes_fixas?: string }).observacoes_fixas).includes(qNorm)) return true;
      const resp = emp.responsavel_id ? respMap.get(emp.responsavel_id) : null;
      if (resp && norm(resp.nome).includes(qNorm)) return true;
      return false;
    };

    const map = new Map<string, Empregado[]>();
    for (const emp of empregadores) {
      const colaboradores = empregados.filter((e) => e.empregador_id === emp.id);
      const empHit = empresaMatches(emp);
      const filtBySit = (arr: Empregado[]) =>
        fSituacao === "all" ? arr : arr.filter((e) => e.situacao === fSituacao);

      let listToShow: Empregado[] | null = null;
      if (empHit) {
        // empresa casou: mostra todos os colaboradores (respeitando filtro de situação)
        listToShow = filtBySit(colaboradores);
        // se filtro de situação eliminou todos mas empresa casou e não há busca por colaborador, ainda mostra grupo vazio
      } else {
        const matched = filtBySit(colaboradores).filter(empregadoMatches);
        if (matched.length > 0) listToShow = filtBySit(colaboradores);
      }

      if (listToShow === null) continue;
      // Aplica filtro de situação (nunca mostra empregado fora do filtro)
      map.set(emp.id, listToShow);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        const s = (situacaoOrder[a.situacao] ?? 9) - (situacaoOrder[b.situacao] ?? 9);
        if (s !== 0) return s;
        return a.nome.localeCompare(b.nome);
      });
    }
    return map;
  }, [empregados, empregadores, fSituacao, search, respMap]);

  const totalFiltered = Array.from(grouped.values()).reduce((s, a) => s + a.length, 0);

  const mainEmpregadores = useMemo(
    () => empregadores.filter((e) => e.status !== "ex_cliente"),
    [empregadores],
  );
  const exClienteEmpregadores = useMemo(
    () => empregadores.filter((e) => e.status === "ex_cliente"),
    [empregadores],
  );

  const mainVisible = mainEmpregadores.filter((e) => grouped.has(e.id));
  const exVisible = exClienteEmpregadores.filter((e) => grouped.has(e.id));
  const mainTotal = mainVisible.reduce((s, e) => s + (grouped.get(e.id)?.length ?? 0), 0);
  const mainEmpregadosTotal = empregados.filter((e) => {
    const emp = empregadorById.get(e.empregador_id);
    return emp?.status !== "ex_cliente";
  }).length;
  const hasQuery = search.trim().length > 0;

  const renderEmpresaItem = (emp: Empregador, opts: { faded?: boolean } = {}) => {
    const list = grouped.get(emp.id) ?? [];
    const ativos = list.filter((e) => e.situacao === "ativo").length;
    const resp = emp.responsavel_id ? respMap.get(emp.responsavel_id) : null;
    const faded = opts.faded;
    const statusBg =
      emp.status === "ativo" ? "#DCFCE7" : emp.status === "ex_cliente" ? "#E5E7EB" : "#F3F4F6";
    const statusFg =
      emp.status === "ativo" ? "#166534" : emp.status === "ex_cliente" ? "#4B5563" : "#374151";
    return (
      <AccordionItem
        key={emp.id}
        value={emp.id}
        className={`rounded-md border ${faded ? "bg-muted/40" : "bg-white"}`}
        style={{ borderLeft: `4px solid ${faded ? "#9CA3AF" : "var(--elite-navy)"}`, opacity: faded ? 0.75 : 1 }}
      >
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
            <div className="flex flex-1 flex-wrap items-center gap-3 text-left">
              <Building2 className="h-4 w-4" style={{ color: faded ? "#9CA3AF" : "var(--elite-gold)" }} />
              <span className="font-mono text-xs text-muted-foreground">#{emp.codigo}</span>
              <span className="font-bold" style={{ color: faded ? "#4B5563" : "var(--elite-navy)" }}>{emp.nome}</span>
              {emp.documento && (
                <span className="font-mono text-xs text-muted-foreground">
                  {maskDoc(emp.documento, emp.tipo_documento ?? "CPF")}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{resp?.nome ?? "sem responsável"}</span>
              <Badge
                variant="outline"
                style={{ backgroundColor: statusBg, color: statusFg, borderColor: "transparent" }}
              >
                {emp.status === "ex_cliente" ? "ex-cliente" : emp.status}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {list.length} colaborador{list.length === 1 ? "" : "es"}
                {ativos > 0 && ` · ${ativos} ativo${ativos === 1 ? "" : "s"}`}
              </span>
            </div>
          </AccordionTrigger>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setEditingEmpresa(emp); }}
            title="Editar empresa"
          >
            <Pencil className="h-3 w-3 mr-1" /> empresa
          </Button>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); setNewForEmpresa(emp.id); }}
            style={{ backgroundColor: "var(--elite-gold)", color: "var(--elite-navy)" }}
            className="font-bold"
            title="Novo colaborador"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <AccordionContent className="px-0 pb-0">
          {list.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Nenhum colaborador cadastrado.
            </div>
          ) : (
            <table className="w-full text-sm elite-zebra">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">Cargo</th>
                  <th className="p-2 text-left">Admissão</th>
                  <th className="p-2 text-right">Salário</th>
                  <th className="p-2 text-left">Situação</th>
                  <th className="p-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const c = empregadoSituacaoColor[e.situacao];
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="p-2 font-semibold" style={{ color: "var(--elite-navy)" }}>{e.nome}</td>
                      <td className="p-2">{e.cargo ?? "—"}</td>
                      <td className="p-2 text-xs">
                        {e.data_admissao ? new Date(e.data_admissao + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {e.salario_base != null
                          ? e.salario_base.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : "—"}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant="outline"
                          style={{ backgroundColor: c.bg, color: c.fg, borderColor: "transparent" }}
                        >
                          {empregadoSituacaoLabel[e.situacao]}
                        </Badge>
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" title="Eventos" onClick={() => setEventosOf(e)}>
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => setEditing(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {e.situacao !== "desligado" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Desligar"
                            onClick={() => {
                              setDesligarOf(e);
                              setDesligarMotivo("rescisao");
                              setDesligarData(new Date().toISOString().slice(0, 10));
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--elite-navy)" }}>Empregados</h1>
          <p className="text-sm text-muted-foreground">
            {mainTotal} de {mainEmpregadosTotal} · {mainVisible.length} de {mainEmpregadores.length} empresas
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: "var(--elite-gold)", color: "var(--elite-navy)" }} className="font-bold hover:opacity-90">
              + Novo empregado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Novo empregado</DialogTitle></DialogHeader>
            <EmpregadoForm
              initial={null}
              empregadores={empregadores}
              onSaved={() => setOpenNew(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={openNewEmpresa} onOpenChange={setOpenNewEmpresa}>
          <DialogTrigger asChild>
            <Button variant="outline" style={{ borderColor: "var(--elite-navy)", color: "var(--elite-navy)" }} className="font-bold">
              + Nova empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Nova empresa</DialogTitle></DialogHeader>
            <EmpregadorForm
              initial={null}
              responsaveis={responsaveis}
              onSaved={() => setOpenNewEmpresa(false)}
              onExistingFound={(emp) => {
                setOpenNewEmpresa(false);
                setEditingEmpresa(emp);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="grid gap-2 p-4 md:grid-cols-2">
          <Input placeholder="Buscar por nome, CPF, cargo ou código da empresa…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={fSituacao} onValueChange={setFSituacao}>
            <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas situações</SelectItem>
              {Object.entries(empregadoSituacaoLabel).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {mainVisible.map((emp) => renderEmpresaItem(emp))}
        {empregadores.length === 0 && (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            Nenhuma empresa cadastrada.
          </div>
        )}
      </Accordion>

      {exClienteEmpregadores.length > 0 && (
        <Accordion
          type="single"
          collapsible
          className="mt-4"
          value={hasQuery && exVisible.length > 0 ? "ex" : undefined}
        >
          <AccordionItem
            value="ex"
            className="rounded-md border bg-muted/30"
            style={{ borderLeft: "4px solid #9CA3AF" }}
          >
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <div className="flex flex-1 items-center gap-2 text-left">
                <FolderArchive className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-muted-foreground">
                  Ex-clientes ({exVisible.length}
                  {hasQuery && exVisible.length !== exClienteEmpregadores.length
                    ? ` de ${exClienteEmpregadores.length}`
                    : ""})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2">
              {exVisible.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {hasQuery ? "Nenhum ex-cliente casou com a busca." : "Nenhum ex-cliente."}
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {exVisible.map((emp) => renderEmpresaItem(emp, { faded: true }))}
                </Accordion>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Editar empregado</DialogTitle></DialogHeader>
          {editing && (
            <EmpregadoForm
              initial={editing}
              empregadores={empregadores}
              onSaved={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!newForEmpresa} onOpenChange={(v) => !v && setNewForEmpresa(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Novo colaborador</DialogTitle></DialogHeader>
          {newForEmpresa && (
            <EmpregadoForm
              initial={null}
              fixedEmpregadorId={newForEmpresa}
              empregadores={empregadores}
              onSaved={() => setNewForEmpresa(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEmpresa} onOpenChange={(v) => !v && setEditingEmpresa(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Editar empresa</DialogTitle></DialogHeader>
          {editingEmpresa && (
            <EmpregadorForm
              initial={editingEmpresa}
              responsaveis={responsaveis}
              onSaved={() => setEditingEmpresa(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <EventosDialog
        empregado={eventosOf}
        open={!!eventosOf}
        onOpenChange={(v) => !v && setEventosOf(null)}
      />

      <Dialog open={!!desligarOf} onOpenChange={(v) => !v && setDesligarOf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desligar {desligarOf?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Qual o motivo?</Label>
              <RadioGroup value={desligarMotivo} onValueChange={(v) => setDesligarMotivo(v as "rescisao" | "erro")}>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="rescisao" id="mot-rescisao" className="mt-1" />
                  <Label htmlFor="mot-rescisao" className="cursor-pointer font-normal">
                    <span className="font-bold">Rescisão</span> — demissão real; gera evento e destaca a empresa no Painel.
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="erro" id="mot-erro" className="mt-1" />
                  <Label htmlFor="mot-erro" className="cursor-pointer font-normal">
                    <span className="font-bold">Erro cadastral</span> — remove o cadastro sem sinalizar demissão.
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {desligarMotivo === "rescisao" && (
              <div>
                <Label>Data do desligamento</Label>
                <Input type="date" value={desligarData} onChange={(e) => setDesligarData(e.target.value)} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDesligarOf(null)}>Cancelar</Button>
              <Button
                style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
                disabled={rescindir.isPending || removerCadastro.isPending}
                onClick={() => {
                  if (!desligarOf) return;
                  if (desligarMotivo === "rescisao") {
                    if (!desligarData) { toast.error("Informe a data"); return; }
                    rescindir.mutate({ emp: desligarOf, data: desligarData }, {
                      onSettled: () => setDesligarOf(null),
                    });
                  } else {
                    if (!confirm("Remover este cadastro criado por erro? Esta ação não gera sinalização de rescisão.")) return;
                    removerCadastro.mutate(desligarOf, {
                      onSettled: () => setDesligarOf(null),
                    });
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmInativarEmpresa} onOpenChange={(v) => !v && setConfirmInativarEmpresa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Único colaborador desligado</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            A empresa <strong>{confirmInativarEmpresa?.nome}</strong> ficou sem colaboradores ativos. Deseja inativar o cadastro da empresa?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmInativarEmpresa(null)}>Manter ativa</Button>
            <Button
              style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
              onClick={() => {
                if (confirmInativarEmpresa) inativarEmpresa.mutate(confirmInativarEmpresa);
                setConfirmInativarEmpresa(null);
              }}
            >
              Inativar empresa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
