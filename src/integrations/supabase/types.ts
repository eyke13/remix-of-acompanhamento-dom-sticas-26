export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      checklist_competencia_itens: {
        Row: {
          competencia_id: string
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          concluido_por_nome: string | null
          created_at: string
          empregador_id: string
          id: string
          obrigatorio: boolean
          obs_visualizada_em: string | null
          ordem: number
          origem_camada: string
          origem_item_empresa_id: string | null
          origem_item_id: string | null
          origem_modelo_nome: string | null
          sistema: boolean
          texto: string
          updated_at: string
        }
        Insert: {
          competencia_id: string
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          concluido_por_nome?: string | null
          created_at?: string
          empregador_id: string
          id?: string
          obrigatorio?: boolean
          obs_visualizada_em?: string | null
          ordem: number
          origem_camada?: string
          origem_item_empresa_id?: string | null
          origem_item_id?: string | null
          origem_modelo_nome?: string | null
          sistema?: boolean
          texto: string
          updated_at?: string
        }
        Update: {
          competencia_id?: string
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          concluido_por_nome?: string | null
          created_at?: string
          empregador_id?: string
          id?: string
          obrigatorio?: boolean
          obs_visualizada_em?: string | null
          ordem?: number
          origem_camada?: string
          origem_item_empresa_id?: string | null
          origem_item_id?: string | null
          origem_modelo_nome?: string | null
          sistema?: boolean
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_competencia_itens_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_competencia_itens_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_competencia_itens_empregador_id_fkey"
            columns: ["empregador_id"]
            isOneToOne: false
            referencedRelation: "empregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_competencia_itens_origem_item_empresa_id_fkey"
            columns: ["origem_item_empresa_id"]
            isOneToOne: false
            referencedRelation: "checklist_itens_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_competencia_itens_origem_item_id_fkey"
            columns: ["origem_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_modelo_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens_empresa: {
        Row: {
          created_at: string
          empregador_id: string
          id: string
          obrigatorio: boolean
          ordem: number
          texto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empregador_id: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          texto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empregador_id?: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_itens_empresa_empregador_id_fkey"
            columns: ["empregador_id"]
            isOneToOne: false
            referencedRelation: "empregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_modelo_empregadores: {
        Row: {
          created_at: string
          empregador_id: string
          modelo_id: string
        }
        Insert: {
          created_at?: string
          empregador_id: string
          modelo_id: string
        }
        Update: {
          created_at?: string
          empregador_id?: string
          modelo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_modelo_empregadores_empregador_id_fkey"
            columns: ["empregador_id"]
            isOneToOne: false
            referencedRelation: "empregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_modelo_empregadores_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "checklist_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_modelo_itens: {
        Row: {
          created_at: string
          id: string
          modelo_id: string
          obrigatorio: boolean
          ordem: number
          texto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          modelo_id: string
          obrigatorio?: boolean
          ordem: number
          texto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          modelo_id?: string
          obrigatorio?: boolean
          ordem?: number
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_modelo_itens_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "checklist_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_modelos: {
        Row: {
          ativo: boolean
          categoria_tipo: string | null
          categorias_especiais: string[]
          created_at: string
          escopo: Database["public"]["Enums"]["checklist_escopo_enum"]
          id: string
          nome: string
          prioridade: number
          somar_ao_geral: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_tipo?: string | null
          categorias_especiais?: string[]
          created_at?: string
          escopo: Database["public"]["Enums"]["checklist_escopo_enum"]
          id?: string
          nome: string
          prioridade?: number
          somar_ao_geral?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_tipo?: string | null
          categorias_especiais?: string[]
          created_at?: string
          escopo?: Database["public"]["Enums"]["checklist_escopo_enum"]
          id?: string
          nome?: string
          prioridade?: number
          somar_ao_geral?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      competencias: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          rotulo: string
          status: Database["public"]["Enums"]["competencia_status_enum"]
          vencimento_dae: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          rotulo: string
          status?: Database["public"]["Enums"]["competencia_status_enum"]
          vencimento_dae: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          rotulo?: string
          status?: Database["public"]["Enums"]["competencia_status_enum"]
          vencimento_dae?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          antecipa_dia_nao_util: boolean
          checklist_ativo: boolean
          checklist_competencia_inicial_id: string | null
          dia_vencimento_dae: number
          feriados_extras: string[]
          id: number
          updated_at: string
        }
        Insert: {
          antecipa_dia_nao_util?: boolean
          checklist_ativo?: boolean
          checklist_competencia_inicial_id?: string | null
          dia_vencimento_dae?: number
          feriados_extras?: string[]
          id?: number
          updated_at?: string
        }
        Update: {
          antecipa_dia_nao_util?: boolean
          checklist_ativo?: boolean
          checklist_competencia_inicial_id?: string | null
          dia_vencimento_dae?: number
          feriados_extras?: string[]
          id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_checklist_competencia_inicial_id_fkey"
            columns: ["checklist_competencia_inicial_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_ocultos: {
        Row: {
          chave: string
          empregador_id: string
          id: string
          oculto_em: string
          tipo: string
        }
        Insert: {
          chave: string
          empregador_id: string
          id?: string
          oculto_em?: string
          tipo: string
        }
        Update: {
          chave?: string
          empregador_id?: string
          id?: string
          oculto_em?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_ocultos_empregador_id_fkey"
            columns: ["empregador_id"]
            isOneToOne: false
            referencedRelation: "empregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      empregadores: {
        Row: {
          canal_dados: Database["public"]["Enums"]["canal_dados_enum"] | null
          codigo: number
          created_at: string
          dia_corte: number | null
          documento: string | null
          eh_domestico: boolean
          email: string | null
          id: string
          nome: string
          observacoes_fixas: string | null
          programacao_ferias: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["empregador_status_enum"]
          telefone: string | null
          tipo_documento:
            | Database["public"]["Enums"]["tipo_documento_enum"]
            | null
        }
        Insert: {
          canal_dados?: Database["public"]["Enums"]["canal_dados_enum"] | null
          codigo: number
          created_at?: string
          dia_corte?: number | null
          documento?: string | null
          eh_domestico?: boolean
          email?: string | null
          id?: string
          nome: string
          observacoes_fixas?: string | null
          programacao_ferias?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["empregador_status_enum"]
          telefone?: string | null
          tipo_documento?:
            | Database["public"]["Enums"]["tipo_documento_enum"]
            | null
        }
        Update: {
          canal_dados?: Database["public"]["Enums"]["canal_dados_enum"] | null
          codigo?: number
          created_at?: string
          dia_corte?: number | null
          documento?: string | null
          eh_domestico?: boolean
          email?: string | null
          id?: string
          nome?: string
          observacoes_fixas?: string | null
          programacao_ferias?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["empregador_status_enum"]
          telefone?: string | null
          tipo_documento?:
            | Database["public"]["Enums"]["tipo_documento_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "empregadores_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      empregados: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_desligamento: string | null
          data_ultimas_ferias_gozadas: string | null
          empregador_id: string
          id: string
          nome: string
          observacoes: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          recebe_vt: boolean
          salario_base: number | null
          situacao: Database["public"]["Enums"]["empregado_situacao_enum"]
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          data_ultimas_ferias_gozadas?: string | null
          empregador_id: string
          id?: string
          nome: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          recebe_vt?: boolean
          salario_base?: number | null
          situacao?: Database["public"]["Enums"]["empregado_situacao_enum"]
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          data_ultimas_ferias_gozadas?: string | null
          empregador_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          recebe_vt?: boolean
          salario_base?: number | null
          situacao?: Database["public"]["Enums"]["empregado_situacao_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "empregados_empregador_id_fkey"
            columns: ["empregador_id"]
            isOneToOne: false
            referencedRelation: "empregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_dp: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          empregado_id: string
          id: string
          tipo: Database["public"]["Enums"]["evento_tipo_enum"]
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          empregado_id: string
          id?: string
          tipo: Database["public"]["Enums"]["evento_tipo_enum"]
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          empregado_id?: string
          id?: string
          tipo?: Database["public"]["Enums"]["evento_tipo_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "eventos_dp_empregado_id_fkey"
            columns: ["empregado_id"]
            isOneToOne: false
            referencedRelation: "empregados"
            referencedColumns: ["id"]
          },
        ]
      }
      processamentos: {
        Row: {
          checklist_aplicado_em: string | null
          checklist_modelos_ids: string[]
          competencia_id: string
          concluido: boolean
          created_at: string
          empregador_id: string
          enviado_cliente: boolean
          id: string
          justificado_portal: boolean
          observacao_calculo: string | null
          observacao_mes: string | null
          possui_movimento: Database["public"]["Enums"]["possui_movimento_enum"]
          situacao: string | null
          status_dae: Database["public"]["Enums"]["status_etapa_enum"]
          status_fgts_dctfweb: Database["public"]["Enums"]["status_etapa_enum"]
          status_folha: Database["public"]["Enums"]["status_etapa_enum"]
          tem_variavel: boolean
          updated_at: string
          valor_dae: number | null
          valor_folha: number | null
        }
        Insert: {
          checklist_aplicado_em?: string | null
          checklist_modelos_ids?: string[]
          competencia_id: string
          concluido?: boolean
          created_at?: string
          empregador_id: string
          enviado_cliente?: boolean
          id?: string
          justificado_portal?: boolean
          observacao_calculo?: string | null
          observacao_mes?: string | null
          possui_movimento?: Database["public"]["Enums"]["possui_movimento_enum"]
          situacao?: string | null
          status_dae?: Database["public"]["Enums"]["status_etapa_enum"]
          status_fgts_dctfweb?: Database["public"]["Enums"]["status_etapa_enum"]
          status_folha?: Database["public"]["Enums"]["status_etapa_enum"]
          tem_variavel?: boolean
          updated_at?: string
          valor_dae?: number | null
          valor_folha?: number | null
        }
        Update: {
          checklist_aplicado_em?: string | null
          checklist_modelos_ids?: string[]
          competencia_id?: string
          concluido?: boolean
          created_at?: string
          empregador_id?: string
          enviado_cliente?: boolean
          id?: string
          justificado_portal?: boolean
          observacao_calculo?: string | null
          observacao_mes?: string | null
          possui_movimento?: Database["public"]["Enums"]["possui_movimento_enum"]
          situacao?: string | null
          status_dae?: Database["public"]["Enums"]["status_etapa_enum"]
          status_fgts_dctfweb?: Database["public"]["Enums"]["status_etapa_enum"]
          status_folha?: Database["public"]["Enums"]["status_etapa_enum"]
          tem_variavel?: boolean
          updated_at?: string
          valor_dae?: number | null
          valor_folha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processamentos_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processamentos_empregador_id_fkey"
            columns: ["empregador_id"]
            isOneToOne: false
            referencedRelation: "empregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_competencia: {
        Args: { p_ano: number; p_importar_variavel?: boolean; p_mes: number }
        Returns: string
      }
      aplicar_checklist_competencia: {
        Args: {
          p_competencia_id: string
          p_empregador_id: string
          p_forcar?: boolean
        }
        Returns: undefined
      }
      aplicar_checklist_competencia_lote: {
        Args: { p_competencia_id: string; p_forcar?: boolean }
        Returns: number
      }
      aplicar_eventos_competencia: {
        Args: { p_comp_id: string }
        Returns: number
      }
      checklist_aplicavel_row: {
        Args: {
          p_aplicado_em: string
          p_competencia_id: string
          p_empregador_id: string
        }
        Returns: boolean
      }
      checklist_bloqueia_conclusao: {
        Args: { p_competencia_id: string; p_empregador_id: string }
        Returns: boolean
      }
      checklist_reaplicar_e_recalcular: {
        Args: { p_competencia_id: string; p_forcar?: boolean }
        Returns: number
      }
      checklist_status_competencia: {
        Args: { p_competencia_id: string }
        Returns: {
          checklist_aplicavel: boolean
          competencia_id: string
          concluidos: number
          divergente: boolean
          empregador_id: string
          movimento_indefinido: boolean
          pode_reaplicar_silencioso: boolean
          situacao: string
          tem_marcacao: boolean
          total: number
        }[]
      }
      checklist_tem_modelo_dependente_de_movimento: {
        Args: never
        Returns: boolean
      }
      dia_util_anterior: { Args: { p_data: string }; Returns: string }
      excluir_competencia: {
        Args: { p_competencia_id: string; p_forcar?: boolean }
        Returns: undefined
      }
      recalcular_conclusao_competencia: {
        Args: { p_competencia_id: string }
        Returns: number
      }
      recalcular_conclusao_competencias_abertas: {
        Args: never
        Returns: number
      }
      resolver_modelo_checklist: {
        Args: { p_competencia_id: string; p_empregador_id: string }
        Returns: string[]
      }
    }
    Enums: {
      canal_dados_enum: "portal_elite" | "email" | "whatsapp" | "outro"
      checklist_escopo_enum: "global" | "categoria" | "empregador"
      competencia_status_enum: "aberta" | "fechada"
      empregado_situacao_enum:
        | "ativo"
        | "ferias"
        | "afastado"
        | "aviso_previo"
        | "desligado"
      empregador_status_enum: "ativo" | "inativo" | "ex_cliente"
      evento_tipo_enum:
        | "admissao"
        | "rescisao"
        | "ferias"
        | "afastamento"
        | "aviso_previo"
        | "decimo_terceiro"
        | "retorno"
        | "outro"
      possui_movimento_enum: "com_movimento" | "sem_movimento" | "indefinido"
      status_etapa_enum: "pendente" | "ok" | "validado" | "nao_aplicavel"
      tipo_documento_enum: "CPF" | "CNPJ"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canal_dados_enum: ["portal_elite", "email", "whatsapp", "outro"],
      checklist_escopo_enum: ["global", "categoria", "empregador"],
      competencia_status_enum: ["aberta", "fechada"],
      empregado_situacao_enum: [
        "ativo",
        "ferias",
        "afastado",
        "aviso_previo",
        "desligado",
      ],
      empregador_status_enum: ["ativo", "inativo", "ex_cliente"],
      evento_tipo_enum: [
        "admissao",
        "rescisao",
        "ferias",
        "afastamento",
        "aviso_previo",
        "decimo_terceiro",
        "retorno",
        "outro",
      ],
      possui_movimento_enum: ["com_movimento", "sem_movimento", "indefinido"],
      status_etapa_enum: ["pendente", "ok", "validado", "nao_aplicavel"],
      tipo_documento_enum: ["CPF", "CNPJ"],
    },
  },
} as const
