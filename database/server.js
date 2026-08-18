import express from 'express';
//import mysql from 'mysql2/promise';
import path from "node:path";
import crypto from 'node:crypto';
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Sequelize, QueryTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { parseAudioPreferences, rankCandidates } from './recommendation_ranker.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname,'.env') });

const app = express();
const PORT = 3000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'local-development-secret-change-me';
const MULTIMODAL_COLLECTION = process.env.MULTIMODAL_COLLECTION || 'MC Tunes Multimodal';
const requestCounts = new Map();

function legacyHash(password, salt) {
  let hashedValue = '';
  const combinedValue = password + salt;
  for (let index = 0; index < combinedValue.length; index += 1) {
    hashedValue += (combinedValue.charCodeAt(index) * 31).toString(16);
  }
  return hashedValue;
}

function shufflePoints(points) {
  const shuffled = [...points];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

async function fetchMultimodalRecommendations({ positiveIds, negativeIds, ratedIds, must, limit }) {
  if (positiveIds.length === 0) return null;

  const filter = { must_not: [{ has_id: ratedIds }] };
  if (must.length > 0) filter.must = must;
  const body = {
    using: 'mert',
    limit,
    with_payload: true,
    filter,
    recommend: {
      positive: positiveIds,
      negative: negativeIds,
      strategy: 'AVERAGE_VECTOR'
    }
  };

  try {
    const response = await fetch(
      `http://localhost:6333/collections/${encodeURIComponent(MULTIMODAL_COLLECTION)}/points/recommend`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.result?.points || data?.result || [];
  } catch {
    return null;
  }
}

function createAuthToken(user) {
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    userName: user.userName,
    expiresAt: Date.now() + (8 * 60 * 60 * 1000)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getAuthenticatedUser(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const signaturesMatch = signature.length === expectedSignature.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!signaturesMatch) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  try {
    const tokenData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!tokenData.userId || tokenData.expiresAt <= Date.now()) {
      return res.status(401).json({ error: 'Expired authentication token' });
    }
    req.auth = tokenData;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function requirePermission(...allowedLevels) {
  return async (req, res, next) => {
    try {
      const permissions = await sequelize.query(
        `SELECT credentialLevel
         FROM Permission_user_link pul
         JOIN Permission_Level pl ON pl.id = pul.permissionID
         WHERE pul.userID = ?`,
        { replacements: [req.auth.userId], type: QueryTypes.SELECT }
      );
      const hasPermission = permissions.some(({ credentialLevel }) => allowedLevels.includes(credentialLevel));
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return next();
    } catch (error) {
      console.error('Permission lookup failed:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  };
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const requestKey = req.ip || 'unknown';
  const recentRequests = (requestCounts.get(requestKey) || []).filter(timestamp => timestamp > windowStart);
  if (recentRequests.length >= 120) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  recentRequests.push(now);
  requestCounts.set(requestKey, recentRequests);
  return next();
}

// Basic CORS for local dev front-end
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(rateLimit);

const sequelize = new Sequelize('user_info', 'root', process.env.password, {
  dialect: 'mysql',
  replication: {
    read: [
      {
        host: 'localhost',
        username: 'root',
        password: process.env.password,
        port: 3307 //replica on port 3307
      }
    ],
    write: {
      host: 'localhost',
      username: 'root',
      password: process.env.password,
      port: 3306
    }
  },
  pool: {
    acquire:30000,
    idle:10000
  },
  logging: false
});

sequelize.authenticate()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Unable to connect to database:', err));

//json parser
app.use(express.json({ limit: '100kb' }));

//login api
app.post('/login', async (req, res) => {
  try{
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    //prepared statement
    const rows = await sequelize.query(
      "SELECT id, userName, userHash, userSalt FROM Login WHERE userName = ?",
      {
        replacements: [username],
        type: QueryTypes.SELECT
      }
    );
    if (rows.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const storedHash = rows[0].userHash;
    const isBcryptHash = storedHash.startsWith('$2');
    const isValid = isBcryptHash
      ? await bcrypt.compare(password, storedHash)
      : legacyHash(password, rows[0].userSalt) === storedHash;
    if (!isValid) {
      return res.status(401).json({ error: "Invalid Hash" });
    }

    if (!isBcryptHash) {
      const upgradedHash = await bcrypt.hash(password, 12);
      await sequelize.query(
        "UPDATE Login SET userHash = ?, userSalt = '' WHERE id = ?",
        { replacements: [upgradedHash, rows[0].id], type: QueryTypes.UPDATE }
      );
    }

    const user = { ...rows[0] };
    delete user.userHash;
    delete user.userSalt;
    res.json({ message: "Login successful", user, token: createAuthToken(user) });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//register api
app.post('/register', async(req,res) => {
  try{
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || username.trim().length < 3 || username.trim().length > 100 || password.length < 8){
      return res.status(400).json({ error: "Username and password are required; password must be at least 8 characters" });
    }
    //prepared statement
    //check if username already exists
    const exists = await sequelize.query(
      "SELECT userName FROM Login WHERE userName = ?",
      {
        replacements: [username],
        type: QueryTypes.SELECT
      }
    );
    if (exists.length != 0)
      return res.status(401).json({ error: "Username already exists" });

    //register user
    const [rows] = await sequelize.query(
      "INSERT INTO Login (userName, userHash, userSalt) VALUES (?, ?, ?)",
      {
      replacements: [username.trim(), await bcrypt.hash(password, 12), ''],
        type: QueryTypes.INSERT
      }
    );
    //add permission level
    const [permID] = await sequelize.query(
      "INSERT INTO Permission_Level (credentialLevel) VALUES (?)",
      {
        replacements: ["USER"],
        type: QueryTypes.INSERT
      }
    );
    await sequelize.query(
      "INSERT INTO Permission_user_link (permissionID, userID) VALUES (?,?)",
      {
        replacements: [permID,rows],
        type: QueryTypes.INSERT
      }
    );
    res.json({ message: "Registration successful"});
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/feedback', getAuthenticatedUser, async(req, res) =>{
  try {
    const { message, severity } = req.body;
    
    if (typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    const [result] = await sequelize.query(
      "INSERT INTO Feedback (message, severity) VALUES (?, ?)",
      {
        replacements: [message, severity || null],
        type: QueryTypes.INSERT
      }
    );

    await sequelize.query(
      "INSERT INTO Feedback_user_link (feedbackID, userID) VALUES (?,?)",
      {
        replacements: [result,req.auth.userId],
        type: QueryTypes.INSERT
      }
    )
    
    res.status(201).json({message: "Feedback submitted"});
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//get user feedback - "ADMIN" or "DEV" permission level only
app.get('/feedback', getAuthenticatedUser, requirePermission('ADMIN', 'DEV'), async(req, res) =>{
  try
  {
    //get user id
    const user = await sequelize.query(
      "SELECT id FROM Login WHERE userName = ?",
        {
          replacements: [req.auth.userName],
          type: QueryTypes.SELECT
        }
      );
    if (user.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });
    //get user permission level
    const perm_link = await sequelize.query(
      "SELECT permissionID FROM Permission_user_link WHERE userID = ?",
        {
          replacements: [user[0].id],
          type: QueryTypes.SELECT
        }
    );
    const perm = await sequelize.query(
      "SELECT credentialLevel FROM Permission_Level WHERE id = ?",
        {
          replacements: [perm_link[0].permissionID],
          type: QueryTypes.SELECT
        }
    );
    //check if they have the correct permissions
    const perm_level = perm[0].credentialLevel;
    if (!(perm_level=="ADMIN" || perm_level=="DEV"))
      return res.status(401).json({ error: "Invalid permission" });
    const rows = await sequelize.query(
      "SELECT * FROM Feedback",
        {
          type: QueryTypes.SELECT
        }
      );
      res.json({ feedback: rows });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/bugreports', getAuthenticatedUser, async(req, res) =>{
  try {
    const { message, severity } = req.body;
    
    if (typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    const [result] = await sequelize.query(
      "INSERT INTO Bug_Reports (message, severity) VALUES (?, ?)",
      {
        replacements: [message, severity || null],
        type: QueryTypes.INSERT
      }
    );

    await sequelize.query(
      "INSERT INTO Bug_Report_user_link (reportID, userID) VALUES (?,?)",
      {
        replacements: [result,req.auth.userId],
        type: QueryTypes.INSERT
      }
    )
    
    res.status(201).json({message: "Bug report submitted"});
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//get bug reports - "ADMIN" or "DEV" permission level only
app.get('/bugreports', getAuthenticatedUser, requirePermission('ADMIN', 'DEV'), async(req, res) =>{
  try
  {
    //get user id
    const user = await sequelize.query(
      "SELECT id FROM Login WHERE userName = ?",
        {
          replacements: [req.auth.userName],
          type: QueryTypes.SELECT
        }
      );
    if (user.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });
    //get user permission level
    const perm_link = await sequelize.query(
      "SELECT permissionID FROM Permission_user_link WHERE userID = ?",
        {
          replacements: [user[0].id],
          type: QueryTypes.SELECT
        }
    );
    const perm = await sequelize.query(
      "SELECT credentialLevel FROM Permission_Level WHERE id = ?",
        {
          replacements: [perm_link[0].permissionID],
          type: QueryTypes.SELECT
        }
    );
    //check if they have the correct permissions
    const perm_level = perm[0].credentialLevel;
    if (!(perm_level=="ADMIN" || perm_level=="DEV"))
      return res.status(401).json({ error: "Invalid permission" });
    const rows = await sequelize.query(
      "SELECT * FROM Bug_Reports",
        {
          type: QueryTypes.SELECT
        }
      );
      res.json({ reports: rows });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//get all song ratings for a user
app.get('/ratings', getAuthenticatedUser, async(req,res) =>{
  try
  {
    //get user ratings
    const rows = await sequelize.query(
      "SELECT * FROM Songs_user_link WHERE userID = ?",
        {
          replacements: [req.auth.userId],
          type: QueryTypes.SELECT
        }
      );
      res.json({ reports: rows });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/ratings', getAuthenticatedUser, async(req, res) =>{
  try {
    const { songid, rating } = req.body;
    
    if (songid == null || rating == null) {
      return res.status(400).json({ error: "Incomplete query" });
    }
    if (![0, 1, '0', '1'].includes(rating)) {
      return res.status(400).json({ error: "rating must be 0 (dislike) or 1 (like)" });
    }
    const normalizedRating = Number(rating) === 1 ? 1 : 0;
    //get user id
    const user = await sequelize.query(
      "SELECT id FROM Login WHERE id = ?",
        {
          replacements: [req.auth.userId],
          type: QueryTypes.SELECT
        }
      );
    if (user.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });    
    await sequelize.query(
      "INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)",
      {
        replacements: [songid,req.auth.userId,normalizedRating],
        type: QueryTypes.INSERT
      }
    );
    
    res.status(201).json({message: "Rating submitted"});
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/songs', getAuthenticatedUser, requirePermission('ADMIN', 'DEV'), async(req,res) => {
  try{
    const { songs } = req.body;
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({ error: "Songs array is required" });
    }
    if (songs.length > 100 || songs.some(song => !song || typeof song.songName !== 'string' || !song.songName.trim())) {
      return res.status(400).json({ error: "Each song must include a name; no more than 100 songs may be submitted" });
    }
    //insert each song
    for (const song of songs) {
      const { songName, genre, explicit } = song;
      
      await sequelize.query(
        "INSERT INTO Songs (songName, genre, explicit) VALUES (?, ?, ?)",
        {
          replacements: [ songName, genre || null, 
            explicit !== undefined ? explicit : false
          ],
          type: QueryTypes.INSERT
        }
      );
    }
    res.status(201).json({message: "Songs inserted"});
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Recommendations backed by Qdrant scroll API
app.get('/recommendations', async (req, res) => {
  const {
    genre = null,
    artist = null,
    subgenre = null
  } = req.query;

  const numPointsRaw = parseInt(req.query.num_points, 10);
  const numPoints = Number.isNaN(numPointsRaw) ? 10 : Math.min(Math.max(numPointsRaw, 1), 50);
  const audioPreferences = parseAudioPreferences(req.query);

  const normGenre = typeof genre === 'string' ? genre.trim() : null;
  const normArtist = typeof artist === 'string' ? artist.trim() : null;
  const normSubgenre = typeof subgenre === 'string' ? subgenre.trim() : null;

  const must = [];
  if (normGenre) {
    // Use text match for case-insensitive genre filtering
    must.push({ key: 'genre', match: { text: normGenre } });
  }
  if (normArtist) {
    // Use text match to avoid exact-case requirements on artist names
    must.push({ key: 'artist', match: { text: normArtist } });
  }
  if (normSubgenre) {
    // Payload field is stored as "subgenres" array; use text match for partial/case-insensitive
    must.push({ key: 'subgenres', match: { text: normSubgenre } });
  }

  const body = {
    limit: numPoints,
    with_payload: true
  };
  if (must.length > 0) {
    body.filter = { must };
  }

  try {
    const response = await fetch('http://localhost:6333/collections/MC%20Tunes/points/scroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Qdrant error', response.status, text);
      return res.status(502).json({ error: 'Recommendation service unavailable' });
    }

    const data = await response.json();
    const points = data?.result?.points || [];
    res.json({ recommendations: rankCandidates(shufflePoints(points), audioPreferences, numPoints) });
  } catch (err) {
    console.error('Recommendation fetch failed:', err);
    res.status(502).json({ error: 'Recommendation service unavailable' });
  }
});

// Recommendations using saved like/dislike feedback in Songs_user_link
app.get('/recommendations/with-feedback', getAuthenticatedUser, async (req, res) => {
  const userId = req.auth.userId;
  const { genre = null, artist = null, subgenre = null } = req.query;

  const numPointsRaw = parseInt(req.query.num_points, 10);
  const numPoints = Number.isNaN(numPointsRaw) ? 10 : Math.min(Math.max(numPointsRaw, 1), 50);
  const audioPreferences = parseAudioPreferences(req.query);

  try {
    // Prefetch likes/dislikes to seed recommend; if no likes, we will use scroll instead.
    const likes = await sequelize.query(
      "SELECT songID FROM Songs_user_link WHERE userID = ? AND rating = 1",
      { replacements: [userId], type: QueryTypes.SELECT }
    );
    const dislikes = await sequelize.query(
      "SELECT songID FROM Songs_user_link WHERE userID = ? AND rating = 0",
      { replacements: [userId], type: QueryTypes.SELECT }
    );

    const positive_ids = likes
      .map(r => Number(r.songID))
      .filter(Number.isFinite);
    const negative_ids = dislikes
      .map(r => Number(r.songID))
      .filter(Number.isFinite);

    const normGenre = typeof genre === 'string' ? genre.trim() : null;
    const normArtist = typeof artist === 'string' ? artist.trim() : null;
    const normSubgenre = typeof subgenre === 'string' ? subgenre.trim() : null;

    const must = [];
    if (normGenre) must.push({ key: 'genre', match: { text: normGenre } });
    if (normArtist) must.push({ key: 'artist', match: { text: normArtist } });
    if (normSubgenre) must.push({ key: 'subgenres', match: { text: normSubgenre } });
    const rated_ids = [...new Set([...positive_ids, ...negative_ids])];

    const multimodalPoints = await fetchMultimodalRecommendations({
      positiveIds: positive_ids,
      negativeIds: negative_ids,
      ratedIds: rated_ids,
      must,
      limit: numPoints
    });
    if (multimodalPoints?.length > 0) {
      return res.json({
        recommendations: rankCandidates(multimodalPoints, audioPreferences, numPoints),
        positive_ids,
        negative_ids,
        source: 'mert'
      });
    }

    // Helper to perform scroll (used for empty positives or recommend fallback)
    const doScroll = async () => {
      const scrollBody = { limit: numPoints, with_payload: true };
      const must_not = rated_ids.length > 0 ? [{ has_id: rated_ids }] : [];
      if (must.length > 0 || must_not.length > 0) {
        scrollBody.filter = {};
        if (must.length > 0) scrollBody.filter.must = must;
        if (must_not.length > 0) scrollBody.filter.must_not = must_not;
      }

      const scrollRes = await fetch('http://localhost:6333/collections/MC%20Tunes/points/scroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrollBody)
      });

      if (!scrollRes.ok) {
        const text = await scrollRes.text();
        console.error('Qdrant scroll error', scrollRes.status, text);
        return res.status(502).json({ error: 'Recommendation service unavailable' });
      }

      const data = await scrollRes.json();
      const points = data?.result?.points || data?.result || [];
      return res.json({
        recommendations: rankCandidates(shufflePoints(points), audioPreferences, numPoints),
        positive_ids,
        negative_ids
      });
    };

    // If we have no positive seeds, use scroll to avoid Qdrant positive-id requirement.
    if (positive_ids.length === 0) {
      return await doScroll();
    }

    // Use recommend when we have seeds
    const body = {
      limit: numPoints,
      with_payload: true,
      recommend: {
        positive: positive_ids,
        negative: negative_ids,
        strategy: 'AVERAGE_VECTOR'
      }
    };
    if (must.length > 0) {
      body.filter = { must };
    }
    body.filter = body.filter || {};
    body.filter.must_not = [{ has_id: rated_ids }];

    const response = await fetch('http://localhost:6333/collections/MC%20Tunes/points/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Qdrant recommend error', response.status, text);
      return await doScroll();
    }

    const data = await response.json();
    const points = data?.result?.points || data?.result || [];
    res.json({
      recommendations: rankCandidates(points, audioPreferences, numPoints),
      positive_ids,
      negative_ids
    });
  } catch (err) {
    console.error('Recommendation with feedback failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
