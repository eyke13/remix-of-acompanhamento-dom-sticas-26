// Cálculo do vencimento do DAE do eSocial Doméstico.
// Regra vigente desde 03/2024: dia 20 do mês seguinte à competência.
// Se cair em sábado/domingo/feriado nacional, antecipa para o último dia útil anterior.

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Calcula a data da Páscoa (Gauss) para derivar feriados móveis.
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function feriadosNacionais(ano: number): Set<string> {
  const fixos: Array<[number, number]> = [
    [1, 1],   // Confraternização
    [4, 21],  // Tiradentes
    [5, 1],   // Trabalho
    [9, 7],   // Independência
    [10, 12], // N. Sra. Aparecida
    [11, 2],  // Finados
    [11, 15], // Proclamação
    [11, 20], // Consciência Negra (nacional desde 2024)
    [12, 25], // Natal
  ];
  const set = new Set<string>();
  fixos.forEach(([m, d]) => set.add(ymd(new Date(ano, m - 1, d))));
  const p = pascoa(ano);
  set.add(ymd(addDays(p, -48))); // Carnaval seg
  set.add(ymd(addDays(p, -47))); // Carnaval ter
  set.add(ymd(addDays(p, -2)));  // Sexta-feira Santa
  set.add(ymd(addDays(p, 60)));  // Corpus Christi
  return set;
}

export function diaUtilAnterior(d: Date, feriados: Set<string>): Date {
  let cur = new Date(d);
  while (true) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !feriados.has(ymd(cur))) return cur;
    cur = addDays(cur, -1);
  }
}

export function vencimentoDAE(
  ano: number,
  mes: number,
  diaVenc = 20,
  antecipa = true,
): { nominal: Date; efetivo: Date; antecipado: boolean } {
  const y = mes === 12 ? ano + 1 : ano;
  const m = mes === 12 ? 1 : mes + 1;
  const nominal = new Date(y, m - 1, diaVenc);
  const efetivo = antecipa ? diaUtilAnterior(nominal, feriadosNacionais(y)) : nominal;
  return { nominal, efetivo, antecipado: ymd(nominal) !== ymd(efetivo) };
}

export function vencimentoDAEIso(
  ano: number,
  mes: number,
  diaVenc = 20,
  antecipa = true,
): string {
  return ymd(vencimentoDAE(ano, mes, diaVenc, antecipa).efetivo);
}

/**
 * Feriados considerados para o 5º dia útil: nacionais + móveis +
 * estadual do RN (03/10) + municipais de Natal (21/11 e 08/12) + extras
 * configurados manualmente (datas ISO "AAAA-MM-DD").
 */
export function feriadosNatalRN(ano: number, extras: string[] = []): Set<string> {
  const set = feriadosNacionais(ano);
  set.add(`${ano}-10-03`); // Mártires de Cunhaú e Uruaçu (RN)
  set.add(`${ano}-11-21`); // N. Sra. da Apresentação (Natal)
  set.add(`${ano}-12-08`); // N. Sra. da Conceição (Natal)
  extras.forEach((d) => {
    if (d) set.add(d.trim());
  });
  return set;
}

export function ehDiaUtil(d: Date, feriados: Set<string>): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6 && !feriados.has(ymd(d));
}

/** N-ésimo dia útil do mês (mes 1-12), considerando feriados de Natal/RN. */
export function nthDiaUtil(ano: number, mes: number, n: number, extras: string[] = []): Date {
  const feriados = feriadosNatalRN(ano, extras);
  let d = new Date(ano, mes - 1, 1);
  let c = 0;
  for (let i = 0; i < 62; i++) {
    if (ehDiaUtil(d, feriados)) {
      c++;
      if (c === n) return d;
    }
    d = addDays(d, 1);
  }
  return d;
}

export function toIso(d: Date) {
  return ymd(d);
}

export function formatBr(d: Date) {
  return d.toLocaleDateString("pt-BR");
}