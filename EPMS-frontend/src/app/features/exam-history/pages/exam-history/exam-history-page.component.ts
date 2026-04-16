import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { XmlRenderPipe } from '../../../../shared/pipes/xml-render.pipe';
import {
  ExamHistoryService,
  ExamHistoryResponse,
  PaperGenRequest,
  PaperGenPartDto,
  PaperGenQuestionDto
} from '../../services/exam-history.service';

interface ChoiceItem {
  label: string;
  value: string;
}

interface QuestionView {
  index: number;
  text: string;
  type: string;
  imageBase64: string | null;
  choices: ChoiceItem[];
}

interface PartView {
  title: string;
  questions: QuestionView[];
}

interface PaperView {
  title: string;
  subject: string;
  parts: PartView[];
}

const CHOICE_LABELS = 'ABCDEFGHIJ'.split('');

@Component({
  selector: 'app-exam-history-page',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BottomNavComponent, XmlRenderPipe],
  templateUrl: './exam-history-page.component.html',
  styleUrl: './exam-history-page.component.scss',
})
export class ExamHistoryPage implements OnInit {
  historyList = signal<ExamHistoryResponse[]>([]);
  loading = signal(true);
  selectedHistory = signal<ExamHistoryResponse | null>(null);
  selectedPaper = signal<PaperView | null>(null);
  downloading = signal<string | null>(null);
  deleting = signal<string | null>(null);

  constructor(private examHistoryService: ExamHistoryService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.examHistoryService.getMyHistory().subscribe({
      next: (data) => {
        this.historyList.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openPreview(history: ExamHistoryResponse) {
    const paper = this.examHistoryService.parsePaperGenRequest(history.rawText);
    if (!paper) return;

    this.selectedHistory.set(history);
    this.selectedPaper.set(this.buildPaperView(paper));
  }

  closePreview() {
    this.selectedHistory.set(null);
    this.selectedPaper.set(null);
  }

  download(history: ExamHistoryResponse, event: Event) {
    event.stopPropagation();
    if (this.downloading()) return;
    this.downloading.set(history.id);

    this.examHistoryService.download(history.id).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${history.title}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloading.set(null),
    });
  }

  downloadSelected() {
    const history = this.selectedHistory();
    if (!history || this.downloading()) return;
    this.downloading.set(history.id);

    this.examHistoryService.download(history.id).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${history.title}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloading.set(null),
    });
  }

  delete(history: ExamHistoryResponse, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete "${history.title}"?`)) return;
    this.deleting.set(history.id);

    this.examHistoryService.delete(history.id).subscribe({
      next: () => {
        this.deleting.set(null);
        if (this.selectedHistory()?.id === history.id) {
          this.closePreview();
        }
        this.historyList.update(list => list.filter(h => h.id !== history.id));
      },
      error: () => this.deleting.set(null),
    });
  }

  private buildPaperView(paper: PaperGenRequest): PaperView {
    let questionIndex = 1;
    const parts: PartView[] = paper.parts.map((part: PaperGenPartDto) => ({
      title: part.title,
      questions: part.questions.map((q: PaperGenQuestionDto) => {
        const view: QuestionView = {
          index: questionIndex++,
          text: q.questionText,
          type: q.questionType,
          imageBase64: q.questionImageBase64 ?? null,
          choices: this.buildChoices(q),
        };
        return view;
      }),
    }));

    return { title: paper.title, subject: paper.subject, parts };
  }

  private buildChoices(q: PaperGenQuestionDto): ChoiceItem[] {
    if (q.questionType === 'TRUE_FALSE') {
      if (!q.questionChoices) return [];
      try {
        const parsed: { value: string }[] = JSON.parse(q.questionChoices);
        return parsed.map((c, i) => ({ label: CHOICE_LABELS[i] ?? String.fromCharCode(65 + i), value: c.value }));
      } catch {
        return [];
      }
    }
    if (
      q.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' ||
      q.questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE'
    ) {
      if (!q.questionChoices) return [];
      try {
        const parsed: { value: string }[] = JSON.parse(q.questionChoices);
        return parsed
          .filter(c => c.value.trim())
          .map((c, i) => ({ label: CHOICE_LABELS[i] ?? String.fromCharCode(65 + i), value: c.value }));
      } catch {
        return [];
      }
    }
    return [];
  }

  useTabLayout(choices: ChoiceItem[]): boolean {
    if (choices.length > 4) return false;
    // Matches docxGenerator: estimateChoiceLength = label.length + 2 + plain.length
    // threshold = CHARS_PER_LINE * COL_WIDTH / 100 = 90 * 0.25 = 22.5
    const maxLen = Math.max(...choices.map(c => c.label.length + 2 + c.value.length));
    return maxLen <= 22.5;
  }
}
