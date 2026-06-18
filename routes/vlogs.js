const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function vlogRoutes(fastify, options) {
  fastify.get('/vlogs/:date', { 
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          date: { type: 'string', pattern: '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { date } = request.params;

    const vlog = db.prepare('SELECT * FROM daily_vlogs WHERE user_id = ? AND date = ?').get(userId, date);
    if (!vlog) {
      return reply.code(404).send({ error: 'Vlog not found' });
    }

    if (vlog.score_breakdown) {
      vlog.score_breakdown = JSON.parse(vlog.score_breakdown);
    }

    return vlog;
  });

  fastify.post('/vlogs/:date/generate', { 
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
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
    const userId = request.user.id;
    const { date } = request.params;
    const { musicType = 'chill' } = request.body || {};

    const clips = db.prepare("SELECT * FROM clips WHERE user_id = ? AND date(timestamp) = ? AND status = 'uploaded' ORDER BY timestamp ASC").all(userId, date);

    if (clips.length === 0) {
      return reply.code(400).send({ error: 'No clips found for this date' });
    }

    const outputFileName = `${userId}_${date}_vlog.mp4`;
    const outputPath = path.join('uploads', 'vlogs', outputFileName);
    const fullOutputPath = path.join(__dirname, '..', outputPath);
    const musicPath = path.join(__dirname, '..', 'uploads', 'music', `${musicType}.mp3`);

    // Enhanced Scoring Logic
    const scoreBreakdown = {
      clipCount: clips.length,
      consistencyScore: Math.min(clips.length * 5, 50), // Up to 50 points for quantity
      hourlyBonus: 0,
      streakBonus: 0,
    };

    // Calculate hourly consistency (simple version)
    const hours = new Set(clips.map(c => new Date(c.timestamp).getHours()));
    scoreBreakdown.hourlyBonus = hours.size * 2;
    
    const totalScore = scoreBreakdown.consistencyScore + scoreBreakdown.hourlyBonus;

    // FFmpeg Processing with Crossfades, Captions, and Music
    const command = ffmpeg();
    
    clips.forEach(clip => {
      command.input(path.join(__dirname, '..', clip.file_path));
    });

    // Add background music as another input
    if (fs.existsSync(musicPath)) {
      command.input(musicPath);
    }

    let filterComplex = '';
    const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';

    // 1. Scale, Captions and PTS for each clip
    for (let i = 0; i < clips.length; i++) {
      const timeStr = new Date(clips[i].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      filterComplex += `[${i}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,drawtext=fontfile='${fontPath}':text='${timeStr}':fontcolor=white:fontsize=48:x=w-tw-40:y=h-th-40:box=1:boxcolor=black@0.5:boxborderw=10,setpts=PTS-STARTPTS[v${i}];`;
      filterComplex += `[${i}:a]aresample=44100,asetpts=PTS-STARTPTS[a${i}];`;
    }

    let lastVideoLabel = 'v0';
    let lastAudioLabel = 'a0';

    // 2. Crossfades
    if (clips.length > 1) {
      let vOffset = 4; // Assuming 5s clips, 1s crossfade
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

    // 3. Mix Background Music
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
        `-t ${clips.length * 4 + 1}` // Expected duration
      ])
      .on('error', function(err) {
        console.error('An error occurred: ' + err.message);
      })
      .on('end', function() {
        console.log('Vlog generation finished!');
        const id = uuidv4();
        db.prepare('INSERT INTO daily_vlogs (id, user_id, date, file_path, score, score_breakdown) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET file_path=excluded.file_path, score=excluded.score, score_breakdown=excluded.score_breakdown')
          .run(id, userId, date, outputPath, totalScore, JSON.stringify(scoreBreakdown));
      })
      .save(fullOutputPath);

    return reply.code(202).send({ status: 'Processing started', score: totalScore });
  });
}

module.exports = vlogRoutes;
