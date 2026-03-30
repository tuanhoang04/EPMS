import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubjectResponse {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRequest {
  name: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly apiUrl = 'http://localhost:8080/api/subjects';

  constructor(private http: HttpClient) {}

  getAll(): Observable<SubjectResponse[]> {
    return this.http.get<SubjectResponse[]>(this.apiUrl);
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
