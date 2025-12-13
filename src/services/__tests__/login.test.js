import request from 'supertest';
import { jest } from '@jest/globals';

//mock the Sequelize constructor before importing app
const mockQuery = jest.fn();

jest.unstable_mockModule('sequelize', () => ({
  Sequelize: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    authenticate: jest.fn().mockResolvedValue(true)
  })),
  QueryTypes: {
    SELECT: 'SELECT'
  }
}));

//mock the hash function
jest.unstable_mockModule('../login.js', () => ({
  hash: jest.fn()
}));

//import app and hash after mocking
const { default: app } = await import('../../../database/server.js');
const { hash } = await import('../login.js');

describe('GET /login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    //close sequelize connection after tests
    const { default: app } = await import('../../../database/server.js');
  });

  test('should return 401 when user not found', async () => {
    mockQuery.mockResolvedValue([]);

    const response = await request(app)
      .get('/login')
      .query({ username: 'nonexistent', password: 'test123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  test('should return 401 when password hash does not match', async () => {
    const mockUser = {
      id: 1,
      userName: 'testuser',
      userHash: 'correcthash123',
      userSalt: 'somesalt'
    };

    mockQuery.mockResolvedValue([mockUser]);
    hash.mockReturnValue({ hashedpassword: 'wronghash456' });

    const response = await request(app)
      .get('/login')
      .query({ username: 'testuser', password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid Hash' });
    expect(hash).toHaveBeenCalledWith('wrongpassword', 'somesalt');
  });

  test('should return 200 on successful login', async () => {
    const mockUser = {
      id: 1,
      userName: 'testuser',
      userHash: 'correcthash123',
      userSalt: 'somesalt'
    };

    mockQuery.mockResolvedValue([mockUser]);
    hash.mockReturnValue({ hashedpassword: 'correcthash123' });

    const response = await request(app)
      .get('/login')
      .query({ username: 'testuser', password: 'correctpassword' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Login successful',
      user: mockUser
    });
  });

  test('should return 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .get('/login')
      .query({ username: 'testuser', password: 'test123' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Server error' });
  });

  test('should call query with correct SQL and parameters', async () => {
    mockQuery.mockResolvedValue([]);

    await request(app)
      .get('/login')
      .query({ username: 'testuser', password: 'test123' });

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id, userName, userHash, userSalt FROM Login WHERE userName = ?',
      {
        replacements: ['testuser'],
        type: 'SELECT'
      }
    );
  });
});