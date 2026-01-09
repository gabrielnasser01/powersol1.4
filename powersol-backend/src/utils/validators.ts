import { z } from 'zod';

export const walletAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address');

export const signatureSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/, 'Invalid Solana signature');

export const connectWalletSchema = z.object({
  walletAddress: walletAddressSchema,
  signature: signatureSchema,
  message: z.string().min(1),
});

export const purchaseTicketSchema = z.object({
  lotteryId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  walletAddress: walletAddressSchema,
  signature: signatureSchema,
  affiliateCode: z.string().optional(),
});

export const claimPrizeSchema = z.object({
  prizeId: z.string().uuid(),
  walletAddress: walletAddressSchema,
  signature: signatureSchema,
});

export const affiliateApplicationSchema = z.object({
  walletAddress: walletAddressSchema,
  email: z.string().email(),
  twitter: z.string().optional(),
  telegram: z.string().optional(),
  experience: z.string().optional(),
  audience: z.number().int().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const authNonceQuerySchema = z.object({
  wallet: walletAddressSchema,
  referralCode: z.string().optional(),
});

export const authWalletBodySchema = z.object({
  walletAddress: walletAddressSchema,
  signature: signatureSchema,
});

export type ConnectWalletInput = z.infer<typeof connectWalletSchema>;
export type PurchaseTicketInput = z.infer<typeof purchaseTicketSchema>;
export type ClaimPrizeInput = z.infer<typeof claimPrizeSchema>;
export type AffiliateApplicationInput = z.infer<typeof affiliateApplicationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
