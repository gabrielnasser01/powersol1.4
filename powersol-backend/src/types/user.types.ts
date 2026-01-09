export interface JWTPayload {
  userId: string;
  wallet: string;
  isAdmin?: boolean;
}

export interface User {
  id: string;
  wallet: string;
  wallet_address?: string;
  is_admin: boolean;
  nonce?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthNonceResponse {
  nonce: string;
}

export interface AuthWalletRequest {
  walletAddress: string;
  signature: string;
}

export interface AuthWalletResponse {
  token: string;
  user: Omit<User, 'nonce'>;
}

export interface AuthenticatedUser {
  id: string;
  wallet: string;
  isAdmin: boolean;
}
