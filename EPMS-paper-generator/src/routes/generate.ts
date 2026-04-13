import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateExamDocx } from '../services/docxGenerator';
import type { GenerateRequest } from '../types';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  const body = req.body as GenerateRequest;

  if (!body?.title || !body?.subject || !Array.isArray(body?.parts)) {
    res.status(400).json({ error: 'Invalid request: missing title, subject, or parts' });
    return;
  }

  try {
    const buffer = await generateExamDocx(body);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="exam.docx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Error generating exam document:', err);
    res.status(500).json({ error: 'Failed to generate exam document' });
  }
});

export default router;
