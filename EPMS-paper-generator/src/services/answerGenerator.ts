import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { GenerateRequest, QuestionChoice } from '../types';
import { parseXml } from '../utils/xmlParser';
import type { TextSegment } from '../utils/xmlParser';

const FONT = 'Times New Roman';
const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');
const TEXT_SIZE = 22;

function segmentsToRuns(segments: TextSegment[], size: number): TextRun[] {
  if (segments.length === 0) return [new TextRun({ text: '', font: FONT, size })];
  const runs: TextRun[] = [];
  for (const seg of segments) {
    const parts = seg.text.split('\n');
    parts.forEach((part, idx) => {
      runs.push(new TextRun({
        text: part,
        break: idx > 0 ? 1 : undefined,
        font: seg.font ?? FONT,
        size,
        bold: seg.bold,
        italics: seg.italics,
      }));
    });
  }
  return runs;
}

function xmlRuns(text: string, size: number): TextRun[] {
  return segmentsToRuns(parseXml(text), size);
}

function getAnswerRuns(
  questionType: string,
  questionChoices: string | null | undefined,
  questionAnswer: string | null | undefined,
): TextRun[] {
  if (
    questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' ||
    questionType === 'TRUE_FALSE'
  ) {
    if (!questionChoices) return [new TextRun({ text: '?', font: FONT, size: TEXT_SIZE })];
    try {
      const choices = JSON.parse(questionChoices) as QuestionChoice[];
      const idx = choices.findIndex(c => c.isAnswer);
      const label = idx >= 0 ? (CHOICE_LABELS[idx] ?? String.fromCharCode(65 + idx)) : '?';
      return [new TextRun({ text: label, font: FONT, size: TEXT_SIZE })];
    } catch {
      return [new TextRun({ text: '?', font: FONT, size: TEXT_SIZE })];
    }
  }

  if (questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE') {
    if (!questionChoices) return [new TextRun({ text: '?', font: FONT, size: TEXT_SIZE })];
    try {
      const choices = JSON.parse(questionChoices) as QuestionChoice[];
      const labels = choices
        .map((c, i) => ({ c, label: CHOICE_LABELS[i] ?? String.fromCharCode(65 + i) }))
        .filter(({ c }) => c.isAnswer)
        .map(({ label }) => label);
      return [new TextRun({ text: labels.length > 0 ? labels.join(', ') : '?', font: FONT, size: TEXT_SIZE })];
    } catch {
      return [new TextRun({ text: '?', font: FONT, size: TEXT_SIZE })];
    }
  }

  // SHORT_ANSWER, GAP_FILLING — questionAnswer may contain XML markup
  if (questionAnswer) {
    return xmlRuns(questionAnswer, TEXT_SIZE);
  }
  return [new TextRun({ text: '', font: FONT, size: TEXT_SIZE })];
}

export async function generateAnswerDocx(request: GenerateRequest): Promise<Buffer> {
  const multiPart = request.parts.length > 1;
  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Exam answers', font: FONT, size: 32, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: request.title, font: FONT, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  let questionIndex = 1;

  for (const part of request.parts) {
    if (multiPart) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: part.title, font: FONT, size: 26, bold: true })],
          spacing: { before: 240, after: 120 },
        }),
      );
    }

    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: 'Question', font: FONT, size: TEXT_SIZE, bold: true })],
              alignment: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: 'Answer', font: FONT, size: TEXT_SIZE, bold: true })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        ],
      }),
    ];

    for (const q of part.questions) {
      const answerRuns = getAnswerRuns(q.questionType, q.questionChoices, q.questionAnswer);
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: `Question ${questionIndex++}`, font: FONT, size: TEXT_SIZE })],
                alignment: AlignmentType.CENTER,
              })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: answerRuns,
              })],
            }),
          ],
        }),
      );
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      }),
    );

    if (multiPart) {
      children.push(new Paragraph({ children: [], spacing: { after: 240 } }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
