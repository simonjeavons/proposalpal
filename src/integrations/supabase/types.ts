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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adhoc_contracts: {
        Row: {
          additional_terms_text: string | null
          agreement_date: string
          client_name: string
          company_reg_number: string
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          last_view_email_at: string | null
          monthly_fee: number
          ongoing_options: Json
          organisation: string
          payment_terms: string
          phases: Json
          prepared_by_user_id: string | null
          programme_title: string
          registered_address_1: string
          registered_address_2: string
          registered_city: string
          registered_county: string
          registered_postcode: string
          retainer_name: string
          retainer_options: Json
          scope_of_work_text: string | null
          signed_at: string | null
          signed_contract_url: string | null
          signer_name: string | null
          signer_title: string | null
          slug: string
          status: string
          template_id: string | null
          updated_at: string
          upfront_items: Json
        }
        Insert: {
          additional_terms_text?: string | null
          agreement_date?: string
          client_name?: string
          company_reg_number?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          last_view_email_at?: string | null
          monthly_fee?: number
          ongoing_options?: Json
          organisation?: string
          payment_terms?: string
          phases?: Json
          prepared_by_user_id?: string | null
          programme_title?: string
          registered_address_1?: string
          registered_address_2?: string
          registered_city?: string
          registered_county?: string
          registered_postcode?: string
          retainer_name?: string
          retainer_options?: Json
          scope_of_work_text?: string | null
          signed_at?: string | null
          signed_contract_url?: string | null
          signer_name?: string | null
          signer_title?: string | null
          slug?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          upfront_items?: Json
        }
        Update: {
          additional_terms_text?: string | null
          agreement_date?: string
          client_name?: string
          company_reg_number?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          last_view_email_at?: string | null
          monthly_fee?: number
          ongoing_options?: Json
          organisation?: string
          payment_terms?: string
          phases?: Json
          prepared_by_user_id?: string | null
          programme_title?: string
          registered_address_1?: string
          registered_address_2?: string
          registered_city?: string
          registered_county?: string
          registered_postcode?: string
          retainer_name?: string
          retainer_options?: Json
          scope_of_work_text?: string | null
          signed_at?: string | null
          signed_contract_url?: string | null
          signer_name?: string | null
          signer_title?: string | null
          slug?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          upfront_items?: Json
        }
        Relationships: [
          {
            foreignKeyName: "adhoc_contracts_prepared_by_user_id_fkey"
            columns: ["prepared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adhoc_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "service_agreement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_views: {
        Row: {
          contract_id: string
          id: string
          ip: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          contract_id: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          contract_id?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_views_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "adhoc_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          default_price: number
          description: string | null
          id: string
          is_ongoing: boolean
          is_upfront: boolean
          name: string
          service_type_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          is_ongoing?: boolean
          is_upfront?: boolean
          name: string
          service_type_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          is_ongoing?: boolean
          is_upfront?: boolean
          name?: string
          service_type_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          job_title: string
          office_phone: string | null
          phone_number: string
          role: string
          team_member_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          job_title?: string
          office_phone?: string | null
          phone_number?: string
          role?: string
          team_member_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string
          office_phone?: string | null
          phone_number?: string
          role?: string
          team_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_acceptances: {
        Row: {
          created_at: string
          first_year_total: number
          id: string
          pricing_option: string | null
          proposal_id: string
          retainer_price: number
          selected_extras: Json
          selected_retainer_index: number
          signature_data: string | null
          signed_at: string
          signed_contract_url: string | null
          signer_name: string
          signer_title: string
          signing_error: string | null
          upfront_total: number
        }
        Insert: {
          created_at?: string
          first_year_total?: number
          id?: string
          pricing_option?: string | null
          proposal_id: string
          retainer_price?: number
          selected_extras?: Json
          selected_retainer_index?: number
          signature_data?: string | null
          signed_at?: string
          signed_contract_url?: string | null
          signer_name: string
          signer_title?: string
          signing_error?: string | null
          upfront_total?: number
        }
        Update: {
          created_at?: string
          first_year_total?: number
          id?: string
          pricing_option?: string | null
          proposal_id?: string
          retainer_price?: number
          selected_extras?: Json
          selected_retainer_index?: number
          signature_data?: string | null
          signed_at?: string
          signed_contract_url?: string | null
          signer_name?: string
          signer_title?: string
          signing_error?: string | null
          upfront_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_acceptances_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          id: string
          ip: string | null
          proposal_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip?: string | null
          proposal_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip?: string | null
          proposal_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          challenge_intro: string
          challenges: Json
          client_email: string | null
          client_logo_url: string | null
          client_name: string
          commercial_opportunity: string
          company_reg_number: string
          contact_email: string
          contact_mobile: string
          contact_name: string
          contact_phone: string
          contract_file_url: string | null
          core_section_title: string | null
          created_at: string
          hide_phase_durations: boolean | null
          id: string
          last_view_email_at: string | null
          launch_phase: Json | null
          lead_team_member_id: string | null
          next_steps: Json | null
          ongoing_section_title: string | null
          organisation: string
          partnership_overview: string
          payment_terms: string | null
          phases: Json
          prepared_by: string
          prepared_by_user_id: string | null
          pricing_model: string
          programme_title: string
          proposal_date: string
          registered_address_1: string
          registered_address_2: string
          registered_city: string
          registered_county: string
          registered_postcode: string
          retainer_options: Json
          saas_config: Json | null
          sector: string
          service_agreement_template_id: string | null
          slug: string
          staff: string
          status: string
          strategic_focus: string
          team_member_ids: Json | null
          tech_stack: string
          updated_at: string
          upfront_items: Json
          upfront_notes: string | null
          upfront_section_title: string | null
          upfront_total: number
          valid_until: string
          viewed_at: string | null
          whats_needed: string
          working_together: string
        }
        Insert: {
          challenge_intro?: string
          challenges?: Json
          client_email?: string | null
          client_logo_url?: string | null
          client_name?: string
          commercial_opportunity?: string
          company_reg_number?: string
          contact_email?: string
          contact_mobile?: string
          contact_name?: string
          contact_phone?: string
          contract_file_url?: string | null
          core_section_title?: string | null
          created_at?: string
          hide_phase_durations?: boolean | null
          id?: string
          last_view_email_at?: string | null
          launch_phase?: Json | null
          lead_team_member_id?: string | null
          next_steps?: Json | null
          ongoing_section_title?: string | null
          organisation?: string
          partnership_overview?: string
          payment_terms?: string | null
          phases?: Json
          prepared_by?: string
          prepared_by_user_id?: string | null
          pricing_model?: string
          programme_title?: string
          proposal_date?: string
          registered_address_1?: string
          registered_address_2?: string
          registered_city?: string
          registered_county?: string
          registered_postcode?: string
          retainer_options?: Json
          saas_config?: Json | null
          sector?: string
          service_agreement_template_id?: string | null
          slug?: string
          staff?: string
          status?: string
          strategic_focus?: string
          team_member_ids?: Json | null
          tech_stack?: string
          updated_at?: string
          upfront_items?: Json
          upfront_notes?: string | null
          upfront_section_title?: string | null
          upfront_total?: number
          valid_until?: string
          viewed_at?: string | null
          whats_needed?: string
          working_together?: string
        }
        Update: {
          challenge_intro?: string
          challenges?: Json
          client_email?: string | null
          client_logo_url?: string | null
          client_name?: string
          commercial_opportunity?: string
          company_reg_number?: string
          contact_email?: string
          contact_mobile?: string
          contact_name?: string
          contact_phone?: string
          contract_file_url?: string | null
          core_section_title?: string | null
          created_at?: string
          hide_phase_durations?: boolean | null
          id?: string
          last_view_email_at?: string | null
          launch_phase?: Json | null
          lead_team_member_id?: string | null
          next_steps?: Json | null
          ongoing_section_title?: string | null
          organisation?: string
          partnership_overview?: string
          payment_terms?: string | null
          phases?: Json
          prepared_by?: string
          prepared_by_user_id?: string | null
          pricing_model?: string
          programme_title?: string
          proposal_date?: string
          registered_address_1?: string
          registered_address_2?: string
          registered_city?: string
          registered_county?: string
          registered_postcode?: string
          retainer_options?: Json
          saas_config?: Json | null
          sector?: string
          service_agreement_template_id?: string | null
          slug?: string
          staff?: string
          status?: string
          strategic_focus?: string
          team_member_ids?: Json | null
          tech_stack?: string
          updated_at?: string
          upfront_items?: Json
          upfront_notes?: string | null
          upfront_section_title?: string | null
          upfront_total?: number
          valid_until?: string
          viewed_at?: string | null
          whats_needed?: string
          working_together?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_lead_team_member_id_fkey"
            columns: ["lead_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_prepared_by_user_id_fkey"
            columns: ["prepared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_service_agreement_template_id_fkey"
            columns: ["service_agreement_template_id"]
            isOneToOne: false
            referencedRelation: "service_agreement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreement_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sections: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sections?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sections?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_type_challenges: {
        Row: {
          created_at: string
          description: string
          id: string
          service_type_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          service_type_id: string
          sort_order?: number
          title?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          service_type_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_type_challenges_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_type_phases: {
        Row: {
          created_at: string
          duration: string
          id: string
          label: string
          price: string
          service_type_id: string
          sort_order: number
          tasks: Json
          title: string
        }
        Insert: {
          created_at?: string
          duration?: string
          id?: string
          label?: string
          price?: string
          service_type_id: string
          sort_order?: number
          tasks?: Json
          title?: string
        }
        Update: {
          created_at?: string
          duration?: string
          id?: string
          label?: string
          price?: string
          service_type_id?: string
          sort_order?: number
          tasks?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_type_phases_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          commercial_opportunity_template: string
          created_at: string
          id: string
          is_ongoing: boolean
          is_upfront: boolean
          name: string
          partnership_overview_template: string
          sort_order: number
          strategic_focus_template: string
          whats_needed_template: string
          working_together_template: string
        }
        Insert: {
          commercial_opportunity_template?: string
          created_at?: string
          id?: string
          is_ongoing?: boolean
          is_upfront?: boolean
          name: string
          partnership_overview_template?: string
          sort_order?: number
          strategic_focus_template?: string
          whats_needed_template?: string
          working_together_template?: string
        }
        Update: {
          commercial_opportunity_template?: string
          created_at?: string
          id?: string
          is_ongoing?: boolean
          is_upfront?: boolean
          name?: string
          partnership_overview_template?: string
          sort_order?: number
          strategic_focus_template?: string
          whats_needed_template?: string
          working_together_template?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          job_title: string | null
          linkedin_url: string | null
          photo_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          photo_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          photo_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_phases: {
        Row: {
          created_at: string
          duration: string
          id: string
          label: string
          price: string
          service_type_id: string
          sort_order: number
          tasks: Json
          title: string
        }
        Insert: {
          created_at?: string
          duration?: string
          id?: string
          label?: string
          price?: string
          service_type_id: string
          sort_order?: number
          tasks?: Json
          title?: string
        }
        Update: {
          created_at?: string
          duration?: string
          id?: string
          label?: string
          price?: string
          service_type_id?: string
          sort_order?: number
          tasks?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_phases_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
