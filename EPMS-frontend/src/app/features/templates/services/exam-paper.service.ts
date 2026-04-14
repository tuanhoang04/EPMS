import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExamPaperService {
  private readonly apiUrl = 'http://localhost:8080/api/exam-papers';

  constructor(private http: HttpClient) {}

  generate(templateId: string, title?: string): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/generate`,
      { templateId, title: title ?? null },
      { responseType: 'blob' },
    );
  }
}
