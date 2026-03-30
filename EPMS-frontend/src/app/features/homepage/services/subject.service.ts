import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubjectResponse {
  id: string;
  name: string;
  description: string;
  topicCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectPage {
  content: SubjectResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface SubjectRequest {
  name: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly apiUrl = 'http://localhost:8080/api/subjects';

  constructor(private http: HttpClient) {}

  getAll(pageIndex: number, pageSize: number): Observable<SubjectPage> {
    const params = new HttpParams()
      .set('pageIndex', pageIndex)
      .set('pageSize', pageSize);
    return this.http.get<SubjectPage>(this.apiUrl, { params });
  }

  create(request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.post<SubjectResponse>(this.apiUrl, request);
  }

  update(id: string, request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.put<SubjectResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
