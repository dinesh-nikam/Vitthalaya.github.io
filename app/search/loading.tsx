export default function SearchLoading() {
  return (
    <div
      role="status"
      aria-label="शोध पृष्ठ लोड होत आहे"
      className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 animate-pulse"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Header & Input Skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-44 bg-foreground/20 rounded-lg" />
          <div className="h-4 w-72 bg-foreground/10 rounded" />
          <div className="h-14 w-full bg-card rounded-2xl border border-border shadow-sm flex items-center px-4 gap-3">
            <div className="w-5 h-5 rounded-full bg-muted" />
            <div className="h-5 w-48 bg-muted/70 rounded" />
          </div>
        </div>

        {/* Filter Chips Skeleton */}
        <div className="flex flex-wrap gap-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 bg-card rounded-full border border-border shadow-xs"
            />
          ))}
        </div>

        {/* Filter Dropdowns Skeleton */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-sm flex flex-wrap gap-3">
          <div className="h-10 w-36 bg-muted rounded-xl" />
          <div className="h-10 w-36 bg-muted rounded-xl" />
          <div className="h-10 w-36 bg-muted rounded-xl" />
          <div className="h-10 w-28 bg-muted rounded-xl" />
        </div>

        {/* Search Results List Skeleton */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted/60 rounded" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-saffron/20 rounded-full" />
                  <div className="h-5 w-24 bg-muted rounded-full" />
                </div>
                <div className="h-4 w-12 bg-muted/60 rounded" />
              </div>

              <div className="h-7 w-3/5 bg-foreground/15 rounded-md" />
              <div className="space-y-1.5 pt-1">
                <div className="h-4 w-11/12 bg-foreground/10 rounded" />
                <div className="h-4 w-4/5 bg-foreground/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">शोध निकाल लोड होत आहेत...</span>
    </div>
  );
}
