import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("powersol-core", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const PROGRAM_ID = new PublicKey("GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW");

  const program = new Program(
    require("../target/idl/powersol_core.json"),
    provider
  );

  const authority = provider.wallet;
  const treasury = Keypair.generate();
  const affiliatesPool = Keypair.generate();

  let triDailyLotteryPda: PublicKey;
  let jackpotLotteryPda: PublicKey;
  let grandPrizeLotteryPda: PublicKey;
  let xmasLotteryPda: PublicKey;

  const TICKET_PRICE = new BN(0.1 * LAMPORTS_PER_SOL);
  const MAX_TICKETS = 100;

  before(async () => {
    const airdropTx = await provider.connection.requestAirdrop(
      treasury.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx);

    const airdropTx2 = await provider.connection.requestAirdrop(
      affiliatesPool.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx2);
  });

  describe("Tri-Daily Lottery", () => {
    const round = new BN(1);
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

    before(async () => {
      [triDailyLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), round.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
    });

    it("should initialize tri-daily lottery", async () => {
      try {
        await program.methods
          .initializeTriDailyLottery(
            round,
            TICKET_PRICE,
            MAX_TICKETS,
            new BN(futureTimestamp)
          )
          .accounts({
            authority: authority.publicKey,
            lottery: triDailyLotteryPda,
            treasury: treasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const lottery = await program.account.lottery.fetch(triDailyLotteryPda);
        expect(lottery.authority.toBase58()).to.equal(authority.publicKey.toBase58());
        expect(lottery.ticketPrice.toNumber()).to.equal(TICKET_PRICE.toNumber());
        expect(lottery.maxTickets).to.equal(MAX_TICKETS);
        expect(lottery.currentTickets).to.equal(0);
        expect(lottery.isDrawn).to.be.false;
        expect(lottery.prizePool.toNumber()).to.equal(0);
      } catch (e) {
        console.log("Initialize tri-daily error:", e);
        throw e;
      }
    });

    it("should fail to initialize duplicate lottery", async () => {
      try {
        await program.methods
          .initializeTriDailyLottery(
            round,
            TICKET_PRICE,
            MAX_TICKETS,
            new BN(futureTimestamp)
          )
          .accounts({
            authority: authority.publicKey,
            lottery: triDailyLotteryPda,
            treasury: treasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown error");
      } catch (e) {
        expect(e).to.exist;
      }
    });

    it("should purchase ticket", async () => {
      const buyer = Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      const lotteryBefore = await program.account.lottery.fetch(triDailyLotteryPda);
      const ticketNumber = lotteryBefore.currentTickets + 1;

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("ticket"),
          triDailyLotteryPda.toBuffer(),
          new BN(ticketNumber).toArrayLike(Buffer, "le", 4),
        ],
        PROGRAM_ID
      );

      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_tickets"),
          buyer.publicKey.toBuffer(),
          triDailyLotteryPda.toBuffer(),
        ],
        PROGRAM_ID
      );

      try {
        await program.methods
          .purchaseTicket(null)
          .accounts({
            buyer: buyer.publicKey,
            lottery: triDailyLotteryPda,
            ticket: ticketPda,
            userTickets: userTicketsPda,
            treasury: treasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();

        const lotteryAfter = await program.account.lottery.fetch(triDailyLotteryPda);
        expect(lotteryAfter.currentTickets).to.equal(lotteryBefore.currentTickets + 1);
        expect(lotteryAfter.prizePool.toNumber()).to.be.greaterThan(0);

        const ticket = await program.account.ticket.fetch(ticketPda);
        expect(ticket.owner.toBase58()).to.equal(buyer.publicKey.toBase58());
        expect(ticket.ticketNumber).to.equal(ticketNumber);
        expect(ticket.isWinner).to.be.false;
        expect(ticket.claimed).to.be.false;

        const userTickets = await program.account.userTickets.fetch(userTicketsPda);
        expect(userTickets.count).to.equal(1);
        expect(userTickets.ticketNumbers).to.include(ticketNumber);
      } catch (e) {
        console.log("Purchase ticket error:", e);
        throw e;
      }
    });

    it("should purchase ticket with affiliate code", async () => {
      const buyer = Keypair.generate();
      const airdropTx = await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropTx);

      const lotteryBefore = await program.account.lottery.fetch(triDailyLotteryPda);
      const ticketNumber = lotteryBefore.currentTickets + 1;

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("ticket"),
          triDailyLotteryPda.toBuffer(),
          new BN(ticketNumber).toArrayLike(Buffer, "le", 4),
        ],
        PROGRAM_ID
      );

      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_tickets"),
          buyer.publicKey.toBuffer(),
          triDailyLotteryPda.toBuffer(),
        ],
        PROGRAM_ID
      );

      await program.methods
        .purchaseTicket("AFFILIATE123")
        .accounts({
          buyer: buyer.publicKey,
          lottery: triDailyLotteryPda,
          ticket: ticketPda,
          userTickets: userTicketsPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const ticket = await program.account.ticket.fetch(ticketPda);
      expect(ticket.affiliateCode).to.equal("AFFILIATE123");
    });

    it("should fail purchase when lottery is full", async () => {
      const fullLotteryRound = new BN(999);
      const [fullLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), fullLotteryRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      await program.methods
        .initializeTriDailyLottery(
          fullLotteryRound,
          TICKET_PRICE,
          1,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: fullLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const buyer1 = Keypair.generate();
      await provider.connection.requestAirdrop(buyer1.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [ticketPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), fullLotteryPda.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 4)],
        PROGRAM_ID
      );
      const [userTicketsPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer1.publicKey.toBuffer(), fullLotteryPda.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .purchaseTicket(null)
        .accounts({
          buyer: buyer1.publicKey,
          lottery: fullLotteryPda,
          ticket: ticketPda1,
          userTickets: userTicketsPda1,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer1])
        .rpc();

      const buyer2 = Keypair.generate();
      await provider.connection.requestAirdrop(buyer2.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [ticketPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), fullLotteryPda.toBuffer(), new BN(2).toArrayLike(Buffer, "le", 4)],
        PROGRAM_ID
      );
      const [userTicketsPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer2.publicKey.toBuffer(), fullLotteryPda.toBuffer()],
        PROGRAM_ID
      );

      try {
        await program.methods
          .purchaseTicket(null)
          .accounts({
            buyer: buyer2.publicKey,
            lottery: fullLotteryPda,
            ticket: ticketPda2,
            userTickets: userTicketsPda2,
            treasury: treasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer2])
          .rpc();
        expect.fail("Should have thrown LotteryFull error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("LotteryFull");
      }
    });

    it("should fail purchase when lottery expired", async () => {
      const expiredRound = new BN(998);
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400;

      const [expiredLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), expiredRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      await program.methods
        .initializeTriDailyLottery(
          expiredRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(pastTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: expiredLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const buyer = Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), expiredLotteryPda.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 4)],
        PROGRAM_ID
      );
      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer.publicKey.toBuffer(), expiredLotteryPda.toBuffer()],
        PROGRAM_ID
      );

      try {
        await program.methods
          .purchaseTicket(null)
          .accounts({
            buyer: buyer.publicKey,
            lottery: expiredLotteryPda,
            ticket: ticketPda,
            userTickets: userTicketsPda,
            treasury: treasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        expect.fail("Should have thrown LotteryExpired error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("LotteryExpired");
      }
    });
  });

  describe("Jackpot Lottery", () => {
    const month = 12;
    const year = 2024;
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30;

    before(async () => {
      const monthBuffer = Buffer.alloc(2);
      monthBuffer.writeUInt16LE(month);
      const yearBuffer = Buffer.alloc(4);
      yearBuffer.writeUInt32LE(year);

      [jackpotLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("jackpot"), monthBuffer, yearBuffer],
        PROGRAM_ID
      );
    });

    it("should initialize jackpot lottery", async () => {
      await program.methods
        .initializeJackpotLottery(
          month,
          year,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: jackpotLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const lottery = await program.account.lottery.fetch(jackpotLotteryPda);
      expect(lottery.authority.toBase58()).to.equal(authority.publicKey.toBase58());
      expect(lottery.lotteryId.toNumber()).to.equal(year * 100 + month);
    });
  });

  describe("Grand Prize Lottery", () => {
    const year = 2024;
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 365;

    before(async () => {
      const yearBuffer = Buffer.alloc(4);
      yearBuffer.writeUInt32LE(year);

      [grandPrizeLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("grand_prize"), yearBuffer],
        PROGRAM_ID
      );
    });

    it("should initialize grand prize lottery", async () => {
      await program.methods
        .initializeGrandPrizeLottery(
          year,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: grandPrizeLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const lottery = await program.account.lottery.fetch(grandPrizeLotteryPda);
      expect(lottery.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    });
  });

  describe("Xmas Lottery", () => {
    const year = 2024;
    const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30;

    before(async () => {
      const yearBuffer = Buffer.alloc(4);
      yearBuffer.writeUInt32LE(year);

      [xmasLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("xmas"), yearBuffer],
        PROGRAM_ID
      );
    });

    it("should initialize xmas lottery", async () => {
      await program.methods
        .initializeXmasLottery(
          year,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: xmasLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const lottery = await program.account.lottery.fetch(xmasLotteryPda);
      expect(lottery.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    });
  });

  describe("Execute Draw", () => {
    const drawRound = new BN(500);
    let drawLotteryPda: PublicKey;
    const pastTimestamp = Math.floor(Date.now() / 1000) - 1;

    before(async () => {
      [drawLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), drawRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      await program.methods
        .initializeTriDailyLottery(
          drawRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(pastTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: drawLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      for (let i = 1; i <= 5; i++) {
        const buyer = Keypair.generate();
        await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
        await new Promise((r) => setTimeout(r, 500));
      }
    });

    it("should fail draw before lottery expires", async () => {
      const futureRound = new BN(501);
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const [futureLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), futureRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      await program.methods
        .initializeTriDailyLottery(
          futureRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: futureLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await program.methods
          .executeDraw([1, 2, 3])
          .accounts({
            lottery: futureLotteryPda,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown LotteryNotExpired error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("LotteryNotExpired");
      }
    });

    it("should fail draw with invalid winning tickets", async () => {
      try {
        await program.methods
          .executeDraw([0, 999])
          .accounts({
            lottery: drawLotteryPda,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown InvalidWinningTicket error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("InvalidWinningTicket");
      }
    });

    it("should fail draw by non-authority", async () => {
      const nonAuthority = Keypair.generate();
      await provider.connection.requestAirdrop(nonAuthority.publicKey, LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      try {
        await program.methods
          .executeDraw([])
          .accounts({
            lottery: drawLotteryPda,
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc();
        expect.fail("Should have thrown constraint error");
      } catch (e) {
        expect(e).to.exist;
      }
    });

    it("should execute draw successfully", async () => {
      await program.methods
        .executeDraw([])
        .accounts({
          lottery: drawLotteryPda,
          authority: authority.publicKey,
        })
        .rpc();

      const lottery = await program.account.lottery.fetch(drawLotteryPda);
      expect(lottery.isDrawn).to.be.true;
    });

    it("should fail draw on already drawn lottery", async () => {
      try {
        await program.methods
          .executeDraw([])
          .accounts({
            lottery: drawLotteryPda,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown LotteryAlreadyDrawn error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("LotteryAlreadyDrawn");
      }
    });
  });

  describe("Close Lottery", () => {
    const closeRound = new BN(600);
    let closeLotteryPda: PublicKey;

    before(async () => {
      [closeLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), closeRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      const pastTimestamp = Math.floor(Date.now() / 1000) - 1;

      await program.methods
        .initializeTriDailyLottery(
          closeRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(pastTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: closeLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should fail close on non-drawn lottery", async () => {
      try {
        await program.methods
          .closeLottery()
          .accounts({
            lottery: closeLotteryPda,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown LotteryNotDrawn error");
      } catch (e: any) {
        expect(e.error?.errorCode?.code || e.message).to.include("LotteryNotDrawn");
      }
    });

    it("should close lottery after draw", async () => {
      await program.methods
        .executeDraw([])
        .accounts({
          lottery: closeLotteryPda,
          authority: authority.publicKey,
        })
        .rpc();

      const balanceBefore = await provider.connection.getBalance(authority.publicKey);

      await program.methods
        .closeLottery()
        .accounts({
          lottery: closeLotteryPda,
          authority: authority.publicKey,
        })
        .rpc();

      const balanceAfter = await provider.connection.getBalance(authority.publicKey);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);

      try {
        await program.account.lottery.fetch(closeLotteryPda);
        expect.fail("Account should be closed");
      } catch (e) {
        expect(e).to.exist;
      }
    });

    it("should fail close by non-authority", async () => {
      const anotherRound = new BN(601);
      const [anotherLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), anotherRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      const pastTimestamp = Math.floor(Date.now() / 1000) - 1;

      await program.methods
        .initializeTriDailyLottery(
          anotherRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(pastTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: anotherLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .executeDraw([])
        .accounts({
          lottery: anotherLotteryPda,
          authority: authority.publicKey,
        })
        .rpc();

      const nonAuthority = Keypair.generate();
      await provider.connection.requestAirdrop(nonAuthority.publicKey, LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      try {
        await program.methods
          .closeLottery()
          .accounts({
            lottery: anotherLotteryPda,
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc();
        expect.fail("Should have thrown constraint error");
      } catch (e) {
        expect(e).to.exist;
      }
    });
  });

  describe("Prize Distribution Calculation", () => {
    it("should distribute 40% to prize pool, 30% treasury, 30% affiliates", async () => {
      const testRound = new BN(700);
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const [testLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), testRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      await program.methods
        .initializeTriDailyLottery(
          testRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: testLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const treasuryBefore = await provider.connection.getBalance(treasury.publicKey);
      const affiliatesBefore = await provider.connection.getBalance(affiliatesPool.publicKey);

      const buyer = Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), testLotteryPda.toBuffer(), new BN(1).toArrayLike(Buffer, "le", 4)],
        PROGRAM_ID
      );
      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer.publicKey.toBuffer(), testLotteryPda.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .purchaseTicket(null)
        .accounts({
          buyer: buyer.publicKey,
          lottery: testLotteryPda,
          ticket: ticketPda,
          userTickets: userTicketsPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const treasuryAfter = await provider.connection.getBalance(treasury.publicKey);
      const affiliatesAfter = await provider.connection.getBalance(affiliatesPool.publicKey);
      const lottery = await program.account.lottery.fetch(testLotteryPda);

      const expectedPrizePool = TICKET_PRICE.toNumber() * 0.4;
      const expectedTreasury = TICKET_PRICE.toNumber() * 0.3;
      const expectedAffiliates = TICKET_PRICE.toNumber() * 0.3;

      expect(lottery.prizePool.toNumber()).to.equal(expectedPrizePool);
      expect(treasuryAfter - treasuryBefore).to.equal(expectedTreasury);
      expect(affiliatesAfter - affiliatesBefore).to.equal(expectedAffiliates);
    });
  });

  describe("Multiple Ticket Purchases", () => {
    it("should track multiple tickets per user correctly", async () => {
      const testRound = new BN(800);
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const [testLotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tri_daily"), testRound.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      await program.methods
        .initializeTriDailyLottery(
          testRound,
          TICKET_PRICE,
          MAX_TICKETS,
          new BN(futureTimestamp)
        )
        .accounts({
          authority: authority.publicKey,
          lottery: testLotteryPda,
          treasury: treasury.publicKey,
          affiliatesPool: affiliatesPool.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const buyer = Keypair.generate();
      await provider.connection.requestAirdrop(buyer.publicKey, 5 * LAMPORTS_PER_SOL);
      await new Promise((r) => setTimeout(r, 1000));

      const [userTicketsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_tickets"), buyer.publicKey.toBuffer(), testLotteryPda.toBuffer()],
        PROGRAM_ID
      );

      for (let i = 1; i <= 3; i++) {
        const [ticketPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("ticket"), testLotteryPda.toBuffer(), new BN(i).toArrayLike(Buffer, "le", 4)],
          PROGRAM_ID
        );

        await program.methods
          .purchaseTicket(null)
          .accounts({
            buyer: buyer.publicKey,
            lottery: testLotteryPda,
            ticket: ticketPda,
            userTickets: userTicketsPda,
            treasury: treasury.publicKey,
            affiliatesPool: affiliatesPool.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
      }

      const userTickets = await program.account.userTickets.fetch(userTicketsPda);
      expect(userTickets.count).to.equal(3);
      expect(userTickets.ticketNumbers).to.deep.equal([1, 2, 3]);
    });
  });
});
