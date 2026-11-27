import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import mongoose from 'mongoose';
import auth from './routes/auth.routes';
import lessons from './routes/lesson.routes';
import notes from './routes/notes.routes';
import reading from './routes/readingArticle.routes';
import companion from './routes/companion.routes';
import { getDashboard } from './controllers/dashboard.controller';
import { authMiddleware } from './middleware/auth.middleware';
import connectDB from './config/database';

const app = express();
const origins = ['http://localhost:3000', 'http://127.0.0.1:3000',
  ...(process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean)];
app.use(cors({ origin: origins, credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, crossOriginEmbedderPolicy: false }));
app.use(express.json());
app.use('/audio', express.static(path.join(__dirname, '../public/audio')));
app.get('/', (_req, res) => res.json({ message: 'Welcome to the Language Learning API', status: 'online',
  features: ['Traditional Lessons', 'Notes & Reading', 'AI Characters (real-time chat & VRM animation)'] }));
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date(), dbConnected: mongoose.connection.readyState === 1 }));
app.use('/api', async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});
app.use('/api/auth', auth);
app.use('/api/lessons', lessons);
app.use('/api/notes', notes);
app.use('/api/reading', reading);
app.use('/api/character', companion);
app.get('/api/dashboard/:language', authMiddleware, getDashboard);
export default app;
