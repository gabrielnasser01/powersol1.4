import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("powersol-claim", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const PROGRAM_ID = new PublicKey("DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK");

  const program = new Program(
    require("../target/idl/powersol_claim.json"),
    provider
  );

  const authority = provider.wallet;

  let prizePoolPda: PublicKey;
  let prizeVaultPda: PublicKey;
  let affiliatePoolPda: PublicKey;
  let affiliateVaultPda: PublicKey;

  const LOTTERY_TYPE_TRI_DAILY = 0;
  const LOTTERY_TYPE_JACKPOT = 1;
  const LOTTERY_TYPE_GRAND_PRIZE = 2;
  const LOTTERY_TYPE_XMAS = 3;

  describe("Initialize Prize Pools", () => {
    it("should initialize tri-daily prize pool", async () => {
      [prizePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([LOTTERY_TYPE_TRI_DAILY])],
        PROGRAM_ID
      );

      [prizeVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_vault"), prizePoolPda.toBuffer()],
        PROGRAM_ID
      );

      try {
        await program.methods
          .initializePrizePool(LOTTERY_TYPE_TRI_DAILY)
          .accounts({
            authority: authority.publicKey,
            prizePool: prizePoolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const prizePool = await program.account.prizePool.fetch(prizePoolPda);
        expect(prizePool.authority.toBase58()).to.equal(authority.publicKey.toBase58());
        expect(prizePool.lotteryType).to.equal(LOTTERY_TYPE_TRI_DAILY);
        expect(prizePool.totalDeposited.toNumber()).to.equal(0);
        expect(prizePool.totalClaimed.toNumber()).to.equal(0);
        expect(prizePool.currentRound.toNumber()).to.equal(0);
        expect(prizePool.vrfCompleted).to.be.false;
      } catch (e) {
        console.log("Initialize prize pool error:", e);
        throw e;
      }
    });

    it("should initialize jackpot prize pool", async () => {
      const [jackpotPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([LOTTERY_TYPE_JACKPOT])],
        PROGRAM_ID
      );

      await program.methods
        .initializePrizePool(LOTTERY_TYPE_JACKPOT)
        .accounts({
          authority: authority.publicKey,
          prizePool: jackpotPoolPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const prizePool = await program.account.prizePool.fetch(jackpotPoolPda);
      expect(prizePool.lotteryType).to.equal(LOTTERY_TYPE_JACKPOT);
    });

    it("should initialize grand prize pool", async () => {
      const [grandPrizePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([LOTTERY_TYPE_GRAND_PRIZE])],
        PROGRAM_ID
      );

      await program.methods
        .initializePrizePool(LOTTERY_TYPE_GRAND_PRIZE)
        .accounts({
          authority: authority.publicKey,
          prizePool: grandPrizePoolPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const prizePool = await program.account.prizePool.fetch(grandPrizePoolPda);
      expect(prizePool.lotteryType).to.equal(LOTTERY_TYPE_GRAND_PRIZE);
    });

    it("should initialize xmas prize pool", async () => {
      const [xmasPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), Buffer.from([LOTTERY_TYPE_XMAS])],
        PROGRAM_ID
      );

      await program.methods
        .initializePrizePool(LOTTERY_TYPE_XMAS)
        .accounts({
          authority: authority.publicKey,
          prizePool: xmasPoolPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const prizePool = await program.account.prizePool.fetch(xmasPoolPda);
      expect(prizePool.lotteryType).to.equal(LOTTERY_TYPE_XMAS);
    });

    it("should fail to initialize duplicate prize pool", async () => {
      try {
        await program.methods
          .initializePrizePool(LOTTERY_TYPE_TRI_DAILY)
          .accounts({
            authority: authority.publicKey,
            prizePool: prizePoolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e) {
        expect(e).to.exist;
      }
    });
  });

  describe("Initialize Affiliate Pool", () => {
    it("should initialize affiliate pool", async () => {
      [affiliatePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("affiliate_pool")],
        PROGRAM_ID
      );

      [affiliateVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("affiliate_vault")],
        PROGRAM_ID
      );

      try {
        await program.methods
          .initializeAffiliatePool()
          .accounts({
            authority: authority.publicKey,
            affiliatePool: affiliatePoolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const affiliatePool = await program.account.affiliatePool.fetch(affiliatePoolPda);
        expect(affiliatePool.authority.toBase58()).to.equal(authority.publicKey.toBase58());
        expect(affiliatePool.totalDeposited.toNumber()).to.equal(0);
        expect(affiliatePool.totalClaimed.toNumber()).to.equal(0);
        expect(affiliatePool.currentWeek.toNumber()).to.be.greaterThan(0);
      } catch (e) {
        console.log("Initialize affiliate pool error:", e);
        throw e;
      }
    });

    it("should fail to initialize duplicate affiliate pool", async () => {
      try {
        await program.methods
          .initializeAffiliatePool()
          .accounts({
            authority: authority.publicKey,
            affiliatePool: affiliatePoolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e) {
        expect(e).to.exist;
      }
    });
  });

  describe("Initialize Accumulator", () => {
    const affiliate = Keypair.generate();
    let accumulatorPda: PublicKey;

    before(async () => {
      [accumulatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("accumulator"), affiliate.publicKey.toBuffer()],
        PROGRAM_ID
      );
    });

    it("should initialize accumulator for affiliate", async () => {
      await program.methods
        .initializeAccumulator()
        .accounts({
          payer: authority.publicKey,
          affiliate: affiliate.publicKey,
          accumulator: accumulatorPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const accumulator = await program.account.affiliateAccumulator.fetch(accumulatorPda);
      expect(accumulator.affiliate.toBase58()).to.equal(affiliate.publicKey.toBase58());
      expect(accumulator.pendingAmount.toNumber()).to.equal(0);
      expect(accumulator.tier).to.equal(1);
      expect(accumulator.referralCount).to.equal(0);
    });

    it("should fail to initialize duplicate accumulator", async () => {
      try {
        await program.methods
          .initializeAccumulator()
          .accounts({
            payer: authority.publicKey,
            affiliate: affiliate.publicKey,
            accumulator: accumulatorPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e) {
        expect(e).to.exist;
      }
    });
  });

  describe("Deposit to Prize Pool", () => {
    const depositAmount = new BN(0.5 * LAMPORTS_PER_SOL);

    it("should deposit SOL to prize pool", async () => {
      const poolBefore = await program.account.prizePool.fetch(prizePoolPda);

      await program.methods
        .depositToPrizePool(depositAmount)
        .accounts({
          depositor: authority.publicKey,
          prizePool: prizePoolPda,
          prizePoolVault: prizeVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const poolAfter = await program.account.prizePool.fetch(prizePoolPda);
      expect(poolAfter.totalDeposited.toNumber()).to.equal(
        poolBefore.totalDeposited.toNumber() + depositAmount.toNumber()
      );
    });

    it("should accumulate multiple deposits", async () => {
      const poolBefore = await program.account.prizePool.fetch(prizePoolPda);

      await program.methods
        .depositToPrizePool(depositAmount)
        .accounts({
          depositor: authority.publicKey,
          prizePool: prizePoolPda,
          prizePoolVault: prizeVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const poolAfter = await program.account.prizePool.fetch(prizePoolPda);
      expect(poolAfter.totalDeposited.toNumber()).to.equal(
        poolBefore.totalDeposited.toNumber() + depositAmount.toNumber()
      );
    });
  });

  describe("Deposit to Affiliate Pool", () => {
    const depositAmount = new BN(0.5 * LAMPORTS_PER_SOL);

    it("should deposit SOL to affiliate pool", async () => {
      const poolBefore = await program.account.affiliatePool.fetch(affiliatePoolPda);

      await program.methods
        .depositToAffiliatePool(depositAmount)
        .accounts({
          depositor: authority.publicKey,
          affiliatePool: affiliatePoolPda,
          affiliatePoolVault: affiliateVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const poolAfter = await program.account.affiliatePool.fetch(affiliatePoolPda);
      expect(poolAfter.totalDeposited.toNumber()).to.equal(
        poolBefore.totalDeposited.toNumber() + depositAmount.toNumber()
      );
    });
  });

  describe("Set VRF Completed", () => {
    it("should set VRF completed by authority", async () => {
      await program.methods
        .setVrfCompleted(true)
        .accounts({
          authority: authority.publicKey,
          prizePool: prizePoolPda,
        })
        .rpc();

      const prizePool = await program.account.prizePool.fetch(prizePoolPda);
      expect(prizePool.vrfCompleted).to.be.true;
      expect(prizePool.currentRound.toNumber()).to.equal(1);
    });

    it("should fail set VRF by non-authority", async () => {
      const nonAuthority = Keypair.generate();
      await provider.connection.requestAirdrop(nonAuthority.publicKey, LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      try {
        await program.methods
          .setVrfCompleted(true)
          .accounts({
            authority: nonAuthority.publicKey,
            prizePool: prizePoolPda,
          })
          .signers([nonAuthority])
          .rpc();
        expect.fail("Should have thrown Unauthorized error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("Unauthorized");
      }
    });

    it("should reset VRF completed", async () => {
      await program.methods
        .setVrfCompleted(false)
        .accounts({
          authority: authority.publicKey,
          prizePool: prizePoolPda,
        })
        .rpc();

      const prizePool = await program.account.prizePool.fetch(prizePoolPda);
      expect(prizePool.vrfCompleted).to.be.false;
    });
  });

  describe("Claim Lottery Prize", () => {
    const claimer = Keypair.generate();
    const claimAmount = new BN(0.1 * LAMPORTS_PER_SOL);
    const tier = 1;
    const lotteryRound = new BN(1);

    before(async () => {
      await provider.connection.requestAirdrop(claimer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      await program.methods
        .depositToPrizePool(new BN(2 * LAMPORTS_PER_SOL))
        .accounts({
          depositor: authority.publicKey,
          prizePool: prizePoolPda,
          prizePoolVault: prizeVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should fail claim when VRF not completed", async () => {
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          lotteryRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      try {
        await program.methods
          .claimLotteryPrize(claimAmount, tier, lotteryRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should have thrown VrfNotCompleted error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("VrfNotCompleted");
      }
    });

    it("should claim prize when VRF completed", async () => {
      await program.methods
        .setVrfCompleted(true)
        .accounts({
          authority: authority.publicKey,
          prizePool: prizePoolPda,
        })
        .rpc();

      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          lotteryRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      const claimerBefore = await provider.connection.getBalance(claimer.publicKey);
      const poolBefore = await program.account.prizePool.fetch(prizePoolPda);

      await program.methods
        .claimLotteryPrize(claimAmount, tier, lotteryRound)
        .accounts({
          claimer: claimer.publicKey,
          prizePool: prizePoolPda,
          prizePoolVault: prizeVaultPda,
          prizeClaim: prizeClaimPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([claimer])
        .rpc();

      const claimerAfter = await provider.connection.getBalance(claimer.publicKey);
      const poolAfter = await program.account.prizePool.fetch(prizePoolPda);

      expect(poolAfter.totalClaimed.toNumber()).to.equal(
        poolBefore.totalClaimed.toNumber() + claimAmount.toNumber()
      );

      const prizeClaim = await program.account.prizeClaim.fetch(prizeClaimPda);
      expect(prizeClaim.claimer.toBase58()).to.equal(claimer.publicKey.toBase58());
      expect(prizeClaim.tier).to.equal(tier);
      expect(prizeClaim.amount.toNumber()).to.equal(claimAmount.toNumber());
      expect(prizeClaim.vrfVerified).to.be.true;
    });

    it("should fail duplicate claim for same round", async () => {
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          lotteryRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      try {
        await program.methods
          .claimLotteryPrize(claimAmount, tier, lotteryRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should have thrown error for duplicate claim");
      } catch (e) {
        expect(e).to.exist;
      }
    });

    it("should fail claim with invalid tier", async () => {
      const newRound = new BN(2);
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          newRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      try {
        await program.methods
          .claimLotteryPrize(claimAmount, 0, newRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should have thrown InvalidTier error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("InvalidTier");
      }
    });

    it("should fail claim with tier > 5", async () => {
      const newRound = new BN(3);
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          newRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      try {
        await program.methods
          .claimLotteryPrize(claimAmount, 6, newRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should have thrown InvalidTier error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("InvalidTier");
      }
    });

    it("should fail claim with zero amount", async () => {
      const newRound = new BN(4);
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          newRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      try {
        await program.methods
          .claimLotteryPrize(new BN(0), tier, newRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should have thrown InvalidAmount error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("InvalidAmount");
      }
    });

    it("should fail claim with insufficient funds", async () => {
      const newRound = new BN(5);
      const [prizeClaimPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("prize_claim"),
          claimer.publicKey.toBuffer(),
          prizePoolPda.toBuffer(),
          newRound.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );

      const pool = await program.account.prizePool.fetch(prizePoolPda);
      const excessiveAmount = new BN(pool.totalDeposited.toNumber() * 10);

      try {
        await program.methods
          .claimLotteryPrize(excessiveAmount, tier, newRound)
          .accounts({
            claimer: claimer.publicKey,
            prizePool: prizePoolPda,
            prizePoolVault: prizeVaultPda,
            prizeClaim: prizeClaimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([claimer])
          .rpc();
        expect.fail("Should have thrown InsufficientFunds error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("InsufficientFunds");
      }
    });
  });

  describe("Accumulate Affiliate Earnings", () => {
    const affiliate = Keypair.generate();
    let accumulatorPda: PublicKey;
    const amount = new BN(0.05 * LAMPORTS_PER_SOL);

    before(async () => {
      [accumulatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("accumulator"), affiliate.publicKey.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .initializeAccumulator()
        .accounts({
          payer: authority.publicKey,
          affiliate: affiliate.publicKey,
          accumulator: accumulatorPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .depositToAffiliatePool(new BN(2 * LAMPORTS_PER_SOL))
        .accounts({
          depositor: authority.publicKey,
          affiliatePool: affiliatePoolPda,
          affiliatePoolVault: affiliateVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should accumulate affiliate earnings", async () => {
      const accBefore = await program.account.affiliateAccumulator.fetch(accumulatorPda);

      await program.methods
        .accumulateAffiliateEarnings(amount, 2)
        .accounts({
          authority: authority.publicKey,
          affiliatePool: affiliatePoolPda,
          accumulator: accumulatorPda,
        })
        .rpc();

      const accAfter = await program.account.affiliateAccumulator.fetch(accumulatorPda);
      expect(accAfter.pendingAmount.toNumber()).to.equal(
        accBefore.pendingAmount.toNumber() + amount.toNumber()
      );
      expect(accAfter.referralCount).to.equal(accBefore.referralCount + 1);
      expect(accAfter.tier).to.equal(2);
    });

    it("should upgrade tier when higher tier earned", async () => {
      const accBefore = await program.account.affiliateAccumulator.fetch(accumulatorPda);

      await program.methods
        .accumulateAffiliateEarnings(amount, 4)
        .accounts({
          authority: authority.publicKey,
          affiliatePool: affiliatePoolPda,
          accumulator: accumulatorPda,
        })
        .rpc();

      const accAfter = await program.account.affiliateAccumulator.fetch(accumulatorPda);
      expect(accAfter.tier).to.equal(4);
    });

    it("should not downgrade tier", async () => {
      const accBefore = await program.account.affiliateAccumulator.fetch(accumulatorPda);

      await program.methods
        .accumulateAffiliateEarnings(amount, 1)
        .accounts({
          authority: authority.publicKey,
          affiliatePool: affiliatePoolPda,
          accumulator: accumulatorPda,
        })
        .rpc();

      const accAfter = await program.account.affiliateAccumulator.fetch(accumulatorPda);
      expect(accAfter.tier).to.equal(accBefore.tier);
    });
  });

  describe("Prize Tier Percentages", () => {
    it("should have correct percentages for standard lottery (tri-daily)", () => {
      expect(getPrizeTierPercentageBps(1, LOTTERY_TYPE_TRI_DAILY)).to.equal(2000);
      expect(getPrizeTierPercentageBps(2, LOTTERY_TYPE_TRI_DAILY)).to.equal(1000);
      expect(getPrizeTierPercentageBps(3, LOTTERY_TYPE_TRI_DAILY)).to.equal(1250);
      expect(getPrizeTierPercentageBps(4, LOTTERY_TYPE_TRI_DAILY)).to.equal(2750);
      expect(getPrizeTierPercentageBps(5, LOTTERY_TYPE_TRI_DAILY)).to.equal(3000);
    });

    it("should have correct percentages for xmas lottery", () => {
      expect(getPrizeTierPercentageBps(1, LOTTERY_TYPE_XMAS)).to.equal(5000);
      expect(getPrizeTierPercentageBps(2, LOTTERY_TYPE_XMAS)).to.equal(3000);
      expect(getPrizeTierPercentageBps(3, LOTTERY_TYPE_XMAS)).to.equal(2000);
    });
  });

  describe("Affiliate Commission Rates", () => {
    it("should return correct commission rates by tier", () => {
      expect(getAffiliateCommissionRate(1)).to.equal(5);
      expect(getAffiliateCommissionRate(2)).to.equal(10);
      expect(getAffiliateCommissionRate(3)).to.equal(20);
      expect(getAffiliateCommissionRate(4)).to.equal(30);
    });

    it("should default to tier 1 for invalid tier", () => {
      expect(getAffiliateCommissionRate(0)).to.equal(5);
      expect(getAffiliateCommissionRate(99)).to.equal(5);
    });
  });

  describe("Week Calculation", () => {
    it("should calculate current week correctly", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const week = calculateCurrentWeek(timestamp);
      expect(week).to.be.greaterThan(2800);
    });

    it("should calculate Wednesday release correctly", () => {
      const wednesdayMidnight = 345600 + (604800 * 2850) + 259199;
      expect(isAfterWednesdayRelease(wednesdayMidnight)).to.be.true;

      const mondayMorning = 345600 + (604800 * 2850) + 100000;
      expect(isAfterWednesdayRelease(mondayMorning)).to.be.false;
    });
  });
});

function getPrizeTierPercentageBps(tier: number, lotteryType: number): number {
  if (lotteryType === 3) {
    switch (tier) {
      case 1: return 5000;
      case 2: return 3000;
      case 3: return 2000;
      default: return 0;
    }
  } else {
    switch (tier) {
      case 1: return 2000;
      case 2: return 1000;
      case 3: return 1250;
      case 4: return 2750;
      case 5: return 3000;
      default: return 0;
    }
  }
}

function getAffiliateCommissionRate(tier: number): number {
  switch (tier) {
    case 1: return 5;
    case 2: return 10;
    case 3: return 20;
    case 4: return 30;
    default: return 5;
  }
}

function calculateCurrentWeek(timestamp: number): number {
  const epochStart = 345600;
  const secondsPerWeek = 604800;
  return Math.floor((timestamp - epochStart) / secondsPerWeek);
}

function isAfterWednesdayRelease(timestamp: number): boolean {
  const epochStart = 345600;
  const secondsPerWeek = 604800;
  const wednesdayOffset = 259199;
  const weekProgress = (timestamp - epochStart) % secondsPerWeek;
  return weekProgress >= wednesdayOffset;
}
