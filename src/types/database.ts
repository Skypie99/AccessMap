export type FlagStatus = 'open' | 'verified' | 'resolved' | 'rejected';

export type FlagCategory =
  | 'no_ramp'
  | 'broken_sidewalk'
  | 'blocked_path'
  | 'missing_signal'
  | 'steep_grade'
  | 'other';

export type FlagSeverity = 1 | 2 | 3 | 4 | 5;

export type FlagRow = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  category: FlagCategory;
  description: string | null;
  severity: FlagSeverity;
  photo_url: string | null;
  status: FlagStatus;
  created_at: string;
};

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  created_at: string;
};

type EmptyRelationships = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}[];

export type Database = {
  public: {
    Tables: {
      flags: {
        Row: FlagRow;
        Insert: Omit<FlagRow, 'id' | 'created_at' | 'status'> & {
          id?: string;
          created_at?: string;
          status?: FlagStatus;
        };
        Update: Partial<FlagRow>;
        Relationships: EmptyRelationships;
      };
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'created_at' | 'points'> & {
          created_at?: string;
          points?: number;
        };
        Update: Partial<UserRow>;
        Relationships: EmptyRelationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
