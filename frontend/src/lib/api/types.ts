export interface PageMeta {
  size: number
  number: number
  totalElements: number
  totalPages: number
}

export interface ApiMeta {
  timestamp: string
  page: PageMeta | null
}

export interface ApiResponse<T> {
  data: T
  meta: ApiMeta
}

export interface CommunityCard {
  slug: string
  name: string
  location: string
  imageUrl: string | null
  shortDescription: string | null
}
