const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../db');

async function clipRoutes(fastify, options) {
  fastify.post('/clips', { 
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    const { timestamp } = request.body || {};
    const id = uuidv4();
    const userId = request.user.id;

    const stmt = db.prepare('INSERT INTO clips (id, user_id, timestamp) VALUES (?, ?, ?)');
    stmt.run(id, userId, timestamp || new Date().toISOString());

    return { id, status: 'pending' };
  });

  fastify.post('/clips/:id/upload', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const clipId = request.params.id;

    const clip = db.prepare('SELECT * FROM clips WHERE id = ? AND user_id = ?').get(clipId, userId);
    if (!clip) {
      return reply.code(404).send({ error: 'Clip not found' });
    }

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const ext = path.extname(data.filename) || '.mp4';
    const filePath = path.join('uploads', 'clips', `${clipId}${ext}`);
    const fullPath = path.join(__dirname, '..', filePath);

    try {
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(fullPath);
        data.file.pipe(out);
        out.on('finish', resolve);
        out.on('error', (err) => {
          out.destroy();
          reject(err);
        });
      });

      db.prepare('UPDATE clips SET file_path = ?, status = ? WHERE id = ?').run(filePath, 'uploaded', clipId);

      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to save file' });
    }
  });

  fastify.get('/clips', { 
    preHandler: [fastify.authenticate],
    schema: {
      query: {
        type: 'object',
        properties: {
          date: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const date = request.query.date || new Date().toISOString().split('T')[0];

    const clips = db.prepare("SELECT * FROM clips WHERE user_id = ? AND date(timestamp) = ?").all(userId, date);
    return clips;
  });
}

module.exports = clipRoutes;
