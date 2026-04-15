import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const ALLOWED = 'b|i|var|code';

/**
 * Renders a stored XML string (containing <b>, <i>, <var>, <code> tags)
 * as sanitised HTML for display in question cards and other read-only contexts.
 *
 * Any tag that is NOT in the allowed list is stripped before rendering.
 */
@Pipe({
  name: 'xmlRender',
  standalone: true,
  pure: true,
})
export class XmlRenderPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const safe = value.replace(
      new RegExp(`<(?!/?(?:${ALLOWED})\\b)[^>]*>`, 'gi'),
      ''
    );
    return this.sanitizer.bypassSecurityTrustHtml(safe.replace(/\n/g, '<br>'));
  }
}
