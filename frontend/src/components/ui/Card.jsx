export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white/95 dark:bg-[#152317]/95 backdrop-blur-md rounded-xl shadow-lg dark:shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 p-6 text-stone-900 dark:text-stone-100 transition-colors duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
