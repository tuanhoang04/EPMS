import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TemplateResponse {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePage {
  content: TemplateResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface TemplatePartDifficultyRequest {
  difficulty: string;
  difficultyValue: number;
}

export interface TemplatePartRequest {
  title: string;
  numberOfQuestions: number;
  questionType: string | null;
  topicIds: string[];
  difficulties: TemplatePartDifficultyRequest[];
}

export interface TemplateRequest {
  title: string;
  subjectId: string;
  parts: TemplatePartRequest[];
}

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly apiUrl = 'http://localhost:8080/api/templates';

  constructor(private http: HttpClient) {}

  getAll(subjectId?: string, page: number = 0, size: number = 10): Observable<TemplatePage> {
    let params = new HttpParams();
    if (subjectId) params = params.set('subjectId', subjectId);
    params = params.set('page', page.toString());
    params = params.set('size', size.toString());

    return this.http.get<TemplatePage>(this.apiUrl, { params });
  }

  getById(id: string): Observable<TemplateResponse> {
    return this.http.get<TemplateResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: TemplateRequest): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(this.apiUrl, request);
  }

  update(id: string, request: TemplateRequest): Observable<TemplateResponse> {
    return this.http.put<TemplateResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
