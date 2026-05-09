import * as fs from 'fs';
import * as path from 'path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  TabStopType,
} from 'docx';
import sizeOf from 'image-size';
import type { GenerateRequest, QuestionChoice, QuestionData } from '../types';
import { getPlainText, parseXml } from '../utils/xmlParser';
import type { TextSegment } from '../utils/xmlParser';

const FONT = 'Times New Roman';
const QUESTION_HEADER_SIZE = 24;
const QUESTION_TEXT_SIZE = 24;
const CHOICE_SIZE = 22;
const COL_WIDTH = 25; // percent
const PRINTABLE_WIDTH_TWIPS = 9746; // 11906 - 1080*2
const PRINTABLE_HEIGHT_TWIPS = 14678; // 16838 - 1080*2
const COL_WIDTH_TWIPS = Math.floor(PRINTABLE_WIDTH_TWIPS * (COL_WIDTH / 100)); // ~2436
const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');

// ── Times New Roman glyph widths (Adobe Type 1, 1000 units/em) ───────────────
// Built-in fallback covering ASCII + punctuation. Merged at startup with
// data/times-roman-widths.json (generated from Times-Roman.afm) which adds
// the full 315-glyph set including accented and extended characters.
const BUILTIN_TNR_WIDTHS: Readonly<Record<string, number>> = {
  ' ': 250, '!': 333, '"': 408, '#': 500, '$': 500, '%': 833, '&': 778, "'": 333,
  '(': 333, ')': 333, '*': 500, '+': 564, ',': 250, '-': 333, '.': 250, '/': 278,
  '0': 500, '1': 500, '2': 500, '3': 500, '4': 500,
  '5': 500, '6': 500, '7': 500, '8': 500, '9': 500,
  ':': 278, ';': 278, '<': 564, '=': 564, '>': 564, '?': 444, '@': 921,
  'A': 722, 'B': 667, 'C': 667, 'D': 722, 'E': 611, 'F': 556, 'G': 722,
  'H': 722, 'I': 333, 'J': 389, 'K': 722, 'L': 611, 'M': 889, 'N': 722,
  'O': 722, 'P': 556, 'Q': 722, 'R': 667, 'S': 556, 'T': 611, 'U': 722,
  'V': 722, 'W': 944, 'X': 722, 'Y': 722, 'Z': 611,
  '[': 333, '\\': 278, ']': 333, '^': 469, '_': 500, '`': 333,
  'a': 444, 'b': 500, 'c': 444, 'd': 500, 'e': 444, 'f': 333, 'g': 500,
  'h': 500, 'i': 278, 'j': 278, 'k': 500, 'l': 278, 'm': 778, 'n': 500,
  'o': 500, 'p': 500, 'q': 500, 'r': 333, 's': 389, 't': 278, 'u': 500,
  'v': 500, 'w': 722, 'x': 500, 'y': 500, 'z': 444,
  '{': 480, '|': 200, '}': 480, '~': 541,
  '\u2003': 1000, // em space
};

function loadGlyphWidths(): Readonly<Record<string, number>> {
  try {
    const jsonPath = path.resolve(__dirname, '../../data/times-roman-widths.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const glyphs = raw?.glyphs;
    if (typeof glyphs === 'object' && glyphs !== null && Object.keys(glyphs).length >= 50) {
      return Object.freeze({ ...BUILTIN_TNR_WIDTHS, ...glyphs });
    }
  } catch {
    // JSON absent or malformed — silent fallback
  }
  return BUILTIN_TNR_WIDTHS;
}

const TNR_WIDTHS = loadGlyphWidths();

/**
 * Estimates the rendered width of plain text in twips for Times New Roman.
 * sizeHalfPts is the docx half-point size (e.g. 22 = 11 pt).
 */
function estimateWidthTwips(text: string, sizeHalfPts: number): number {
  const emTwips = (sizeHalfPts / 2) * 20; // 1 pt = 20 twips
  let units = 0;
  for (const ch of text) {
    units += TNR_WIDTHS[ch] ?? 500;
  }
  return (units / 1000) * emTwips;
}

// Image size constraints (docx transformation units: 1 unit = 1/100 inch = 1440/100 twips)
const TWIPS_PER_IMG_UNIT = 1440 / 100;
const MAX_IMAGE_WIDTH_PCT = 85;  // % of printable width
const MAX_IMAGE_HEIGHT_PCT = 45; // % of printable height
const MAX_IMG_W = Math.floor(PRINTABLE_WIDTH_TWIPS / TWIPS_PER_IMG_UNIT * MAX_IMAGE_WIDTH_PCT / 100);
const MAX_IMG_H = Math.floor(PRINTABLE_HEIGHT_TWIPS / TWIPS_PER_IMG_UNIT * MAX_IMAGE_HEIGHT_PCT / 100);

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
    indent: { left: 0, firstLine: 0 },
    keepNext,
    spacing: { after: 60 },
  });
}

// ── Image helpers ─────────────────────────────────────────────────────────────

function calcImageSize(
  origW: number,
  origH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  // Try fitting to maxW, height proportional
  const heightAtMaxW = Math.round((origH / origW) * maxW);
  if (heightAtMaxW <= maxH) {
    return { width: maxW, height: heightAtMaxW };
  }
  // Height overflows — fit to maxH, width proportional
  return { width: Math.round((origW / origH) * maxH), height: maxH };
}

function createImageParagraph(dataUrl: string, keepNext: boolean): Paragraph | null {
  try {
    const b64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
    const buf = Buffer.from(b64, 'base64');

    const info = sizeOf(buf);
    if (!info.width || !info.height) return null;

    const type = info.type as 'png' | 'jpg' | 'gif' | 'bmp';
    const { width, height } = calcImageSize(info.width, info.height, MAX_IMG_W, MAX_IMG_H);

    return new Paragraph({
      children: [
        new ImageRun({ type, data: buf, transformation: { width, height } }),
      ],
      alignment: AlignmentType.CENTER,
      keepNext,
      spacing: { before: 80, after: 120 },
    });
  } catch {
    return null;
  }
}

// ── Question block ────────────────────────────────────────────────────────────

function createQuestionBlock(index: number, question: QuestionData): Paragraph[] {
  const items: Paragraph[] = [];

  const isMultipleChoice =
    question.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' ||
    question.questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE';
  const isTrueFalse = question.questionType === 'TRUE_FALSE';
  const hasChoices = isMultipleChoice || isTrueFalse;
  const hasImage = !!(question.questionImageBase64?.trim());
  const isAnswerLine =
    question.questionType === 'SHORT_ANSWER' || question.questionType === 'GAP_FILLING';
  const answerLines = isAnswerLine ? Math.max(1, question.answerLines ?? 1) : 0;

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
      keepNext: hasImage || hasChoices || isAnswerLine,
      spacing: { after: 80 },
    }),
  );

  if (hasImage) {
    const imgParagraph = createImageParagraph(question.questionImageBase64!, hasChoices);
    if (imgParagraph) {
      items.push(imgParagraph);
    }
  }

  if (isTrueFalse && question.questionChoices) {
    try {
      const tfChoices = JSON.parse(question.questionChoices) as QuestionChoice[];
      items.push(choiceTabLine(tfChoices, ['A', 'B']));
    } catch { /* ignore malformed data */ }
  } else if (isMultipleChoice && question.questionChoices) {
    let choices: QuestionChoice[] = [];
    try {
      choices = (JSON.parse(question.questionChoices) as QuestionChoice[]).filter((c) => c.value.trim());
    } catch { /* ignore */ }

    if (choices.length > 0) {
      const labels = choices.map((_, i) => CHOICE_LABELS[i] ?? String.fromCharCode(65 + i));
      const maxChoiceWidthTwips = Math.max(...choices.map((c, i) => {
        const label = `${labels[i] ?? String.fromCharCode(65 + i)}. `;
        return estimateWidthTwips(label, CHOICE_SIZE) + estimateWidthTwips(getPlainText(c.value), CHOICE_SIZE);
      }));

      if (choices.length <= 4 && maxChoiceWidthTwips <= COL_WIDTH_TWIPS * 0.92) {
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

  if (answerLines > 0) {
    for (let i = 0; i < answerLines; i++) {
      items.push(
        new Paragraph({
          children: [new TextRun({ text: '', font: FONT, size: QUESTION_TEXT_SIZE })],
          border: {
            bottom: { style: BorderStyle.DOTTED, size: 6, color: '000000', space: 1 },
          },
          spacing: { before: 200, after: 120 },
        }),
      );
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
    if (request.parts.length > 1) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: part.title, font: FONT, size: 28, bold: true })],
          spacing: { before: 240, after: 180 },
        }),
      );
    }
    for (const question of part.questions) {
      children.push(...createQuestionBlock(questionIndex++, question));
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