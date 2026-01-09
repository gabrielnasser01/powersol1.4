import { SignJWT } from 'jose';
import { supabaseAdmin } from '@config/supabase.js';
import { ENV } from '@config/env.js';
import {
  generateNonce,
  generateAuthMessage,
  verifySignature,
} from '@utils/crypto.js';
import { AuthenticationError, NotFoundError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import type {
  User,
  AuthNonceResponse,
  AuthWalletRequest,
  AuthWalletResponse,
} from '../types/user.types.js';

const logger = loggers.auth;
const jwtSecret = new TextEncoder().encode(ENV.JWT_SECRET);

export class AuthService {
  async processReferralCode(userId: string, referralCode: string): Promise<void> {
    try {
      const { data: existingReferral } = await supabaseAdmin
        .from('referrals')
        .select('id')
        .eq('referred_user_id', userId)
        .maybeSingle();

      if (existingReferral) {
        logger.info({ userId }, 'User already has a referral registered');
        return;
      }

      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id, user_id')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (!affiliate) {
        logger.warn({ referralCode }, 'Referral code not found');
        return;
      }

      if (affiliate.user_id === userId) {
        logger.warn({ userId, referralCode }, 'User cannot refer themselves');
        return;
      }

      await supabaseAdmin.from('referrals').insert({
        referred_user_id: userId,
        referrer_affiliate_id: affiliate.id,
        referral_code_used: referralCode,
        is_validated: false,
      });

      logger.info(
        { userId, affiliateId: affiliate.id, referralCode },
        'Referral registered successfully'
      );
    } catch (error) {
      logger.error({ error, userId, referralCode }, 'Failed to process referral code');
    }
  }

  async getNonce(walletAddress: string, referralCode?: string): Promise<AuthNonceResponse> {
    try {
      logger.info({ wallet: walletAddress }, 'Getting nonce for wallet');

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (existingUser) {
        const nonce = generateNonce();

        await supabaseAdmin
          .from('users')
          .update({ nonce })
          .eq('id', existingUser.id);

        if (referralCode) {
          await this.processReferralCode(existingUser.id, referralCode);
        }

        return { nonce };
      }

      const nonce = generateNonce();

      const { data: newUser } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: walletAddress,
          nonce,
        })
        .select()
        .single();

      if (newUser && referralCode) {
        await this.processReferralCode(newUser.id, referralCode);
      }

      return { nonce };
    } catch (error) {
      logger.error({ error, wallet: walletAddress }, 'Failed to get nonce');
      throw error;
    }
  }

  async authenticateWallet(
    request: AuthWalletRequest
  ): Promise<AuthWalletResponse> {
    try {
      const { walletAddress, signature } = request;

      logger.info({ wallet: walletAddress }, 'Authenticating wallet');

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error || !user) {
        throw new NotFoundError('User');
      }

      const message = generateAuthMessage(walletAddress, user.nonce);
      const isValid = verifySignature(message, signature, walletAddress);

      if (!isValid) {
        throw new AuthenticationError('Invalid signature');
      }

      const newNonce = generateNonce();
      await supabaseAdmin
        .from('users')
        .update({ nonce: newNonce, last_login: new Date().toISOString() })
        .eq('id', user.id);

      const token = await new SignJWT({
        userId: user.id,
        wallet: user.wallet_address,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ENV.JWT_EXPIRES_IN)
        .sign(jwtSecret);

      logger.info({ wallet: walletAddress, userId: user.id }, 'Wallet authenticated');

      const { nonce, ...userWithoutNonce } = user;

      return {
        token,
        user: userWithoutNonce,
      };
    } catch (error) {
      logger.error({ error, wallet: request.walletAddress }, 'Authentication failed');
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundError('User');
    }

    return data;
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return data;
  }
}

export const authService = new AuthService();
