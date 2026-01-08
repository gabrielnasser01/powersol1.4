const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./database.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    twitter_username TEXT,
    twitter_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Missions table
  db.run(`CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    target INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_amount INTEGER NOT NULL,
    twitter_action TEXT,
    twitter_hashtag TEXT,
    twitter_mention TEXT,
    active BOOLEAN DEFAULT 1
  )`);

  // User missions progress table
  db.run(`CREATE TABLE IF NOT EXISTS user_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mission_id TEXT,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (mission_id) REFERENCES missions (id),
    UNIQUE(user_id, mission_id)
  )`);

  // User rewards table
  db.run(`CREATE TABLE IF NOT EXISTS user_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    reward_type TEXT NOT NULL,
    reward_amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Twitter verifications table
  db.run(`CREATE TABLE IF NOT EXISTS twitter_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mission_id TEXT,
    tweet_id TEXT,
    tweet_text TEXT,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// Twitter API setup
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// User authentication
app.post('/api/auth/login', (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Check if user exists
  db.get('SELECT * FROM users WHERE wallet_address = ?', [walletAddress], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      // Create new user
      db.run('INSERT INTO users (wallet_address) VALUES (?)', [walletAddress], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const token = jwt.sign(
          { userId: this.lastID, walletAddress },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        res.json({
          token,
          user: {
            id: this.lastID,
            walletAddress,
            twitterUsername: null
          }
        });
      });
    } else {
      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { userId: user.id, walletAddress: user.wallet_address },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          twitterUsername: user.twitter_username
        }
      });
    }
  });
});

// Connect Twitter account
app.post('/api/twitter/connect', authenticateToken, (req, res) => {
  const { twitterUsername } = req.body;
  const userId = req.user.userId;

  if (!twitterUsername) {
    return res.status(400).json({ error: 'Twitter username is required' });
  }

  // Update user with Twitter info
  db.run(
    'UPDATE users SET twitter_username = ? WHERE id = ?',
    [twitterUsername, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to connect Twitter account' });
      }

      res.json({ success: true, message: 'Twitter account connected successfully' });
    }
  );
});

// Get user missions
app.get('/api/missions', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const query = `
    SELECT 
      m.*,
      COALESCE(um.progress, 0) as progress,
      COALESCE(um.completed, 0) as completed,
      um.completed_at
    FROM missions m
    LEFT JOIN user_missions um ON m.id = um.mission_id AND um.user_id = ?
    WHERE m.active = 1
    ORDER BY m.type, m.difficulty
  `;

  db.all(query, [userId], (err, missions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(missions);
  });
});

// Verify Twitter mission
app.post('/api/missions/verify-twitter', authenticateToken, async (req, res) => {
  const { missionId } = req.body;
  const userId = req.user.userId;

  try {
    // Get user and mission info
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    const mission = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM missions WHERE id = ?', [missionId], (err, mission) => {
        if (err) reject(err);
        else resolve(mission);
      });
    });

    if (!user.twitter_username) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Verify Twitter action based on mission type
    let verified = false;
    let tweetData = null;

    if (mission.twitter_action === 'tweet') {
      // Check for recent tweets with hashtag
      const tweets = await twitterClient.v2.userTimelineByUsername(user.twitter_username, {
        max_results: 10,
        'tweet.fields': ['created_at', 'text']
      });

      if (tweets.data) {
        const recentTweet = tweets.data.find(tweet => {
          const tweetDate = new Date(tweet.created_at);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          return tweetDate > oneDayAgo && 
                 tweet.text.includes(mission.twitter_hashtag) &&
                 (mission.twitter_mention ? tweet.text.includes(mission.twitter_mention) : true);
        });

        if (recentTweet) {
          verified = true;
          tweetData = recentTweet;
        }
      }
    } else if (mission.twitter_action === 'follow') {
      // Check if user follows the account
      try {
        const following = await twitterClient.v2.following(user.twitter_id, {
          max_results: 1000
        });
        
        verified = following.data?.some(followedUser => 
          followedUser.username === mission.twitter_mention?.replace('@', '')
        ) || false;
      } catch (error) {
        console.log('Follow check error:', error);
        verified = false;
      }
    }

    if (verified) {
      // Update mission progress
      db.run(`
        INSERT OR REPLACE INTO user_missions 
        (user_id, mission_id, progress, completed, completed_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [userId, missionId, mission.target], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update mission progress' });
        }

        // Add reward
        db.run(`
          INSERT INTO user_rewards (user_id, reward_type, reward_amount, source)
          VALUES (?, ?, ?, ?)
        `, [userId, mission.reward_type, mission.reward_amount, `mission:${missionId}`]);

        // Save verification record
        if (tweetData) {
          db.run(`
            INSERT INTO twitter_verifications (user_id, mission_id, tweet_id, tweet_text)
            VALUES (?, ?, ?, ?)
          `, [userId, missionId, tweetData.id, tweetData.text]);
        }

        res.json({
          success: true,
          message: 'Mission completed successfully!',
          reward: {
            type: mission.reward_type,
            amount: mission.reward_amount
          }
        });
      });
    } else {
      res.json({
        success: false,
        message: 'Twitter action not verified. Please make sure you completed the required action.'
      });
    }

  } catch (error) {
    console.error('Twitter verification error:', error);
    res.status(500).json({ error: 'Failed to verify Twitter action' });
  }
});

// Get user rewards
app.get('/api/rewards', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const query = `
    SELECT 
      reward_type,
      SUM(reward_amount) as total_amount
    FROM user_rewards 
    WHERE user_id = ?
    GROUP BY reward_type
  `;

  db.all(query, [userId], (err, rewards) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const rewardSummary = {
      tickets: 0,
      chests: 0
    };

    rewards.forEach(reward => {
      if (reward.reward_type === 'ticket') {
        rewardSummary.tickets = reward.total_amount;
      } else if (reward.reward_type === 'chest') {
        rewardSummary.chests = reward.total_amount;
      }
    });

    res.json(rewardSummary);
  });
});

// Initialize default missions
const initializeMissions = () => {
  const defaultMissions = [
    {
      id: 'twitter-share-powersol',
      title: 'Share powerSOL',
      description: 'Tweet about powerSOL with #powerSOL hashtag',
      type: 'social',
      difficulty: 'easy',
      target: 1,
      reward_type: 'ticket',
      reward_amount: 3,
      twitter_action: 'tweet',
      twitter_hashtag: '#powerSOL',
      twitter_mention: '@powerSOL_io'
    },
    {
      id: 'twitter-follow-official',
      title: 'Follow Official Account',
      description: 'Follow @powerSOL_io on Twitter',
      type: 'social',
      difficulty: 'easy',
      target: 1,
      reward_type: 'ticket',
      reward_amount: 2,
      twitter_action: 'follow',
      twitter_mention: '@powerSOL_io'
    },
    {
      id: 'twitter-retweet-announcement',
      title: 'Retweet Announcement',
      description: 'Retweet our latest announcement with #powerSOLCommunity',
      type: 'social',
      difficulty: 'medium',
      target: 1,
      reward_type: 'chest',
      reward_amount: 1,
      twitter_action: 'tweet',
      twitter_hashtag: '#powerSOLCommunity'
    },
    {
      id: 'twitter-tag-friends',
      title: 'Tag Friends',
      description: 'Tweet about powerSOL and tag 3 friends',
      type: 'social',
      difficulty: 'hard',
      target: 1,
      reward_type: 'ticket',
      reward_amount: 5,
      twitter_action: 'tweet',
      twitter_hashtag: '#powerSOL'
    }
  ];

  defaultMissions.forEach(mission => {
    db.run(`
      INSERT OR IGNORE INTO missions 
      (id, title, description, type, difficulty, target, reward_type, reward_amount, twitter_action, twitter_hashtag, twitter_mention)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mission.id, mission.title, mission.description, mission.type, mission.difficulty,
      mission.target, mission.reward_type, mission.reward_amount, mission.twitter_action,
      mission.twitter_hashtag, mission.twitter_mention
    ]);
  });
};

// Auto-verify missions every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running automatic mission verification...');
  
  // Get all users with Twitter connected
  db.all('SELECT * FROM users WHERE twitter_username IS NOT NULL', async (err, users) => {
    if (err) return;

    for (const user of users) {
      // Check incomplete Twitter missions
      db.all(`
        SELECT m.* FROM missions m
        LEFT JOIN user_missions um ON m.id = um.mission_id AND um.user_id = ?
        WHERE m.twitter_action IS NOT NULL 
        AND m.active = 1 
        AND (um.completed IS NULL OR um.completed = 0)
      `, [user.id], async (err, missions) => {
        if (err) return;

        for (const mission of missions) {
          // Auto-verify each mission
          try {
            // This would contain the same verification logic as the manual endpoint
            console.log(`Auto-verifying mission ${mission.id} for user ${user.id}`);
          } catch (error) {
            console.error('Auto-verification error:', error);
          }
        }
      });
    }
  });
});

// Initialize missions on startup
setTimeout(initializeMissions, 1000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🐦 Twitter API integration ready`);
  console.log(`💾 Database initialized`);
});