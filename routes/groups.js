const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const db = require('../db');

async function groupRoutes(fastify, options) {
  fastify.post('/groups', { 
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2 }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.body;
    const id = uuidv4();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const insertGroup = db.prepare('INSERT INTO groups (id, name, invite_code) VALUES (?, ?, ?)');
    const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');

    const run = db.transaction(() => {
      insertGroup.run(id, name, inviteCode);
      insertMember.run(id, request.user.id);
    });

    run();

    return { id, name, inviteCode };
  });

  fastify.get('/groups', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const groups = db.prepare(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `).all(userId);
    return groups;
  });

  // Join by invite code (no group ID needed — we look it up)
  fastify.post('/groups/join', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['invite_code'],
        properties: {
          invite_code: { type: 'string', minLength: 6, maxLength: 6 }
        }
      }
    }
  }, async (request, reply) => {
    const { invite_code } = request.body;
    const userId = request.user.id;

    const group = db.prepare('SELECT id FROM groups WHERE invite_code = ?').get(invite_code);
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    try {
      db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(group.id, userId);
      const groupInfo = db.prepare('SELECT id, name, invite_code FROM groups WHERE id = ?').get(group.id);
      return { success: true, group: groupInfo };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return { success: true, message: 'Already a member' };
      }
      throw err;
    }
  });

  fastify.post('/groups/:id/join', { 
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['invite_code'],
        properties: {
          invite_code: { type: 'string', minLength: 6, maxLength: 6 }
        }
      }
    }
  }, async (request, reply) => {
    const { invite_code } = request.body;
    const userId = request.user.id;

    const group = db.prepare('SELECT id FROM groups WHERE invite_code = ?').get(invite_code);
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    try {
      db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(group.id, userId);
      return { success: true };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return { success: true, message: 'Already a member' };
      }
      throw err;
    }
  });

  fastify.post('/groups/:id/vlog/:date/generate', { 
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          date: { type: 'string', pattern: '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' }
        }
      },
      body: {
        type: 'object',
        properties: {
          musicType: { type: 'string', enum: ['chill', 'upbeat', 'energetic'] }
        }
      }
    }
  }, async (request, reply) => {
    const groupId = request.params.id;
    const { date } = request.params;
    const { musicType = 'upbeat' } = request.body || {};

    // Check if user is member
    const member = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, request.user.id);
    if (!member) {
      return reply.code(403).send({ error: 'Not a member of this group' });
    }

    const clips = db.prepare(`
      SELECT c.*, u.name as user_name FROM clips c
      JOIN users u ON c.user_id = u.id
      JOIN group_members gm ON c.user_id = gm.user_id
      WHERE gm.group_id = ? AND date(c.timestamp) = ? AND c.status = 'uploaded'
      ORDER BY c.timestamp ASC
    `).all(groupId, date);

    if (clips.length === 0) {
      return reply.code(400).send({ error: 'No clips found for this group on this date' });
    }

    const outputFileName = `group_${groupId}_${date}_vlog.mp4`;
    const outputPath = path.join('uploads', 'vlogs', outputFileName);
    const fullOutputPath = path.join(__dirname, '..', outputPath);
    const musicPath = path.join(__dirname, '..', 'uploads', 'music', `${musicType}.mp3`);

    const command = ffmpeg();
    clips.forEach(clip => {
      command.input(path.join(__dirname, '..', clip.file_path));
    });

    if (fs.existsSync(musicPath)) {
      command.input(musicPath);
    }

    let filterComplex = '';
    const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';

    for (let i = 0; i < clips.length; i++) {
      const timeStr = new Date(clips[i].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const caption = `${timeStr} - ${clips[i].user_name}`;
      filterComplex += `[${i}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,drawtext=fontfile='${fontPath}':text='${caption}':fontcolor=white:fontsize=36:x=40:y=h-th-40:box=1:boxcolor=black@0.5:boxborderw=10,setpts=PTS-STARTPTS[v${i}];`;
      filterComplex += `[${i}:a]aresample=44100,asetpts=PTS-STARTPTS[a${i}];`;
    }

    let lastVideoLabel = 'v0';
    let lastAudioLabel = 'a0';

    if (clips.length > 1) {
      let vOffset = 4;
      filterComplex += `[v0][v1]xfade=transition=fade:duration=1:offset=${vOffset}[vout1];`;
      filterComplex += `[a0][a1]acrossfade=d=1:o=${vOffset}[aout1];`;
      for (let i = 2; i < clips.length; i++) {
        vOffset += 4;
        filterComplex += `[vout${i-1}][v${i}]xfade=transition=fade:duration=1:offset=${vOffset}[vout${i}];`;
        filterComplex += `[aout${i-1}][a${i}]acrossfade=d=1:o=${vOffset}[aout${i}];`;
      }
      lastVideoLabel = `vout${clips.length - 1}`;
      lastAudioLabel = `aout${clips.length - 1}`;
    }

    const musicInputIndex = clips.length;
    if (fs.existsSync(musicPath)) {
      filterComplex += `[${musicInputIndex}:a]aloop=loop=-1:size=2e9,volume=0.3[bgm];`;
      filterComplex += `[${lastAudioLabel}][bgm]amix=inputs=2:duration=first[finalaudio]`;
      lastAudioLabel = 'finalaudio';
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        `-map [${lastVideoLabel}]`,
        `-map [${lastAudioLabel}]`,
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
        `-t ${clips.length * 4 + 1}`
      ])
      .on('error', function(err) {
        console.error('An error occurred: ' + err.message);
      })
      .on('end', function() {
        console.log('Group merging finished!');
        const id = uuidv4();
        db.prepare('INSERT INTO group_vlogs (id, group_id, date, file_path) VALUES (?, ?, ?, ?) ON CONFLICT(group_id, date) DO UPDATE SET file_path=excluded.file_path')
          .run(id, groupId, date, outputPath);
      })
      .save(fullOutputPath);

    return reply.code(202).send({ status: 'Processing started' });
  });

  fastify.get('/groups/:id/vlog/:date', { 
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          date: { type: 'string', pattern: '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' }
        }
      }
    }
  }, async (request, reply) => {
    const groupId = request.params.id;
    const { date } = request.params;

    const vlog = db.prepare('SELECT * FROM group_vlogs WHERE group_id = ? AND date = ?').get(groupId, date);
    if (!vlog) {
      return reply.code(404).send({ error: 'Group vlog not found' });
    }

    return vlog;
  });

  fastify.get('/groups/:id/members', { 
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const groupId = request.params.id;
    const today = new Date().toISOString().split('T')[0];

    const members = db.prepare(`
      SELECT u.id, u.name, u.email,
             (SELECT COUNT(*) FROM clips c WHERE c.user_id = u.id AND date(c.timestamp) = ?) as clips_today
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `).all(today, groupId);

    return members;
  });
}

module.exports = groupRoutes;
