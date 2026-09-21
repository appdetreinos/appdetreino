/** Skeleton do painel trainer. */
export default function Loading() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
    </div>
  );
}
