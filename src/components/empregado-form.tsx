import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Empregado,
  type Empregador,
  type EmpregadoSituacao,
  maskDoc,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type FormState = {
  empregador_id: string;
  nome: string;
  cpf: string;
  cargo: string;
  data_admissao: string;
  data_desligamento: string;
  salario_base: string;
  recebe_vt: boolean;
  situacao: EmpregadoSituacao;
  observacoes: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  data_ultimas_ferias_gozadas: string;
};

function emptyState(empregadorId: string): FormState {
  return {
    empregador_id: empregadorId,
    nome: "",
    cpf: "",
    cargo: "",
    data_admissao: "",
    data_desligamento: "",
    salario_base: "",
    recebe_vt: false,
    situacao: "ativo",
    observacoes: "",
    periodo_aquisitivo_inicio: "",
    periodo_aquisitivo_fim: "",
    data_ultimas_ferias_gozadas: "",
  };
}

export function EmpregadoForm({
  initial,
  fixedEmpregadorId,
  empregadores,
  onSaved,
}: {
  initial: Empregado | null;
  fixedEmpregadorId?: string;
  empregadores: Empregador[];
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormState>(
    initial
      ? {
          empregador_id: initial.empregador_id,
          nome: initial.nome,
          cpf: initial.cpf ?? "",
          cargo: initial.cargo ?? "",
          data_admissao: initial.data_admissao ?? "",
          data_desligamento: initial.data_desligamento ?? "",
          salario_base: initial.salario_base?.toString() ?? "",
          recebe_vt: initial.recebe_vt,
          situacao: initial.situacao,
          observacoes: initial.observacoes ?? "",
          periodo_aquisitivo_inicio: initial.periodo_aquisitivo_inicio ?? "",
          periodo_aquisitivo_fim: initial.periodo_aquisitivo_fim ?? "",
          data_ultimas_ferias_gozadas: initial.data_ultimas_ferias_gozadas ?? "",
        }
      : emptyState(fixedEmpregadorId ?? ""),
  );
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empregador_id: f.empregador_id,
        nome: f.nome,
        cpf: f.cpf.replace(/\D/g, "") || null,
        cargo: f.cargo || null,
        data_admissao: f.data_admissao || null,
        data_desligamento: f.data_desligamento || null,
        salario_base: f.salario_base ? Number(f.salario_base) : null,
        recebe_vt: f.recebe_vt,
        situacao: f.situacao,
        observacoes: f.observacoes || null,
        periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio || null,
        periodo_aquisitivo_fim: f.periodo_aquisitivo_fim || null,
        data_ultimas_ferias_gozadas: f.data_ultimas_ferias_gozadas || null,
      };
      if (initial) {
        const { error } = await supabase.from("empregados").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("empregados")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted && payload.data_admissao) {
          const { data: existing } = await supabase
            .from("eventos_dp")
            .select("id")
            .eq("empregado_id", inserted.id)
            .eq("tipo", "admissao")
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("eventos_dp").insert({
              empregado_id: inserted.id,
              tipo: "admissao",
              data_inicio: payload.data_admissao,
            });
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(initial ? "Empregado atualizado" : "Empregado criado");
      qc.invalidateQueries({ queryKey: ["empregados"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const empAtivos = empregadores.filter((e) => e.status === "ativo" || e.id === f.empregador_id);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {!fixedEmpregadorId && (
        <div className="md:col-span-2">
          <Label>Empregador</Label>
          <Select value={f.empregador_id} onValueChange={(v) => setF({ ...f, empregador_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {empAtivos.map((e) => (
                <SelectItem key={e.id} value={e.id}>#{e.codigo} — {e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="md:col-span-2">
        <Label>Nome</Label>
        <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </div>
      <div>
        <Label>CPF</Label>
        <Input value={maskDoc(f.cpf, "CPF")} onChange={(e) => setF({ ...f, cpf: e.target.value })} maxLength={14} />
      </div>
      <div>
        <Label>Cargo</Label>
        <Input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} />
      </div>
      <div>
        <Label>Admissão</Label>
        <Input type="date" value={f.data_admissao} onChange={(e) => setF({ ...f, data_admissao: e.target.value })} />
      </div>
      <div>
        <Label>Desligamento</Label>
        <Input type="date" value={f.data_desligamento} onChange={(e) => setF({ ...f, data_desligamento: e.target.value })} />
      </div>
      <div>
        <Label>Salário base (R$)</Label>
        <Input type="number" step="0.01" value={f.salario_base} onChange={(e) => setF({ ...f, salario_base: e.target.value })} />
      </div>
      <div className="flex items-center gap-2 pt-6">
        <Checkbox id="vt" checked={f.recebe_vt} onCheckedChange={(v) => setF({ ...f, recebe_vt: !!v })} />
        <Label htmlFor="vt" className="cursor-pointer">Recebe vale-transporte</Label>
      </div>
      <div>
        <Label>Situação</Label>
        <Select value={f.situacao} onValueChange={(v) => setF({ ...f, situacao: v as EmpregadoSituacao })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="ferias">Férias</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="aviso_previo">Aviso prévio</SelectItem>
            <SelectItem value="desligado">Desligado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2 grid gap-3 md:grid-cols-3 rounded-md border p-3">
        <div className="md:col-span-3 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--elite-navy)" }}>
          Férias — Período aquisitivo
        </div>
        <div>
          <Label>Início do aquisitivo</Label>
          <Input type="date" value={f.periodo_aquisitivo_inicio} onChange={(e) => setF({ ...f, periodo_aquisitivo_inicio: e.target.value })} />
        </div>
        <div>
          <Label>Fim do aquisitivo</Label>
          <Input type="date" value={f.periodo_aquisitivo_fim} onChange={(e) => setF({ ...f, periodo_aquisitivo_fim: e.target.value })} />
        </div>
        <div>
          <Label>Últimas férias gozadas</Label>
          <Input type="date" value={f.data_ultimas_ferias_gozadas} onChange={(e) => setF({ ...f, data_ultimas_ferias_gozadas: e.target.value })} />
        </div>
      </div>
      <div className="md:col-span-2">
        <Label>Observações</Label>
        <Textarea rows={3} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button
          disabled={save.isPending || !f.nome || !f.empregador_id}
          onClick={() => save.mutate()}
          style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
        >
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}