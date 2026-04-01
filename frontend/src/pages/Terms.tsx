import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight } from 'lucide-react';
import { theme } from '../theme';

const LAST_UPDATED = 'April 1, 2026';

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <section className="mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.colors.text }}>
        <span
          className="font-mono text-sm px-2 py-0.5 rounded"
          style={{ background: `${theme.colors.neonBlue}15`, color: theme.colors.neonBlue }}
        >
          {number}
        </span>
        {title}
      </h3>
      <div className="space-y-3 text-zinc-300 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

const TOC_ITEMS = [
  'Acceptance of Terms',
  'Eligibility & Age Verification',
  'Wallet Connection & Digital Signatures',
  'Lottery & Gaming Services',
  'Ticket Purchases & Blockchain Transactions',
  'Prize Distribution & Claims',
  'Affiliate Program',
  'Power Points & Missions',
  'Responsible Gaming',
  'OFAC Sanctions Compliance',
  'Prohibited Conduct & Account Enforcement',
  'Intellectual Property',
  'Data Collection & Privacy',
  'Third-Party Services & External Links',
  'Disclaimers & Limitation of Liability',
  'Indemnification',
  'Governing Law & Dispute Resolution',
  'Force Majeure',
  'Severability',
  'Modifications to Terms',
  'Contact Information',
];

export function Terms() {
  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{
              fontFamily: 'Orbitron, monospace',
              background: theme.gradients.neon,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Terms of Service
          </h1>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="prose prose-invert max-w-none"
            style={{
              background: theme.gradients.card,
              borderRadius: '2rem',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: theme.shadows.cardGlow,
              backdropFilter: 'blur(20px)',
              padding: '3rem',
            }}
          >
            <div className="flex items-center space-x-4 mb-8">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.neonBlue}20, ${theme.colors.neonCyan}20)`,
                  border: `1px solid ${theme.colors.neonBlue}40`,
                }}
              >
                <FileText className="w-6 h-6" style={{ color: theme.colors.neonBlue }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  Legal Terms & Conditions
                </h2>
                <p className="text-zinc-400">Last updated: {LAST_UPDATED}</p>
              </div>
            </div>

            <div
              className="rounded-xl p-5 mb-10"
              style={{ background: 'rgba(62, 203, 255, 0.04)', border: '1px solid rgba(62, 203, 255, 0.12)' }}
            >
              <p className="text-sm font-mono text-zinc-500 mb-3 uppercase tracking-wider">Table of Contents</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {TOC_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                    <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    <span className="text-zinc-600 font-mono text-xs w-5">{i + 1}.</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Section number="1" title="Acceptance of Terms">
                <p>
                  By accessing, browsing, or using the PowerSOL platform (the "Platform"), including all associated services, applications, smart contracts, and content, you ("User", "you") acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). These Terms constitute a legally binding agreement between you and PowerSOL ("we", "us", "the Platform").
                </p>
                <p>
                  If you do not agree to all provisions of these Terms, you must immediately discontinue use of the Platform. Your continued use of the Platform after any modifications to these Terms constitutes acceptance of such changes.
                </p>
                <p>
                  These Terms apply to all visitors, registered users, affiliates, and any other persons who access or use the Platform in any capacity.
                </p>
              </Section>

              <Section number="2" title="Eligibility & Age Verification">
                <p>
                  You must be at least eighteen (18) years of age or the minimum legal age for gambling activities in your jurisdiction, whichever is greater, to use the Platform. By using the Platform, you represent and warrant that you meet this age requirement.
                </p>
                <p>
                  <strong>Mandatory Cryptographic Age Verification:</strong> The Platform requires all users to complete a mandatory age verification process via a cryptographic wallet signature upon first connection. This involves signing a specific message with your connected Solana wallet confirming you are at least 18 years of age and agreeing to these Terms. This signature is recorded on our systems as a binding attestation. Until this verification is complete, access to ticket purchases, lottery participation, affiliate dashboards, and other core Platform features is restricted.
                </p>
                <p>
                  The age verification signature is required only once per wallet address. Once recorded, you will not be prompted again. If you decline to sign, Platform features will remain restricted and the verification prompt will continue to appear.
                </p>
                <p>
                  PowerSOL reserves the right to request additional age or identity verification at any time and to suspend or terminate accounts where there is reasonable suspicion that the User does not meet the minimum age requirement.
                </p>
              </Section>

              <Section number="3" title="Wallet Connection & Digital Signatures">
                <p>
                  The Platform requires connection of a Solana-compatible cryptocurrency wallet (such as Phantom or Solflare) to access most features. You are solely responsible for maintaining the security of your wallet, private keys, seed phrases, and any associated credentials.
                </p>
                <p>
                  By connecting your wallet, you consent to the Platform reading your wallet's public address for identification, transaction processing, and compliance purposes. PowerSOL never has access to your private keys or seed phrases.
                </p>
                <p>
                  Digital signatures requested by the Platform (including but not limited to age verification signatures) are off-chain message signatures that do not initiate blockchain transactions and incur no network fees. By signing messages requested by the Platform, you acknowledge that such signatures constitute binding attestations that may be stored and used for compliance, audit, and record-keeping purposes.
                </p>
                <p>
                  PowerSOL is not responsible for any loss arising from unauthorized access to your wallet, compromised private keys, or wallet provider malfunctions.
                </p>
              </Section>

              <Section number="4" title="Lottery & Gaming Services">
                <p>
                  PowerSOL operates blockchain-based lottery draws on the Solana network. The Platform offers various lottery types including but not limited to: daily, weekly, monthly, and special event lotteries. Each lottery type has its own ticket pricing, prize pool structure, draw schedule, and rules as displayed on the Platform.
                </p>
                <p>
                  All lottery operations are conducted through Solana smart contracts (programs). Draw results are determined using cryptographically secure randomness mechanisms. While we strive for maximum transparency, the Platform does not guarantee uninterrupted operation of any lottery due to the inherent nature of blockchain technology, network congestion, or other factors beyond our control.
                </p>
                <p>
                  PowerSOL reserves the right to modify lottery types, ticket prices, prize structures, draw schedules, and rules at any time. Active lottery rounds in progress at the time of changes will be honored under the rules in effect at the time of ticket purchase.
                </p>
                <p>
                  By participating in any lottery on the Platform, you acknowledge that gambling involves inherent financial risk, that outcomes are uncertain, and that past results do not guarantee future outcomes.
                </p>
              </Section>

              <Section number="5" title="Ticket Purchases & Blockchain Transactions">
                <p>
                  Lottery tickets are purchased using SOL (the native token of the Solana blockchain). All ticket purchases are processed as on-chain Solana transactions and are therefore final, irreversible, and non-refundable once confirmed on the blockchain.
                </p>
                <p>
                  You are responsible for ensuring you have sufficient SOL balance in your connected wallet to cover the ticket price plus any applicable Solana network transaction fees. The Platform is not responsible for failed transactions due to insufficient balance, network congestion, wallet errors, or any other technical issues.
                </p>
                <p>
                  Ticket prices are denominated in SOL. Given the volatile nature of cryptocurrency markets, the fiat-equivalent value of tickets and prizes may fluctuate significantly. PowerSOL makes no representations regarding the fiat value of any cryptocurrency amounts.
                </p>
                <p>
                  Each ticket purchase is recorded both on the Solana blockchain and in the Platform's database. In the event of any discrepancy, on-chain transaction data shall be considered the authoritative record.
                </p>
              </Section>

              <Section number="6" title="Prize Distribution & Claims">
                <p>
                  Prize pools are funded from ticket sales according to the allocation structure defined for each lottery type. A portion of ticket revenue is allocated to prize pools, platform operations (dev treasury), delta pool reserves, and affiliate commissions.
                </p>
                <p>
                  Winners are selected through verifiable random processes executed by Solana smart contracts. Prize claims may be initiated through the Platform interface and are processed as on-chain transactions.
                </p>
                <p>
                  <strong>Prize Expiration:</strong> Unclaimed prizes are subject to expiration policies. If a prize is not claimed within the designated claim window, it may be forfeited and reallocated to future prize pools or the Platform's operational reserves. It is your sole responsibility to monitor and claim your prizes in a timely manner.
                </p>
                <p>
                  PowerSOL is not responsible for prizes that cannot be delivered due to wallet incompatibility, user error in providing wallet addresses, blockchain network issues, or failure to claim within the expiration window.
                </p>
                <p>
                  You are solely responsible for any tax obligations arising from prizes received. PowerSOL does not provide tax advice and does not withhold taxes on prize distributions.
                </p>
              </Section>

              <Section number="7" title="Affiliate Program">
                <p>
                  PowerSOL offers an affiliate program that allows approved users to earn commissions by referring new users to the Platform. Participation in the affiliate program is subject to an application and approval process at PowerSOL's sole discretion.
                </p>
                <p>
                  <strong>Commission Structure:</strong> Affiliate commissions are calculated as a percentage of ticket purchases made by referred users. Commission rates are determined by the affiliate's tier level, which may be adjusted by PowerSOL at any time. Tier levels include Starter, Bronze, Silver, and Gold, each with different commission rates.
                </p>
                <p>
                  <strong>Weekly Release Schedule:</strong> Commissions accumulate and are released on a weekly schedule. Affiliates must claim their earned commissions within the designated claim window. Unclaimed commissions may expire and be forfeited.
                </p>
                <p>
                  <strong>Referral Code:</strong> Each affiliate receives a unique referral code. Sharing this code with potential users is the sole authorized method of referral tracking. Affiliates may not use deceptive, misleading, or spamming tactics to generate referrals.
                </p>
                <p>
                  <strong>Prohibited Affiliate Conduct:</strong> The following activities are strictly prohibited and may result in immediate termination from the affiliate program, forfeiture of all pending commissions, and potential account banning:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Self-referrals or creating multiple accounts to generate artificial commissions</li>
                  <li>Sybil attacks: creating fake or puppet accounts to inflate referral counts</li>
                  <li>Misrepresenting the Platform, its services, or potential earnings</li>
                  <li>Using bots, scripts, or automated tools to generate referrals</li>
                  <li>Engaging in any form of fraud, manipulation, or deceptive practices</li>
                  <li>Sending unsolicited communications (spam) to promote referral codes</li>
                </ul>
                <p>
                  PowerSOL employs automated sybil attack detection systems that analyze referral patterns, signup timing, ticket purchasing behavior, and other indicators. Users identified as engaging in manipulative referral practices will be subject to enforcement actions without prior notice.
                </p>
              </Section>

              <Section number="8" title="Power Points & Missions">
                <p>
                  The Platform offers a Power Points system where users can earn points through various activities including daily logins, completing missions, purchasing tickets, and other engagement activities. Power Points are internal platform rewards and have no monetary or exchange value outside of the Platform.
                </p>
                <p>
                  Missions are tasks that users can complete to earn Power Points. Mission availability, requirements, and rewards may change at any time. Some missions reset on daily, weekly, or monthly cycles based on fixed calendar periods.
                </p>
                <p>
                  PowerSOL reserves the right to modify, suspend, or terminate the Power Points system and any associated missions at any time without prior notice. Accumulated Power Points may be adjusted or reset at PowerSOL's discretion if abuse or manipulation is detected.
                </p>
              </Section>

              <Section number="9" title="Responsible Gaming">
                <p>
                  PowerSOL is committed to promoting responsible gaming practices. Participation in lottery activities should be treated as entertainment, not as a source of income or financial strategy.
                </p>
                <p>
                  <strong>You acknowledge and agree that:</strong>
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Gambling involves risk of financial loss, and you should never spend more than you can afford to lose</li>
                  <li>Past lottery results do not predict or influence future outcomes</li>
                  <li>The odds of winning are determined by the number of tickets sold and the prize structure</li>
                  <li>You are solely responsible for your gambling decisions and their consequences</li>
                  <li>You should seek professional help if you believe you may have a gambling problem</li>
                </ul>
                <p>
                  If you feel you may have a gambling problem, please contact a gambling support service in your jurisdiction. PowerSOL is not a counseling or addiction treatment service and does not provide such services.
                </p>
                <p>
                  PowerSOL may, at its sole discretion, implement spending limits, cooling-off periods, or self-exclusion mechanisms. Users who exhibit patterns indicative of problem gambling may be contacted or have their accounts restricted as a harm-prevention measure.
                </p>
              </Section>

              <Section number="10" title="OFAC Sanctions Compliance">
                <p>
                  PowerSOL complies with the sanctions programs administered by the U.S. Department of the Treasury's Office of Foreign Assets Control ("OFAC"). The Platform maintains a compliance program that includes screening user wallets against the OFAC Specially Designated Nationals (SDN) list and other sanctions lists.
                </p>
                <p>
                  <strong>Automated Screening:</strong> User wallet addresses are automatically screened against OFAC sanctioned address lists on a periodic basis (every 30 days) and may also be checked manually by Platform administrators. Wallet addresses identified as matching sanctioned addresses will be immediately flagged.
                </p>
                <p>
                  <strong>Consequences of Sanctions Match:</strong> If your wallet address is found on the OFAC SDN list or any other applicable sanctions list:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Your account will be immediately flagged and access to Platform services will be restricted</li>
                  <li>Pending transactions, prizes, and affiliate commissions may be frozen or forfeited</li>
                  <li>Your account may be permanently banned without prior notice</li>
                  <li>PowerSOL may be required to report the matter to relevant authorities</li>
                </ul>
                <p>
                  By using the Platform, you represent and warrant that you are not on any sanctions list, that you are not acting on behalf of any sanctioned individual or entity, and that your funds are not derived from or connected to sanctioned activities.
                </p>
                <p>
                  PowerSOL reserves the right to implement additional compliance measures, including but not limited to KYC (Know Your Customer) procedures, at any time.
                </p>
              </Section>

              <Section number="11" title="Prohibited Conduct & Account Enforcement">
                <p>
                  You agree not to engage in any of the following prohibited activities:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Attempting to manipulate lottery outcomes, exploit smart contract vulnerabilities, or interfere with the Platform's operations</li>
                  <li>Using bots, scripts, automated tools, or any non-human means to interact with the Platform</li>
                  <li>Whale manipulation: concentrating disproportionate ticket purchases to unfairly influence lottery outcomes</li>
                  <li>Creating multiple accounts or wallets to circumvent restrictions, bans, or to gain unfair advantages</li>
                  <li>Accessing the Platform from jurisdictions where lottery or gambling activities are prohibited</li>
                  <li>Attempting to reverse-engineer, decompile, or access the source code of the Platform's smart contracts or applications</li>
                  <li>Engaging in money laundering, terrorist financing, or any illegal financial activity</li>
                  <li>Harassing, threatening, or abusing other users, staff, or administrators</li>
                  <li>Circumventing or attempting to circumvent any security measures, age verification, or compliance systems</li>
                  <li>Providing false or misleading information during registration, verification, or affiliate application processes</li>
                </ul>
                <p>
                  <strong>Enforcement Actions:</strong> PowerSOL reserves the right to take the following enforcement actions at its sole discretion, with or without prior notice:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Issuing compliance warnings of varying severity (low, medium, high, critical)</li>
                  <li>Temporarily or permanently restricting access to specific Platform features</li>
                  <li>Suspending or permanently banning user accounts</li>
                  <li>Forfeiting unclaimed prizes, pending affiliate commissions, or Power Points</li>
                  <li>Reporting violations to relevant law enforcement or regulatory authorities</li>
                </ul>
                <p>
                  The Platform employs automated whale analysis and sybil attack detection systems that monitor ticket purchasing patterns, wallet concentration, referral behavior, and other behavioral indicators. Accounts flagged by these systems may be subject to review and enforcement actions.
                </p>
              </Section>

              <Section number="12" title="Intellectual Property">
                <p>
                  All content, trademarks, logos, graphics, user interface designs, software, smart contract code, and other materials available on the Platform ("Platform Content") are owned by or licensed to PowerSOL and are protected by applicable intellectual property laws.
                </p>
                <p>
                  You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for its intended purposes. This license does not include the right to modify, reproduce, distribute, create derivative works from, or commercially exploit any Platform Content without prior written consent from PowerSOL.
                </p>
              </Section>

              <Section number="13" title="Data Collection & Privacy">
                <p>
                  By using the Platform, you consent to the collection, storage, and processing of the following data:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Wallet addresses:</strong> Your public Solana wallet address is recorded for identification, transaction processing, compliance screening, and audit purposes</li>
                  <li><strong>Transaction data:</strong> All ticket purchases, prize claims, and affiliate transactions are recorded both on-chain and in our database</li>
                  <li><strong>Digital signatures:</strong> Cryptographic signatures provided for age verification and other attestation purposes</li>
                  <li><strong>Usage data:</strong> Login timestamps, session information, browser user-agent strings, and interaction patterns for security, analytics, and compliance monitoring</li>
                  <li><strong>Affiliate data:</strong> Application information including name, email, country, social media accounts, and marketing strategy for approved affiliates</li>
                  <li><strong>Social account links:</strong> Optionally provided social media handles for profile and mission purposes</li>
                  <li><strong>Compliance records:</strong> OFAC screening results, compliance warnings, enforcement actions, and audit trails</li>
                </ul>
                <p>
                  PowerSOL does not sell personal data to third parties. Data may be shared with law enforcement or regulatory authorities when required by law or in connection with sanctions compliance. Data may also be used in aggregated, anonymized form for analytics purposes.
                </p>
                <p>
                  All data is stored using industry-standard security measures. However, no method of electronic storage or transmission is 100% secure, and PowerSOL cannot guarantee absolute data security.
                </p>
              </Section>

              <Section number="14" title="Third-Party Services & External Links">
                <p>
                  The Platform integrates with and relies upon various third-party services including but not limited to:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Solana Blockchain:</strong> All lottery operations, ticket purchases, and prize distributions occur on the Solana network</li>
                  <li><strong>Wallet Providers:</strong> Phantom, Solflare, and other compatible Solana wallets</li>
                  <li><strong>Supabase:</strong> Database and backend infrastructure services</li>
                  <li><strong>OFAC/U.S. Treasury:</strong> Sanctions list data for compliance screening</li>
                </ul>
                <p>
                  PowerSOL is not responsible for the availability, security, accuracy, or performance of third-party services. Any disruption to third-party services may impact Platform functionality. You acknowledge that your use of third-party services is subject to their respective terms of service and privacy policies.
                </p>
                <p>
                  The Platform may contain links to external websites or resources. PowerSOL does not endorse and is not responsible for the content, products, or services available from external sources.
                </p>
              </Section>

              <Section number="15" title="Disclaimers & Limitation of Liability">
                <p>
                  THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. POWERSOL EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                </p>
                <p>
                  POWERSOL DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS. POWERSOL DOES NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY INFORMATION PROVIDED ON THE PLATFORM.
                </p>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL POWERSOL, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Loss of profits, revenue, data, goodwill, or other intangible losses</li>
                  <li>Loss of cryptocurrency, tokens, or digital assets</li>
                  <li>Damages resulting from unauthorized access to or alteration of your data or transactions</li>
                  <li>Damages resulting from smart contract bugs, blockchain network failures, or wallet malfunctions</li>
                  <li>Damages resulting from the conduct of any third party on the Platform</li>
                  <li>Damages resulting from fluctuations in cryptocurrency values</li>
                  <li>Damages resulting from account restrictions, bans, or enforcement actions taken under these Terms</li>
                </ul>
                <p>
                  IN NO EVENT SHALL POWERSOL'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM EXCEED THE TOTAL AMOUNT OF SOL YOU HAVE SPENT ON TICKET PURCHASES IN THE THIRTY (30) DAYS PRECEDING THE CLAIM.
                </p>
                <p>
                  SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR LIMITATION OF LIABILITY FOR CERTAIN TYPES OF DAMAGES. IN SUCH CASES, THE LIMITATIONS SET FORTH ABOVE SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW.
                </p>
              </Section>

              <Section number="16" title="Indemnification">
                <p>
                  You agree to indemnify, defend, and hold harmless PowerSOL and its officers, directors, employees, agents, licensors, and service providers from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Your use of the Platform or any activity under your wallet address</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any applicable law, regulation, or rights of any third party</li>
                  <li>Any content or information you provide to the Platform</li>
                  <li>Your participation in the affiliate program and any referral activities</li>
                </ul>
              </Section>

              <Section number="17" title="Governing Law & Dispute Resolution">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws applicable to decentralized digital platforms, without regard to conflict of law principles.
                </p>
                <p>
                  Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, or invalidity thereof, shall first be attempted to be resolved through good-faith negotiation between the parties. If the dispute cannot be resolved through negotiation within thirty (30) days, it shall be submitted to binding arbitration.
                </p>
                <p>
                  YOU AGREE THAT ANY CLAIMS SHALL BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
                </p>
              </Section>

              <Section number="18" title="Force Majeure">
                <p>
                  PowerSOL shall not be liable for any failure or delay in performing its obligations under these Terms due to circumstances beyond its reasonable control, including but not limited to: natural disasters, acts of war or terrorism, epidemics or pandemics, government actions or regulations, blockchain network failures or congestion, smart contract vulnerabilities discovered after deployment, third-party service outages, cyberattacks, or significant fluctuations in cryptocurrency markets.
                </p>
              </Section>

              <Section number="19" title="Severability">
                <p>
                  If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be enforced to the maximum extent permissible, and the remaining provisions of these Terms shall remain in full force and effect. The invalid or unenforceable provision shall be replaced by a valid and enforceable provision that most closely achieves the original intent.
                </p>
              </Section>

              <Section number="20" title="Modifications to Terms">
                <p>
                  PowerSOL reserves the right to modify, amend, or update these Terms at any time and at its sole discretion. Changes will be effective immediately upon posting on the Platform. The "Last updated" date at the top of these Terms will be revised accordingly.
                </p>
                <p>
                  It is your responsibility to review these Terms periodically. Your continued use of the Platform after any modifications constitutes your acceptance of the updated Terms. If you disagree with any modifications, you must immediately discontinue use of the Platform.
                </p>
                <p>
                  For material changes that significantly affect your rights or obligations, PowerSOL will make reasonable efforts to provide notice through the Platform interface. However, the absence of such notice does not invalidate any changes made to these Terms.
                </p>
              </Section>

              <Section number="21" title="Contact Information">
                <p>
                  For questions, concerns, or inquiries regarding these Terms of Service, the Platform, compliance matters, or any other issues, please contact us through the official PowerSOL communication channels as listed on the Platform.
                </p>
                <p>
                  For urgent compliance or security matters including sanctions-related concerns, please reach out to the Platform administrators through the designated compliance channels.
                </p>
              </Section>

              <div
                className="mt-12 p-5 rounded-xl text-center"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <p className="text-zinc-500 text-sm">
                  By using PowerSOL, you confirm that you have read, understood, and agree to be bound by these Terms of Service in their entirety.
                </p>
                <p className="text-zinc-600 text-xs mt-3 font-mono">
                  Document Version 2.0 | Effective Date: {LAST_UPDATED}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
