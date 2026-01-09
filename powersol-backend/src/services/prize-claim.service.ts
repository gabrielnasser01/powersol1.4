import { supabase, supabaseAdmin } from '../config/supabase.js';
import { NotFoundError, ValidationError } from '@utils/errors.js';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

interface Prize {
  id: string;
  draw_id: number | null;
  round: number;
  user_wallet: string;
  ticket_number: number;
  prize_amount_lamports: number;
  prize_position: string;
  lottery_type: string;
  draw_date: string;
  claimed: boolean;
  claimed_at: string | null;
  claim_signature: string | null;
  created_at: string;
  updated_at: string;
}

interface PrizeClaim {
  id: string;
  prize_id: string;
  user_wallet: string;
  amount_lamports: number;
  signature: string | null;
  status: 'pending' | 'completed' | 'failed';
  error_message: string | null;
  claimed_at: string;
  created_at: string;
}

interface PreparedTransaction {
  serializedTx: string;
  blockhash: string;
  claimId: string;
}

export class PrizeClaimService {
  private connection: Connection;
  private treasuryWallet: PublicKey;
  private treasuryKeypair: Keypair;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    const treasuryKey = process.env.TREASURY_WALLET || 'YOUR_TREASURY_WALLET';
    this.treasuryWallet = new PublicKey(treasuryKey);

    const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
    if (treasuryPrivateKey) {
      this.treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
    } else {
      this.treasuryKeypair = Keypair.generate();
      console.warn('TREASURY_PRIVATE_KEY not set, using dummy keypair');
    }
  }

  async getUserPrizes(userWallet: string): Promise<Prize[]> {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('user_wallet', userWallet)
      .order('draw_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch user prizes:', error);
      throw error;
    }

    return data || [];
  }

  async getUnclaimedPrizes(userWallet: string): Promise<Prize[]> {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('user_wallet', userWallet)
      .eq('claimed', false)
      .order('draw_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch unclaimed prizes:', error);
      throw error;
    }

    return data || [];
  }

  async getPrizeById(prizeId: string): Promise<Prize> {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('id', prizeId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Prize not found');
    }

    return data;
  }

  async validateClaimEligibility(prizeId: string, userWallet: string): Promise<void> {
    const prize = await this.getPrizeById(prizeId);

    if (prize.user_wallet.toLowerCase() !== userWallet.toLowerCase()) {
      throw new ValidationError('You are not the winner of this prize');
    }

    if (prize.claimed) {
      throw new ValidationError('Prize has already been claimed');
    }

    if (prize.prize_amount_lamports <= 0) {
      throw new ValidationError('Invalid prize amount');
    }
  }

  async initiateClaim(prizeId: string, userWallet: string): Promise<PreparedTransaction> {
    await this.validateClaimEligibility(prizeId, userWallet);

    const prize = await this.getPrizeById(prizeId);

    const { data, error } = await supabaseAdmin
      .from('prize_claims')
      .insert({
        prize_id: prizeId,
        user_wallet: userWallet,
        amount_lamports: prize.prize_amount_lamports,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create prize claim:', error);
      throw error;
    }

    const { serializedTx, blockhash } = await this.prepareClaimTransaction(
      userWallet,
      prize.prize_amount_lamports
    );

    console.log(`Prize claim initiated: ${data.id} for user ${userWallet}`);
    return { serializedTx, blockhash, claimId: data.id };
  }

  private async prepareClaimTransaction(
    userWallet: string,
    amountLamports: number
  ): Promise<{ serializedTx: string; blockhash: string }> {
    const recipientPubkey = new PublicKey(userWallet);
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = recipientPubkey;

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: this.treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: amountLamports,
      })
    );

    transaction.partialSign(this.treasuryKeypair);

    const serializedTx = transaction
      .serialize({ requireAllSignatures: false })
      .toString('base64');

    console.log(`Prepared claim tx: ${amountLamports / LAMPORTS_PER_SOL} SOL to ${userWallet}, user pays fees`);

    return { serializedTx, blockhash };
  }

  async submitSignedClaim(claimId: string, signedTxBase64: string): Promise<string> {
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('prize_claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      throw new NotFoundError('Claim not found');
    }

    if (claim.status === 'completed') {
      throw new ValidationError('Claim already processed');
    }

    const prize = await this.getPrizeById(claim.prize_id);

    try {
      const txBuffer = Buffer.from(signedTxBase64, 'base64');

      const signature = await this.connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await this.connection.confirmTransaction(signature, 'confirmed');
      await this.markClaimAsCompleted(claimId, prize.id, signature);

      console.log(`Prize claimed successfully: ${signature}`);
      return signature;
    } catch (error) {
      await this.markClaimAsFailed(claimId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async markClaimAsCompleted(
    claimId: string,
    prizeId: string,
    signature: string
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error: claimUpdateError } = await supabaseAdmin
      .from('prize_claims')
      .update({
        signature,
        status: 'completed',
        claimed_at: now
      })
      .eq('id', claimId);

    if (claimUpdateError) {
      console.error('Failed to update claim status:', claimUpdateError);
      throw claimUpdateError;
    }

    const { error: prizeUpdateError } = await supabaseAdmin
      .from('prizes')
      .update({
        claimed: true,
        claimed_at: now,
        claim_signature: signature
      })
      .eq('id', prizeId);

    if (prizeUpdateError) {
      console.error('Failed to update prize status:', prizeUpdateError);
      throw prizeUpdateError;
    }

    console.log(`Claim ${claimId} marked as completed with signature ${signature}`);
  }

  private async markClaimAsFailed(claimId: string, errorMessage: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('prize_claims')
      .update({
        status: 'failed',
        error_message: errorMessage
      })
      .eq('id', claimId);

    if (error) {
      console.error('Failed to mark claim as failed:', error);
      throw error;
    }

    console.error(`Claim ${claimId} marked as failed: ${errorMessage}`);
  }

  async getClaimHistory(userWallet: string): Promise<PrizeClaim[]> {
    const { data, error } = await supabase
      .from('prize_claims')
      .select('*')
      .eq('user_wallet', userWallet)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch claim history:', error);
      throw error;
    }

    return data || [];
  }
}

export const prizeClaimService = new PrizeClaimService();
