export default function WariLoading() {
  return (
    <div
      role="status"
      aria-label="वारी माहिती लोड होत आहे"
      className="min-h-screen bg-gradient-to-b from-background via-cream to-background animate-pulse"
    >
      {/* Hero Skeleton */}
      <div className="py-24 bg-foreground/10 text-center flex flex-col items-center justify-center space-y-4 px-4">
        <div className="w-16 h-16 rounded-full bg-saffron/20" />
        <div className="h-10 w-64 bg-foreground/20 rounded-lg" />
        <div className="h-5 w-96 max-w-full bg-foreground/15 rounded" />
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 max-w-4xl py-12 space-y-8">
        {/* Route Stats Card */}
        <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-sm flex flex-wrap justify-around gap-6">
          <div className="text-center space-y-2">
            <div className="h-4 w-20 bg-muted rounded mx-auto" />
            <div className="h-8 w-16 bg-saffron/25 rounded mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <div className="h-4 w-20 bg-muted rounded mx-auto" />
            <div className="h-8 w-16 bg-saffron/25 rounded mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <div className="h-4 w-20 bg-muted rounded mx-auto" />
            <div className="h-8 w-16 bg-saffron/25 rounded mx-auto" />
          </div>
        </div>

        {/* Timeline Stops Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-saffron/20 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-36 bg-foreground/20 rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="h-4 w-4/5 bg-foreground/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">वारी मार्ग माहिती लोड होत आहे...</span>
    </div>
  );
}
