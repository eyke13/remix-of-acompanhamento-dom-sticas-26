import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  StickyNote,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";
export type ChecklistSituacao =
  | "fora_do_corte"
  | "movimento_indefinido"
  | "sem_itens"
  | "pendente"
  | "checklist_completo";

export interface ChecklistStatusRow {
  empregador_id: string;
  competencia_id: string;
  checklist_aplicavel: boolean;
  movimento_indefinido: boolean;
  total: number;
  concluidos: number;
  tem_marcacao: boolean;
  divergente: boolean;
  pode_reaplicar_silencioso: boolean;
  situacao: string;
}

interface ChecklistItem {
  id: string;
  empregador_id: string;
  competencia_id: string;
  ordem: number;
  texto: string;
  obrigatorio: boolean;
  sistema: boolean;
  origem_modelo_nome: string | null;
  origem_camada: string;
  origem_item_empresa_id: string | null;
  concluido: boolean;
  concluido_em: string | null;
  concluido_por: string | null;
  concluido_por_nome: string | null;
  obs_visualizada_em: string | null;
}

interface ItemEmpresa {
  id: string;
  empregador_id: string;
  ordem: number;
  texto: string;
  obrigatorio: boolean;
}

const CHIP_STYLE: Record<
  ChecklistSituacao,
  { bg: string; fg: string; tip: string }
> = {
  fora_do_corte: { bg: "#E5E7EB", fg: "#6B7280", tip: "Checklist fora do corte" },
  movimento_indefinido: {
    bg: "#E5E7EB",
    fg: "#4B5563",
    tip: "Defina o movimento para carregar o restante do checklist",
  },
  sem_itens: {
    bg: "#E5E7EB",
    fg: "#4B5563",
    tip: "Nenhum modelo de checklist se aplica a este empregador",
  },
  pendente: { bg: "#FEF3C7", fg: "#92400E", tip: "Checklist pendente" },
  checklist_completo: { bg: "#DCFCE7", fg: "#166534", tip: "Checklist completo" },
};


export function ChecklistChip({
  status,
  onClick,
}: {
  status: ChecklistStatusRow;
  onClick?: () => void;
}) {
  const sit = status.situacao as ChecklistSituacao;
  const style = CHIP_STYLE[sit] ?? CHIP_STYLE.pendente;
  const label = `${status.concluidos}/${status.total}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none"
          style={{ backgroundColor: style.bg, color: style.fg }}
        >
          {status.divergente && <AlertTriangle className="h-3 w-3" />}
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {status.divergente
          ? "A categoria mudou — o checklist aplicado pode estar desatualizado"
          : style.tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function ChecklistBody({
  status,
  autorNome,
  observacaoCalculo,
  competenciaFechada,
  onOpenObs,
  inline = false,
}: {
  status: ChecklistStatusRow;
  autorNome: string | null;
  observacaoCalculo: string | null;
  competenciaFechada: boolean;
  onOpenObs?: () => void;
  inline?: boolean;
}) {
  const qc = useQueryClient();
  const autor = (autorNome ?? "").trim() || "—";
  const [confirmReapply, setConfirmReapply] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["checklist", status.empregador_id, status.competencia_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_competencia_itens")
        .select("*")
        .eq("empregador_id", status.empregador_id)
        .eq("competencia_id", status.competencia_id)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
  });

  const { data: itensEmpresa = [] } = useQuery({
    queryKey: ["checklist_itens_empresa", status.empregador_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_itens_empresa")
        .select("*")
        .eq("empregador_id", status.empregador_id)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemEmpresa[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({
      queryKey: ["checklist", status.empregador_id, status.competencia_id],
    });
    qc.invalidateQueries({
      queryKey: ["checklist_itens_empresa", status.empregador_id],
    });
    qc.invalidateQueries({ queryKey: ["processamentos", status.competencia_id] });
    qc.invalidateQueries({ queryKey: ["checklist-status", status.competencia_id] });
  };

  async function sincronizar() {
    const { error } = await supabase.rpc("aplicar_checklist_competencia", {
      p_empregador_id: status.empregador_id,
      p_competencia_id: status.competencia_id,
      p_forcar: false,
    });
    if (error) throw error;
  }

  const setConcluido = useMutation({
    mutationFn: async ({
      item,
      desired,
    }: {
      item: ChecklistItem;
      desired: boolean;
    }) => {
      const patch = desired
        ? {
            concluido: true,
            concluido_em: new Date().toISOString(),
            concluido_por_nome: autor,
          }
        : { concluido: false, concluido_em: null, concluido_por_nome: null };
      const { error } = await supabase
        .from("checklist_competencia_itens")
        .update(patch)
        .eq("id", item.id);
      if (error) throw error;
    },
    onMutate: async ({ item, desired }) => {
      const key = ["checklist", status.empregador_id, status.competencia_id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ChecklistItem[]>(key);
      qc.setQueryData<ChecklistItem[]>(key, (old) =>
        (old ?? []).map((it) =>
          it.id === item.id
            ? {
                ...it,
                concluido: desired,
                concluido_por_nome: desired ? autor : null,
                concluido_em: desired ? new Date().toISOString() : null,
              }
            : it,
        ),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(
          ["checklist", status.empregador_id, status.competencia_id],
          ctx.prev,
        );
      }
      toast.error(e.message);
    },
    onSuccess: invalidateAll,
  });

  const markObsVisualizada = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_competencia_itens")
        .update({ obs_visualizada_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const addEmpresa = useMutation({
    mutationFn: async (texto: string) => {
      const ordem =
        (itensEmpresa.reduce((m, i) => Math.max(m, i.ordem), 0) || 0) + 1;
      const { error } = await supabase
        .from("checklist_itens_empresa")
        .insert({ empregador_id: status.empregador_id, texto, ordem });
      if (error) throw error;
      await sincronizar();
    },
    onSuccess: () => {
      setNovoTexto("");
      invalidateAll();
      toast.success("Item da empresa adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updEmpresa = useMutation({
    mutationFn: async ({ id, texto }: { id: string; texto: string }) => {
      const { error } = await supabase
        .from("checklist_itens_empresa")
        .update({ texto })
        .eq("id", id);
      if (error) throw error;
      await sincronizar();
    },
    onSuccess: () => {
      setEditKey(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delEmpresa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_itens_empresa")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await sincronizar();
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Item removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveEmpresa = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const list = [...itensEmpresa].sort((a, b) => a.ordem - b.ordem);
      const idx = list.findIndex((i) => i.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= list.length) return;
      [list[idx], list[j]] = [list[j], list[idx]];
      for (let k = 0; k < list.length; k++) {
        const { error } = await supabase
          .from("checklist_itens_empresa")
          .update({ ordem: -(k + 1000) })
          .eq("id", list[k].id);
        if (error) throw error;
      }
      for (let k = 0; k < list.length; k++) {
        const { error } = await supabase
          .from("checklist_itens_empresa")
          .update({ ordem: k + 1 })
          .eq("id", list[k].id);
        if (error) throw error;
      }
      await sincronizar();
    },
    onSuccess: invalidateAll,
    onError: (e: Error) => toast.error(e.message),
  });

  const reaplicar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("aplicar_checklist_competencia", {
        p_empregador_id: status.empregador_id,
        p_competencia_id: status.competencia_id,
        p_forcar: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Checklist reaplicado");
      setConfirmReapply(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const readOnly = competenciaFechada;
  const empresaIds = useMemo(
    () => new Set(itensEmpresa.map((i) => i.id)),
    [itensEmpresa],
  );

  return (
    <div className={`flex flex-col ${inline ? "" : "max-h-[70vh]"}`}>
      <div className="border-b px-3 py-2">
        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
          Checklist · {status.concluidos}/{status.total}
        </div>
        {status.divergente && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
            <AlertTriangle className="h-3 w-3" /> Categoria mudou — modelo pode
            estar desatualizado
          </div>
        )}
      </div>

      <div className={`flex-1 px-3 py-2 ${inline ? "" : "overflow-auto"}`}>
        {isLoading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Nenhum item de checklist.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const isSistema = it.sistema;
              const hasObs = !!(observacaoCalculo && observacaoCalculo.trim());
              const obsLocked = isSistema && hasObs && !it.obs_visualizada_em;
              const disabled = readOnly || obsLocked;
              
              const isEmpresa =
                !!it.origem_item_empresa_id && empresaIds.has(it.origem_item_empresa_id);
              const editing = editKey === it.origem_item_empresa_id && isEmpresa;
              const empIdx = isEmpresa
                ? [...itensEmpresa]
                    .sort((a, b) => a.ordem - b.ordem)
                    .findIndex((i) => i.id === it.origem_item_empresa_id)
                : -1;
              return (
                <li
                  key={it.id}
                  className="flex items-start gap-2 rounded border p-2"
                  style={
                    isSistema
                      ? { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }
                      : isEmpresa
                        ? { backgroundColor: "#F5F7FF", borderColor: "#C7D2FE" }
                        : undefined
                  }
                >
                  <div className="pt-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Checkbox
                            checked={it.concluido}
                            disabled={disabled}
                            onCheckedChange={(v) =>
                              setConcluido.mutate({
                                item: it,
                                desired: v === true,
                              })
                            }
                          />
                        </span>
                      </TooltipTrigger>
                      {obsLocked && (
                        <TooltipContent>
                          Abra as observações de cálculo para liberar
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      {isSistema && (
                        <StickyNote
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                          style={{ color: "#B45309" }}
                        />
                      )}
                      {editing ? (
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            className="h-7 text-[13px]"
                            value={editTexto}
                            autoFocus
                            onChange={(e) => setEditTexto(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editTexto.trim()) {
                                updEmpresa.mutate({
                                  id: it.origem_item_empresa_id!,
                                  texto: editTexto.trim(),
                                });
                              }
                              if (e.key === "Escape") setEditKey(null);
                            }}
                          />
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-muted"
                            onClick={() =>
                              editTexto.trim() &&
                              updEmpresa.mutate({
                                id: it.origem_item_empresa_id!,
                                texto: editTexto.trim(),
                              })
                            }
                          >
                            <Check className="h-3.5 w-3.5 text-green-700" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-muted"
                            onClick={() => setEditKey(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[13px] leading-snug">
                          {it.texto}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {isEmpresa && !readOnly && !editing && (
                        <>
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                            disabled={empIdx <= 0}
                            title="Subir"
                            onClick={() =>
                              moveEmpresa.mutate({
                                id: it.origem_item_empresa_id!,
                                dir: -1,
                              })
                            }
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                            disabled={empIdx === itensEmpresa.length - 1}
                            title="Descer"
                            onClick={() =>
                              moveEmpresa.mutate({
                                id: it.origem_item_empresa_id!,
                                dir: 1,
                              })
                            }
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-muted"
                            title="Editar"
                            onClick={() => {
                              setEditKey(it.origem_item_empresa_id!);
                              setEditTexto(it.texto);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-muted"
                            title="Excluir"
                            onClick={() => {
                              if (confirm("Excluir este item da empresa?"))
                                delEmpresa.mutate(it.origem_item_empresa_id!);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                    {isSistema && hasObs && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenObs?.();
                          if (!it.obs_visualizada_em) {
                            markObsVisualizada.mutate(it.id);
                          }
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold underline"
                        style={{ color: "var(--elite-navy)" }}
                      >
                        <FileText className="h-3 w-3" /> Abrir observações de
                        cálculo
                      </button>
                    )}
                    {it.concluido && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {it.concluido_por_nome?.trim() || "—"}
                        {it.concluido_em
                          ? ` · ${new Date(it.concluido_em).toLocaleDateString("pt-BR")}`
                          : ""}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!readOnly && (
        <div className="border-t px-3 py-2 space-y-2">
          <div className="flex items-center gap-1">
            <Input
              className="h-7 flex-1 text-[12px]"
              placeholder="Novo item só desta empresa"
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novoTexto.trim()) {
                  addEmpresa.mutate(novoTexto.trim());
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              disabled={!novoTexto.trim() || addEmpresa.isPending}
              onClick={() => addEmpresa.mutate(novoTexto.trim())}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {status.divergente && (
            <Button
              size="sm"
              className="h-7 text-[11px]"
              style={{
                backgroundColor: "var(--elite-gold)",
                color: "var(--elite-navy)",
              }}
              onClick={() => {
                if (status.tem_marcacao) setConfirmReapply(true);
                else reaplicar.mutate();
              }}
            >
              Reaplicar modelo
            </Button>
          )}
        </div>
      )}

      <Dialog open={confirmReapply} onOpenChange={setConfirmReapply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reaplicar modelo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Isto substituirá os itens herdados de categoria/geral pelo modelo
            aplicável agora. As marcações desses itens serão perdidas. Os itens
            específicos da empresa e suas marcações são preservados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReapply(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => reaplicar.mutate()}
              disabled={reaplicar.isPending}
              style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
            >
              Reaplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
