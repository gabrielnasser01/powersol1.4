import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Loader, ExternalLink, AlertCircle, Link } from 'lucide-react';
import { theme } from '../theme';
import { formatSol, formatUsd, solToUsd, LOTTERY_TICKET_PRICE_SOL, LAMPORTS_PER_SOL, HOUSE_COMMISSION_RATE } from '../chain/adapter';
import { useMagnetic } from '../hooks/useMagnetic';
import { ticketStorage } from '../store/ticketStorage';
import { useWallet } from '../contexts/WalletContext';
import { solanaService } from '../services/solanaService';
import { anchorService, LotteryInfo } from '../services/anchorService';
import { supabase } from '../lib/supabase';
import { apiClient } from '../services/api';
import { getActiveAffiliateCode, initAffiliateTracking } from '../utils/affiliateTracking';

export function TicketPurchaseCard() {
  const { publicKey, connected, balance, getWalletAdapter, refreshBalance } = useWallet();
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const [isOnChain, setIsOnChain] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(buttonRef);

  const totalSol = LOTTERY_TICKET_PRICE_SOL * quantity;
  const totalUsd = solToUsd(totalSol);

  useEffect(() => {
    initAffiliateTracking();
    setAffiliateCode(getActiveAffiliateCode());
    checkOnChainLottery();
  }, []);

  const checkOnChainLottery = async () => {
    try {
      const { data } = await supabase
        .from('blockchain_lotteries')
        .select('lottery_id')
        .eq('lottery_type', 'tri-daily')
        .eq('is_drawn', false)
        .order('lottery_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      const round = data?.lottery_id || 1;
      setCurrentRound(round);

      const exists = await anchorService.checkLotteryExists({
        type: 'tri-daily',
        round,
      });
      setIsOnChain(exists);
    } catch {
      setIsOnChain(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, Math.min(1000, quantity + delta)));
  };

  const saveTicketPurchase = async (walletAddress: string, qty: number, sol: number, sig: string, affCode: string | null) => {
    try {
      const insertData = {
        wallet_address: walletAddress,
        lottery_type: 'tri-daily',
        quantity: qty,
        total_sol: sol,
        transaction_signature: sig,
        lottery_round_id: currentRound,
      };

      const { data: purchaseData, error: insertError } = await supabase
        .from('ticket_purchases')
        .insert(insertData)
        .select('id')
        .maybeSingle();

      if (insertError) {
        console.error('Failed to save ticket purchase:', insertError);

        const { data: retryData, error: retryError } = await supabase
          .from('ticket_purchases')
          .insert(insertData)
          .select('id')
          .maybeSingle();

        if (retryError) {
          console.error('Retry also failed:', retryError);
          return null;
        }

        await ticketStorage.add(qty, 'tri-daily', currentRound);
        return retryData;
      }

      if (!affCode && purchaseData) {
        const houseEarningsLamports = Math.floor(sol * LAMPORTS_PER_SOL * HOUSE_COMMISSION_RATE);
        await supabase.from('house_earnings').insert({
          ticket_purchase_id: purchaseData.id,
          wallet_address: walletAddress,
          lottery_type: 'tri-daily',
          amount_lamports: houseEarningsLamports,
          transaction_signature: sig,
        });
      }

      await ticketStorage.add(qty, 'tri-daily', currentRound);

      return purchaseData;
    } catch (error) {
      console.error('Error saving ticket purchase:', error);
      return null;
    }
  };

  const handlePurchase = async () => {
    if (!connected || !publicKey) return;

    if (balance < totalSol) {
      setError(`Insufficient SOL balance. You need ${totalSol.toFixed(2)} SOL but only have ${balance.toFixed(4)} SOL.`);
      return;
    }

    setIsLoading(true);
    setError('');

    const currentAffiliateCode = getActiveAffiliateCode();
    let signature: string = '';
    let ticketNumbers: number[] = [];
    let transactionSucceeded = false;

    try {
      const wallet = getWalletAdapter();

      if (wallet) {
        if (isOnChain) {
          const lotteryInfo: LotteryInfo = { type: 'tri-daily', round: currentRound };

          if (quantity === 1) {
            const result = await anchorService.purchaseTicketOnChain(wallet, lotteryInfo, currentAffiliateCode);
            signature = result.signature;
            ticketNumbers = [result.ticketNumber];
          } else {
            const result = await anchorService.purchaseMultipleTicketsOnChain(
              wallet,
              lotteryInfo,
              quantity,
              currentAffiliateCode
            );
            signature = result.signatures[result.signatures.length - 1];
            ticketNumbers = result.ticketNumbers;
          }
        } else {
          const result = await solanaService.purchaseTicketsWithWallet(
            wallet,
            quantity,
            LOTTERY_TICKET_PRICE_SOL,
            'tri-daily'
          );
          signature = result.signature;
        }
        transactionSucceeded = true;
      } else {
        throw new Error('Wallet adapter not available');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
      console.error('Transaction failed:', err);
      setIsLoading(false);
      return;
    }

    if (transactionSucceeded && signature) {
      setTxId(signature);

      await saveTicketPurchase(publicKey, quantity, totalSol, signature, currentAffiliateCode);

      if (isOnChain && ticketNumbers.length > 0) {
        try {
          const { data: userData } = await supabase
            .from('blockchain_users')
            .select('id')
            .eq('wallet_address', publicKey)
            .maybeSingle();

          if (userData) {
            for (const ticketNumber of ticketNumbers) {
              await supabase.from('blockchain_tickets').insert({
                user_id: userData.id,
                lottery_id: currentRound,
                ticket_number: ticketNumber,
                purchase_timestamp: Math.floor(Date.now() / 1000),
                transaction_signature: signature,
              });
            }
          }
        } catch (error) {
          console.error('Failed to save blockchain tickets:', error);
        }
      }

      try {
        await apiClient.recordTicketPurchase(publicKey, {
          lottery_type: 'tri-daily',
          ticket_count: quantity,
          transaction_signature: signature,
        });
      } catch (missionErr) {
        console.error('Mission update failed:', missionErr);
      }

      window.dispatchEvent(new CustomEvent('ticketsPurchased', {
        detail: { quantity, signature, ticketNumbers, isOnChain, affiliateCode: currentAffiliateCode }
      }));

      try {
        await refreshBalance();
      } catch {
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 10000);
    }

    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border relative overflow-hidden"
      style={{
        background: `
          linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
          linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(10, 10, 10, 0.95) 100%)
        `,
        backgroundSize: '20px 20px, 20px 20px, 100% 100%',
        borderColor: 'rgba(255, 20, 147, 0.5)',
        boxShadow: '0 0 25px rgba(255, 20, 147, 0.4), inset 0 0 40px rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(20px)',
        fontFamily: 'monospace',
      }}
    >
      {/* Terminal scan lines effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 20, 147, 0.02) 2px,
              rgba(255, 20, 147, 0.02) 4px
            )
          `,
          animation: 'terminalScan 4s linear infinite',
        }}
      />
      
      {/* Terminal corner indicators */}
      <div className="absolute top-2 left-2 text-xs font-mono text-pink-400/60">
        [TICKET_SYS]
      </div>
      <div className="absolute top-2 right-2 text-xs font-mono text-pink-400/60">
        [READY]
      </div>
      
      <style jsx>{`
        @keyframes terminalScan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      <div className="flex items-center justify-center space-x-3 mb-4 mt-4 text-center">
        <div className="text-center">
          <h3 className="text-xl font-bold font-mono mb-2 flex items-center justify-center space-x-3" style={{ 
            color: '#ffffff',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src="https://i.imgur.com/T3PVktI.png" 
                alt="PWRS Ticket"
                className="w-10 h-10 object-contain"
                style={{ 
                  filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(255, 20, 147, 0.6))',
                }}
              />
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 w-10 h-10 rounded-lg"
                style={{
                  background: 'radial-gradient(circle, rgba(255, 20, 147, 0.3) 0%, transparent 70%)',
                  filter: 'blur(4px)',
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
            Buy Tickets
          </h3>
          <div className="text-lg font-bold font-mono" style={{ color: '#00ffff' }}>
            {formatSol(LOTTERY_TICKET_PRICE_SOL)}
          </div>
        </div>
      </div>

      {/* Quantity selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-3 font-mono text-center" style={{ color: '#ffffff' }}>
          <span className="text-white/90">Quantity</span>
        </label>
        <div className="flex items-center justify-center space-x-6">
          <motion.button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 30, 30, 0.5))',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.1)',
              color: '#00bfff',
            }}
            whileHover={quantity > 1 ? { scale: 1.05 } : {}}
            whileTap={quantity > 1 ? { scale: 0.95 } : {}}
          >
            <Minus className="w-6 h-6" />
          </motion.button>
          
          <div className="flex-1 text-center px-4 max-w-32">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              className="w-full text-center text-3xl font-bold bg-transparent border-none outline-none font-mono"
              style={{
                color: '#ffffff',
                textShadow: '0 0 8px rgba(0, 255, 255, 0.6)'
              }}
              min="1"
              max="1000"
            />
            <div className="text-xs text-white/40 font-mono mt-1">tickets</div>
          </div>
          
          <motion.button
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= 1000}
            className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 30, 30, 0.5))',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.1)',
              color: '#00bfff',
            }}
            whileHover={quantity < 1000 ? { scale: 1.05 } : {}}
            whileTap={quantity < 1000 ? { scale: 0.95 } : {}}
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </div>

      {/* Total Cost - Centralized */}
      <div className="mb-4 p-3 rounded-xl text-center" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(30, 30, 30, 0.4))',
        border: '1px solid rgba(255, 20, 147, 0.3)',
        boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9)'
      }}>
        <div className="text-sm font-medium font-mono mb-2" style={{ color: '#ffffff' }}>
          <div className="flex items-center justify-center space-x-2">
            <span>TOTAL COST ({quantity} ticket{quantity > 1 ? 's' : ''} <img 
              src="https://i.imgur.com/T3PVktI.png" 
              alt="PWRS Ticket"
              className="w-5 h-5 object-contain inline mx-1"
              style={{ 
                filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 4px rgba(255, 20, 147, 0.6))',
              }}
            />)</span>
          </div>
        </div>
        <div className="flex items-center justify-center space-x-4 relative">
          {/* SOL Coin Animation */}
          <motion.div 
            className="relative flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <motion.img
              src="https://i.imgur.com/eE1m8fp.png"
              alt="Moeda"
              className="w-12 h-12 rounded-full object-cover"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
              }}
            />
            <div className="text-2xl font-bold font-mono" style={{ 
            color: '#00ffff',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            {formatSol(totalSol)}
          </div>
          </motion.div>
          
          <div className="text-lg text-white/70 font-mono" style={{
            textShadow: '0 0 8px rgba(255, 20, 147, 0.5)',
            color: '#ff1493'
          }}>
            ≈ {formatUsd(totalUsd)}
          </div>
        </div>
        <div className="text-xs text-white/50 font-mono mt-1">
          USD equivalent
        </div>
      </div>

      {connected && balance > 0 && (
        <div className="mb-4 p-2 rounded-lg text-center" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
          <p className="text-xs font-mono text-green-400">
            Balance: {balance.toFixed(4)} SOL
          </p>
        </div>
      )}

      {isOnChain && (
        <div className="mb-4 p-2 rounded-lg text-center flex items-center justify-center space-x-2" style={{ background: 'rgba(138, 43, 226, 0.15)', border: '1px solid rgba(138, 43, 226, 0.4)' }}>
          <Link className="w-3 h-3 text-purple-400" />
          <p className="text-xs font-mono text-purple-400">
            ON-CHAIN (Round #{currentRound})
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        </div>
      )}

      <motion.button
        ref={buttonRef}
        onClick={handlePurchase}
        disabled={!connected || isLoading}
        className="w-full py-5 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
        style={{
          background: connected ? theme.gradients.button : 'rgba(255, 255, 255, 0.1)',
          color: connected ? '#000' : theme.colors.text,
          boxShadow: connected ? theme.shadows.buttonGlow : 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
        whileHover={connected && !isLoading ? { scale: 1.05 } : {}}
        whileTap={connected && !isLoading ? { scale: 0.95 } : {}}
      >
        {isLoading ? (
          <>
            <Loader className="w-6 h-6 animate-spin" />
            <span>Signing Transaction...</span>
          </>
        ) : (
          <>
            <img
              src="https://i.imgur.com/T3PVktI.png"
              alt="PWRS Ticket"
              className="w-8 h-8 object-contain"
              style={{
                filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(62, 203, 255, 0.6))',
              }}
            />
            <span>
              {!connected
                ? 'Connect Wallet First'
                : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
            </span>
          </>
        )}
      </motion.button>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-5 rounded-xl border-0 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(60, 247, 158, 0.15), rgba(60, 247, 158, 0.08))',
            boxShadow: '0 8px 32px rgba(60, 247, 158, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: theme.colors.success }}
            />
            <p className="text-sm font-semibold font-mono" style={{
              color: theme.colors.success,
              textShadow: `0 0 8px ${theme.colors.success}60`
            }}>
              TICKETS PURCHASED SUCCESSFULLY!
            </p>
          </div>
          <div className="flex items-center justify-between ml-5">
            <p className="text-xs font-mono" style={{
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '0.5px'
            }}>
              TX: {txId.slice(0, 20)}...
            </p>
            {!txId.startsWith('mock_') && (
              <a
                href={solanaService.getExplorerUrl(txId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </motion.div>
      )}

      {!connected && (
        <p className="text-xs text-center text-zinc-500 mt-4">
          Connect your wallet to purchase tickets
        </p>
      )}
    </motion.div>
  );
}