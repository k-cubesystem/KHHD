export type UserRole = 'user' | 'admin' | 'tester';

export interface UserProfile {
  id: string;
  email?: string;
  role: UserRole;
  credits: number;
  created_at: string;
}

export interface PricePlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string | null;
  badge_text: string | null;
  features: string[] | null;
  is_active: boolean;
}
