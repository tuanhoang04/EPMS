import express from 'express';
import generateRouter from './routes/generate';

const app = express();
const PORT = process.env['PORT'] ?? 3001;

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'epms-paper-generator' });
});

app.use('/', generateRouter);

app.listen(PORT, () => {
  console.log(`EPMS paper generator running on port ${PORT}`);
});
