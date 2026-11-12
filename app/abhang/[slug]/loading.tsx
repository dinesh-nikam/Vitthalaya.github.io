export default function AbhangLoading() {
  return (
    <div
      role="status"
      aria-label="अभंग लोड होत आहे"
      className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 animate-pulse"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-4 bg-muted/50 rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-4 bg-muted/50 rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>

        {/* Composition Header Card Skeleton */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-6 w-20 bg-saffron/20 rounded-full" />
            <div className="h-6 w-28 bg-muted rounded-full" />
          </div>

          {/* Title Marathi */}
          <div className="h-10 w-3/4 max-w-lg bg-foreground/15 rounded-lg" />
          {/* Title Transliteration */}
          <div className="h-5 w-1/2 max-w-sm bg-foreground/10 rounded" />

          {/* Audio bar placeholder */}
          <div className="mt-6 pt-6 border-t border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-saffron/20" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-2 w-1/3 bg-muted/70 rounded" />
            </div>
          </div>
        </div>

        {/* Lyrics Reader Skeleton */}
        <div className="bg-card rounded-2xl p-6 sm:p-10 border border-border shadow-sm space-y-8 text-center">
          {/* Verse 1 */}
          <div className="space-y-3 max-w-md mx-auto">
            <div className="h-6 w-5/6 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-4/5 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-3/4 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-4/5 bg-foreground/15 rounded mx-auto" />
          </div>

          <div className="w-16 h-0.5 bg-saffron/30 mx-auto" />

          {/* Verse 2 */}
          <div className="space-y-3 max-w-md mx-auto">
            <div className="h-6 w-4/5 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-3/4 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-5/6 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-2/3 bg-foreground/15 rounded mx-auto" />
          </div>

          <div className="w-16 h-0.5 bg-saffron/30 mx-auto" />

          {/* Verse 3 */}
          <div className="space-y-3 max-w-md mx-auto">
            <div className="h-6 w-3/4 bg-foreground/15 rounded mx-auto" />
            <div className="h-6 w-4/5 bg-foreground/15 rounded mx-auto" />
          </div>
        </div>

        {/* Action Controls Skeleton */}
        <div className="flex justify-center gap-3">
          <div className="h-10 w-28 bg-muted rounded-xl" />
          <div className="h-10 w-28 bg-muted rounded-xl" />
          <div className="h-10 w-28 bg-muted rounded-xl" />
        </div>
      </div>
      <span className="sr-only">अभंग लोड होत आहे...</span>
    </div>
  );
}
