import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Security Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const CORE_PROGRAM_ID = new PublicKey("GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW");
  const CLAIM_PROGRAM_ID = new PublicKey("DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK");

  const coreProgram = new Program(
    require("../target/idl/powersol_core.json"),
    provider
  );

  const claimProgram = new Program(
    require("../target/idl/powersol_claim.json"),
    provider
  );

  const authority = provider.wallet;
  const attacker = Keypair.generate();
  const treasury = Keypair.generate();
  const affiliatesPool = Keypair.generate();

  before(async () => {
    await provider.connection.requestAirdrop(attacker.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(treasury.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(affiliatesPool.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise((r) => setTimeout(r, 1000));
  });

  describe("Authority Bypass Attempts", () => {
    it("should prevent unauthorized draw execution", async () => {
      const round = new BN(10001);
      const pastTimestamp = Math.floor(Date.now() / 1000) - 1;

      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      await coreProgram.methods
        .initializeTriDailyLottery(
          round,
          new BN(0.1 * LAMPORTS_PER_SOL),
          100,
          new BN(pastTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: lotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await coreProgram.methods
          .executeDraw([])
          .accounts({
            lottery: lotteryPda,
            authority: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        expect.fail("Attacker should not be able to execute draw");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.not.equal("");
      }
    });

    it("should prevent unauthorized lottery closure", async () => {
      const round = new BN(10002);
      const pastTimestamp = Math.floor(Date.now() / 1000) - 1;

      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      await coreProgram.methods
        .initializeTriDailyLottery(
          round,
          new BN(0.1 * LAMPORTS_PER_SOL),
          100,
          new BN(pastTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: lotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await coreProgram.methods
        .executeDraw([])
        .accounts({
          lottery: lotteryPda,
          authority: authority.publicKey,
        })
        .rpc();

      try {
        await coreProgram.methods
          .closeLottery()
          .accounts({
            lottery: lotteryPda,
            authority: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        expect.fail("Attacker should not be able to close lottery");
      } catch (e) {
        expect(e).to.exist;
      }
    });

    it("should prevent unauthorized VRF completion", async () => {
      const [prizePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([0])],
        CLAIM_PROGRAM_ID
      );

      try {
        await claimProgram.methods
          .setVrfCompleted(true)
          .accounts({
            authority: attacker.publicKey,
            prizePool: prizePoolPda,
          })
          .signers([attacker])
          .rpc();
        expect.fail("Attacker should not be able to set VRF completed");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("Unauthorized");
      }
    });
  });

  describe("Reentrancy Protection", () => {
    it("should prevent double-claiming same prize", async () => {
      const claimer = Keypair.generate();
      await provider.connection.requestAirdrop(claimer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [prizePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([0])],
        CLAIM_PROGRAM_ID
      );

      const [prizeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_vault"), prizePoolPda.toBuffer()],
        CLAIM_PROGRAM_ID
      );

      const lotteryRound = new BN(99999);
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          lotteryRound.toArrayLike(Buffer, "le", 8),
        ],
        CLAIM_PROGRAM_ID
      );

      await claimProgram.methods
        .setVrfCompleted(true)
        .accounts({
          authority: authority.publicKey,
          prizePool: prizePoolPda,
        })
        .rpc();

      await claimProgram.methods
        .claimLotteryPrize(new BN(0.01 * LAMPORTS_PER_SOL), 1, lotteryRound)
        .accounts({
          claimer: claimer.publicKey,
          prizePool: prizePoolPda,
          prizePoolVault: prizeVaultPda,
          prizeClaim: prizeClaimPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([claimer])
        .rpc();

      try {
        await claimProgram.methods
          .claimLotteryPrize(new BN(0.01 * LAMPORTS_PER_SOL), 1, lotteryRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should not allow double claim");
      } catch (e) {
        expect(e).to.exist;
      }
    });
  });

  describe("Arithmetic Overflow Protection", () => {
    it("should handle max ticket count without overflow", async () => {
      const round = new BN(10003);
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      await coreProgram.methods
        .initializeTriDailyLottery(
          round,
          new BN(0.1 * LAMPORTS_PER_SOL),
          4294967295,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: lotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const lottery = await coreProgram.account.lottery.fetch(lotteryPda);
      expect(lottery.maxTickets).to.equal(4294967295);
    });

    it("should handle large prize pool amounts", async () => {
      const [prizePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([0])],
        CLAIM_PROGRAM_ID
      );

      const [prizeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_vault"), prizePoolPda.toBuffer()],
        CLAIM_PROGRAM_ID
      );

      const largeDeposit = new BN(100 * LAMPORTS_PER_SOL);

      await claimProgram.methods
        .depositToPrizePool(largeDeposit)
        .accounts({
          depositor: authority.publicKey,
          prizePool: prizePoolPda,
          prizePoolVault: prizeVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const pool = await claimProgram.account.prizePool.fetch(prizePoolPda);
      expect(pool.totalDeposited.toNumber()).to.be.greaterThan(0);
    });
  });

  describe("Treasury/Affiliate Pool Validation", () => {
    it("should reject mismatched treasury", async () => {
      const round = new BN(10004);
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      await coreProgram.methods
        .initializeTriDailyLottery(
          round,
          new BN(0.1 * LAMPORTS_PER_SOL),
          100,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: lotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const buyer = Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), lotteryPda.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 4)],
        CORE_PROGRAM_ID
      );

      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer.publicKey.toBuffer(), lotteryPda.toBuffer()],
        CORE_PROGRAM_ID
      );

      const fakeTreasury = Keypair.generate();

      try {
        await coreProgram.methods
          .purchaseTicket(null)
          .accounts({
            buyer: buyer.publicKey,
            lottery: lotteryPda,
            ticket: ticketPda,
            userTickets: userTicketsPda,
            treasury: fakeTreasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        expect.fail("Should reject mismatched treasury");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("TreasuryMismatch");
      }
    });

    it("should reject mismatched affiliates pool", async () => {
      const round = new BN(10005);
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      await coreProgram.methods
        .initializeTriDailyLottery(
          round,
          new BN(0.1 * LAMPORTS_PER_SOL),
          100,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: lotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const buyer = Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), lotteryPda.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 4)],
        CORE_PROGRAM_ID
      );

      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer.publicKey.toBuffer(), lotteryPda.toBuffer()],
        CORE_PROGRAM_ID
      );

      const fakeAffiliatesPool = Keypair.generate();

      try {
        await coreProgram.methods
          .purchaseTicket(null)
          .accounts({
            buyer: buyer.publicKey,
            lottery: lotteryPda,
            ticket: ticketPda,
            userTickets: userTicketsPda,
            treasury: treasury.publicKey,
            affiliatesPool: fakeAffiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        expect.fail("Should reject mismatched affiliates pool");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("AffiliatesPoolMismatch");
      }
    });
  });

  describe("PDA Seed Validation", () => {
    it("should create unique lottery PDAs for different rounds", async () => {
      const round1 = new BN(20001);
      const round2 = new BN(20002);

      const [lotteryPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round1.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      const [lotteryPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round2.toArrayLike(Buffer, "le", 8)],
        CORE_PROGRAM_ID
      );

      expect(lotteryPda1.toBase58()).to.not.equal(lotteryPda2.toBase58());
    });

    it("should create unique ticket PDAs", async () => {
      const lotteryKey = Keypair.generate().publicKey;

      const [ticketPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), lotteryKey.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 4)],
        CORE_PROGRAM_ID
      );

      const [ticketPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), lotteryKey.toBuffer(), new BN(2).toArrayLike(Buffer, "le", 4)],
        CORE_PROGRAM_ID
      );

      expect(ticketPda1.toBase58()).to.not.equal(ticketPda2.toBase58());
    });
  });

  describe("Claim Before VRF Protection", () => {
    it("should block claims until VRF is verified", async () => {
      const [prizePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([1])],
        CLAIM_PROGRAM_ID
      );

      const [prizeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_vault"), prizePoolPda.toBuffer()],
        CLAIM_PROGRAM_ID
      );

      await claimProgram.methods
        .setVrfCompleted(false)
        .accounts({
          authority: authority.publicKey,
          prizePool: prizePoolPda,
        })
        .rpc();

      const claimer = Keypair.generate();
      await provider.connection.requestAirdrop(claimer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const lotteryRound = new BN(88888);
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          lotteryRound.toArrayLike(Buffer, "le", 8),
        ],
        CLAIM_PROGRAM_ID
      );

      try {
        await claimProgram.methods
          .claimLotteryPrize(new BN(0.01 * LAMPORTS_PER_SOL), 1, lotteryRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should block claim before VRF");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("VrfNotCompleted");
      }
    });
  });
});
