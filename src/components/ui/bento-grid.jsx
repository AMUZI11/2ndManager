import { cn } from "@/lib/utils";

export const BentoGrid = ({ className, children }) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[12rem] grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto ",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 p-8 bg-[#0A0705] border border-[#2A2419] justify-between flex flex-col space-y-4 overflow-hidden relative",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
        {icon}
        <div className="font-sans font-bold text-kw-text mb-1 mt-2 text-lg">
          {title}
        </div>
        <div className="font-sans font-normal text-zinc-400 text-lg">
          {description}
        </div>
      </div>
    </div>
  );
};
