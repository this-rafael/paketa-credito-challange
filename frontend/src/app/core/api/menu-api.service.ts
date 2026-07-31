import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMenuItemRequest,
  CreateMenuItemResponse,
  MenuItem,
} from '../models/menu';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/menu`;

  getMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(this.baseUrl);
  }

  createItem(body: CreateMenuItemRequest): Observable<CreateMenuItemResponse> {
    return this.http.post<CreateMenuItemResponse>(this.baseUrl, body);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
