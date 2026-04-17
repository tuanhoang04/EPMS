import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateExamDocx } from '../services/docxGenerator';
import { generateAnswerDocx } from '../services/answerGenerator';
import type { GenerateRequest } from '../types';
import JSZip from 'jszip';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  const body = req.body as GenerateRequest;

  if (!body?.title || !body?.subject || !Array.isArray(body?.parts)) {
    res.status(400).json({ error: 'Invalid request: missing title, subject, or parts' });
    return;
  }

  try {
    const [examBuffer, answerBuffer] = await Promise.all([
      generateExamDocx(body),
      generateAnswerDocx(body),
    ]);

    const zip = new JSZip();
    zip.file('exam.docx', examBuffer);
    zip.file('answers.docx', answerBuffer);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="exam-package.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error generating exam document:', err);
    res.status(500).json({ error: 'Failed to generate exam document' });
  }
});

export default router;
