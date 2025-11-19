const request = require('supertest');
const ChatBETOListener = require('../server');

describe('ChatBETO Listener API', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.API_KEY = 'test-api-key';

    const listener = new ChatBETOListener();
    app = listener.app;
    
    // Mock database initialization
    jest.spyOn(require('../src/services/database'), 'initialize').mockResolvedValue();
    
    await listener.initialize();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      // Mock database health check
      jest.spyOn(require('../src/services/database'), 'healthCheck').mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString()
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Root Endpoint', () => {
    test('GET / should return service info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('service', 'ChatBETO Listener');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Authentication', () => {
    test('POST /sync/manual without API key should return 401', async () => {
      const response = await request(app)
        .post('/sync/manual')
        .send({ type: 'conversation', data: {} })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing API key');
    });

    test('POST /sync/manual with invalid API key should return 401', async () => {
      const response = await request(app)
        .post('/sync/manual')
        .set('X-API-Key', 'invalid-key')
        .send({ type: 'conversation', data: {} })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid API key');
    });
  });

  describe('Webhook Validation', () => {
    test('POST /webhook/chatgpt without signature should return 401', async () => {
      const response = await request(app)
        .post('/webhook/chatgpt')
        .send({ test: 'data' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing signature or timestamp');
    });
  });

  describe('404 Handler', () => {
    test('GET /nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('method', 'GET');
      expect(response.body).toHaveProperty('path', '/nonexistent');
    });
  });
});