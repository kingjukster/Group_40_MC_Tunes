import mysql from 'mysql2/promise';
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname,'.env') });

let pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.password,
  database: 'user_info',
  port: 3306
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
await pool.end();
