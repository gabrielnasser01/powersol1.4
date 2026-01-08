export interface JWTPayload {
  userId: string;
  wallet: string;
  isAdmin?: boolean;
}

export interface User {
  id: string;
  wallet: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}
