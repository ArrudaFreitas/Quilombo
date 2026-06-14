import { CommunityGridSkeleton } from '@/components/community-card-skeleton'

export default function Loading() {
  return (
    <div className="container-page py-10 md:py-16">
      <p className="sr-only" role="status">
        Carregando comunidades…
      </p>
      <CommunityGridSkeleton count={6} />
    </div>
  )
}
