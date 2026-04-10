import {
  Component,
  Input,
  forwardRef,
  ElementRef,
  ViewChild,
  signal,
  AfterViewInit,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

type XmlTag = 'b' | 'i' | 'var' | 'code';

const ALLOWED_TAGS: XmlTag[] = ['b', 'i', 'var', 'code'];
const TAG_LABELS: Record<XmlTag, string> = {
  b: 'Bold',
  i: 'Italic',
  var: 'Variable',
  code: 'Code',
};
const ALLOWED = 'b|i|var|code';

@Component({
  selector: 'app-xml-editor',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => XmlEditorComponent),
      multi: true,
    },
  ],
  templateUrl: './xml-editor.component.html',
  styleUrl: './xml-editor.component.scss',
})
export class XmlEditorComponent implements ControlValueAccessor, AfterViewInit {
  @Input() placeholder = '';
  @Input() rows = 3;

  @ViewChild('editableDiv') editableDiv!: ElementRef<HTMLDivElement>;
  @ViewChild('textareaEl') textareaEl!: ElementRef<HTMLTextAreaElement>;

  rawValue = '';
  /** 'rich' = formatted contenteditable, 'xml' = raw textarea */
  mode: 'rich' | 'xml' = 'rich';
  activeTag = signal<XmlTag | null>(null);
  notice = signal<string | null>(null);

  private isFocused = false;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  readonly tags = ALLOWED_TAGS;
  readonly tagLabels = TAG_LABELS;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  // ──────────────────────────────────────────────────────────
  // ControlValueAccessor
  // ──────────────────────────────────────────────────────────

  writeValue(val: string): void {
    const next = val ?? '';
    if (next === this.rawValue) return; // Avoid circular update
    this.rawValue = next;
    if (!this.isFocused) {
      this.syncDivFromRaw();
    }
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  ngAfterViewInit(): void {
    this.syncDivFromRaw();
  }

  // ──────────────────────────────────────────────────────────
  // Sync helpers
  // ──────────────────────────────────────────────────────────

  /** Push rawValue → contenteditable div (only when div exists and not focused) */
  private syncDivFromRaw(): void {
    const div = this.editableDiv?.nativeElement;
    if (!div) return;
    div.innerHTML = this.xmlToHtml(this.rawValue);
  }

  // ──────────────────────────────────────────────────────────
  // Notice helper
  // ──────────────────────────────────────────────────────────

  private showNotice(msg: string): void {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.notice.set(msg);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 5000);
  }

  // ──────────────────────────────────────────────────────────
  // XML helpers
  // ──────────────────────────────────────────────────────────

  /** Strip empty allowed-tag pairs, e.g. <b></b> or <code>  </code> */
  private stripEmptyTags(xml: string): string {
    return xml.replace(/<(b|i|var|code)>\s*<\/\1>/g, '');
  }

  /** Convert stored XML → inner HTML safe for the editable div */
  private xmlToHtml(xml: string): string {
    const safe = xml.replace(
      new RegExp(`<(?!/?(?:${ALLOWED})\\b)[^>]*>`, 'gi'),
      ''
    );
    return safe.replace(/\n/g, '<br>');
  }

  /** Serialize the editable div's DOM back to our flat-tag XML format */
  private serializeDomToXml(node: Node): string {
    let out = '';
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if ((ALLOWED_TAGS as string[]).includes(tag)) {
          // Skip elements whose text content is empty — browser leftovers
          const inner = el.textContent ?? '';
          if (inner) out += `<${tag}>${inner}</${tag}>`;
        } else if (tag === 'br') {
          out += '\n';
        } else if (tag === 'div' || tag === 'p') {
          // Browsers wrap new paragraphs in <div>/<p>
          if (out.length > 0 && !out.endsWith('\n')) out += '\n';
          out += this.serializeDomToXml(el);
        } else {
          // Unknown element (e.g. <span> from paste) — recurse for text
          out += this.serializeDomToXml(el);
        }
      }
    }
    // Browsers append a phantom <br> at end of contenteditable — trim it
    return out.replace(/\n$/, '');
  }

  // ──────────────────────────────────────────────────────────
  // Editable-div events
  // ──────────────────────────────────────────────────────────

  onDivInput(): void {
    const div = this.editableDiv?.nativeElement;
    if (!div) return;
    this.rawValue = this.stripEmptyTags(this.serializeDomToXml(div));
    this.onChange(this.rawValue);
  }

  onDivFocus(): void { this.isFocused = true; }

  onDivBlur(): void {
    this.isFocused = false;
    this.onTouched();
    this.activeTag.set(null);
  }

  onDivSelectionChange(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) { this.activeTag.set(null); return; }
    const range = selection.getRangeAt(0);
    const info = this.resolveTagRange(range);
    this.activeTag.set(info.tag);
  }

  /** Strip rich-text HTML on paste — insert plain text only */
  onDivPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    // insertText keeps cursor position correctly
    document.execCommand('insertText', false, text);
    this.onDivInput();
  }

  // ──────────────────────────────────────────────────────────
  // XML-textarea events
  // ──────────────────────────────────────────────────────────

  onTextareaInput(event: Event): void {
    const val = this.stripEmptyTags((event.target as HTMLTextAreaElement).value);
    this.rawValue = val;
    this.onChange(val);
  }

  onTextareaSelectionChange(): void {
    const el = this.textareaEl?.nativeElement;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    if (s === e) { this.activeTag.set(null); return; }
    const selected = this.rawValue.substring(s, e);
    const m = selected.match(new RegExp(`^<(${ALLOWED})>[\\s\\S]*<\\/\\1>$`));
    this.activeTag.set(m ? (m[1] as XmlTag) : null);
  }

  onTextareaBlur(): void { this.onTouched(); }

  // ──────────────────────────────────────────────────────────
  // Mode toggle
  // ──────────────────────────────────────────────────────────

  toggleMode(): void {
    if (this.mode === 'rich') {
      this.mode = 'xml';
      setTimeout(() => this.textareaEl?.nativeElement?.focus(), 0);
    } else {
      this.mode = 'rich';
      // Re-render the div from current rawValue after view updates
      setTimeout(() => {
        this.syncDivFromRaw();
        this.editableDiv?.nativeElement?.focus();
      }, 0);
    }
    this.activeTag.set(null);
  }

  // ──────────────────────────────────────────────────────────
  // Tag application
  // ──────────────────────────────────────────────────────────

  applyTag(tag: XmlTag): void {
    if (this.mode === 'rich') {
      this.applyTagContentEditable(tag);
    } else {
      this.applyTagTextarea(tag);
    }
  }

  /** Apply/toggle/replace a tag via the Selection API in the contenteditable div */
  private applyTagContentEditable(tag: XmlTag): void {
    const div = this.editableDiv?.nativeElement;
    if (!div) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) { div.focus(); return; }

    const range = selection.getRangeAt(0);
    if (range.collapsed) { div.focus(); return; }
    if (!div.contains(range.commonAncestorContainer)) return;

    const { element, tag: existingTag } = this.resolveTagRange(range);

    // Block only when the selection is partially inside ONE tag without covering it fully.
    // Selecting across multiple tags (different parents) is fine — those get stripped and rewrapped.
    if (!element) {
      const startParent = this.closestAllowedTag(range.startContainer);
      const endParent   = this.closestAllowedTag(range.endContainer);
      if (startParent && startParent === endParent) {
        this.showNotice('Selection is inside an existing tag — select the full tag to replace or remove it.');
        return;
      }
    }

    if (element) {
      if (existingTag === tag) {
        // Toggle off — replace element with its plain text
        const text = document.createTextNode(element.textContent ?? '');
        element.replaceWith(text);
        const r = document.createRange();
        r.selectNode(text);
        selection.removeAllRanges();
        selection.addRange(r);
      } else {
        // Replace tag — same inner content, different wrapping element
        const newEl = document.createElement(tag);
        newEl.textContent = element.textContent ?? '';
        element.replaceWith(newEl);
        const r = document.createRange();
        r.selectNode(newEl);
        selection.removeAllRanges();
        selection.addRange(r);
      }
    } else {
      // General case: grab plain text of selection, wrap with tag
      const plain = range.toString();
      range.deleteContents();
      const newEl = document.createElement(tag);
      newEl.textContent = plain;
      range.insertNode(newEl);
      const r = document.createRange();
      r.selectNode(newEl);
      selection.removeAllRanges();
      selection.addRange(r);
    }

    // Sync DOM → XML (strip any empty tags produced by the edit), then refresh active-tag indicator
    this.rawValue = this.stripEmptyTags(this.serializeDomToXml(div));
    this.onChange(this.rawValue);
    this.onDivSelectionChange();
  }

  /** Apply/toggle/replace a tag in the raw XML textarea */
  private applyTagTextarea(tag: XmlTag): void {
    const el = this.textareaEl?.nativeElement;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;

    const selected = this.rawValue.substring(start, end);
    let replacement: string;

    const exactMatch = selected.match(
      new RegExp(`^<(${ALLOWED})>([\\s\\S]*)<\\/\\1>$`)
    );

    // Block if the selection is entirely inside an existing tag (without fully covering it)
    if (!exactMatch) {
      const startTag = this.tagAtPosition(start);
      const endTag   = this.tagAtPosition(end);
      if (startTag && startTag === endTag) {
        this.showNotice('Selection is inside an existing tag — select the full tag to replace or remove it.');
        el.focus();
        return;
      }
    }

    if (exactMatch) {
      const [, existingTag, inner] = exactMatch;
      replacement = existingTag === tag
        ? inner                                   // toggle off
        : `<${tag}>${inner}</${tag}>`;            // replace tag
    } else {
      const plain = selected.replace(/<[^>]+>/g, '');
      replacement = `<${tag}>${plain}</${tag}>`;  // wrap
    }

    const before = this.rawValue.substring(0, start);
    const after = this.rawValue.substring(end);
    this.rawValue = this.stripEmptyTags(before + replacement + after);
    this.onChange(this.rawValue);
    this.onTouched();

    setTimeout(() => {
      el.selectionStart = start;
      el.selectionEnd = start + replacement.length;
      el.focus();
      this.onTextareaSelectionChange();
    }, 0);
  }

  // ──────────────────────────────────────────────────────────
  // Selection helpers
  // ──────────────────────────────────────────────────────────

  /**
   * Checks whether the given range corresponds exactly to one of our allowed tag elements.
   * "Exactly" means: the entire text content of the element is selected.
   */
  private resolveTagRange(range: Range): { element: Element | null; tag: XmlTag | null } {
    const startParent = this.closestAllowedTag(range.startContainer);
    const endParent = this.closestAllowedTag(range.endContainer);

    // Both ends within the same allowed element
    if (startParent && startParent === endParent
        && range.toString() === (startParent.textContent ?? '')) {
      return {
        element: startParent,
        tag: startParent.tagName.toLowerCase() as XmlTag,
      };
    }

    // Common ancestor IS an allowed element and the whole text is selected
    if (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
      const el = range.commonAncestorContainer as Element;
      const t = el.tagName.toLowerCase();
      if ((ALLOWED_TAGS as string[]).includes(t)
          && range.toString() === (el.textContent ?? '')) {
        return { element: el, tag: t as XmlTag };
      }
    }

    return { element: null, tag: null };
  }

  /**
   * Returns the tag name if character position `pos` inside `rawValue` is between
   * an unclosed opening tag and its closing tag, otherwise null.
   * Used to guard the textarea path against nested-tag attempts.
   */
  private tagAtPosition(pos: number): XmlTag | null {
    const before = this.rawValue.substring(0, pos);
    for (const tag of ALLOWED_TAGS) {
      const lastOpen  = before.lastIndexOf(`<${tag}>`);
      if (lastOpen === -1) continue;
      const lastClose = before.lastIndexOf(`</${tag}>`);
      if (lastClose < lastOpen) return tag; // Unclosed tag before pos
    }
    return null;
  }

  /** Walk up DOM from `node` to find the nearest ancestor that is one of our allowed tags */
  private closestAllowedTag(node: Node): Element | null {
    const boundary = this.editableDiv?.nativeElement;
    let cur: Node | null = node;
    while (cur && cur !== boundary) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        const t = (cur as Element).tagName.toLowerCase();
        if ((ALLOWED_TAGS as string[]).includes(t)) return cur as Element;
      }
      cur = cur.parentNode;
    }
    return null;
  }
}
