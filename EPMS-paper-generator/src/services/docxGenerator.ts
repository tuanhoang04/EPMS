import {
  AlignmentType,
  Document,
  ImageRun,
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
const PRINTABLE_HEIGHT_TWIPS = 13958; // 16838 - 1440*2
const COL_WIDTH_TWIPS = Math.floor(PRINTABLE_WIDTH_TWIPS * (COL_WIDTH / 100)); // ~2256
const CHARS_PER_LINE = 90;
const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');

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

// ── Image helpers ─────────────────────────────────────────────────────────────

function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: 8-byte signature then IHDR (4 len + 4 type + 4 width + 4 height)
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: starts with FF D8, then scan for SOF marker
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xda) break; // Start of scan — no more headers
      const segLen = buf.readUInt16BE(offset + 2);
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + segLen;
    }
  }

  return null;
}

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
    let b64: string;
    let type: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';

    if (dataUrl.includes(',')) {
      const comma = dataUrl.indexOf(',');
      const header = dataUrl.slice(0, comma);
      b64 = dataUrl.slice(comma + 1);
      if (header.includes('image/jpeg') || header.includes('image/jpg')) type = 'jpg';
      else if (header.includes('image/gif')) type = 'gif';
      else if (header.includes('image/bmp')) type = 'bmp';
      else type = 'png';
    } else {
      b64 = dataUrl;
    }

    const buf = Buffer.from(b64, 'base64');
    const dims = getImageDimensions(buf);
    if (!dims || dims.width === 0 || dims.height === 0) return null;

    const { width, height } = calcImageSize(dims.width, dims.height, MAX_IMG_W, MAX_IMG_H);

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
      keepNext: hasImage || hasChoices,
      spacing: { after: 80 },
    }),
  );

  if (hasImage) {
    const imgParagraph = createImageParagraph(question.questionImageBase64!, hasChoices);
    if (imgParagraph) {
      items.push(imgParagraph);
    }
  }

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