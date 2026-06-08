const assert = require('node:assert');
const test = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.NODE_ENV = 'test';

const { app } = require('../server');

const request = async (server, path, options = {}) => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  const body = await response.json();

  return {
    body,
    headers: response.headers,
    status: response.status
  };
};

test('GET /health returns ok status', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, '/health');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok' });
    assert.equal(response.headers.get('x-dns-prefetch-control'), 'off');
  } finally {
    server.close();
  }
});

test('unknown API route returns a JSON 404', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, '/api/not-found');

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Route not found' });
  } finally {
    server.close();
  }
});

test('register validation rejects unsafe payloads before database access', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, '/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'A',
        email: 'not-an-email',
        password: 'short'
      })
    });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /Name must be 2-80 characters/);
    assert.match(response.body.error, /A valid email is required/);
    assert.match(response.body.error, /Password must be at least 8 characters/);
  } finally {
    server.close();
  }
});
