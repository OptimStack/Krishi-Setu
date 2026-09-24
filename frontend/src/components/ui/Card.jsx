export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-stone-200 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
