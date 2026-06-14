/** Skeleton com a mesma silhueta do CommunityCard (sem layout shift). */
export function CommunityCardSkeleton() {
  return (
    <li aria-hidden="true">
      <div className="surface flex h-full flex-col overflow-hidden">
        <div className="bg-bg-subtle aspect-[16/9] animate-pulse" />
        <div className="flex flex-col gap-3 p-5">
          <div className="bg-bg-subtle h-3 w-24 animate-pulse rounded" />
          <div className="bg-bg-subtle h-5 w-2/3 animate-pulse rounded" />
          <div className="bg-bg-subtle h-3 w-full animate-pulse rounded" />
          <div className="bg-bg-subtle h-3 w-4/5 animate-pulse rounded" />
        </div>
      </div>
    </li>
  )
}

/** Grade de skeletons — reusada no fallback do Suspense e no loading.tsx. */
export function CommunityGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <CommunityCardSkeleton key={index} />
      ))}
    </ul>
  )
}
