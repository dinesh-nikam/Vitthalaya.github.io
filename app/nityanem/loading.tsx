export default function NityanemLoading() {
  return (
    <div className="vitthalaya-shell min-h-screen pb-20 animate-pulse">
      <div className="pt-16 pb-16 border-b border-[var(--dp-rule)] bg-[var(--dp-ground-well)] text-center">
        <div className="vitthalaya-container max-w-4xl space-y-4">
          <div className="h-4 w-32 bg-[var(--dp-rule)] rounded mx-auto" />
          <div className="h-10 w-3/4 max-w-md bg-[var(--dp-rule)] rounded mx-auto" />
          <div className="h-4 w-1/2 bg-[var(--dp-rule)] rounded mx-auto" />
        </div>
      </div>

      <div className="vitthalaya-container max-w-5xl pt-10 space-y-6">
        <div className="h-12 w-80 bg-[var(--dp-rule)] rounded-2xl mx-auto" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-[var(--dp-rule)] rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-[var(--dp-rule)] rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-[var(--dp-rule)] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
