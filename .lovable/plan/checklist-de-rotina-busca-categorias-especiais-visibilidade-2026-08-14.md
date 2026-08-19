# Checklist de rotina — busca, categorias especiais, visibilidade e itens por empresa

## 1. Busca de empregadores no modelo "Empregadores específicos"
No editor de modelo (Configurações → Modelos de checklist), acima da lista rolável:
- Campo de busca que filtra de verdade a lista, por nome, código e CNPJ/CPF.
- Normalização: sem acento, minúsculas, sem pontuação — "849.889.404-20" acha "84988940420"; "#110" acha "110".
- Lista ordenada por código crescente.
- Contador "X de Y empregadores" e altura maior da lista.
- Mantidos: toggle Ativo, "Somar aos gerais", itens com reordenar/excluir.

## 2. "Uma categoria" → "Categorias especiais"
- A opção passa a se chamar "Categorias especiais".
- O segundo campo vira seleção múltipla (checkboxes) com:
  - Com variável (processamento com variável marcada)
  - Sem variável
  - Possui FGTS/DCTFWeb (empregador não-doméstico ou processamento com essa etapa aplicável)
- O modelo passa a valer para todo empregador/processamento que se encaixe em qualquer uma das características marcadas.
- Novo campo `categorias_especiais` (lista de textos) no modelo; a categoria antiga (`categoria_tipo`) continua funcionando para modelos já existentes.

## 3. Checklist visível no painel
- Nova coluna/botão claro "Ver checklist" (ícone de lista + contagem tipo 3/7) na linha do empregador no Painel Mensal.
- Ao clicar, expande uma linha logo abaixo daquela empresa com o checklist completo da competência selecionada, já mesclado por camadas; clicar de novo recolhe. O popover atual continua existindo para marcação rápida.
- Dentro do painel expandido: marcar/desmarcar itens um a um e campo para adicionar item só daquela empresa.
- O botão "Marcar todos" é removido (também do popover atual): nenhuma ação em massa pode marcar Folha/DAE/FGTS automaticamente.

## 4. Itens por empresa acima dos herdados (camadas)
Ordem do checklist efetivo, de cima para baixo:
1. Itens específicos da empresa
2. Itens das categorias especiais em que a empresa se encaixa
3. Itens dos modelos gerais (quando "Somar aos gerais" estiver ligado)

Regras:
- Itens herdados de categoria/geral são somente leitura no contexto da empresa; o modelo permanece intacto para as demais empresas.
- Itens da empresa podem ser adicionados, editados, reordenados e excluídos sem afetar categoria nem outras empresas.
- Cada item exibe um rótulo discreto de origem: "empresa", "categoria: com variável", "geral".
- Novo armazenamento: tabela de itens por empresa (id próprio e estável, empregador_id, texto, ordem, obrigatório), separada dos itens de modelo. Ao montar o checklist da competência, esses itens entram sempre no topo.
- Em qualquer reaplicação de modelo, os itens da camada empresa e suas marcações são preservados pelo id de origem do item (nunca por comparação de texto), então renomear um item não perde a conclusão.

## 5. Coerência
- A marcação de conclusão continua por empresa + competência e nunca altera textos de modelo.
- Reordenar itens da empresa mexe só na camada da empresa; a barra de progresso e o bloqueio de conclusão passam a considerar as três camadas.

## Detalhes técnicos
- Migração: coluna `categorias_especiais text[]` em `checklist_modelos`; tabela `checklist_itens_empresa` (empregador_id, ordem, texto, obrigatorio, timestamps) com GRANTs e política aberta (fase 1, igual às demais); coluna `origem_camada` ('empresa' | 'categoria' | 'geral') em `checklist_competencia_itens`.
- `resolver_modelo_checklist`: passa a casar modelos de escopo categoria por `categorias_especiais` avaliadas contra `processamentos.tem_variavel`, `empregadores.eh_domestico` e `status_fgts_dctfweb`, mantendo compatibilidade com `categoria_tipo`.
- `aplicar_checklist_competencia`: insere primeiro a camada da empresa (ordens iniciais), depois categoria, depois geral, gravando `origem_camada` e o nome da origem. A camada empresa é sincronizada por `origem_item_empresa_id` (upsert por esse id), preservando `concluido`/`concluido_em`/`concluido_por`; itens removidos da empresa saem do snapshot.
- Remoção do fluxo "Marcar todos" em `checklist-popover.tsx` (mutação e botão).
- Frontend: `checklist-models-panel.tsx` (busca + categorias especiais), `checklist-popover.tsx` (rótulos de origem + edição da camada da empresa), `routes/index.tsx` (botão e linha expansível).
