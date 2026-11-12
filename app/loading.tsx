export default function RootLoading() {
  return (
    <div
      role="status"
      aria-label="पृष्ठ लोड होत आहे"
      className="min-h-[65vh] flex flex-col items-center justify-center px-4 py-16"
    >
      <div className="relative flex items-center justify-center mb-6">
        {/* Spiritual Pulse Effect */}
        <div className="absolute w-20 h-20 rounded-full bg-saffron/20 animate-ping" />
        <div className="w-16 h-16 rounded-full bg-saffron/10 border-2 border-saffron flex items-center justify-center shadow-lg relative z-10 animate-pulse">
          <span className="text-2xl" aria-hidden="true">🚩</span>
        </div>
      </div>

      <p className="text-lg font-marathiHeading font-bold text-foreground mb-1">
        माहिती लोड होत आहे...
      </p>
      <p className="text-sm font-marathi text-foreground/60">
        श्री विठ्ठल चरणी स्वागत आहे
      </p>
      <span className="sr-only">कृपया प्रतीक्षा करा, माहिती लोड होत आहे...</span>
    </div>
  );
}
