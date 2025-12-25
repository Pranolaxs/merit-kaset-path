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
      academic_periods: {
        Row: {
          academic_year: number
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          semester: number
          start_date: string
          updated_at: string | null
        }
        Insert: {
          academic_year: number
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          semester: number
          start_date: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: number
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          semester?: number
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      application_attachments: {
        Row: {
          application_id: string
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string | null
          id: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_attachments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          achievements: string | null
          activity_hours: number | null
          award_type_id: string
          created_at: string | null
          current_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          description: string | null
          id: string
          period_id: string
          project_name: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          achievements?: string | null
          activity_hours?: number | null
          award_type_id: string
          created_at?: string | null
          current_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          description?: string | null
          id?: string
          period_id: string
          project_name?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          achievements?: string | null
          activity_hours?: number | null
          award_type_id?: string
          created_at?: string | null
          current_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          description?: string | null
          id?: string
          period_id?: string
          project_name?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_award_type_id_fkey"
            columns: ["award_type_id"]
            isOneToOne: false
            referencedRelation: "award_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_logs: {
        Row: {
          action_type: string
          actor_id: string
          application_id: string
          comment: string | null
          created_at: string | null
          from_status: Database["public"]["Enums"]["application_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["application_status"] | null
        }
        Insert: {
          action_type: string
          actor_id: string
          application_id: string
          comment?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["application_status"] | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          application_id?: string
          comment?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["application_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      award_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          required_docs: Json | null
          type_code: string
          type_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          required_docs?: Json | null
          type_code: string
          type_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          required_docs?: Json | null
          type_code?: string
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      committee_votes: {
        Row: {
          application_id: string
          comment: string | null
          committee_id: string
          created_at: string | null
          id: string
          is_agree: boolean
        }
        Insert: {
          application_id: string
          comment?: string | null
          committee_id: string
          created_at?: string | null
          id?: string
          is_agree: boolean
        }
        Update: {
          application_id?: string
          comment?: string | null
          committee_id?: string
          created_at?: string | null
          id?: string
          is_agree?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "committee_votes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_votes_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          dept_code: string
          dept_name: string
          faculty_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dept_code: string
          dept_name: string
          faculty_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dept_code?: string
          dept_name?: string
          faculty_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          created_at: string | null
          faculty_code: string
          faculty_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          faculty_code: string
          faculty_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          faculty_code?: string
          faculty_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      personnel_profiles: {
        Row: {
          created_at: string | null
          department_id: string | null
          faculty_id: string | null
          first_name: string
          id: string
          last_name: string
          position: Database["public"]["Enums"]["personnel_position"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          faculty_id?: string | null
          first_name: string
          id?: string
          last_name: string
          position: Database["public"]["Enums"]["personnel_position"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          faculty_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          position?: Database["public"]["Enums"]["personnel_position"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_profiles_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string | null
          department_id: string | null
          first_name: string
          gpax: number | null
          id: string
          last_name: string
          student_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          first_name: string
          gpax?: number | null
          id?: string
          last_name: string
          student_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          first_name?: string
          gpax?: number | null
          id?: string
          last_name?: string
          student_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_personnel_position: {
        Args: { auth_id: string }
        Returns: Database["public"]["Enums"]["personnel_position"]
      }
      get_user_id: { Args: { auth_id: string }; Returns: string }
      get_user_role: {
        Args: { auth_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_vote_percentage: {
        Args: { nomination_uuid: string }
        Returns: number
      }
      is_approver: { Args: { _user_id: string }; Returns: boolean }
      is_staff_or_admin: { Args: { auth_id: string }; Returns: boolean }
    }
    Enums: {
      application_status:
        | "draft"
        | "submitted"
        | "dept_review"
        | "faculty_review"
        | "student_affairs_review"
        | "committee_review"
        | "chairman_review"
        | "president_review"
        | "approved"
        | "rejected"
      personnel_position:
        | "dean"
        | "associate_dean"
        | "department_head"
        | "student_affairs"
        | "committee_member"
        | "committee_chairman"
        | "president"
      user_role: "student" | "staff" | "admin"
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
      application_status: [
        "draft",
        "submitted",
        "dept_review",
        "faculty_review",
        "student_affairs_review",
        "committee_review",
        "chairman_review",
        "president_review",
        "approved",
        "rejected",
      ],
      personnel_position: [
        "dean",
        "associate_dean",
        "department_head",
        "student_affairs",
        "committee_member",
        "committee_chairman",
        "president",
      ],
      user_role: ["student", "staff", "admin"],
    },
  },
} as const
