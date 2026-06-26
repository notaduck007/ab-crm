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
      bid_activity_log: {
        Row: {
          action: string
          bid_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          bid_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          bid_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_activity_log_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_client_companies: {
        Row: {
          bid_id: string
          client_company_id: string
          created_at: string
          id: string
        }
        Insert: {
          bid_id: string
          client_company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          bid_id?: string
          client_company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_client_companies_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_client_companies_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_projects: {
        Row: {
          bid_id: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_projects_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          agency: string
          archived_at: string | null
          assigned_to: string | null
          bid_number: string | null
          bid_url: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          decline_reason: string | null
          dedup_key: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          due_date: string
          estimated_value: number | null
          id: string
          issue_date: string | null
          last_seen_at: string | null
          notes: string | null
          project_name: string
          sector: Database["public"]["Enums"]["bid_sector"]
          source_portal: string | null
          source_run_id: string | null
          status: Database["public"]["Enums"]["bid_status"]
          tier: Database["public"]["Enums"]["bid_tier"]
          updated_at: string
        }
        Insert: {
          agency: string
          archived_at?: string | null
          assigned_to?: string | null
          bid_number?: string | null
          bid_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          decline_reason?: string | null
          dedup_key?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          due_date: string
          estimated_value?: number | null
          id?: string
          issue_date?: string | null
          last_seen_at?: string | null
          notes?: string | null
          project_name: string
          sector?: Database["public"]["Enums"]["bid_sector"]
          source_portal?: string | null
          source_run_id?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          tier: Database["public"]["Enums"]["bid_tier"]
          updated_at?: string
        }
        Update: {
          agency?: string
          archived_at?: string | null
          assigned_to?: string | null
          bid_number?: string | null
          bid_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          decline_reason?: string | null
          dedup_key?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          due_date?: string
          estimated_value?: number | null
          id?: string
          issue_date?: string | null
          last_seen_at?: string | null
          notes?: string | null
          project_name?: string
          sector?: Database["public"]["Enums"]["bid_sector"]
          source_portal?: string | null
          source_run_id?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          tier?: Database["public"]["Enums"]["bid_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      client_companies: {
        Row: {
          created_at: string
          id: string
          market_sector: Database["public"]["Enums"]["market_sector"]
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_sector?: Database["public"]["Enums"]["market_sector"]
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          market_sector?: Database["public"]["Enums"]["market_sector"]
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_company_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary_contact: boolean
          last_name: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          client_company_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary_contact?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_company_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary_contact?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      declined_keys: {
        Row: {
          agency: string | null
          bid_number: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          dedup_key: string
          project_name: string | null
        }
        Insert: {
          agency?: string | null
          bid_number?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          dedup_key: string
          project_name?: string | null
        }
        Update: {
          agency?: string | null
          bid_number?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          dedup_key?: string
          project_name?: string | null
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          detail: Json | null
          errors: number | null
          id: string
          imported: number | null
          ran_at: string | null
          skipped_declined: number | null
          skipped_dup: number | null
          source: string | null
          updated: number | null
        }
        Insert: {
          detail?: Json | null
          errors?: number | null
          id?: string
          imported?: number | null
          ran_at?: string | null
          skipped_declined?: number | null
          skipped_dup?: number | null
          source?: string | null
          updated?: number | null
        }
        Update: {
          detail?: Json | null
          errors?: number | null
          id?: string
          imported?: number | null
          ran_at?: string | null
          skipped_declined?: number | null
          skipped_dup?: number | null
          source?: string | null
          updated?: number | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          client_company_id: string
          client_contact_id: string | null
          created_at: string
          id: string
          interaction_date: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          logged_by_user_id: string
          notes: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          client_company_id: string
          client_contact_id?: string | null
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          logged_by_user_id: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          client_company_id?: string
          client_contact_id?: string | null
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          logged_by_user_id?: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_client_companies: {
        Row: {
          client_company_id: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          client_company_id: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          client_company_id?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_client_companies_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_client_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          anticipated_rfp_date: string | null
          anticipated_rfq_date: string | null
          award_date: string | null
          created_at: string
          estimated_value: number | null
          id: string
          market_sector: Database["public"]["Enums"]["market_sector"]
          name: string
          notes: string | null
          public_tracking_type: Database["public"]["Enums"]["public_tracking_type"]
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          anticipated_rfp_date?: string | null
          anticipated_rfq_date?: string | null
          award_date?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          market_sector?: Database["public"]["Enums"]["market_sector"]
          name: string
          notes?: string | null
          public_tracking_type?: Database["public"]["Enums"]["public_tracking_type"]
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          anticipated_rfp_date?: string | null
          anticipated_rfq_date?: string | null
          award_date?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          market_sector?: Database["public"]["Enums"]["market_sector"]
          name?: string
          notes?: string | null
          public_tracking_type?: Database["public"]["Enums"]["public_tracking_type"]
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          client_company_id: string
          created_at: string
          estimated_pursuit_value: number | null
          id: string
          is_potentially_cold: boolean
          last_interaction_date: string | null
          notes: string | null
          owner_user_id: string | null
          stage: Database["public"]["Enums"]["relationship_stage"]
          strength: Database["public"]["Enums"]["relationship_strength"]
          updated_at: string
        }
        Insert: {
          client_company_id: string
          created_at?: string
          estimated_pursuit_value?: number | null
          id?: string
          is_potentially_cold?: boolean
          last_interaction_date?: string | null
          notes?: string | null
          owner_user_id?: string | null
          stage?: Database["public"]["Enums"]["relationship_stage"]
          strength?: Database["public"]["Enums"]["relationship_strength"]
          updated_at?: string
        }
        Update: {
          client_company_id?: string
          created_at?: string
          estimated_pursuit_value?: number | null
          id?: string
          is_potentially_cold?: boolean
          last_interaction_date?: string | null
          notes?: string | null
          owner_user_id?: string | null
          stage?: Database["public"]["Enums"]["relationship_stage"]
          strength?: Database["public"]["Enums"]["relationship_strength"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: true
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_relationship: {
        Args: { _relationship_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_bids: { Args: { payload: Json }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      bid_sector:
        | "ISD"
        | "Higher Education"
        | "City"
        | "County"
        | "Charter School"
        | "Private Education"
        | "Other"
      bid_status:
        | "New"
        | "Reviewing"
        | "Pursuing"
        | "Submitted"
        | "Awarded"
        | "No-Go"
        | "Declined"
      bid_tier: "A" | "B" | "AE"
      delivery_method:
        | "GC"
        | "CMAR"
        | "Design-Build"
        | "RFQ/Pre-qual"
        | "Architect-Engineer Lead"
        | "Other"
      interaction_type:
        | "Call"
        | "Email"
        | "Meeting"
        | "SiteVisit"
        | "Conference"
        | "Other"
      market_sector:
        | "Public"
        | "ISD"
        | "Municipal"
        | "HigherEd"
        | "CharterSchool"
        | "Private"
        | "Other"
      project_status: "Prospect" | "ActivePursuit" | "Awarded" | "Lost"
      public_tracking_type:
        | "Bond"
        | "Charter"
        | "CoopContract"
        | "RFQ"
        | "RFP"
        | "Other"
      relationship_stage:
        | "TargetIdentified"
        | "InitialOutreach"
        | "Introductions"
        | "ActivePursuit"
        | "AwardedWork"
        | "Dormant"
        | "Lost"
      relationship_strength: "Cold" | "Neutral" | "Warm"
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
      app_role: ["admin", "user"],
      bid_sector: [
        "ISD",
        "Higher Education",
        "City",
        "County",
        "Charter School",
        "Private Education",
        "Other",
      ],
      bid_status: [
        "New",
        "Reviewing",
        "Pursuing",
        "Submitted",
        "Awarded",
        "No-Go",
        "Declined",
      ],
      bid_tier: ["A", "B", "AE"],
      delivery_method: [
        "GC",
        "CMAR",
        "Design-Build",
        "RFQ/Pre-qual",
        "Architect-Engineer Lead",
        "Other",
      ],
      interaction_type: [
        "Call",
        "Email",
        "Meeting",
        "SiteVisit",
        "Conference",
        "Other",
      ],
      market_sector: [
        "Public",
        "ISD",
        "Municipal",
        "HigherEd",
        "CharterSchool",
        "Private",
        "Other",
      ],
      project_status: ["Prospect", "ActivePursuit", "Awarded", "Lost"],
      public_tracking_type: [
        "Bond",
        "Charter",
        "CoopContract",
        "RFQ",
        "RFP",
        "Other",
      ],
      relationship_stage: [
        "TargetIdentified",
        "InitialOutreach",
        "Introductions",
        "ActivePursuit",
        "AwardedWork",
        "Dormant",
        "Lost",
      ],
      relationship_strength: ["Cold", "Neutral", "Warm"],
    },
  },
} as const
