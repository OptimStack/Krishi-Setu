export default function Card({ children, className = '', highlight = false, ...props }) {
  return (
    <div
      className={`bg-white/95 dark:bg-[#132215]/95 backdrop-blur-md rounded-2xl shadow-xl dark:shadow-2xl border ${
        highlight
          ? 'border-emerald-500/60 dark:border-[#D3D67A]/60 ring-2 ring-emerald-500/20 dark:ring-[#D3D67A]/20'
          : 'border-stone-200/90 dark:border-emerald-800/40'
      } p-6 md:p-8 text-stone-900 dark:text-stone-100 transition-all duration-300 hover:shadow-2xl dark:hover:border-emerald-600/50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
