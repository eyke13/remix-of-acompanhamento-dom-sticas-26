import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Copy,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useCompetencia } from "@/lib/competencia-context";
import type { Empregador } from "@/lib/domain";

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
  categorias_especiais: string[];
}

interface ModeloItem {
  id: string;
  modelo_id: string;
  ordem: number;
  texto: string;
  obrigatorio: boolean;
}

interface DraftItem {
  key: string;
  id: string | null; // null se novo
  ordem: number;
  texto: string;
  obrigatorio: boolean;
}

type Especial = "com_variavel" | "sem_variavel" | "fgts_dctfweb";

const ESPECIAL_LABEL: Record<Especial, string> = {
  com_variavel: "Com variável",
  sem_variavel: "Sem variável",
  fgts_dctfweb: "Possui FGTS/DCTFWeb",
};

const ESPECIAIS: Especial[] = ["com_variavel", "sem_variavel", "fgts_dctfweb"];

/** Normaliza texto para busca: minúsculas, sem acento e sem pontuação. */
export function normalizeBusca(v: string) {
  return (v ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const CATEGORIA_LABEL: Record<Categoria, string> = {
  com_movimento: "Com movimento",
  sem_movimento: "Sem movimento",
  admissao: "Admissão",
  rescisao: "Rescisão",
  ferias: "Férias",
  segunda_folha: "Segunda folha",
};

function useModelos() {
  return useQuery({
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
}

export function ChecklistModelsPanel({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { data: modelos = [] } = useModelos();
  const [editingId, setEditingId] = useState<string | null | "new">(null);

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

  const { data: vinculosAll = [] } = useQuery({
    queryKey: ["checklist_modelo_empregadores_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelo_empregadores")
        .select("*");
      if (error) throw error;
      return (data ?? []) as { modelo_id: string; empregador_id: string }[];
    },
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

  const duplicar = useMutation({
    mutationFn: async (m: Modelo) => {
      const { data: novo, error: e1 } = await supabase
        .from("checklist_modelos")
        .insert({
          nome: `${m.nome} (cópia)`,
          escopo: m.escopo,
          categoria_tipo: m.categoria_tipo,
          categorias_especiais: m.categorias_especiais ?? [],
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
              modelo_id: (novo as Modelo).id,
              ordem: i.ordem,
              texto: i.texto,
              obrigatorio: i.obrigatorio,
            })),
          );
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function scopeText(m: Modelo): string {
    if (m.escopo === "global") return "Todos os empregadores";
    if (m.escopo === "categoria") {
      const esp = m.categorias_especiais ?? [];
      if (esp.length > 0) {
        return esp
          .map((c) => ESPECIAL_LABEL[c as Especial] ?? c)
          .join(" · ");
      }
      return m.categoria_tipo ? CATEGORIA_LABEL[m.categoria_tipo] : "Categorias especiais";
    }
    const n = vinculosAll.filter((v) => v.modelo_id === m.id).length;
    return `${n} ${n === 1 ? "empregador" : "empregadores"}`;
  }

  if (editingId !== null) {
    return (
      <ChecklistModelEditor
        modeloId={editingId === "new" ? null : editingId}
        onBack={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1 text-sm font-semibold" style={{ color: "var(--elite-navy)" }}>
          Modelos de checklist
        </div>
        <Button
          size="sm"
          onClick={() => setEditingId("new")}
          style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
        >
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <div className="rounded-md border divide-y">
        {modelos.map((m) => (
          <div key={m.id} className="flex items-center gap-2 p-2">
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => setEditingId(m.id)}
            >
              <div className="text-sm font-medium">{m.nome}</div>
              <div className="text-xs text-muted-foreground">{scopeText(m)}</div>
            </button>
            <Switch
              checked={m.ativo}
              onCheckedChange={(v) => toggleAtivo.mutate({ id: m.id, ativo: v })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => duplicar.mutate(m)}>
                  <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    if (confirm(`Excluir modelo "${m.nome}"?`)) del.mutate(m.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {modelos.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum modelo cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistModelEditor({
  modeloId,
  onBack,
}: {
  modeloId: string | null;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const isNew = !modeloId;
  const { selected } = useCompetencia();

  const { data: modelo } = useQuery({
    queryKey: ["checklist_modelo", modeloId],
    enabled: !!modeloId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelos")
        .select("*")
        .eq("id", modeloId!)
        .single();
      if (error) throw error;
      return data as Modelo;
    },
  });

  const { data: itensDb = [] } = useQuery({
    queryKey: ["checklist_modelo_itens", modeloId],
    enabled: !!modeloId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelo_itens")
        .select("*")
        .eq("modelo_id", modeloId!)
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

  const { data: vinculosDb = [] } = useQuery({
    queryKey: ["checklist_modelo_empregadores", modeloId],
    enabled: !!modeloId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_modelo_empregadores")
        .select("*")
        .eq("modelo_id", modeloId!);
      if (error) throw error;
      return (data ?? []) as { modelo_id: string; empregador_id: string }[];
    },
  });

  const [nome, setNome] = useState("");
  const [escopo, setEscopo] = useState<Escopo>("global");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [especiais, setEspeciais] = useState<Especial[]>([]);
  const [buscaEmp, setBuscaEmp] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [somar, setSomar] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [vincSet, setVincSet] = useState<Set<string>>(new Set());
  const [showAdv, setShowAdv] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isNew && !initialized) {
      setInitialized(true);
      return;
    }
    if (!initialized && modelo) {
      setNome(modelo.nome);
      setEscopo(modelo.escopo);
      setCategoria(modelo.categoria_tipo);
      setEspeciais((modelo.categorias_especiais ?? []) as Especial[]);
      setAtivo(modelo.ativo);
      setSomar(modelo.somar_ao_geral);
      setInitialized(true);
    }
  }, [isNew, modelo, initialized]);

  useEffect(() => {
    if (!isNew && itensDb.length >= 0 && modelo) {
      setItems(
        itensDb.map((i) => ({
          key: i.id,
          id: i.id,
          ordem: i.ordem,
          texto: i.texto,
          obrigatorio: i.obrigatorio,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensDb.length, modelo?.id]);

  useEffect(() => {
    if (!isNew) setVincSet(new Set(vinculosDb.map((v) => v.empregador_id)));
  }, [vinculosDb, isNew]);

  const empregadoresFiltrados = useMemo(() => {
    const base = [...empregadores].sort((a, b) => a.codigo - b.codigo);
    const q = normalizeBusca(buscaEmp);
    if (!q) return base;
    return base.filter((e) =>
      [e.nome, String(e.codigo), e.documento ?? ""]
        .map(normalizeBusca)
        .some((v) => v.includes(q)),
    );
  }, [empregadores, buscaEmp]);

  const originalItemsSig = useMemo(
    () =>
      JSON.stringify(
        [...itensDb]
          .sort((a, b) => a.ordem - b.ordem)
          .map((i) => [i.texto, i.obrigatorio]),
      ),
    [itensDb],
  );
  const currentItemsSig = useMemo(
    () =>
      JSON.stringify(
        [...items]
          .sort((a, b) => a.ordem - b.ordem)
          .map((i) => [i.texto.trim(), i.obrigatorio]),
      ),
    [items],
  );
  const itemsChanged = originalItemsSig !== currentItemsSig;

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((it, k) => (it.ordem = k + 1));
    setItems(next);
  }

  function addItem() {
    const ordem = items.length + 1;
    setItems([
      ...items,
      {
        key: `new-${Date.now()}-${Math.random()}`,
        id: null,
        ordem,
        texto: "",
        obrigatorio: false,
      },
    ]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    const next = items.filter((i) => i.key !== key);
    next.forEach((it, k) => (it.ordem = k + 1));
    setItems(next);
  }

  async function countEmpregadoresUsando(modeloIdReal: string): Promise<number> {
    if (!selected) return 0;
    const itemIds = itensDb.map((i) => i.id);
    if (itemIds.length === 0) return 0;
    const { data, error } = await supabase
      .from("checklist_competencia_itens")
      .select("empregador_id")
      .eq("competencia_id", selected.id)
      .in("origem_item_id", itemIds);
    if (error) return 0;
    const set = new Set((data ?? []).map((r) => r.empregador_id));
    return set.size;
  }

  const salvar = useMutation({
    mutationFn: async ({ aplicarAgora }: { aplicarAgora: boolean }) => {
      if (!nome.trim()) throw new Error("Informe o nome");
      if (escopo === "categoria" && especiais.length === 0 && !categoria)
        throw new Error("Selecione ao menos uma categoria especial");

      const payload = {
        nome: nome.trim(),
        escopo,
        categoria_tipo: escopo === "categoria" && especiais.length === 0 ? categoria : null,
        categorias_especiais: escopo === "categoria" ? especiais : [],
        ativo,
        somar_ao_geral: somar,
      };

      let realId = modeloId;
      if (isNew) {
        const { data, error } = await supabase
          .from("checklist_modelos")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        realId = (data as Modelo).id;
      } else {
        const { error } = await supabase
          .from("checklist_modelos")
          .update(payload)
          .eq("id", modeloId!);
        if (error) throw error;
      }

      // Sincroniza itens
      const dbIds = new Set(itensDb.map((i) => i.id));
      const keptIds = new Set(items.filter((i) => i.id).map((i) => i.id!));
      const toDelete = [...dbIds].filter((id) => !keptIds.has(id));
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("checklist_modelo_itens")
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }
      // Two-phase ordem update to avoid unique collisions if any
      for (const it of items.filter((i) => i.id)) {
        const { error } = await supabase
          .from("checklist_modelo_itens")
          .update({ ordem: -(it.ordem + 1000), texto: it.texto, obrigatorio: it.obrigatorio })
          .eq("id", it.id!);
        if (error) throw error;
      }
      for (const it of items.filter((i) => i.id)) {
        const { error } = await supabase
          .from("checklist_modelo_itens")
          .update({ ordem: it.ordem })
          .eq("id", it.id!);
        if (error) throw error;
      }
      const toInsert = items
        .filter((i) => !i.id && i.texto.trim())
        .map((i) => ({
          modelo_id: realId!,
          ordem: i.ordem,
          texto: i.texto.trim(),
          obrigatorio: i.obrigatorio,
        }));
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("checklist_modelo_itens")
          .insert(toInsert);
        if (error) throw error;
      }

      // Sincroniza vínculos de empregador
      if (escopo === "empregador" && !isNew) {
        const dbSet = new Set(vinculosDb.map((v) => v.empregador_id));
        const toAdd = [...vincSet].filter((id) => !dbSet.has(id));
        const toRem = [...dbSet].filter((id) => !vincSet.has(id));
        if (toAdd.length > 0) {
          const { error } = await supabase
            .from("checklist_modelo_empregadores")
            .insert(toAdd.map((empregador_id) => ({ modelo_id: realId!, empregador_id })));
          if (error) throw error;
        }
        if (toRem.length > 0) {
          const { error } = await supabase
            .from("checklist_modelo_empregadores")
            .delete()
            .eq("modelo_id", realId!)
            .in("empregador_id", toRem);
          if (error) throw error;
        }
      }

      if (aplicarAgora && selected) {
        const { error } = await supabase.rpc("checklist_reaplicar_e_recalcular", {
          p_competencia_id: selected.id,
          p_forcar: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.aplicarAgora ? "Salvo e aplicado à competência atual" : "Modelo salvo");
      qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
      qc.invalidateQueries({ queryKey: ["checklist_modelo_itens"] });
      qc.invalidateQueries({ queryKey: ["checklist_modelo_empregadores"] });
      qc.invalidateQueries({ queryKey: ["checklist_modelo_empregadores_all"] });
      qc.invalidateQueries({ queryKey: ["checklist-status"] });
      qc.invalidateQueries({ queryKey: ["checklist"] });
      qc.invalidateQueries({ queryKey: ["processamentos"] });
      onBack();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSave() {
    if (!isNew && itemsChanged && modeloId) {
      const n = await countEmpregadoresUsando(modeloId);
      if (n > 0) {
        const msg = `Aplicar as alterações à competência atual? ${n} ${
          n === 1 ? "empregador já tem" : "empregadores já têm"
        } este checklist. Aplicar agora substitui os itens deles e as marcações já feitas serão perdidas.\n\nOK = Aplicar agora\nCancelar = Só nas próximas`;
        const yes = window.confirm(msg);
        salvar.mutate({ aplicarAgora: yes });
        return;
      }
    }
    salvar.mutate({ aplicarAgora: false });
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1 text-sm font-semibold" style={{ color: "var(--elite-navy)" }}>
            {isNew ? "Novo modelo" : "Editar modelo"}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Aplica-se a</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as Escopo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Todos os empregadores</SelectItem>
                  <SelectItem value="categoria">Categorias especiais</SelectItem>
                  <SelectItem value="empregador">Empregadores específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {escopo === "categoria" && (
              <div>
                <Label>Características</Label>
                <div className="rounded border p-2 space-y-1">
                  {ESPECIAIS.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={especiais.includes(c)}
                        onCheckedChange={(v) =>
                          setEspeciais((prev) =>
                            v === true
                              ? [...prev, c]
                              : prev.filter((x) => x !== c),
                          )
                        }
                      />
                      {ESPECIAL_LABEL[c]}
                    </label>
                  ))}
                </div>
                {especiais.length === 0 && categoria && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Categoria antiga: {CATEGORIA_LABEL[categoria]} (será mantida
                    enquanto nenhuma característica for marcada)
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={somar} onCheckedChange={(v) => setSomar(v === true)} />
              Somar a este checklist os itens dos modelos mais gerais
            </label>
          </div>
        </div>

        {escopo === "empregador" && !isNew && (
          <div>
            <div className="flex items-center justify-between">
              <Label>Empregadores</Label>
              <span className="text-[11px] text-muted-foreground">
                {empregadoresFiltrados.length} de {empregadores.length} empregadores
              </span>
            </div>
            <Input
              className="mb-1 h-8"
              placeholder="Buscar por nome, código ou CPF/CNPJ"
              value={buscaEmp}
              onChange={(e) => setBuscaEmp(e.target.value)}
            />
            <div className="max-h-64 overflow-auto rounded border">
              {empregadoresFiltrados.length === 0 && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  Nenhum empregador encontrado.
                </div>
              )}
              {empregadoresFiltrados.map((e) => (
                <label key={e.id} className="flex items-center gap-2 border-b px-2 py-1 text-sm">
                  <Checkbox
                    checked={vincSet.has(e.id)}
                    onCheckedChange={(v) => {
                      const s = new Set(vincSet);
                      if (v === true) s.add(e.id);
                      else s.delete(e.id);
                      setVincSet(s);
                    }}
                  />
                  <span className="font-mono text-xs w-12">{e.codigo}</span>
                  <span className="flex-1 truncate">{e.nome}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {escopo === "empregador" && isNew && (
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            Salve o modelo primeiro para vincular empregadores.
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Itens</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => setShowAdv((v) => !v)}
              >
                {showAdv ? "Ocultar opções avançadas" : "Opções avançadas"}
              </button>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Item
              </Button>
            </div>
          </div>
          <ul className="space-y-1">
            {items.map((it, idx) => (
              <li key={it.key} className="flex items-center gap-1 rounded border p-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                    disabled={idx === items.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <Input
                  className="flex-1 h-8"
                  value={it.texto}
                  placeholder="Descrição do item"
                  onChange={(e) => updateItem(it.key, { texto: e.target.value })}
                />
                {showAdv && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="flex items-center gap-1 text-xs">
                        <Checkbox
                          checked={it.obrigatorio}
                          onCheckedChange={(v) =>
                            updateItem(it.key, { obrigatorio: v === true })
                          }
                        />
                        Marcar sempre à mão
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      Este item não é incluído no botão "Marcar todos".
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeItem(it.key)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-2 text-center text-xs text-muted-foreground">
                Nenhum item. Clique em "Item" para adicionar.
              </li>
            )}
          </ul>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={onBack}>Cancelar</Button>
          <Button
            disabled={salvar.isPending}
            onClick={handleSave}
            style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
          >
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Suppress unused-import warnings for helpers surfaced elsewhere.
export const _ChevronRight = ChevronRight;