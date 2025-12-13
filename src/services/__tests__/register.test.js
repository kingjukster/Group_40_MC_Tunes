import request from 'supertest';
import { jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('sequelize', () => ({
  Sequelize: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    authenticate: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined)
  })),
  QueryTypes: {
    SELECT: 'SELECT',
    INSERT: 'INSERT'
  }
}));

const { default: app } = await import('../../../database/server.js');

describe('POST /register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 when username is missing', async () => {
    const response = await request(app)
      .post('/register')
      .send({ userhash: 'hash123', usersalt: 'salt123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'All fields are required' });
  });

  test('should return 400 when userhash is missing', async () => {
    const response = await request(app)
      .post('/register')
      .send({ username: 'newuser', usersalt: 'salt123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'All fields are required' });
  });

  test('should return 400 when usersalt is missing', async () => {
    const response = await request(app)
      .post('/register')
      .send({ username: 'newuser', userhash: 'hash123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'All fields are required' });
  });

  test('should return 400 when all fields are missing', async () => {
    const response = await request(app)
      .post('/register')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'All fields are required' });
  });

  test('should return 401 when username already exists', async () => {
    //mocking if username exists in database
    mockQuery.mockResolvedValueOnce([{ userName: 'existinguser' }]);

    const response = await request(app)
      .post('/register')
      .send({
        username: 'existinguser',
        userhash: 'hash123',
        usersalt: 'salt123'
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Username already exists' });
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT userName FROM Login WHERE userName = ?',
      {
        replacements: ['existinguser'],
        type: 'SELECT'
      }
    );
  });

  test('should successfully register a new user', async () => {
    //mock: username doesn't exist
    mockQuery.mockResolvedValueOnce([]);
    
    //mock: INSERT into Login returns user ID
    mockQuery.mockResolvedValueOnce([5]); // userID = 5
    
    //mock: INSERT into Permission_Level returns permission ID
    mockQuery.mockResolvedValueOnce([10]); // permissionID = 10
    
    //mock: INSERT into Permission_user_link
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/register')
      .send({
        username: 'newuser',
        userhash: 'hash123',
        usersalt: 'salt123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Registration successful' });

    //verify all queries were called in correct order
    expect(mockQuery).toHaveBeenCalledTimes(4);
    
    //check username existence
    expect(mockQuery).toHaveBeenNthCalledWith(1,
      'SELECT userName FROM Login WHERE userName = ?',
      {
        replacements: ['newuser'],
        type: 'SELECT'
      }
    );

    //insert user
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      'INSERT INTO Login (userName, userHash, userSalt) VALUES (?, ?, ?)',
      {
        replacements: ['newuser', 'hash123', 'salt123'],
        type: 'INSERT'
      }
    );

    //insert permission level
    expect(mockQuery).toHaveBeenNthCalledWith(3,
      'INSERT INTO Permission_Level (credentialLevel) VALUES (?)',
      {
        replacements: ['USER'],
        type: 'INSERT'
      }
    );

    //link user to permission
    expect(mockQuery).toHaveBeenNthCalledWith(4,
      'INSERT INTO Permission_user_link (permissionID, userID) VALUES (?,?)',
      {
        replacements: [10, 5],
        type: 'INSERT'
      }
    );
  });

  test('should return 500 on database error during username check', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/register')
      .send({
        username: 'newuser',
        userhash: 'hash123',
        usersalt: 'salt123'
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Server error' });
  });

  test('should return 500 on database error during user insertion', async () => {
    //username check succeeds
    mockQuery.mockResolvedValueOnce([]);
    
    //INSERT fails
    mockQuery.mockRejectedValueOnce(new Error('Insert failed'));

    const response = await request(app)
      .post('/register')
      .send({
        username: 'newuser',
        userhash: 'hash123',
        usersalt: 'salt123'
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Server error' });
  });

  test('should handle special characters in username', async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce([1]);
    mockQuery.mockResolvedValueOnce([1]);
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/register')
      .send({
        username: "user'name",
        userhash: 'hash123',
        usersalt: 'salt123'
      });

    expect(response.status).toBe(200);
    //verify prepared statement protects against SQL injection
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        replacements: expect.arrayContaining(["user'name"])
      })
    );
  });

  test('should handle empty string values', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        username: '',
        userhash: '',
        usersalt: ''
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'All fields are required' });
  });
});