import express from 'express';
//import mysql from 'mysql2/promise';
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Sequelize, QueryTypes } from 'sequelize';
import { error } from 'node:console';



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
    //get user ratings
    const rows = await sequelize.query(
      "SELECT * FROM Songs_user_link WHERE userID = ?",
        {
          replacements: [user[0].id],
          type: QueryTypes.SELECT
        }
      );
      res.json({ reports: rows });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/ratings', async(req, res) =>{
  try {
    const {userid, songid, rating } = req.body;
    
    if (!(userid && songid && rating)) {
      return res.status(400).json({ error: "Incomplete query" });
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
    const [result] = await sequelize.query(
      "INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?)",
      {
        replacements: [songid,user[0].id,rating],
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
      
      const [result] = await sequelize.query(
        "INSERT INTO Songs (songName, genre, explicit) VALUES (?, ?, ?)",
        {
          replacements: [ songName, genre || null, 
            explicit !== undefined ? explicit : false
          ],
          type: QueryTypes.INSERT
        }
      );
      res.status(201).json({message: "Songs inserted"});
    }
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
