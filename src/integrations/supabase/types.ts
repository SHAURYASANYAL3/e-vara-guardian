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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      biometric_consent_logs: {
        Row: {
          action: Database["public"]["Enums"]["biometric_action"]
          consent_text: string
          consented_at: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["biometric_action"]
          consent_text: string
          consented_at?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["biometric_action"]
          consent_text?: string
          consented_at?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      face_embeddings: {
        Row: {
          angles_completed: string[]
          consented_at: string
          created_at: string
          embedding_ciphertext: string
          embedding_iv: string
          embedding_version: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          angles_completed?: string[]
          consented_at: string
          created_at?: string
          embedding_ciphertext: string
          embedding_iv: string
          embedding_version?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          angles_completed?: string[]
          consented_at?: string
          created_at?: string
          embedding_ciphertext?: string
          embedding_iv?: string
          embedding_version?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liveness_challenges: {
        Row: {
          challenge_type: Database["public"]["Enums"]["liveness_challenge_type"]
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          instruction: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          challenge_type: Database["public"]["Enums"]["liveness_challenge_type"]
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          instruction: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          challenge_type?: Database["public"]["Enums"]["liveness_challenge_type"]
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          instruction?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          confidence: number | null
          created_at: string
          details: Json
          id: string
          status: Database["public"]["Enums"]["login_attempt_status"]
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          details?: Json
          id?: string
          status: Database["public"]["Enums"]["login_attempt_status"]
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          details?: Json
          id?: string
          status?: Database["public"]["Enums"]["login_attempt_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          keywords: string | null
          social_link: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          keywords?: string | null
          social_link?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          keywords?: string | null
          social_link?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      suspicious_activity_alerts: {
        Row: {
          acknowledged_by_admin: boolean
          acknowledged_by_user: boolean
          alert_type: Database["public"]["Enums"]["alert_type"]
          confidence: number | null
          created_at: string
          id: string
          matched_user_id: string | null
          message: string
          user_id: string
        }
        Insert: {
          acknowledged_by_admin?: boolean
          acknowledged_by_user?: boolean
          alert_type: Database["public"]["Enums"]["alert_type"]
          confidence?: number | null
          created_at?: string
          id?: string
          matched_user_id?: string | null
          message: string
          user_id: string
        }
        Update: {
          acknowledged_by_admin?: boolean
          acknowledged_by_user?: boolean
          alert_type?: Database["public"]["Enums"]["alert_type"]
          confidence?: number | null
          created_at?: string
          id?: string
          matched_user_id?: string | null
          message?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_biometric_consent: {
        Args: {
          _action: Database["public"]["Enums"]["biometric_action"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_type: "duplicate_identity" | "failed_login_pattern"
      app_role: "admin" | "user"
      biometric_action: "registration" | "login"
      liveness_challenge_type: "blink" | "turn_left" | "turn_right"
      login_attempt_status:
        | "success"
        | "failed_liveness"
        | "failed_match"
        | "duplicate_detected"
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
      alert_type: ["duplicate_identity", "failed_login_pattern"],
      app_role: ["admin", "user"],
      biometric_action: ["registration", "login"],
      liveness_challenge_type: ["blink", "turn_left", "turn_right"],
      login_attempt_status: [
        "success",
        "failed_liveness",
        "failed_match",
        "duplicate_detected",
      ],
    },
  },
} as const
