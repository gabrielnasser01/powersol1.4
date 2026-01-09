export interface Lottery {
  id: string;
  lottery_id: number;
  lottery_type: string;
  type?: string;
  ticket_price: string;
  max_tickets: number;
  current_tickets: number;
  prize_pool: string;
  is_drawn: boolean;
  winning_ticket: number | null;
  draw_tx_signature: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotteryStats {
  totalTickets: number;
  prizePool: bigint | string;
  ticketPrice: bigint | string;
  isDrawn: boolean;
  winningTicket: number | null;
  uniquePlayers?: number;
  timeUntilDraw?: number;
}

export interface Winner {
  id?: string;
  lottery_id: string;
  lottery_type?: string;
  user_id?: string;
  ticket_id?: string;
  winning_ticket?: number;
  winner_wallet?: string;
  prize_amount: string | bigint;
  claim_status?: string;
  claimed?: boolean;
  drawn_at?: Date;
  created_at?: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  lottery_id: string;
  ticket_number: number;
  purchase_price: string;
  tx_signature: string;
  is_winner: boolean;
  created_at: string;
}

export interface Draw {
  id: string;
  lottery_id: string;
  winning_ticket: number;
  vrf_proof: string | null;
  tx_signature: string;
  created_at: string;
}

export interface LotteryOnChain {
  authority: string;
  treasury: string;
  ticketPrice: bigint;
  maxTickets: number;
  currentTickets: number;
  prizePool: bigint;
  lotteryType: string;
  isActive: boolean;
  isDrawn: boolean;
  winningTicket: number | null;
}

export interface TicketOnChain {
  owner: string;
  lottery: string;
  ticketNumber: number;
  purchaseTime: number;
  isWinner: boolean;
}

export interface VRFProof {
  publicKey: string;
  proof: string;
  message: string;
  currentRound: number;
  status: string;
}

export interface LotteryCreateParams {
  lottery_type: string;
  ticket_price: bigint;
  max_tickets: number;
}
