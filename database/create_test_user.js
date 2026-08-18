import { Sequelize, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const DB_NAME = 'user_info';
const DB_USER = 'root';
const DB_PASS = process.env.password;
const DB_HOST = 'localhost';
const DB_PORT = 3306;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  dialect: 'mysql',
  host: DB_HOST,
  port: DB_PORT,
  pool: { acquire: 30000, idle: 10000 },
  logging: false
});

const Login = sequelize.define('Login', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userHash: { type: DataTypes.STRING(255), allowNull: false },
  userName: { type: DataTypes.STRING(255), allowNull: false },
  userSalt: { type: DataTypes.STRING(255), allowNull: false }
}, {
  tableName: 'Login',
  timestamps: true
});

async function createTestUser() {
  try {
    await sequelize.authenticate();
    const testUserName = 'admin';
    const testPassword = 'admin123';

    
    const hashedpassword = await bcrypt.hash(testPassword, 12);

    const [user, created] = await Login.findOrCreate({
      where: { userName: testUserName },
      defaults: { userSalt: '', userHash: hashedpassword }
    });

    if (created) {
      console.log(`Test user '${testUserName}' created (id=${user.id}).`);
    } else {
      console.log(`Test user '${testUserName}' already exists (id=${user.id}).`);
    }
  } catch (err) {
    console.error('Error creating test user:', err);
  } finally {
    await sequelize.close();
  }
}

createTestUser();
