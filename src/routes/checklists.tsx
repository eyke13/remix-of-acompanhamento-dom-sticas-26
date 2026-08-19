import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Pencil,
} from "lucide-react";
import type { Empregador } from "@/lib/domain";

export const Route = createFileRoute("/checklists")({
  component: ChecklistsPage,
  head: () => ({ meta: [{ title: "Modelos de checklist" }] }),
});

type Escopo = "global" | "categoria" | "empregador";
type Categoria =
  | "com_movimento"
  | "sem_movimento"
  | "admissao"
  | "rescisao"
  | "ferias"
  | "segunda_folha";

interface Modelo {
  id: string;
  nome: string;
  escopo: Escopo;
  categoria_tipo: Categoria | null;
  ativo: boolean;
  prioridade: number;
  somar_ao_geral: boolean;
}

interface ModeloItem {
  id: string;
  modelo_id: string;
  ordem: number;
  texto: string;
  obrigatorio: boolean;
}

interface ModeloEmpregador {
  modelo_id: string;
  empregador_id: string;
}

const CATEGORIA_LABEL: Record<Categoria, string> = {
  com_movimento: "Com movimento",
  sem_movimento: "Sem movimento",
  admissao: "Admissão",
  rescisao: "Rescisão",
  ferias: "Férias",
  segunda_folha: "Segunda folha",
};

const ESCOPO_LABEL: Record<Escopo, string> = {
  global: "Global",
  categoria: "Categoria",
  empregador: "Empregador",
};

function ChecklistsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Modelo | null>(null);

  const { data: modelos = [] } = useQuery({
    queryKey: ["checklist_modelos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelos")
        .select("*")
        .order("escopo")
        .order("prioridade")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Modelo[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_modelos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo excluído");
      qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("checklist_modelos")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist_modelos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicar = useMutation({
    mutationFn: async (m: Modelo) => {
      const { data: novoModelo, error: e1 } = await supabase
        .from("checklist_modelos")
        .insert({
          nome: `${m.nome} (cópia)`,
          escopo: m.escopo,
          categoria_tipo: m.categoria_tipo,
          ativo: false,
          prioridade: m.prioridade,
          somar_ao_geral: m.somar_ao_geral,
        })
        .select()
        .single();
      if (e1) throw e1;
      const { data: itens, error: e2 } = await supabase
        .from("checklist_modelo_itens")
        .select("*")
        .eq("modelo_id", m.id);
      if (e2) throw e2;
      if (itens && itens.length > 0) {
        const { error: e3 } = await supabase
          .from("checklist_modelo_itens")
          .insert(
            itens.map((i) => ({
              modelo_id: (novoModelo as Modelo).id,
              ordem: i.ordem,
              texto: i.texto,
              obrigatorio: i.obrigatorio,
            })),
          );
        if (e3) throw e3;
      }
      return novoModelo as Modelo;
    },
    onSuccess: () => {
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--elite-navy)" }}>
          Modelos de checklist
        </h1>
        <Button
          onClick={() =>
            setEditing({
              id: "",
              nome: "",
              escopo: "global",
              categoria_tipo: null,
              ativo: false,
              prioridade: 0,
              somar_ao_geral: false,
            })
          }
          style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
        >
          <Plus className="h-4 w-4 mr-1" /> Novo modelo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead
              style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
            >
              <tr>
                <th className="p-2 text-left text-xs uppercase">Nome</th>
                <th className="p-2 text-left text-xs uppercase">Escopo</th>
                <th className="p-2 text-left text-xs uppercase">Categoria</th>
                <th className="p-2 text-left text-xs uppercase">Somar ao geral</th>
                <th className="p-2 text-center text-xs uppercase">Ativo</th>
                <th className="p-2 text-right text-xs uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((m, i) => (
                <tr
                  key={m.id}
                  className="border-t"
                  style={{
                    backgroundColor: i % 2 ? "var(--elite-zebra)" : "white",
                  }}
                >
                  <td className="p-2 font-semibold">{m.nome}</td>
                  <td className="p-2">{ESCOPO_LABEL[m.escopo]}</td>
                  <td className="p-2">
                    {m.categoria_tipo
                      ? CATEGORIA_LABEL[m.categoria_tipo]
                      : "—"}
                  </td>
                  <td className="p-2">
                    {m.somar_ao_geral ? "Sim" : "Não"}
                  </td>
                  <td className="p-2 text-center">
                    <Switch
                      checked={m.ativo}
                      onCheckedChange={(v) =>
                        toggleAtivo.mutate({ id: m.id, ativo: v })
                      }
                    />
                  </td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicar.mutate(m)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Excluir modelo "${m.nome}"?`))
                            del.mutate(m.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {modelos.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Nenhum modelo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editing && (
        <ModeloEditor
          modelo={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
          }}
        />
      )}
    </div>
  );
}

function ModeloEditor({
  modelo,
  onClose,
  onSaved,
}: {
  modelo: Modelo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isNew = !modelo.id;
  const [nome, setNome] = useState(modelo.nome);
  const [escopo, setEscopo] = useState<Escopo>(modelo.escopo);
  const [categoria, setCategoria] = useState<Categoria | null>(
    modelo.categoria_tipo,
  );
  const [ativo, setAtivo] = useState(modelo.ativo);
  const [somar, setSomar] = useState(modelo.somar_ao_geral);
  const [prioridade, setPrioridade] = useState(modelo.prioridade);

  const { data: itens = [] } = useQuery({
    queryKey: ["checklist_modelo_itens", modelo.id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelo_itens")
        .select("*")
        .eq("modelo_id", modelo.id)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as ModeloItem[];
    },
  });

  const { data: empregadores = [] } = useQuery({
    queryKey: ["empregadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empregadores")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return (data ?? []) as Empregador[];
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["checklist_modelo_empregadores", modelo.id],
    enabled: !isNew && escopo === "empregador",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelo_empregadores")
        .select("*")
        .eq("modelo_id", modelo.id);
      if (error) throw error;
      return (data ?? []) as ModeloEmpregador[];
    },
  });

  const vinculosSet = useMemo(
    () => new Set(vinculos.map((v) => v.empregador_id)),
    [vinculos],
  );

  const salvarModelo = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome");
      if (escopo === "categoria" && !categoria)
        throw new Error("Selecione a categoria");
      const payload = {
        nome: nome.trim(),
        escopo,
        categoria_tipo: escopo === "categoria" ? categoria : null,
        ativo,
        prioridade,
        somar_ao_geral: somar,
      };
      if (isNew) {
        const { data, error } = await supabase
          .from("checklist_modelos")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data as Modelo;
      }
      const { error } = await supabase
        .from("checklist_modelos")
        .update(payload)
        .eq("id", modelo.id);
      if (error) throw error;
      return modelo;
    },
    onSuccess: (m) => {
      toast.success("Modelo salvo");
      onSaved();
      if (isNew) {
        // switch to edit mode of newly created model
        qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
        onClose();
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const nextOrdem =
        itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1;
      const { error } = await supabase
        .from("checklist_modelo_itens")
        .insert({
          modelo_id: modelo.id,
          ordem: nextOrdem,
          texto: "Novo item",
          obrigatorio: false,
        });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["checklist_modelo_itens", modelo.id],
      }),
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<ModeloItem>;
    }) => {
      const { error } = await supabase
        .from("checklist_modelo_itens")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["checklist_modelo_itens", modelo.id],
      }),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklist_modelo_itens")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["checklist_modelo_itens", modelo.id],
      }),
  });

  const move = async (id: string, dir: -1 | 1) => {
    const sorted = [...itens].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swap = sorted[idx + dir];
    if (!swap) return;
    const a = sorted[idx];
    // Two-step to avoid unique-index collisions if any
    await supabase
      .from("checklist_modelo_itens")
      .update({ ordem: -1 })
      .eq("id", a.id);
    await supabase
      .from("checklist_modelo_itens")
      .update({ ordem: a.ordem })
      .eq("id", swap.id);
    await supabase
      .from("checklist_modelo_itens")
      .update({ ordem: swap.ordem })
      .eq("id", a.id);
    qc.invalidateQueries({
      queryKey: ["checklist_modelo_itens", modelo.id],
    });
  };

  const toggleVinculo = useMutation({
    mutationFn: async ({
      empregador_id,
      on,
    }: {
      empregador_id: string;
      on: boolean;
    }) => {
      if (on) {
        const { error } = await supabase
          .from("checklist_modelo_empregadores")
          .insert({ modelo_id: modelo.id, empregador_id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("checklist_modelo_empregadores")
          .delete()
          .eq("modelo_id", modelo.id)
          .eq("empregador_id", empregador_id);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["checklist_modelo_empregadores", modelo.id],
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Novo modelo" : `Editar: ${modelo.nome}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Escopo</Label>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as Escopo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="categoria">Categoria</SelectItem>
                <SelectItem value="empregador">Empregador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {escopo === "categoria" && (
            <div>
              <Label>Categoria</Label>
              <Select
                value={categoria ?? ""}
                onValueChange={(v) => setCategoria(v as Categoria)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIA_LABEL) as Categoria[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Prioridade</Label>
            <Input
              type="number"
              value={prioridade}
              onChange={(e) => setPrioridade(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label>Ativo</Label>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={somar} onCheckedChange={setSomar} />
            <Label>Somar ao geral</Label>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => salvarModelo.mutate()}
            disabled={salvarModelo.isPending}
            style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
          >
            {isNew ? "Criar modelo" : "Salvar alterações"}
          </Button>
        </div>

        {!isNew && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold" style={{ color: "var(--elite-navy)" }}>
                Itens do modelo
              </h3>
              <Button size="sm" variant="outline" onClick={() => addItem.mutate()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Novo item
              </Button>
            </div>
            <ul className="space-y-1">
              {itens.map((it, idx) => (
                <li key={it.id} className="flex items-center gap-1 rounded border p-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                      disabled={idx === 0}
                      onClick={() => move(it.id, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                      disabled={idx === itens.length - 1}
                      onClick={() => move(it.id, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <Input
                    className="flex-1 h-8"
                    defaultValue={it.texto}
                    onBlur={(e) => {
                      if (e.target.value !== it.texto)
                        updateItem.mutate({
                          id: it.id,
                          patch: { texto: e.target.value },
                        });
                    }}
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={it.obrigatorio}
                      onCheckedChange={(v) =>
                        updateItem.mutate({
                          id: it.id,
                          patch: { obrigatorio: v === true },
                        })
                      }
                    />
                    obrig.
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Excluir item?")) delItem.mutate(it.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </li>
              ))}
              {itens.length === 0 && (
                <li className="p-2 text-center text-xs text-muted-foreground">
                  Sem itens.
                </li>
              )}
            </ul>
          </div>
        )}

        {!isNew && escopo === "empregador" && (
          <div className="mt-6 border-t pt-4">
            <h3 className="font-semibold mb-2" style={{ color: "var(--elite-navy)" }}>
              Empregadores vinculados
            </h3>
            <div className="max-h-48 overflow-auto rounded border">
              {empregadores.map((e) => (
                <label
                  key={e.id}
                  className="flex items-center gap-2 border-b px-2 py-1 text-sm"
                >
                  <Checkbox
                    checked={vinculosSet.has(e.id)}
                    onCheckedChange={(v) =>
                      toggleVinculo.mutate({
                        empregador_id: e.id,
                        on: v === true,
                      })
                    }
                  />
                  <span className="font-mono text-xs w-12">{e.codigo}</span>
                  <span className="flex-1 truncate">{e.nome}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}