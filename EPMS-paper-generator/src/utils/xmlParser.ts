export interface TextSegment {
  text: string;
  bold?: boolean;
  italics?: boolean;
  font?: string;
}

interface ParsedStyle {
  bold: boolean;
  italics: boolean;
  font: string | null;
}

type Token =
  | { type: 'text'; value: string }
  | { type: 'open'; tag: string }
  | { type: 'close'; tag: string };

function decodeEntity(entity: string): string | null {
  switch (entity) {
    case 'amp': return '&';
    case 'lt': return '<';
    case 'gt': return '>';
    case 'nbsp': return '\u00A0';
    case 'quot': return '"';
    case 'apos': return "'";
    default: return null;
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let currentText = '';

  const flushText = () => {
    if (currentText) {
      tokens.push({ type: 'text', value: currentText });
      currentText = '';
    }
  };

  while (i < input.length) {
    const ch = input[i]!;

    if (ch === '&') {
      const semicolonIdx = input.indexOf(';', i);
      if (semicolonIdx !== -1) {
        const entity = input.substring(i + 1, semicolonIdx);
        const decoded = decodeEntity(entity);
        if (decoded !== null) {
          currentText += decoded;
          i = semicolonIdx + 1;
          continue;
        }
      }
      currentText += ch;
      i++;
    } else if (ch === '<') {
      const tagEnd = input.indexOf('>', i);
      if (tagEnd === -1) {
        currentText += ch;
        i++;
        continue;
      }

      flushText();

      const tagContent = input.substring(i + 1, tagEnd).trim();
      if (tagContent.startsWith('/')) {
        tokens.push({ type: 'close', tag: tagContent.substring(1).trim() });
      } else {
        // Take only the tag name (ignore attributes)
        const tagName = tagContent.split(/\s+/)[0] ?? tagContent;
        tokens.push({ type: 'open', tag: tagName });
      }

      i = tagEnd + 1;
    } else {
      currentText += ch;
      i++;
    }
  }

  flushText();
  return tokens;
}

function applyTag(tag: string, style: ParsedStyle): ParsedStyle {
  switch (tag) {
    case 'b':
      return { ...style, bold: true };
    case 'i':
      return { ...style, italics: true };
    case 'var':
      return { ...style, italics: true, font: 'Courier New' };
    case 'code':
      return { ...style, font: 'Courier New' };
    default:
      return style;
  }
}

export function parseXml(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const styleStack: ParsedStyle[] = [{ bold: false, italics: false, font: null }];

  const currentStyle = (): ParsedStyle =>
    styleStack[styleStack.length - 1] ?? { bold: false, italics: false, font: null };

  for (const token of tokenize(text)) {
    if (token.type === 'text') {
      if (!token.value) continue;
      const style = currentStyle();
      const segment: TextSegment = { text: token.value };
      if (style.bold) segment.bold = true;
      if (style.italics) segment.italics = true;
      if (style.font) segment.font = style.font;
      segments.push(segment);
    } else if (token.type === 'open') {
      styleStack.push(applyTag(token.tag, currentStyle()));
    } else {
      if (styleStack.length > 1) styleStack.pop();
    }
  }

  return segments;
}

export function getPlainText(text: string): string {
  return parseXml(text)
    .map((s) => s.text)
    .join('');
}
