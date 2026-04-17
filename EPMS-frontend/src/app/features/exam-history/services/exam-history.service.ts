import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaperGenQuestionDto {
  id: string;
  questionText: string;
  questionType: string;
  questionChoices: string | null;
  questionAnswer: string | null;
  difficulty: string;
  answerLines: number;
  questionImagePath: string | null;
}

export interface PaperGenPartDto {
  title: string;
  questions: PaperGenQuestionDto[];
}

export interface PaperGenRequest {
  title: string;
  subject: string;
  parts: PaperGenPartDto[];
}

export interface ExamHistoryResponse {
  id: string;
  title: string;
  description: string | null;
  rawText: string;
  templateId: string;
  templateTitle: string;
  createdAt: string;
}

export interface ExamHistoryPageData {
  content: ExamHistoryResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class ExamHistoryService {
  private readonly apiUrl = 'http://localhost:8080/api/exam-history';

  constructor(private http: HttpClient) {}

  getMyHistory(page = 0, size = 10): Observable<ExamHistoryPageData> {
    return this.http.get<ExamHistoryPageData>(this.apiUrl, { params: { page, size } });
  }

  download(id: string): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/${id}/download`, {}, { responseType: 'blob' });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  parsePaperGenRequest(rawText: string): PaperGenRequest | null {
    try {
      return JSON.parse(rawText) as PaperGenRequest;
    } catch {
      return null;
    }
  }
}
