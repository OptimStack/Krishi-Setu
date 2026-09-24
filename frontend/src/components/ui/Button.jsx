export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyle =
    "px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

  const variants = {
    primary:
      "bg-[#2A5124] hover:bg-[#1d3a19] text-white dark:bg-[#D3D67A] dark:hover:bg-[#c2c56a] dark:text-[#1c3618] focus:ring-[#2A5124] dark:focus:ring-[#D3D67A]",
    secondary:
      "bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700 focus:ring-stone-500",
    outline:
      "border-2 border-[#2A5124] text-[#2A5124] hover:bg-[#2A5124]/10 dark:border-[#D3D67A] dark:text-[#D3D67A] dark:hover:bg-[#D3D67A]/10 focus:ring-[#2A5124]",
    gold:
      "bg-[#D3D67A] hover:bg-[#c2c56a] text-[#2A5124] font-bold shadow-md hover:shadow-lg focus:ring-[#D3D67A]",
    danger:
      "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-500",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
