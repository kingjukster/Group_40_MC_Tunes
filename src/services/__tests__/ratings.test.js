import request from 'supertest';
import { jest } from '@jest/globals';

//mock the Sequelize constructor before importing app
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

describe('GET /ratings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 when username is missing', async () => {
    const response = await request(app)
      .get('/ratings')
      .query({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'username is required' });
  });

  test('should return 401 when user does not exist', async () => {
    //mock: user not found
    mockQuery.mockResolvedValueOnce([]);

    const response = await request(app)
      .get('/ratings')
      .query({ username: 'nonexistentuser' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id FROM Login WHERE userName = ?',
      {
        replacements: ['nonexistentuser'],
        type: 'SELECT'
      }
    );
  });

  test('should return empty ratings array when user has no ratings', async () => {
    // Mock: user exists with id 5
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    
    //mock: no ratings found
    mockQuery.mockResolvedValueOnce([]);

    const response = await request(app)
      .get('/ratings')
      .query({ username: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reports: [] });
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test('should return user ratings successfully', async () => {
    const mockRatings = [
      { id: 1, songID: 10, userID: 5, rating: 1 },
      { id: 2, songID: 20, userID: 5, rating: 0 },
      { id: 3, songID: 30, userID: 5, rating: 1 }
    ];

    //mock: user exists with id 5
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    
    //mock: return user ratings
    mockQuery.mockResolvedValueOnce(mockRatings);

    const response = await request(app)
      .get('/ratings')
      .query({ username: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reports: mockRatings });
    
    //verify queries
    expect(mockQuery).toHaveBeenNthCalledWith(1,
      'SELECT id FROM Login WHERE userName = ?',
      {
        replacements: ['testuser'],
        type: 'SELECT'
      }
    );
    
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      'SELECT * FROM Songs_user_link WHERE userID = ?',
      {
        replacements: [5],
        type: 'SELECT'
      }
    );
  });

  test('should return 500 on database error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockQuery.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/ratings')
      .query({ username: 'testuser' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Server error' });
    
    consoleErrorSpy.mockRestore();
  });

  test('should handle special characters in username', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 1 }]);
    mockQuery.mockResolvedValueOnce([]);

    const response = await request(app)
      .get('/ratings')
      .query({ username: "user'name" });

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id FROM Login WHERE userName = ?',
      {
        replacements: ["user'name"],
        type: 'SELECT'
      }
    );
  });
});

describe('POST /ratings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 when userid is missing', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({ songid: 10, rating: 1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Incomplete query' });
  });

  test('should return 400 when songid is missing', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, rating: 1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Incomplete query' });
  });

  test('should return 400 when rating is missing', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Incomplete query' });
  });

  test('should return 400 when all fields are missing', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Incomplete query' });
  });

  test('should return 400 when rating is not 0 or 1', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 2 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'rating must be 0 (dislike) or 1 (like)' });
  });

  test('should return 400 when rating is negative', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'rating must be 0 (dislike) or 1 (like)' });
  });

  test('should return 400 when rating is a string other than "0" or "1"', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'rating must be 0 (dislike) or 1 (like)' });
  });

  test('should return 401 when user does not exist', async () => {
    //mock: user not found
    mockQuery.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 999, songid: 10, rating: 1 });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id FROM Login WHERE id = ?',
      {
        replacements: [999],
        type: 'SELECT'
      }
    );
  });

  test('should successfully submit rating with numeric 1 (like)', async () => {
    //mock: user exists
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    
    //mock: INSERT successful
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 1 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Rating submitted' });
    
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      'INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)',
      {
        replacements: [10, 5, 1],
        type: 'INSERT'
      }
    );
  });

  test('should successfully submit rating with numeric 0 (dislike)', async () => {
    //mock: user exists
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    
    //mock: INSERT successful
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 0 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Rating submitted' });
    
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      'INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)',
      {
        replacements: [10, 5, 0],
        type: 'INSERT'
      }
    );
  });

  test('should successfully submit rating with string "1"', async () => {
    //mock: user exists
    mockQuery.mockResolvedValueOnce([{ id: 1 }]);
    
    //mock: INSERT successful
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: '1' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Rating submitted' });
    
    //should normalize to 1
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      'INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)',
      {
        replacements: [10, 1, 1],
        type: 'INSERT'
      }
    );
  });

  test('should successfully submit rating with string "0"', async () => {
    //mock: user exists
    mockQuery.mockResolvedValueOnce([{ id: 1 }]);
    
    //mock: INSERT successful
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: '0' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Rating submitted' });
    
    //should normalize to 0
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      'INSERT INTO Songs_user_link (songID,userID,rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)',
      {
        replacements: [10, 1, 0],
        type: 'INSERT'
      }
    );
  });

  test('should handle updating existing rating (ON DUPLICATE KEY)', async () => {
    //mock: user exists
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    
    //mock: UPDATE existing rating
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 1 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Rating submitted' });
  });

  test('should return 500 on database error during user check', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockQuery.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 1 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Server error' });
    
    consoleErrorSpy.mockRestore();
  });

  test('should return 500 on database error during insert', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    //mock: user exists
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    
    //mock: INSERT fails
    mockQuery.mockRejectedValueOnce(new Error('Insert failed'));

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 10, rating: 1 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Server error' });
    
    consoleErrorSpy.mockRestore();
  });

  test('should handle different songid values', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 5, songid: 999999, rating: 1 });

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenNthCalledWith(2,
      expect.any(String),
      expect.objectContaining({
        replacements: [999999, 5, 1]
      })
    );
  });

  test('should handle userid 0 as valid', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 0 }]);
    mockQuery.mockResolvedValueOnce([1]);

    const response = await request(app)
      .post('/ratings')
      .send({ userid: 0, songid: 10, rating: 1 });

    expect(response.status).toBe(201);
  });
});