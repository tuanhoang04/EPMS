import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
  TabStopType,
} from 'docx';
import type { GenerateRequest, QuestionChoice, QuestionData } from '../types';
import { getPlainText, parseXml } from '../utils/xmlParser';
import type { TextSegment } from '../utils/xmlParser';

const FONT = 'Times New Roman';
const QUESTION_HEADER_SIZE = 24;
const QUESTION_TEXT_SIZE = 24;
const CHOICE_SIZE = 22;
const COL_WIDTH = 25; // percent
const PRINTABLE_WIDTH_TWIPS = 9026; // 11906 - 1440*2
const COL_WIDTH_TWIPS = Math.floor(PRINTABLE_WIDTH_TWIPS * (COL_WIDTH / 100)); // ~2256
const CHARS_PER_LINE = 90;
const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');

// ── XML → TextRun helpers ─────────────────────────────────────────────────────

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

// ── Choice helpers ────────────────────────────────────────────────────────────

const estimateChoiceLength = (label: string, text: string): number => {
  const plain = getPlainText(text);
  return label.length + 2 + plain.length;
};

function choiceTabLine(choices: QuestionChoice[], labels: string[]): Paragraph {
  const runs: TextRun[] = [];

  choices.forEach((choice, i) => {
    if (i > 0) {
      runs.push(new TextRun({ text: '\t', font: FONT, size: CHOICE_SIZE }));
    }
    runs.push(new TextRun({ text: `${labels[i]}. `, font: FONT, size: CHOICE_SIZE }));
    runs.push(...xmlRuns(choice.value, CHOICE_SIZE));
  });

  return new Paragraph({
    children: runs,
    tabStops: [
      { type: TabStopType.LEFT, position: COL_WIDTH_TWIPS },
      { type: TabStopType.LEFT, position: COL_WIDTH_TWIPS * 2 },
      { type: TabStopType.LEFT, position: COL_WIDTH_TWIPS * 3 },
    ],
    indent: { left: 0, firstLine: 0 },
    spacing: { after: 80 },
  });
}

function choiceSeparateParagraph(label: string, xmlText: string, keepNext: boolean): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}. `, font: FONT, size: CHOICE_SIZE }),
      ...xmlRuns(xmlText, CHOICE_SIZE),
    ],
    indent: { left: 360, firstLine: 0 },
    keepNext,
    spacing: { after: 60 },
  });
}

// ── Question block ────────────────────────────────────────────────────────────

function createQuestionBlock(index: number, question: QuestionData): Paragraph[] {
  const items: Paragraph[] = [];

  const isMultipleChoice =
    question.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' ||
    question.questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE';
  const isTrueFalse = question.questionType === 'TRUE_FALSE';
  const hasChoices = isMultipleChoice || isTrueFalse;

  items.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Question ${index}.`,
          font: FONT,
          size: QUESTION_HEADER_SIZE,
          bold: true,
        }),
      ],
      keepNext: true,
      spacing: { before: 280, after: 80 },
    }),
  );

  items.push(
    new Paragraph({
      children: xmlRuns(question.questionText || '', QUESTION_TEXT_SIZE),
      keepNext: hasChoices,
      spacing: { after: 80 },
    }),
  );

  if (isTrueFalse) {
    items.push(choiceTabLine(
      [{ value: 'True', isAnswer: false }, { value: 'False', isAnswer: false }],
      ['A', 'B'],
    ));
  } else if (isMultipleChoice && question.questionChoices) {
    let choices: QuestionChoice[] = [];
    try {
      choices = (JSON.parse(question.questionChoices) as QuestionChoice[]).filter((c) => c.value.trim());
    } catch { /* ignore */ }

    if (choices.length > 0) {
      const labels = choices.map((_, i) => CHOICE_LABELS[i] ?? String.fromCharCode(65 + i));
      const maxLen = Math.max(...choices.map((c, i) => estimateChoiceLength(labels[i], c.value)));
      const charsPerColumn = CHARS_PER_LINE * (COL_WIDTH / 100);

      if (choices.length <= 4 && maxLen <= charsPerColumn) {
        items.push(choiceTabLine(choices, labels));
      } else {
        choices.forEach((choice, i) => {
          const isLast = i === choices.length - 1;
          items.push(choiceSeparateParagraph(
            labels[i] ?? String.fromCharCode(65 + i),
            choice.value,
            !isLast,
          ));
        });
      }
    }
  }

  return items;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateExamDocx(request: GenerateRequest): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: request.title, font: FONT, size: 32, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Subject: ${request.subject}`, font: FONT, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  let questionIndex = 1;

  for (const part of request.parts) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: part.title, font: FONT, size: 28, bold: true })],
        spacing: { before: 240, after: 180 },
      }),
    );
    for (const question of part.questions) {
      children.push(...createQuestionBlock(questionIndex++, question));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}