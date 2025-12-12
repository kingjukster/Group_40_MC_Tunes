import express from 'express';
//import mysql from 'mysql2/promise';
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Sequelize, QueryTypes } from 'sequelize';
import { spawn } from 'node:child_process';
import { hash } from '../src/services/login.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname,'.env') });

const app = express();
const PORT = 3000;

// Basic CORS for local dev front-end
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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
app.use(express.json());

//login api
app.get('/login', async (req, res) => {
  try{
    const username = req.query.username;
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

    const { hashedpassword } = hash(req.query.password, rows[0].userSalt);
    if (hashedpassword !== rows[0].userHash) {
      return res.status(401).json({ error: "Invalid Hash" });
    }

    res.json({ message: "Login successful", user: rows[0] });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//register api
app.post('/register', async(req,res) => {
  try{
    //TODO: Should take in just username and password, hash password here
    const { username, userhash, usersalt } = req.body;
    if (!username || !usersalt || !userhash){
      return res.status(400).json({ error: "All fields are required" });
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
        replacements: [username, userhash, usersalt],
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

app.post('/feedback', async(req, res) =>{
  try {
    const {userid, message, severity } = req.body;
    
    if (!message) {
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
        replacements: [result,userid],
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
app.get('/feedback', async(req, res) =>{
  try
  { const {username} = req.query.username;
    if (!username) {
        return res.status(400).json({ error: "username is required" });
      }
    //get user id
    const user = await sequelize.query(
      "SELECT id FROM Login WHERE userName = ?",
        {
          replacements: [username],
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

app.post('/bugreports', async(req, res) =>{
  try {
    const {userid, message, severity } = req.body;
    
    if (!message) {
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
        replacements: [result,userid],
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
app.get('/bugreports', async(req, res) =>{
  try
  { const {username} = req.query.username;
    if (!username) {
        return res.status(400).json({ error: "username is required" });
      }
    //get user id
    const user = await sequelize.query(
      "SELECT id FROM Login WHERE userName = ?",
        {
          replacements: [username],
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
app.get('/ratings', async(req,res) =>{
  //testing
  console.log("hi");
  try
  { const {username} = req.query;
    console.log(username);
    if (!username) {
        return res.status(400).json({ error: "username is required" });
      }
    //get user id
    const user = await sequelize.query(
      "SELECT id FROM Login WHERE userName = ?",
        {
          replacements: [username],
          type: QueryTypes.SELECT
        }
      );
    if (user.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });
    //get user ratings
    const rows = await sequelize.query(
      "SELECT * FROM Songs_user_link WHERE userID = ?",
        {
          replacements: [user[0].id],
          type: QueryTypes.SELECT
        }
      );
      console.log(user[0].id);
      res.json({ reports: rows });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/ratings', async(req, res) =>{
  try {
    const {userid, songid, rating } = req.body;
    
    if (userid == null || songid == null || rating == null) {
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
          replacements: [userid],
          type: QueryTypes.SELECT
        }
      );
    if (user.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });    
    await sequelize.query(
      "INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)",
      {
        replacements: [songid,user[0].id,normalizedRating],
        type: QueryTypes.INSERT
      }
    );
    
    res.status(201).json({message: "Rating submitted"});
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/songs', async(req,res) => {
  try{
    const { songs } = req.body;
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({ error: "Songs array is required" });
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
    res.json({ recommendations: points });
  } catch (err) {
    console.error('Recommendation fetch failed:', err);
    res.status(502).json({ error: 'Recommendation service unavailable' });
  }
});

// Recommendations using saved like/dislike feedback in Songs_user_link
app.get('/recommendations/with-feedback', async (req, res) => {
  const { userId } = req.query;
  const { genre = null, artist = null, subgenre = null } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const numPointsRaw = parseInt(req.query.num_points, 10);
  const numPoints = Number.isNaN(numPointsRaw) ? 10 : Math.min(Math.max(numPointsRaw, 1), 50);

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

    //TODO
    // Helper to perform scroll (used for empty positives or recommend fallback)
    const doScroll = async () => {
      const scrollBody = { limit: numPoints, with_payload: true };
      const must_not = [];
      if (negative_ids.length > 0) {
        must_not.push({ key: 'id', match: { any: negative_ids } });
      }
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
      return res.json({ recommendations: points, positive_ids, negative_ids });
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
    res.json({ recommendations: points, positive_ids, negative_ids });
  } catch (err) {
    console.error('Recommendation with feedback failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Parsed recommendations (tuple list) using the Python helper contract:
// returns [(id, artist, genre, name), ...]
app.post("/parsed-recommendations", (req, res) => {
  const { userId, genre = "", artist = "", subgenre = "", num_points = 20 } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  
  const projectRoot = path.join(__dirname, "..");
  const scriptPath = path.join(projectRoot, "src", "qdrant", "run_recommendations.py");
  const pythonProcess = spawn("python", [
    scriptPath,
    String(userId),
    String(genre),
    String(artist),
    String(subgenre),
    String(num_points)
  ], {
    cwd: projectRoot,
    env: { ...process.env, PYTHONPATH: projectRoot }
  });

  let dataString = "";
  let stderrString = "";

  pythonProcess.stdout.on("data", (data) => {
    dataString += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    const text = data.toString();
    stderrString += text;
    console.error(`Python error: ${text}`);
  });

  pythonProcess.on("close", () => {
    try {
      const recommendations = JSON.parse(dataString);
      return res.json({ recommendations });
    } catch (err) {
      return res.status(500).json({ error: stderrString || "Failed to parse Python output" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
