import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Empregador,
  type Responsavel,
  type EmpregadorStatus,
  type TipoDocumento,
  type CanalDados,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type FormState = {
  codigo: number;
  nome: string;
  documento: string;
  tipo_documento: TipoDocumento;
  eh_domestico: boolean;
  status: EmpregadorStatus;
  responsavel_id: string | null;
  email: string;
  telefone: string;
  canal_dados: CanalDados | "";
  observacoes_fixas: string;
};

const empty: FormState = {
  codigo: 0,
  nome: "",
  documento: "",
  tipo_documento: "CPF",
  eh_domestico: true,
  status: "ativo",
  responsavel_id: null,
  email: "",
  telefone: "",
  canal_dados: "",
  observacoes_fixas: "",
};

export function EmpregadorForm({
  initial,
  responsaveis,
  onSaved,
  onExistingFound,
}: {
  initial: Empregador | null;
  responsaveis: Responsavel[];
  onSaved: () => void;
  onExistingFound?: (emp: Empregador) => void;
}) {
  const [f, setF] = useState<FormState>(
    initial
      ? {
          codigo: initial.codigo,
          nome: initial.nome,
          documento: initial.documento ?? "",
          tipo_documento: initial.tipo_documento ?? "CPF",
          eh_domestico: initial.eh_domestico,
          status: initial.status,
          responsavel_id: initial.responsavel_id,
          email: initial.email ?? "",
          telefone: initial.telefone ?? "",
          canal_dados: initial.canal_dados ?? "",
          observacoes_fixas: initial.observacoes_fixas ?? "",
        }
      : empty,
  );
  const qc = useQueryClient();

  const notifyDuplicate = (existing: Empregador) => {
    toast.error(`Já existe a empresa ${existing.codigo} – ${existing.nome}.`, {
      action: onExistingFound
        ? { label: "Abrir empresa existente", onClick: () => onExistingFound(existing) }
        : undefined,
    });
  };

  const checkDuplicateCodigo = async (codigo: number): Promise<Empregador | null> => {
    if (!codigo) return null;
    if (initial && initial.codigo === codigo) return null;
    const { data } = await supabase
      .from("empregadores")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();
    return (data as Empregador | null) ?? null;
  };

  const save = useMutation({
    mutationFn: async () => {
      const docDigits = (f.documento ?? "").replace(/\D/g, "");
      const payload = {
        codigo: Number(f.codigo),
        nome: f.nome,
        documento: docDigits || null,
        tipo_documento: docDigits ? f.tipo_documento : null,
        eh_domestico: f.eh_domestico,
        status: f.status,
        responsavel_id: f.responsavel_id,
        email: f.email || null,
        telefone: f.telefone || null,
        canal_dados: f.canal_dados || null,
        observacoes_fixas: f.observacoes_fixas || null,
      };
      if (initial) {
        const { error } = await supabase.from("empregadores").update(payload).eq("id", initial.id);
        if (error) throw error;
        return { duplicated: null as Empregador | null };
      } else {
        const existing = await checkDuplicateCodigo(payload.codigo);
        if (existing) return { duplicated: existing };
        const { error } = await supabase.from("empregadores").insert(payload);
        if (error) {
          if ((error as { code?: string }).code === "23505") {
            const again = await checkDuplicateCodigo(payload.codigo);
            if (again) return { duplicated: again };
          }
          throw error;
        }
        return { duplicated: null as Empregador | null };
      }
    },
    onSuccess: (res) => {
      if (res?.duplicated) {
        notifyDuplicate(res.duplicated);
        return;
      }
      toast.success(initial ? "Empregador atualizado" : "Empregador criado");
      qc.invalidateQueries({ queryKey: ["empregadores"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Código</Label>
        <Input
          type="number"
          value={f.codigo}
          onChange={(e) => setF({ ...f, codigo: Number(e.target.value) })}
          onBlur={async (e) => {
            const codigo = Number(e.target.value);
            const existing = await checkDuplicateCodigo(codigo);
            if (existing) notifyDuplicate(existing);
          }}
        />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as EmpregadorStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="ex_cliente">Ex-cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>Nome</Label>
        <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </div>
      <div>
        <Label>Tipo documento</Label>
        <Select value={f.tipo_documento} onValueChange={(v) => setF({ ...f, tipo_documento: v as TipoDocumento })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CPF">CPF</SelectItem>
            <SelectItem value="CNPJ">CNPJ</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Documento</Label>
        <Input
          value={f.documento}
          onChange={(e) => setF({ ...f, documento: e.target.value.replace(/\D/g, "") })}
          maxLength={14}
          placeholder="somente dígitos"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="ehdom" checked={f.eh_domestico} onCheckedChange={(v) => setF({ ...f, eh_domestico: !!v })} />
        <Label htmlFor="ehdom" className="cursor-pointer">É doméstico</Label>
      </div>
      <div>
        <Label>Responsável</Label>
        <Select
          value={f.responsavel_id ?? "__none"}
          onValueChange={(v) => setF({ ...f, responsavel_id: v === "__none" ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— sem responsável —</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>E-mail</Label>
        <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <div>
        <Label>Telefone</Label>
        <Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      </div>
      <div>
        <Label>Canal de dados</Label>
        <Select value={f.canal_dados || "__none"} onValueChange={(v) => setF({ ...f, canal_dados: v === "__none" ? "" : (v as CanalDados) })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">—</SelectItem>
            <SelectItem value="portal_elite">Portal Elite</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>Observações fixas (lembretes recorrentes)</Label>
        <Textarea
          rows={3}
          value={f.observacoes_fixas}
          onChange={(e) => setF({ ...f, observacoes_fixas: e.target.value })}
          placeholder="Ex.: adiantamento de 13º em março, sempre enviar dia 20…"
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button
          disabled={save.isPending || !f.nome || !f.codigo}
          onClick={() => save.mutate()}
          style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
        >
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}