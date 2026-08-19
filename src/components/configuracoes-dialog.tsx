import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Check, X, Plus } from "lucide-react";
import type { Responsavel } from "@/lib/domain";
import { vencimentoDAEIso } from "@/lib/vencimento";
import { useCompetencia } from "@/lib/competencia-context";
import { ChevronRight } from "lucide-react";
import { ChecklistModelsPanel } from "@/components/checklist-models-panel";

interface Configuracao {
  id: number;
  dia_vencimento_dae: number;
  antecipa_dia_nao_util: boolean;
  checklist_ativo: boolean;
  checklist_competencia_inicial_id: string | null;
  feriados_extras: string[] | null;
}

function ResponsaveisSection() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const { data: lista = [] } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Responsavel[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["responsaveis"] });

  const criar = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("responsaveis").insert({ nome });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovo("");
      invalidate();
      toast.success("Responsável adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (p: { id: string; patch: Partial<Responsavel> }) => {
      const { error } = await supabase
        .from("responsaveis")
        .update(p.patch)
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div>
        <div className="text-sm font-semibold" style={{ color: "var(--elite-navy)" }}>
          Responsáveis
        </div>
        <div className="text-xs text-muted-foreground">
          Desativar remove das novas atribuições, mas preserva atribuições e
          marcações já feitas.
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nome do responsável"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && novo.trim()) criar.mutate(novo.trim());
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!novo.trim() || criar.isPending}
          onClick={() => criar.mutate(novo.trim())}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="space-y-1">
        {lista.length === 0 && (
          <li className="text-xs text-muted-foreground">Nenhum responsável.</li>
        )}
        {lista.map((r) => {
          const ativo = r.ativo !== false;
          return (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded border px-2 py-1.5"
            >
              {editId === r.id ? (
                <>
                  <Input
                    className="h-8 flex-1 text-sm"
                    autoFocus
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editNome.trim())
                        atualizar.mutate({ id: r.id, patch: { nome: editNome.trim() } });
                      if (e.key === "Escape") setEditId(null);
                    }}
                  />
                  <button
                    type="button"
                    className="rounded p-1 hover:bg-muted"
                    onClick={() =>
                      editNome.trim() &&
                      atualizar.mutate({ id: r.id, patch: { nome: editNome.trim() } })
                    }
                  >
                    <Check className="h-4 w-4 text-green-700" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 hover:bg-muted"
                    onClick={() => setEditId(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 text-sm ${ativo ? "" : "text-muted-foreground line-through"}`}
                  >
                    {r.nome}
                  </span>
                  <button
                    type="button"
                    className="rounded p-1 hover:bg-muted"
                    title="Editar nome"
                    onClick={() => {
                      setEditId(r.id);
                      setEditNome(r.nome);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      {ativo ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={ativo}
                      onCheckedChange={(v) =>
                        atualizar.mutate({ id: r.id, patch: { ativo: v } })
                      }
                    />
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ConfiguracoesDialog() {
  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState(20);
  const [antecipa, setAntecipa] = useState(true);
  const [extras, setExtras] = useState<string[]>([]);
  const [novoFeriado, setNovoFeriado] = useState("");
  const [view, setView] = useState<"main" | "models">("main");
  const qc = useQueryClient();
  const { refetch } = useCompetencia();

  const { data: cfg } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes" as never)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as Configuracao | null;
    },
  });

  useEffect(() => {
    if (cfg) {
      setDia(cfg.dia_vencimento_dae);
      setAntecipa(cfg.antecipa_dia_nao_util);
      setExtras(cfg.feriados_extras ?? []);
    }
  }, [cfg]);

  const { data: modelosCount = 0 } = useQuery({
    queryKey: ["checklist_modelos_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("checklist_modelos")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
  const { data: modelosAtivosCount = 0 } = useQuery({
    queryKey: ["checklist_modelos_ativos_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("checklist_modelos")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const toggleChecklist = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase
        .from("configuracoes")
        .update({ checklist_ativo: v })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
      qc.invalidateQueries({ queryKey: ["checklist-status"] });
      qc.invalidateQueries({ queryKey: ["processamentos"] });
      toast.success(v ? "Checklist ativado" : "Checklist desativado");
    },
    onError: (e: Error) => {
      const msg = e.message.includes("Abra ao menos")
        ? "Abra ao menos uma competência antes de ativar o checklist"
        : e.message;
      toast.error(msg);
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (dia < 1 || dia > 28) throw new Error("Dia deve estar entre 1 e 28");

      const { error: upErr } = await supabase
        .from("configuracoes" as never)
        .update({
          dia_vencimento_dae: dia,
          antecipa_dia_nao_util: antecipa,
          feriados_extras: extras,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", 1);
      if (upErr) throw upErr;

      // Recalcula vencimento de todas as competências
      const { data: comps, error: cErr } = await supabase
        .from("competencias")
        .select("id, ano, mes");
      if (cErr) throw cErr;

      for (const c of comps ?? []) {
        const novo = vencimentoDAEIso(c.ano, c.mes, dia, antecipa);
        const { error: uErr } = await supabase
          .from("competencias")
          .update({ vencimento_dae: novo })
          .eq("id", c.id);
        if (uErr) throw uErr;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas e vencimentos recalculados");
      qc.invalidateQueries({ queryKey: ["configuracoes"] });
      qc.invalidateQueries({ queryKey: ["competencias"] });
      refetch();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Configurações"
        className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
        style={{ color: "var(--elite-gold)" }}
      >
        <Settings className="h-5 w-5" />
      </button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>
        {view === "models" ? (
          <ChecklistModelsPanel onBack={() => setView("main")} />
        ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="dia-venc">Dia de vencimento do DAE</Label>
            <Input
              id="dia-venc"
              type="number"
              min={1}
              max={28}
              value={dia}
              onChange={(e) => setDia(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">
                Antecipar quando cair em fim de semana/feriado
              </div>
              <div className="text-xs text-muted-foreground">
                Se ligado, usa o último dia útil anterior.
              </div>
            </div>
            <Switch checked={antecipa} onCheckedChange={setAntecipa} />
          </div>
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            O DAE do eSocial Doméstico vence no dia 20 do mês seguinte (regra
            vigente desde março/2024). Se cair em sábado, domingo ou feriado
            nacional, o vencimento é antecipado para o último dia útil anterior.
          </p>

          <div className="rounded-md border p-3 space-y-2">
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--elite-navy)" }}>
                Feriados extras (estaduais / municipais / pontos facultativos)
              </div>
              <div className="text-xs text-muted-foreground">
                Somados aos nacionais no cálculo do 5º dia útil. Já inclusos: 03/10 (RN),
                21/11 e 08/12 (Natal).
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={novoFeriado}
                onChange={(e) => setNovoFeriado(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!novoFeriado) return;
                  setExtras((prev) => (prev.includes(novoFeriado) ? prev : [...prev, novoFeriado].sort()));
                  setNovoFeriado("");
                }}
              >
                Adicionar
              </Button>
            </div>
            {extras.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum feriado extra.</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {extras.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtras((prev) => prev.filter((x) => x !== d))}
                    className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                    title="Remover"
                  >
                    {d.split("-").reverse().join("/")} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <ResponsaveisSection />

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--elite-navy)" }}>
                  Checklist de processos
                </div>
                <div className="text-xs text-muted-foreground">
                  Passo a passo de conferência por empregador.
                </div>
              </div>
              <Switch
                checked={!!cfg?.checklist_ativo}
                disabled={toggleChecklist.isPending}
                onCheckedChange={(v) => toggleChecklist.mutate(v)}
              />
            </div>
            {cfg?.checklist_ativo && (
              <>
                {modelosAtivosCount === 0 && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
                    Nenhum modelo ativo. O checklist não vai aparecer no painel
                    até você ativar ou criar um.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setView("models")}
                  className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted transition"
                >
                  <span className="flex-1 font-medium">Modelos de checklist</span>
                  <span className="text-xs text-muted-foreground">
                    {modelosCount} {modelosCount === 1 ? "modelo" : "modelos"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </div>
        )}
        {view === "main" && (
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={salvar.isPending}
            onClick={() => salvar.mutate()}
            style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
          >
            {salvar.isPending ? "Salvando..." : "Salvar e recalcular vencimentos"}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}