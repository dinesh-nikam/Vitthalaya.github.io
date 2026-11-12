export default function BooksLoading() {
  return (
    <div
      role="status"
      aria-label="पुस्तके लोड होत आहेत"
      className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 animate-pulse"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-foreground/20 rounded-lg" />
            <div className="h-5 w-80 max-w-full bg-foreground/10 rounded" />
          </div>
          <div className="h-11 w-44 bg-saffron/20 rounded-xl" />
        </div>

        {/* Filter Chips Skeleton */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 bg-card rounded-xl border border-border shadow-xs"
            />
          ))}
        </div>

        {/* Book Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col"
            >
              {/* Book Cover Placeholder */}
              <div className="aspect-[3/4] w-full bg-foreground/10 flex items-center justify-center">
                <div className="w-12 h-16 bg-muted rounded-md" />
              </div>

              {/* Book Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-saffron/20 rounded-full" />
                  <div className="h-6 w-4/5 bg-foreground/20 rounded" />
                  <div className="h-4 w-3/5 bg-foreground/10 rounded" />
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="h-5 w-16 bg-foreground/15 rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">पुस्तके लोड होत आहेत...</span>
    </div>
  );
}
