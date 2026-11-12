export default function SaintLoading() {
  return (
    <div
      role="status"
      aria-label="संत माहिती लोड होत आहे"
      className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 animate-pulse"
    >
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Back Link */}
        <div className="h-5 w-24 bg-muted rounded" />

        {/* Saint Hero Header */}
        <div className="bg-card rounded-3xl p-6 sm:p-10 border border-border shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Portrait Skeleton */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-saffron/15 flex-shrink-0" />

          {/* Bio Header Info */}
          <div className="flex-1 space-y-4 text-center md:text-left w-full">
            <div className="inline-block h-6 w-28 bg-saffron/20 rounded-full" />
            <div className="h-10 w-2/3 bg-foreground/15 rounded-lg mx-auto md:mx-0" />
            <div className="h-5 w-1/3 bg-foreground/10 rounded mx-auto md:mx-0" />

            {/* Meta Tags (Birthplace, Period, Samadhi) */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              <div className="h-8 w-28 bg-muted rounded-lg" />
              <div className="h-8 w-32 bg-muted rounded-lg" />
              <div className="h-8 w-24 bg-muted rounded-lg" />
            </div>
          </div>
        </div>

        {/* Biography Section Skeleton */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-3">
          <div className="h-7 w-32 bg-foreground/15 rounded mb-4" />
          <div className="h-4 w-full bg-foreground/10 rounded" />
          <div className="h-4 w-11/12 bg-foreground/10 rounded" />
          <div className="h-4 w-4/5 bg-foreground/10 rounded" />
          <div className="h-4 w-5/6 bg-foreground/10 rounded" />
        </div>

        {/* Compositions Grid Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-7 w-48 bg-foreground/15 rounded" />
            <div className="h-5 w-20 bg-muted rounded" />
          </div>

          {/* Grid of Composition Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-saffron/20 rounded" />
                  <div className="h-4 w-8 bg-muted rounded" />
                </div>
                <div className="h-6 w-5/6 bg-foreground/15 rounded" />
                <div className="h-4 w-1/2 bg-foreground/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">संत माहिती लोड होत आहे...</span>
    </div>
  );
}
