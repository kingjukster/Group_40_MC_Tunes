import express from 'express';
import mysql from 'mysql2/promise';
import path, { dirname } from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname,'.env') });

const app = express();
const PORT = 3000;

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.password,
  database: 'user_info',
  port: 3306
});

//json parser
app.use(express.json());

//login api
app.get('/login', async (req, res) => {
  try{
    const username = req.query.username;
    //prepared statement
    const [rows] = await pool.execute(
      "SELECT userName, userHash, userSalt FROM Login WHERE username = ?", [username]
    );
    if (rows.length == 0)
      return res.status(401).json({ error: "Invalid credentials" });
    res.json({ message: "Login successful", user: rows[0] });
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

async function runSQLScript(filename) {

  const connection = await pool.getConnection();
  
  //read sql file
  const sqlPath = path.join(__dirname, filename);
  const sql = await fs.readFile(sqlPath, 'utf8');
  
  //execute each statement
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  for (const statement of statements) {
    await connection.query(statement);
  }
  
  connection.release();
}

await runSQLScript("init.sql");
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
