export interface TermsSection {
  id: string;
  title: string;
  content: string[];
}

export const TERMS_LAST_UPDATED = 'April 1, 2026';

export const termsSections: TermsSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: [
      'By accessing, browsing, or using the PowerSOL platform ("Platform"), including its website, smart contracts, edge functions, APIs, and any related services (collectively, the "Services"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms").',
      'If you do not agree to these Terms, you must immediately cease all use of the Platform. Continued use of the Platform constitutes ongoing acceptance of these Terms and any amendments thereto.',
      'These Terms constitute a legally binding agreement between you ("User," "you," or "your") and PowerSOL ("we," "us," or "our"). We reserve the right to update, modify, or replace any part of these Terms at our sole discretion. Changes take effect immediately upon publication on the Platform. It is your responsibility to review these Terms periodically.',
    ],
  },
  {
    id: 'eligibility',
    title: '2. Eligibility & Age Requirements',
    content: [
      'You must be at least eighteen (18) years of age to access or use the Platform. By using the Platform, you represent and warrant that you meet this minimum age requirement. PowerSOL enforces age verification through its verification system, and any attempt to circumvent this requirement is a violation of these Terms.',
      'You further represent that you are not a person barred from using the Services under the laws of any applicable jurisdiction. You must not use the Platform if online lottery participation, blockchain-based gaming, or similar activities are prohibited or restricted in your jurisdiction.',
      'You are solely responsible for determining whether your use of the Platform complies with all laws and regulations applicable to you, including but not limited to gambling laws, tax obligations, and cryptocurrency regulations in your jurisdiction. PowerSOL does not provide legal or tax advice.',
    ],
  },
  {
    id: 'jurisdictional',
    title: '3. Jurisdictional Restrictions & Compliance',
    content: [
      'PowerSOL operates globally on the Solana blockchain; however, certain jurisdictions may restrict or prohibit participation in lottery or blockchain-based services. You are solely responsible for ensuring that your participation complies with local, state, national, and international laws applicable to you.',
      'PowerSOL implements OFAC (Office of Foreign Assets Control) compliance screening. Wallet addresses may be screened against the SDN (Specially Designated Nationals) list and consolidated sanctions lists. Users flagged by OFAC screening may have their accounts restricted, suspended, or permanently banned.',
      'PowerSOL reserves the right to restrict, suspend, or terminate access for users in any jurisdiction at any time, without prior notice, if we determine that continued service would violate applicable law or expose the Platform to legal risk.',
      'Users who reside in or are nationals of jurisdictions subject to comprehensive sanctions (including but not limited to North Korea, Iran, Syria, Cuba, and Crimea) are strictly prohibited from using the Platform.',
    ],
  },
  {
    id: 'account-wallet',
    title: '4. Account & Wallet Authentication',
    content: [
      'The Platform uses Solana wallet-based authentication exclusively. Your wallet address serves as your unique identifier. PowerSOL does not store passwords, seed phrases, or private keys. Authentication is performed via cryptographic signature verification using a nonce-based challenge-response protocol.',
      'You are solely responsible for the security of your wallet, private keys, seed phrases, and any associated authentication credentials. PowerSOL shall not be liable for any loss or damage arising from your failure to secure your wallet or from unauthorized access to your wallet.',
      'Supported wallets include but are not limited to Phantom, Solflare, Backpack, Glow, and Trust Wallet. PowerSOL does not endorse, guarantee, or assume responsibility for the functionality, security, or availability of any third-party wallet provider.',
      'By connecting your wallet to the Platform, you authorize PowerSOL to read your wallet address, request transaction signatures, and interact with the Solana blockchain on your behalf when you explicitly approve transactions. You retain full custody of your funds at all times.',
    ],
  },
  {
    id: 'lottery-services',
    title: '5. Lottery Services',
    content: [
      'PowerSOL offers multiple lottery types, including but not limited to: Tri-Daily Lottery (every 3 days), Monthly Jackpot, Grand Prize, and Special Event Lotteries. Each lottery type has its own ticket pricing, prize pool structure, draw schedule, and maximum ticket caps.',
      'Ticket prices are denominated in SOL (Solana\'s native cryptocurrency) and may vary by lottery type. Prices are displayed at the time of purchase and are subject to change. By purchasing a ticket, you agree to the displayed price and terms for that specific lottery draw.',
      'All ticket purchases are final and non-refundable once the transaction has been confirmed on the Solana blockchain. The irreversible nature of blockchain transactions means that PowerSOL cannot reverse, cancel, or refund completed ticket purchases under any circumstances.',
      'PowerSOL reserves the right to modify, suspend, or discontinue any lottery type, alter prize structures, adjust ticket pricing, change draw frequencies, or implement maximum ticket limits at any time, with or without notice.',
      'In the event of technical failures, network congestion, or other disruptions that prevent a scheduled draw from completing, PowerSOL reserves the right to delay the draw, reschedule it, or take other remedial action at its sole discretion. Any such delay or modification shall not constitute a breach of these Terms.',
    ],
  },
  {
    id: 'draws-randomness',
    title: '6. Draw Mechanism & Verifiable Randomness',
    content: [
      'Lottery draws utilize Verifiable Random Function (VRF) technology integrated with the Switchboard Oracle network to ensure cryptographically secure and verifiable randomness. Each draw produces a commit hash and seed hash that can be independently verified on the Solana blockchain.',
      'Draw results are recorded on-chain and include the commit hash, seed hash, number of participants, prize pool amount, and winner information. This data is publicly accessible via the Solana blockchain for transparency and independent verification.',
      'While PowerSOL employs industry-leading randomness mechanisms, no system is perfectly infallible. PowerSOL does not guarantee the absolute security or infallibility of the VRF mechanism, the oracle network, or any component of the draw process. PowerSOL shall not be liable for any technical anomalies, oracle failures, or blockchain-level issues that may affect draw outcomes.',
      'PowerSOL does not guarantee any specific odds of winning. The probability of winning depends on the number of participants and tickets purchased for each draw. Past results do not predict future outcomes.',
    ],
  },
  {
    id: 'prizes-claims',
    title: '7. Prize Distribution & Claims',
    content: [
      'Prizes are distributed in SOL through on-chain transactions from designated lottery pool wallets or PDA (Program Derived Address) vaults managed by PowerSOL smart contracts. Prize amounts are denominated in lamports (the smallest unit of SOL).',
      'Winners must actively claim their prizes through the Platform interface. Prize claims require wallet signature approval to process the on-chain transfer. PowerSOL provides a claim preparation and submission mechanism, but the User is responsible for initiating and completing the claim process.',
      'Prizes are subject to expiration. Unclaimed prizes may expire after a specified period as determined by PowerSOL. Expired prizes may be swept into the treasury or reallocated to future prize pools. PowerSOL is not obligated to notify users of pending prize expirations beyond the information displayed on the Platform.',
      'PowerSOL reserves the right to withhold, delay, or forfeit prizes if there is reasonable suspicion of fraud, terms violations, sanctions violations, or any other activity that undermines the integrity of the Platform. Prize claims may be subject to compliance review.',
      'Transaction fees (including Solana network fees) associated with prize claims are the responsibility of the User unless otherwise specified. PowerSOL may estimate and deduct network fees from prize amounts.',
    ],
  },
  {
    id: 'smart-contracts',
    title: '8. Smart Contracts & Blockchain Risks',
    content: [
      'The Platform utilizes smart contracts deployed on the Solana blockchain (PowerSOL Core and PowerSOL Claim programs). These contracts manage lottery initialization, ticket purchases, draw execution, and prize distribution.',
      'Smart contracts are immutable once deployed and operate autonomously based on their programmed logic. While PowerSOL takes extensive measures to audit and test its smart contracts, no smart contract is guaranteed to be free from bugs, vulnerabilities, or exploits. You acknowledge and accept the inherent risks associated with interacting with smart contracts.',
      'Blockchain transactions are irreversible. Once a transaction is confirmed on the Solana blockchain, it cannot be reversed, altered, or cancelled by PowerSOL or any other party. You acknowledge this irreversibility and agree to exercise caution when approving transactions.',
      'You acknowledge and accept the risks inherent to blockchain technology, including but not limited to: network congestion, high transaction fees, blockchain forks, protocol changes, validator downtime, smart contract vulnerabilities, oracle failures, and the potential total loss of funds.',
      'PowerSOL is not responsible for losses resulting from Solana network outages, blockchain reorganizations, validator failures, smart contract exploits by third parties, or any other blockchain-level events beyond our reasonable control.',
    ],
  },
  {
    id: 'affiliate-program',
    title: '9. Affiliate & Referral Program',
    content: [
      'PowerSOL offers an Affiliate Program that allows approved users to earn commissions on ticket purchases made by referred users. The program features tiered commission rates: Starter (5%), Bronze (10%), Silver (20%), and Gold (30%), based on cumulative referred volume thresholds.',
      'Participation in the Affiliate Program requires submission of an application, which is subject to approval or rejection at PowerSOL\'s sole discretion. Approved affiliates receive a unique referral code and referral link for tracking purposes.',
      'Commissions are calculated per ticket purchased by referred users and accumulated on a weekly basis. Earnings are released according to a weekly schedule and must be claimed by the affiliate through the Platform. Unclaimed affiliate earnings may be subject to sweep or forfeiture after extended periods of inactivity.',
      'PowerSOL reserves the right to modify commission rates, tier thresholds, payout schedules, and any other aspect of the Affiliate Program at any time. Changes will apply prospectively to future transactions.',
      'Any form of affiliate fraud, including but not limited to self-referral, fake accounts, Sybil attacks (coordinated creation of multiple accounts), referral code manipulation, or any scheme designed to artificially inflate commissions, is strictly prohibited and will result in immediate termination from the Affiliate Program, forfeiture of all pending earnings, and potential permanent ban from the Platform.',
      'PowerSOL employs automated Sybil detection systems that analyze wallet clusters, transaction patterns, and referral relationships. Users flagged by these systems may be subject to investigation, account restriction, or permanent ban.',
    ],
  },
  {
    id: 'power-points',
    title: '10. Power Points Rewards System',
    content: [
      'PowerSOL offers a rewards system called "Power Points" that users can earn through various platform activities including daily login bonuses, ticket purchases, mission completion, social account linking, and affiliate referrals.',
      'Power Points are non-transferable, non-redeemable for cash, and have no monetary value outside the Platform. Power Points may be used for platform benefits, rankings, or other features as determined by PowerSOL.',
      'PowerSOL reserves the right to modify, suspend, or discontinue the Power Points system, adjust point values, change earning rates, reset point balances, or alter the benefits associated with Power Points at any time without prior notice or compensation.',
      'Points earned through fraudulent means, exploits, or violations of these Terms may be revoked without notice. PowerSOL administrators retain the ability to manually adjust Power Points balances for legitimate operational reasons.',
    ],
  },
  {
    id: 'missions',
    title: '11. Missions System',
    content: [
      'The Platform offers a missions system with daily, weekly, social, and milestone-based challenges. Completing missions may award Power Points or other platform benefits.',
      'Missions may require interaction with external platforms (Discord, Twitter/X, YouTube, TikTok) and may involve linking your accounts on those platforms. By linking external accounts, you authorize PowerSOL to verify your identity and activity on those platforms as required for mission completion.',
      'Mission availability, requirements, and rewards are subject to change at any time. Missions may be added, removed, or modified without prior notice. Daily and weekly missions operate on fixed calendar cycles and reset accordingly.',
      'PowerSOL does not guarantee the availability of any particular mission and is not liable for any failure to complete a mission due to external platform issues, API changes, or other factors beyond our control.',
    ],
  },
  {
    id: 'social-accounts',
    title: '12. Social Account Integration',
    content: [
      'The Platform allows optional linking of external social media accounts (Discord, Twitter/X, YouTube, TikTok) through OAuth 2.0 authentication flows. Linking these accounts enables participation in social missions and may provide additional rewards.',
      'When you link a social account, PowerSOL stores your platform user ID, username, and avatar URL. PowerSOL does not access your social media passwords, private messages, or content beyond what is necessary for verification purposes.',
      'You may unlink social accounts at any time through the Platform interface. Unlinking may affect your ability to complete certain missions or access certain features.',
      'PowerSOL is not responsible for any actions taken by third-party social media platforms, including changes to their APIs, terms of service, or privacy policies that may affect Platform functionality.',
    ],
  },
  {
    id: 'responsible-gaming',
    title: '13. Responsible Gaming',
    content: [
      'PowerSOL is committed to promoting responsible gaming practices. Lottery participation should be treated as entertainment, not as a means of income or financial investment.',
      'You should never spend more than you can afford to lose. If you feel that your lottery participation is becoming problematic, we strongly encourage you to seek help from professional support services such as the National Council on Problem Gambling (1-800-522-4700) or equivalent services in your jurisdiction.',
      'PowerSOL may implement ticket purchase limits, cooling-off periods, or other responsible gaming measures at its discretion. These measures are designed to protect users and maintain the integrity of the Platform.',
      'By using the Platform, you acknowledge that participation in lottery activities carries inherent financial risk, including the potential total loss of funds spent on ticket purchases.',
    ],
  },
  {
    id: 'prohibited-conduct',
    title: '14. Prohibited Conduct',
    content: [
      'You agree not to engage in any of the following prohibited activities: (a) Using the Platform for money laundering, terrorist financing, or any other illegal activity; (b) Creating multiple accounts or wallets to manipulate lottery outcomes, affiliate commissions, or reward systems (Sybil attacks); (c) Attempting to exploit, hack, reverse-engineer, or interfere with smart contracts, the VRF mechanism, or any Platform system;',
      '(d) Using bots, scripts, or automated tools to interact with the Platform in unauthorized ways; (e) Circumventing or attempting to circumvent age verification, OFAC screening, or any other compliance measure; (f) Impersonating another user, entity, or PowerSOL personnel; (g) Submitting false, misleading, or fraudulent information in affiliate applications or any other Platform interaction;',
      '(h) Engaging in market manipulation, wash trading, or any coordinated scheme to artificially influence lottery outcomes or prize distributions; (i) Violating any applicable law, regulation, or third-party rights while using the Platform; (j) Attempting to access admin functions, restricted APIs, or any unauthorized areas of the Platform.',
      'PowerSOL reserves the right to investigate, restrict, suspend, or permanently ban any User suspected of engaging in prohibited conduct. Such actions may be taken without prior notice and at PowerSOL\'s sole discretion. Banned users forfeit all pending prizes, affiliate earnings, and Power Points.',
    ],
  },
  {
    id: 'admin-rights',
    title: '15. Platform Administration & Enforcement',
    content: [
      'PowerSOL reserves the right to take administrative actions including but not limited to: banning or suspending user accounts, forfeiting unclaimed prizes, adjusting Power Points balances, modifying affiliate tiers, rejecting affiliate applications, and restricting Platform access.',
      'Administrative decisions are made at PowerSOL\'s sole discretion and may be based on compliance reviews, fraud detection algorithms, Sybil detection systems, OFAC screening results, user reports, or any other information deemed relevant.',
      'PowerSOL maintains audit logs and compliance records. Users subject to administrative action will be informed where practical, but PowerSOL is not obligated to provide detailed explanations or evidence for enforcement decisions.',
      'PowerSOL may employ whale score tracking, behavioral analytics, and other monitoring tools to ensure Platform integrity. By using the Platform, you consent to such monitoring.',
    ],
  },
  {
    id: 'financial-disclaimers',
    title: '16. Financial Disclaimers',
    content: [
      'SOL and all cryptocurrency assets are highly volatile and subject to significant price fluctuations. The value of prizes, ticket costs, and affiliate earnings in fiat currency terms may change substantially between the time of transaction and the time of conversion. PowerSOL bears no responsibility for cryptocurrency price fluctuations.',
      'PowerSOL does not provide financial, investment, tax, or legal advice. You are solely responsible for any tax obligations arising from your use of the Platform, including but not limited to lottery winnings, affiliate earnings, and any other income derived from Platform participation.',
      'The Platform displays real-time SOL price data for informational purposes only. PowerSOL does not guarantee the accuracy of price data and shall not be liable for any decisions made based on displayed price information.',
      'PowerSOL maintains designated wallet addresses for lottery pools, treasury, and affiliate payouts. While PowerSOL implements security measures to protect these funds, you acknowledge the inherent risks associated with blockchain-based fund management, including potential smart contract vulnerabilities and technical failures.',
    ],
  },
  {
    id: 'intellectual-property',
    title: '17. Intellectual Property',
    content: [
      'All content on the Platform, including but not limited to text, graphics, logos ("PowerSOL," "PWRS"), images, software, smart contract code, user interface designs, and documentation (including the PowerSOL Whitepaper), is the property of PowerSOL or its licensors and is protected by intellectual property laws.',
      'You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for personal, non-commercial purposes in accordance with these Terms. This license does not include the right to reproduce, distribute, modify, or create derivative works from any Platform content.',
      'You may not use PowerSOL\'s name, logo, or branding for any purpose without prior written consent, except as reasonably necessary for referral activities under an approved Affiliate Program participation.',
    ],
  },
  {
    id: 'privacy-data',
    title: '18. Privacy & Data Collection',
    content: [
      'Your use of the Platform is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the collection and use of data as described in the Privacy Policy.',
      'PowerSOL collects the following data: wallet addresses, transaction records, IP addresses (for security and compliance), age verification status, social account identifiers (if linked), and optional personal information (display name, email, country) provided voluntarily through the profile or affiliate application.',
      'Data is stored using industry-standard encryption (AES-256) and security measures. Transaction data is retained as required by law and for Platform functionality. Personal data may be deleted after two (2) years of account inactivity.',
      'PowerSOL may share data with law enforcement or regulatory authorities when required by law, court order, or to comply with sanctions screening obligations. PowerSOL will not sell your personal data to third parties.',
    ],
  },
  {
    id: 'notifications',
    title: '19. Communications & Notifications',
    content: [
      'The Platform may send notifications regarding prize wins, upcoming draws, affiliate earnings, mission updates, and account status changes. You may enable or disable push notifications through the Platform interface.',
      'By providing an email address (in your profile or affiliate application), you consent to receive service-related communications from PowerSOL. You may opt out of non-essential communications at any time.',
      'Important notices regarding changes to these Terms, security alerts, compliance actions, or account restrictions may be communicated through the Platform interface and are considered received upon publication regardless of whether you access them.',
    ],
  },
  {
    id: 'third-party',
    title: '20. Third-Party Services & Integrations',
    content: [
      'The Platform integrates with and relies upon third-party services including but not limited to: the Solana blockchain and its validators, Switchboard Oracle (VRF and automation), wallet providers (Phantom, Solflare, etc.), social media platforms (Discord, Twitter/X, YouTube, TikTok), and Helius (transaction monitoring).',
      'PowerSOL does not control, endorse, or assume responsibility for any third-party services. Your use of third-party services is governed by their respective terms of service and privacy policies.',
      'PowerSOL shall not be liable for any loss, damage, or disruption caused by third-party service outages, API changes, security breaches, or policy modifications. The availability of Platform features that depend on third-party services cannot be guaranteed.',
    ],
  },
  {
    id: 'limitation-liability',
    title: '21. Limitation of Liability',
    content: [
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, POWERSOL AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO: LOSS OF PROFITS, REVENUE, DATA, GOODWILL, USE, OR OTHER INTANGIBLE LOSSES, ARISING FROM OR RELATED TO YOUR USE OF THE PLATFORM.',
      'WITHOUT LIMITING THE FOREGOING, POWERSOL\'S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE TOTAL AMOUNT OF SOL YOU HAVE SPENT ON TICKET PURCHASES IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
      'THIS LIMITATION APPLIES REGARDLESS OF THE LEGAL THEORY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND REGARDLESS OF WHETHER POWERSOL HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
      'SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IN SUCH JURISDICTIONS, THE LIMITATIONS SET FORTH ABOVE SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW.',
    ],
  },
  {
    id: 'disclaimer-warranties',
    title: '22. Disclaimer of Warranties',
    content: [
      'THE PLATFORM AND ALL SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. POWERSOL EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
      'POWERSOL DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. POWERSOL DOES NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CONTENT, DATA, OR INFORMATION PROVIDED THROUGH THE PLATFORM.',
      'POWERSOL DOES NOT WARRANT THAT ANY SPECIFIC RESULTS WILL BE OBTAINED FROM USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO WINNING PRIZES, EARNING COMMISSIONS, OR RECEIVING ANY PARTICULAR BENEFIT.',
    ],
  },
  {
    id: 'indemnification',
    title: '23. Indemnification',
    content: [
      'You agree to indemnify, defend, and hold harmless PowerSOL and its officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising from or related to:',
      '(a) Your use of or inability to use the Platform; (b) Your violation of these Terms; (c) Your violation of any applicable law, regulation, or third-party rights; (d) Any fraud, misrepresentation, or prohibited conduct by you; (e) Your tax obligations or failure to comply with applicable tax laws; (f) Any claim by a third party arising from your use of the referral/affiliate system.',
    ],
  },
  {
    id: 'force-majeure',
    title: '24. Force Majeure',
    content: [
      'PowerSOL shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from circumstances beyond PowerSOL\'s reasonable control, including but not limited to: acts of God, natural disasters, pandemics, war, terrorism, riots, government actions, embargoes, sanctions, blockchain network failures, smart contract exploits by third parties, oracle failures, internet outages, power outages, or cyberattacks.',
      'In the event of a force majeure, PowerSOL\'s obligations under these Terms will be suspended for the duration of the event. PowerSOL will make reasonable efforts to resume normal operations as soon as practicable.',
    ],
  },
  {
    id: 'dispute-resolution',
    title: '25. Dispute Resolution & Governing Law',
    content: [
      'These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.',
      'Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, or invalidity thereof, shall first be attempted to be resolved through good-faith negotiation between the parties for a period of thirty (30) days.',
      'If the dispute cannot be resolved through negotiation, it shall be submitted to binding arbitration in accordance with internationally recognized arbitration rules. The arbitration shall be conducted in English, and the arbitral award shall be final and binding on both parties.',
      'YOU AGREE THAT ANY CLAIMS SHALL BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.',
    ],
  },
  {
    id: 'termination',
    title: '26. Termination',
    content: [
      'PowerSOL may terminate or suspend your access to the Platform immediately, without prior notice or liability, for any reason, including but not limited to: breach of these Terms, suspected fraud, compliance violations, OFAC screening flags, or administrative decisions.',
      'Upon termination: (a) All rights and licenses granted to you under these Terms will immediately cease; (b) You must immediately stop using the Platform; (c) Pending prizes may be forfeited at PowerSOL\'s discretion; (d) Affiliate earnings may be forfeited; (e) Power Points will be revoked.',
      'Sections of these Terms that by their nature should survive termination shall survive, including but not limited to: Limitation of Liability, Disclaimer of Warranties, Indemnification, Dispute Resolution, and Intellectual Property.',
    ],
  },
  {
    id: 'modifications',
    title: '27. Modifications to Terms',
    content: [
      'PowerSOL reserves the right to modify these Terms at any time at its sole discretion. Material changes will be indicated by updating the "Last Updated" date at the top of this document.',
      'Your continued use of the Platform following the posting of modified Terms constitutes acceptance of the modified Terms. If you do not agree with the modifications, you must immediately stop using the Platform.',
      'It is your responsibility to review these Terms periodically for changes. PowerSOL is not obligated to provide individual notice of changes beyond updating the document on the Platform.',
    ],
  },
  {
    id: 'severability',
    title: '28. Severability & General Provisions',
    content: [
      'If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent.',
      'The failure of PowerSOL to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver must be in writing and signed by an authorized representative of PowerSOL.',
      'These Terms, together with the Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and PowerSOL regarding your use of the Platform and supersede all prior agreements, understandings, and representations.',
      'No agency, partnership, joint venture, or employment relationship is created by these Terms, and you may not make any representation or bind PowerSOL in any manner.',
    ],
  },
  {
    id: 'contact',
    title: '29. Contact Information',
    content: [
      'For questions, concerns, or inquiries regarding these Terms of Service, please contact us through the following channels:',
      'Email: support@powersol.app',
      'For compliance-related matters, including OFAC screening inquiries or account restriction appeals, please include your wallet address and a detailed description of your concern.',
    ],
  },
];
