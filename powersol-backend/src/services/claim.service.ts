import { supabase, supabaseAdmin } from '@config/supabase.js';
import { NotFoundError, ValidationError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import type { Claim, ClaimStatus } from '../types/claim.types.js';

const logger = loggers.claim;

export class ClaimService {
  async getUserClaims(userId: string): Promise<Claim[]> {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch user claims');
      throw error;
    }

    return data || [];
  }

  async getClaimById(claimId: string): Promise<Claim> {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Claim');
    }

    return data;
  }

  async createClaim(params: {
    user_id: string;
    ticket_id?: string;
    amount: bigint;
    claim_type: 'PRIZE' | 'AFFILIATE' | 'MISSION';
  }): Promise<Claim> {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .insert({
        user_id: params.user_id,
        ticket_id: params.ticket_id || null,
        amount: params.amount.toString(),
        claim_type: params.claim_type,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, params }, 'Failed to create claim');
      throw error;
    }

    logger.info({ claimId: data.id, userId: params.user_id }, 'Claim created');

    return data;
  }

  async markAsClaimed(claimId: string, txSignature: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('claims')
      .update({
        is_claimed: true,
        tx_signature: txSignature,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    if (error) {
      logger.error({ error, claimId }, 'Failed to mark claim as claimed');
      throw error;
    }

    logger.info({ claimId, txSignature }, 'Claim marked as claimed');
  }

  async getClaimStatus(claimId: string): Promise<ClaimStatus> {
    const claim = await this.getClaimById(claimId);

    return {
      status: claim.is_claimed
        ? 'COMPLETED'
        : claim.tx_signature
        ? 'PROCESSING'
        : 'PENDING',
      txSignature: claim.tx_signature,
      amount: BigInt(claim.amount),
      createdAt: new Date(claim.created_at),
      claimedAt: claim.claimed_at ? new Date(claim.claimed_at) : null,
    };
  }

  async getPendingClaims(): Promise<Claim[]> {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select('*')
      .eq('is_claimed', false)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch pending claims');
      throw error;
    }

    return data || [];
  }
}

export const claimService = new ClaimService();
