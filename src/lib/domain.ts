export type StatusEtapa = "pendente" | "ok" | "validado" | "nao_aplicavel";
export type PossuiMovimento = "com_movimento" | "sem_movimento" | "indefinido";
export type EmpregadorStatus = "ativo" | "inativo" | "ex_cliente";
export type TipoDocumento = "CPF" | "CNPJ";
export type CanalDados = "portal_elite" | "email" | "whatsapp" | "outro";
export type EmpregadoSituacao = "ativo" | "ferias" | "afastado" | "aviso_previo" | "desligado";
export type EventoTipo =
  | "admissao"
  | "rescisao"
  | "ferias"
  | "afastamento"
  | "aviso_previo"
  | "decimo_terceiro"
  | "retorno"
  | "outro";

export interface Empregado {
  id: string;
  empregador_id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  data_admissao: string | null;
  data_desligamento: string | null;
  salario_base: number | null;
  recebe_vt: boolean;
  situacao: EmpregadoSituacao;
  observacoes: string | null;
  periodo_aquisitivo_inicio: string | null;
  periodo_aquisitivo_fim: string | null;
  data_ultimas_ferias_gozadas: string | null;
  created_at: string;
}

export interface EventoDp {
  id: string;
  empregado_id: string;
  tipo: EventoTipo;
  data_inicio: string;
  data_fim: string | null;
  descricao: string | null;
  created_at: string;
}

export const eventoTipoLabel: Record<EventoTipo, string> = {
  admissao: "Admissão",
  rescisao: "Rescisão",
  ferias: "Férias",
  afastamento: "Afastamento",
  aviso_previo: "Aviso prévio",
  decimo_terceiro: "13º salário",
  retorno: "Retorno",
  outro: "Outro",
};

export const eventoTipoColor: Record<EventoTipo, { bg: string; fg: string }> = {
  admissao: { bg: "#DCFCE7", fg: "#166534" },
  rescisao: { bg: "#FCEAEC", fg: "#8B1E2A" },
  ferias: { bg: "#DBEAFE", fg: "#1E3A8A" },
  afastamento: { bg: "#FEF6E6", fg: "#8a5a00" },
  aviso_previo: { bg: "#FEE4E2", fg: "#8B1E2A" },
  decimo_terceiro: { bg: "#FEF3C7", fg: "#78350F" },
  retorno: { bg: "#E0F2FE", fg: "#075985" },
  outro: { bg: "#E5E7EB", fg: "#374151" },
};

/** Cor "sólida" para borda/realce de linha, por tipo de evento. */
export const eventoTipoAccent: Record<EventoTipo, string> = {
  rescisao: "#B00020",
  admissao: "#1E7B4F",
  afastamento: "#BF8F00",
  ferias: "#2462A8",
  aviso_previo: "#B00020",
  decimo_terceiro: "#78350F",
  retorno: "#075985",
  outro: "#4B5563",
};

/** Menor = maior prioridade. */
export const eventoPrioridade: Record<EventoTipo, number> = {
  rescisao: 1,
  admissao: 2,
  afastamento: 3,
  ferias: 4,
  aviso_previo: 5,
  decimo_terceiro: 6,
  retorno: 7,
  outro: 8,
};

export const empregadoSituacaoLabel: Record<EmpregadoSituacao, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  afastado: "Afastado",
  aviso_previo: "Aviso prévio",
  desligado: "Desligado",
};

export const empregadoSituacaoColor: Record<EmpregadoSituacao, { bg: string; fg: string }> = {
  ativo: { bg: "#DCFCE7", fg: "#166534" },
  ferias: { bg: "#DBEAFE", fg: "#1E3A8A" },
  afastado: { bg: "#FEF6E6", fg: "#8a5a00" },
  aviso_previo: { bg: "#FEE4E2", fg: "#8B1E2A" },
  desligado: { bg: "#F3F4F6", fg: "#4B5563" },
};

/** True se o intervalo [data_inicio, data_fim||data_inicio] intersecta o mês (ano, mes 1-12). */
export function eventoTocaMes(ev: Pick<EventoDp, "data_inicio" | "data_fim">, ano: number, mes: number) {
  const mesIni = new Date(ano, mes - 1, 1);
  const mesFim = new Date(ano, mes, 0);
  const ini = new Date(ev.data_inicio + "T00:00:00");
  const fim = new Date((ev.data_fim ?? ev.data_inicio) + "T00:00:00");
  return ini <= mesFim && fim >= mesIni;
}

/**
 * Regra de incidência específica por tipo:
 *  - rescisao: apenas o mês da data_inicio
 *  - admissao: mês da data_inicio E o mês seguinte (2 folhas)
 *  - ferias / afastamento / demais: interseção do intervalo com o mês
 */
export function eventoIncideNaComp(ev: EventoDp, ano: number, mes: number) {
  const ini = new Date(ev.data_inicio + "T00:00:00");
  const iniAno = ini.getFullYear();
  const iniMes = ini.getMonth() + 1;
  if (ev.tipo === "rescisao") return iniAno === ano && iniMes === mes;
  if (ev.tipo === "admissao") {
    if (iniAno === ano && iniMes === mes) return true;
    const nextMes = iniMes === 12 ? 1 : iniMes + 1;
    const nextAno = iniMes === 12 ? iniAno + 1 : iniAno;
    return nextAno === ano && nextMes === mes;
  }
  return eventoTocaMes(ev, ano, mes);
}

export function isSegundaFolhaAdmissao(ev: EventoDp, ano: number, mes: number) {
  if (ev.tipo !== "admissao") return false;
  const ini = new Date(ev.data_inicio + "T00:00:00");
  return !(ini.getFullYear() === ano && ini.getMonth() + 1 === mes);
}

export function formatDia(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Rótulo curto do evento p/ badge no painel. */
export function eventoBadgeLabel(ev: EventoDp) {
  const base = eventoTipoLabel[ev.tipo];
  if (ev.data_fim && ev.data_fim !== ev.data_inicio) {
    return `${base} ${formatDia(ev.data_inicio)}–${formatDia(ev.data_fim)}`;
  }
  return `${base} ${formatDia(ev.data_inicio)}`;
}

export type FeriasAlerta = "vencidas" | "avencer" | null;

/** Calcula alerta de férias de um empregado ativo. */
export function feriasAlerta(emp: Empregado, eventosFerias: EventoDp[]): { level: FeriasAlerta; limite: Date | null } {
  if (emp.situacao !== "ativo" || !emp.periodo_aquisitivo_fim) return { level: null, limite: null };
  const aqFim = new Date(emp.periodo_aquisitivo_fim + "T00:00:00");
  const limite = new Date(aqFim);
  limite.setMonth(limite.getMonth() + 12);

  const gozouPorEvento = eventosFerias.some(
    (ev) => ev.tipo === "ferias" && new Date(ev.data_inicio + "T00:00:00") > aqFim,
  );
  const gozouPorData = emp.data_ultimas_ferias_gozadas
    ? new Date(emp.data_ultimas_ferias_gozadas + "T00:00:00") > aqFim
    : false;
  if (gozouPorEvento || gozouPorData) return { level: null, limite };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDays = Math.round((limite.getTime() - hoje.getTime()) / 86400000);
  if (diffDays < 0) return { level: "vencidas", limite };
  if (diffDays <= 60) return { level: "avencer", limite };
  return { level: null, limite };
}

export interface Responsavel {
  id: string;
  nome: string;
  ativo?: boolean;
}
export interface Empregador {
  id: string;
  codigo: number;
  nome: string;
  documento: string;
  tipo_documento: TipoDocumento;
  eh_domestico: boolean;
  status: EmpregadorStatus;
  responsavel_id: string | null;
  email: string | null;
  telefone: string | null;
  canal_dados: CanalDados | null;
  dia_corte: number | null;
  programacao_ferias: string | null;
  observacoes_fixas: string | null;
  created_at: string;
}
export interface Competencia {
  id: string;
  ano: number;
  mes: number;
  rotulo: string;
  status: "aberta" | "fechada";
  vencimento_dae: string;
}
export interface Processamento {
  id: string;
  competencia_id: string;
  empregador_id: string;
  possui_movimento: PossuiMovimento;
  situacao: string | null;
  observacao_mes: string | null;
  status_folha: StatusEtapa;
  status_dae: StatusEtapa;
  status_fgts_dctfweb: StatusEtapa;
  justificado_portal: boolean;
  enviado_cliente: boolean;
  valor_folha: number | null;
  valor_dae: number | null;
  concluido: boolean;
  tem_variavel: boolean;
  observacao_calculo: string | null;
}

export const statusEtapaLabel: Record<StatusEtapa, string> = {
  pendente: "Pendente",
  ok: "OK",
  validado: "Validado",
  nao_aplicavel: "N/A",
};
export const movimentoLabel: Record<PossuiMovimento, string> = {
  com_movimento: "Com movimento",
  sem_movimento: "Sem movimento",
  indefinido: "Indefinido",
};

export function mesRotulo(ano: number, mes: number) {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

export function maskDoc(v: string | null | undefined, tipo: TipoDocumento) {
  const d = (v ?? "").toString().replace(/\D/g, "");
  if (!d) return "";
  if (tipo === "CPF") {
    return d
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function daysUntil(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}