import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import type {
  BoardDetailDto,
  BoardSummaryDto,
  CreateBoardPayload,
  InviteLinkDto,
  PaginatedResult,
} from './models/board.models';

@Injectable({ providedIn: 'root' })
export class BoardsService {
  private readonly http = inject(HttpClient);

  create(payload: CreateBoardPayload): Observable<BoardDetailDto> {
    return this.http.post<BoardDetailDto>(`${environment.apiUrl}/boards`, payload);
  }

  list(page = 1, limit = 20): Observable<PaginatedResult<BoardSummaryDto>> {
    return this.http.get<PaginatedResult<BoardSummaryDto>>(`${environment.apiUrl}/boards`, {
      params: { page, limit },
    });
  }

  bySlug(slug: string): Observable<BoardDetailDto> {
    return this.http.get<BoardDetailDto>(`${environment.apiUrl}/boards/${slug}`);
  }

  archive(boardId: string): Observable<BoardDetailDto> {
    return this.http.patch<BoardDetailDto>(`${environment.apiUrl}/boards/${boardId}/archive`, {});
  }

  createInvite(boardId: string): Observable<InviteLinkDto> {
    return this.http.post<InviteLinkDto>(`${environment.apiUrl}/boards/${boardId}/invite`, {});
  }

  revokeInvite(boardId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/boards/${boardId}/invite`);
  }

  acceptInvite(token: string): Observable<BoardDetailDto> {
    return this.http.post<BoardDetailDto>(`${environment.apiUrl}/invitations/accept`, { token });
  }
}
