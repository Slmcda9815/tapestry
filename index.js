require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads', 'clips'),
  path.join(__dirname, 'uploads', 'vlogs'),
  path.join(__dirname, 'uploads', 'music'),
  path.join(__dirname, 'uploads', 'tmp')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Plugins
fastify.register(require('@fastify/cors'), {
  origin: '*', // Adjust for production
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'supersecret'
});

fastify.register(require('@fastify/multipart'));

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',
});

// Auth Decorator
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// Global Error Handler
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
    reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
    return;
  }
  if (reply.statusCode >= 500) {
    fastify.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
    return;
  }
  reply.send(error);
});

// Health Check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register Routes
fastify.register(require('./routes/clips'));
fastify.register(require('./routes/vlogs'));
fastify.register(require('./routes/groups'));

// Auth Routes
fastify.post('/api/auth/register', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
        name: { type: 'string', minLength: 2 }
      }
    }
  }
}, async (request, reply) => {
  const { email, password, name } = request.body;

  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuidv4();

  try {
    const stmt = db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)');
    stmt.run(id, email, passwordHash, name);
    
    const token = fastify.jwt.sign({ id, email });
    return { user: { id, email, name }, token };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return reply.code(400).send({ error: 'Email already exists' });
    }
    throw err;
  }
});

fastify.post('/api/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const { email, password } = request.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const token = fastify.jwt.sign({ id: user.id, email: user.email });
  return { user: { id: user.id, email: user.email, name: user.name }, token };
});

// User Profile
fastify.get('/api/users/me', { preHandler: [fastify.authenticate] }, async (request) => {
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(request.user.id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
