import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TopicResponse {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicRequest {
  name: string;
  description: string;
  subjectId: string;
}

@Injectable({ providedIn: 'root' })
export class TopicService {
  private readonly apiUrl = 'http://localhost:8080/api/topics';

  constructor(private http: HttpClient) {}

  getBySubjectId(subjectId: string): Observable<TopicResponse[]> {
    return this.http.get<TopicResponse[]>(`${this.apiUrl}/subject/${subjectId}`);
  }

  getAll(): Observable<TopicResponse[]> {
    return this.http.get<TopicResponse[]>(this.apiUrl);
  }

  create(request: TopicRequest): Observable<TopicResponse> {
    return this.http.post<TopicResponse>(this.apiUrl, request);
  }

  update(id: string, request: TopicRequest): Observable<TopicResponse> {
    return this.http.put<TopicResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
