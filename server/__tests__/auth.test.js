const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure we start with a clean DB for tests
const DB_PATH = path.join(__dirname, '..', 'db.json');
beforeEach(() => {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2), 'utf8');
});

const app = require('..');

describe('Auth endpoints', () => {
  test('register -> login -> me flow', async () => {
    const email = 'test@example.com';
    const password = 'pass1234';

    // Register
    const reg = await request(app)
      .post('/register')
      .send({ email, password, name: 'Tester' })
      .set('Accept', 'application/json');

    expect(reg.status).toBe(201);
    expect(reg.body.user).toHaveProperty('id');
    expect(reg.body.user.email).toBe(email);

    // Login
    const login = await request(app)
      .post('/login')
      .send({ email, password })
      .set('Accept', 'application/json');

    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('token');
    const token = login.body.token;

    // Me
    const me = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  test('login with bad password returns 401', async () => {
    const email = 'badpw@example.com';
    const password = 'rightpw';
    await request(app).post('/register').send({ email, password });

    const res = await request(app).post('/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
