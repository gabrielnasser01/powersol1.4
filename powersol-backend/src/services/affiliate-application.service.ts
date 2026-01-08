import { supabase } from '../config/supabase.js';
import type {
  AffiliateApplication,
  CreateAffiliateApplicationRequest,
  UpdateApplicationStatusRequest,
} from '../types/affiliate-application.types.js';

export class AffiliateApplicationService {
  async createApplication(data: CreateAffiliateApplicationRequest): Promise<AffiliateApplication> {
    const existingApplication = await this.getApplicationByWallet(data.wallet_address);
    if (existingApplication) {
      throw new Error('You have already submitted an application');
    }

    const { data: application, error } = await supabase
      .from('affiliate_applications')
      .insert({
        wallet_address: data.wallet_address,
        full_name: data.full_name,
        email: data.email,
        country: data.country,
        social_media: data.social_media,
        marketing_experience: data.marketing_experience,
        marketing_strategy: data.marketing_strategy,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create application: ${error.message}`);
    }

    return application;
  }

  async getApplicationByWallet(walletAddress: string): Promise<AffiliateApplication | null> {
    const { data, error } = await supabase
      .from('affiliate_applications')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch application: ${error.message}`);
    }

    return data;
  }

  async getAllApplications(
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<{ applications: AffiliateApplication[]; total: number }> {
    let query = supabase
      .from('affiliate_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch applications: ${error.message}`);
    }

    return {
      applications: data || [],
      total: count || 0,
    };
  }

  async updateApplicationStatus(
    applicationId: string,
    update: UpdateApplicationStatusRequest
  ): Promise<AffiliateApplication> {
    const { data, error } = await supabase
      .from('affiliate_applications')
      .update({
        status: update.status,
        admin_notes: update.admin_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update application: ${error.message}`);
    }

    return data;
  }

  async deleteApplication(applicationId: string): Promise<void> {
    const { error } = await supabase
      .from('affiliate_applications')
      .delete()
      .eq('id', applicationId);

    if (error) {
      throw new Error(`Failed to delete application: ${error.message}`);
    }
  }
}

export const affiliateApplicationService = new AffiliateApplicationService();
