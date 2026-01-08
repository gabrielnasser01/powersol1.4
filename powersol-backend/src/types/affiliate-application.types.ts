export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AffiliateApplication {
  id: string;
  wallet_address: string;
  full_name: string;
  email: string;
  country?: string;
  social_media?: string;
  marketing_experience?: string;
  marketing_strategy?: string;
  status: ApplicationStatus;
  admin_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAffiliateApplicationRequest {
  wallet_address: string;
  full_name: string;
  email: string;
  country?: string;
  social_media?: string;
  marketing_experience?: string;
  marketing_strategy?: string;
}

export interface UpdateApplicationStatusRequest {
  status: ApplicationStatus;
  admin_notes?: string;
}
