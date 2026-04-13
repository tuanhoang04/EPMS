import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';
import type { GenerateRequest, QuestionChoice, QuestionData } from '../types';
import { getPlainText, parseXml } from '../utils/xmlParser';
import type { TextSegment } from '../utils/xmlParser';

// ── Constants ────────────────────────────────────────────────────────────────

const FONT = 'Times New Roman';
/** 12 pt in half-points */
const QUESTION_HEADER_SIZE = 24;
/** 12 pt in half-points */
const QUESTION_TEXT_SIZE = 24;
/** 11 pt in half-points */
const CHOICE_SIZE = 22;

/**
 * Estimated printable characters per line at 11 pt Times New Roman on A4
 * with 1 in (1440 twip) margins. Used for same-line vs separate-line heuristic.
 */
const CHARS_PER_LINE = 90;

/**
 * Usable line width in twips: A4 (11906) minus left+right margins (2 × 1440).
 * Tab stop positions are calculated as fractions of this value.
 */
const USABLE_WIDTH_TWIPS = 9026;

const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');

// ── XML → TextRun helpers ─────────────────────────────────────────────────────

function segmentsToRuns(segments: TextSegment[], size: number): TextRun[] {
  if (segments.length === 0) {
    return [new TextRun({ text: '', font: FONT, size })];
  }
  return segments.map(
    (seg) =>
      new TextRun({
        text: seg.text,
        font: seg.font ?? FONT,
        size,
        bold: seg.bold,
        italics: seg.italics,
      }),
  );
}

function xmlRuns(text: string, size: number): TextRun[] {
  return segmentsToRuns(parseXml(text), size);
}

// ── Choice helpers ────────────────────────────────────────────────────────────

function choiceSeparateParagraph(label: string, xmlText: string, keepNext: boolean): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}.\u2003`, font: FONT, size: CHOICE_SIZE }),
      ...xmlRuns(xmlText, CHOICE_SIZE),
    ],
    indent: { left: 360 },
    keepNext,
    spacing: { after: 60 },
  });
}

/**
 * Renders all choices in a single paragraph using evenly-spaced tab stops.
 * This avoids table cell borders entirely.
 *
 * Tab stop positions divide the usable line width equally so that:
 *   choice[0] starts at the natural indent,
 *   choice[1] starts at 1/n of the usable width,
 *   choice[2] starts at 2/n, … and so on.
 */
function choiceSameLineParagraph(choices: QuestionChoice[], labels: string[]): Paragraph {
  const n = choices.length;

  // One tab stop per inter-choice boundary (n choices → n-1 stops)
  const tabStops = Array.from({ length: n - 1 }, (_, i) => ({
    type: TabStopType.LEFT,
    position: Math.round(USABLE_WIDTH_TWIPS * (i + 1) / n),
  }));

  const children: TextRun[] = [];
  choices.forEach((choice, i) => {
    children.push(new TextRun({ text: `${labels[i]}.\u2003`, font: FONT, size: CHOICE_SIZE }));
    children.push(...xmlRuns(choice.value, CHOICE_SIZE));
    if (i < n - 1) {
      children.push(new TextRun({ text: '\t', font: FONT, size: CHOICE_SIZE }));
    }
  });

  return new Paragraph({
    children,
    tabStops,
    keepLines: true,
    spacing: { after: 80 },
  });
}

// ── Question block ─────────────────────────────────────────────────────────────

/**
 * Returns the sequence of paragraphs that represent one question.
 * All paragraphs except the last carry keepNext=true so the entire block
 * stays on one page.
 */
function createQuestionBlock(index: number, question: QuestionData): Paragraph[] {
  const items: Paragraph[] = [];

  const isMultipleChoice =
    question.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' ||
    question.questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE';
  const isTrueFalse = question.questionType === 'TRUE_FALSE';
  const hasChoices = isMultipleChoice || isTrueFalse;

  // ── "Question N." header ──
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

  // ── Question text ──
  items.push(
    new Paragraph({
      children: xmlRuns(question.questionText || '', QUESTION_TEXT_SIZE),
      keepNext: hasChoices,
      spacing: { after: 80 },
    }),
  );

  if (isTrueFalse) {
    const tfChoices: QuestionChoice[] = [
      { value: 'True', isAnswer: false },
      { value: 'False', isAnswer: false },
    ];
    items.push(choiceSameLineParagraph(tfChoices, ['A', 'B']));
  } else if (isMultipleChoice && question.questionChoices) {
    let choices: QuestionChoice[] = [];
    try {
      choices = (JSON.parse(question.questionChoices) as QuestionChoice[]).filter((c) =>
        c.value.trim(),
      );
    } catch {
      /* ignore malformed JSON */
    }

    if (choices.length > 0) {
      const labels = choices.map(
        (_, i) => CHOICE_LABELS[i] ?? String.fromCharCode(65 + i),
      );

      // Estimate total display length: label + ". " + plain text + trailing space
      const totalLen = choices.reduce(
        (sum, c, i) => sum + (labels[i]?.length ?? 1) + 2 + getPlainText(c.value).length + 1,
        0,
      );

      if (totalLen / CHARS_PER_LINE < 0.9) {
        items.push(choiceSameLineParagraph(choices, labels));
      } else {
        choices.forEach((choice, i) => {
          const isLast = i === choices.length - 1;
          items.push(
            choiceSeparateParagraph(
              labels[i] ?? String.fromCharCode(65 + i),
              choice.value,
              !isLast,
            ),
          );
        });
      }
    }
  }

  return items;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateExamDocx(request: GenerateRequest): Promise<Buffer> {
  const children: Paragraph[] = [];

  // ── Header: title + subject ──
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
    // ── Part title ──
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
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 in margins
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
