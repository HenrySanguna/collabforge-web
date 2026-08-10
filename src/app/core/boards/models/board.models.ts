export type BoardPhase = 'COLLECTING' | 'GROUPING' | 'VOTING' | 'DISCUSSING';
export type BoardRole = 'owner' | 'member';

export interface BoardColumnDto {
  id: string;
  title: string;
  color: string;
  position: number;
}

export interface BoardSummaryDto {
  id: string;
  slug: string;
  title: string;
  phase: BoardPhase;
  isArchived: boolean;
  myRole: BoardRole;
  createdAt: string;
  updatedAt: string;
}

export interface BoardDetailDto extends BoardSummaryDto {
  ownerId: string;
  revealed: boolean;
  voteBudget: number;
  allowMultiVote: boolean;
  liveTally: boolean;
  columns: BoardColumnDto[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface InviteLinkDto {
  token: string;
  expiresAt: string;
}

export interface CreateBoardPayload {
  title: string;
  templateKey: string;
}
