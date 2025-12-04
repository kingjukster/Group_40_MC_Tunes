import { Sequelize, DataTypes } from 'sequelize';

//primary and repica setup
const sequelize = new Sequelize('user_info', 'root', process.env.password, {
  dialect: 'mysql',
  replication: {
    read: [
      {
        host: 'localhost',
        username: 'root',
        password: process.env.password,
        port: REPLICA_PORT
      }
    ],
    write: {
      host: 'localhost',
      username: 'root',
      password: process.env.password,
      port: PRIMARY_PORT
    }
  },
  pool: {
    acquire:30000,
    idle:10000
  }
});

//login table
const Login = sequelize.define('Login', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userHash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  userSalt: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'Login',
  timestamps: true
});

//songs table
const Songs = sequelize.define('Songs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  songName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  explicit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'Songs',
  timestamps: true
});

//artists table
const Artists = sequelize.define('Artists', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'Artists',
  timestamps: true
});


const SongsArtistsLink = sequelize.define('SongsArtistsLink', {
  songID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  artistID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'Songs_artists_link',
  timestamps: true
});

const SongsArtistsUserLink = sequelize.define('SongsArtistsUserLink', {
  songID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  artistID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  userID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'Songs_artists_user_link',
  timestamps: true
});

const Feedback = sequelize.define('Feedback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'Feedback',
  timestamps: true
});


const FeedbackUserLink = sequelize.define('FeedbackUserLink', {
  feedbackID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  userID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'Feedback_user_link',
  timestamps: true
});

const BugReports = sequelize.define('BugReports', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'Bug_Reports',
  timestamps: true
});


const BugReportUserLink = sequelize.define('BugReportUserLink', {
  reportID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  userID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'Bug_Report_user_link',
  timestamps: true
});

const PermissionLevel = sequelize.define('PermissionLevel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  credentialLevel: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'Permission_Level',
  timestamps: true
});

const PermissionUserLink = sequelize.define('PermissionUserLink', {
  permissionID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  userID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'Permission_user_link',
  timestamps: true
});


// Test connection and sync models
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
    // Optional: Sync models (use carefully in production!)
    // return sequelize.sync({ alter: false }); // Don't use { force: true } in production!
  })
  .catch(err => console.error('Unable to connect to database:', err));

