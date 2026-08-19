import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Empregado,
  type EventoDp,
  type EventoTipo,
  eventoTipoLabel,
  eventoTipoColor,
  formatDia,
} from "@/lib/domain";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function EventosDialog({
  empregado,
  open,
  onOpenChange,
}: {
  empregado: Empregado | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos_dp", empregado?.id],
    enabled: !!empregado?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_dp")
        .select("*")
        .eq("empregado_id", empregado!.id)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventoDp[];
    },
  });

  const [tipo, setTipo] = useState<EventoTipo>("ferias");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [descricao, setDescricao] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("eventos_dp").insert({
        empregado_id: empregado!.id,
        tipo,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        descricao: descricao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento adicionado");
      setDataInicio("");
      setDataFim("");
      setDescricao("");
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos_dp").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos_dp"] });
      qc.invalidateQueries({ queryKey: ["eventos_dp_all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Eventos — {empregado?.nome ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--elite-navy)" }}>
            Novo evento
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as EventoTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(eventoTipoLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!dataInicio || add.isPending}
                onClick={() => add.mutate()}
                style={{ backgroundColor: "var(--elite-navy)", color: "white" }}
              >
                Adicionar
              </Button>
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="max-h-[350px] overflow-auto space-y-1">
          {eventos.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhum evento registrado.</div>
          )}
          {eventos.map((ev) => {
            const c = eventoTipoColor[ev.tipo];
            return (
              <div key={ev.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: c.bg, color: c.fg }}
                >
                  {eventoTipoLabel[ev.tipo]}
                </span>
                <span className="font-mono text-xs">
                  {formatDia(ev.data_inicio)}
                  {ev.data_fim && ev.data_fim !== ev.data_inicio ? ` – ${formatDia(ev.data_fim)}` : ""}
                </span>
                {ev.descricao && <span className="text-muted-foreground truncate">— {ev.descricao}</span>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => {
                    if (confirm("Remover evento?")) del.mutate(ev.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}