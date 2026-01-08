# powerSOL - Complete Backend Integration

## 🚀 Features

- ✅ **Complete Backend** with Express.js
- ✅ **Twitter API Integration** for real verification
- ✅ **SQLite Database** for data persistence
- ✅ **JWT Authentication** for secure access
- ✅ **Mission System** with automatic verification
- ✅ **Reward System** with tickets and chests
- ✅ **Cron Jobs** for automatic mission checking

## 📋 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Twitter API credentials
```

### 3. Get Twitter API Keys
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new App
3. Get your API keys:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret
4. Add them to your `.env` file

### 4. Run the Application
```bash
# Run both frontend and backend
npm start

# Or run separately:
npm run server    # Backend only
npm run dev       # Frontend only
```

## 🐦 Twitter Integration

### Supported Mission Types:

1. **Tweet with Hashtag**
   - Verifies user tweeted with specific hashtag
   - Example: Tweet with #powerSOL

2. **Follow Account**
   - Verifies user follows official account
   - Example: Follow @powerSOL_io

3. **Retweet with Hashtag**
   - Verifies user retweeted with specific hashtag
   - Example: Retweet with #powerSOLCommunity

4. **Tag Friends**
   - Verifies user tagged friends in tweet
   - Example: Tweet mentioning 3+ users

### API Endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/twitter/connect` - Connect Twitter account
- `GET /api/missions` - Get user missions
- `POST /api/missions/verify-twitter` - Verify Twitter mission
- `GET /api/rewards` - Get user rewards

## 💾 Database Schema

### Tables:
- **users** - User accounts and Twitter info
- **missions** - Available missions
- **user_missions** - User progress on missions
- **user_rewards** - Earned rewards
- **twitter_verifications** - Twitter verification records

## 🔄 Automatic Verification

The system runs automatic verification every hour to check:
- New tweets with required hashtags
- Follow status changes
- Retweet activities

## 🚀 Deployment

### Local Development:
```bash
npm start
```

### Production Deployment:
1. **Vercel/Netlify**: Frontend
2. **Railway/Heroku**: Backend
3. **PostgreSQL**: Production database

### Environment Variables for Production:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_token_secret
JWT_SECRET=your_jwt_secret
```

## 📱 Frontend Integration

The frontend automatically connects to the backend API for:
- User authentication
- Mission progress tracking
- Twitter verification
- Reward distribution

## 🔐 Security Features

- JWT token authentication
- CORS protection
- Input validation
- SQL injection prevention
- Rate limiting ready

## 🎯 Mission Examples

```javascript
// Tweet Mission
{
  id: 'twitter-share-powersol',
  title: 'Share powerSOL',
  description: 'Tweet about powerSOL with #powerSOL hashtag',
  twitter_action: 'tweet',
  twitter_hashtag: '#powerSOL',
  reward: { type: 'ticket', amount: 3 }
}

// Follow Mission
{
  id: 'twitter-follow-official',
  title: 'Follow Official Account',
  description: 'Follow @powerSOL_io on Twitter',
  twitter_action: 'follow',
  twitter_mention: '@powerSOL_io',
  reward: { type: 'ticket', amount: 2 }
}
```

## 🛠️ Development

### Add New Mission:
```sql
INSERT INTO missions (id, title, description, type, difficulty, target, reward_type, reward_amount, twitter_action, twitter_hashtag)
VALUES ('new-mission', 'New Mission', 'Description', 'social', 'easy', 1, 'ticket', 5, 'tweet', '#hashtag');
```

### Check Database:
```bash
sqlite3 database.db
.tables
SELECT * FROM missions;
```

## 📊 Analytics

The backend tracks:
- Mission completion rates
- User engagement
- Twitter verification success
- Reward distribution

## ⚓ Anchor Programs Setup

PowerSOL integrates with on-chain Solana programs for lottery operations.

### Quick Setup:
```bash
# Install dependencies
npm install

# Setup and deploy Anchor programs (requires Anchor & Solana CLI)
npm run setup:anchor
```

This will:
1. Build and deploy `powersol-core` and `powersol-claim` programs
2. Initialize 5 lotteries on devnet
3. Update `.env` with Program IDs and PDAs
4. Seed Supabase with lottery data

### Requirements:
- Anchor v0.30+
- Solana CLI v1.18+
- Funded wallets on devnet

### Documentation:
- **[Complete Guide](./ANCHOR_INTEGRATION.md)** - Full setup and integration details
- **[Programs Source](./powersol-programs/)** - Rust source code
- **[PDA Utilities](./powersol-backend/src/lib/anchor/pdas.ts)** - Helper functions

## 🎉 Ready to Use!

Your powerSOL project now has:
- ✅ Complete backend infrastructure
- ✅ Real Twitter API integration
- ✅ Mission system with verification
- ✅ Reward distribution
- ✅ User authentication
- ✅ Database persistence
- ✅ On-chain lottery programs (Anchor)

**Just add your Twitter API keys and you're live!** 🚀