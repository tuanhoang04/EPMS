import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  EASY = 'EASY',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export interface QuestionResponse {
  id: string;
  questionText: string;
  questionAnswer: string;
  questionChoices: string;
  questionImageBase64: string;
  difficulty: Difficulty;
  questionType: string;
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionPage {
  content: QuestionResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly apiUrl = 'http://localhost:8080/api/questions';

  constructor(private http: HttpClient) {}

  getAll(subjectId?: string, topicId?: string, difficulty?: string, page: number = 0, size: number = 10): Observable<QuestionPage> {
    let params = new HttpParams();
    if (subjectId) params = params.set('subjectId', subjectId);
    if (topicId) params = params.set('topicId', topicId);
    if (difficulty) params = params.set('difficulty', difficulty);
    params = params.set('page', page.toString());
    params = params.set('size', size.toString());

    return this.http.get<QuestionPage>(this.apiUrl, { params });
  }

  getById(id: string): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: {
    questionText: string;
    questionAnswer: string | null;
    questionChoices: string | null;
    questionImageBase64: string | null;
    difficulty: string;
    questionType: string;
    topicId: string;
  }): Observable<QuestionResponse> {
    return this.http.post<QuestionResponse>(this.apiUrl, request);
  }

  update(id: string, request: {
    questionText: string;
    questionAnswer: string | null;
    questionChoices: string | null;
    questionImageBase64: string | null;
    difficulty: string;
    questionType: string;
    topicId: string;
  }): Observable<QuestionResponse> {
    return this.http.put<QuestionResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
