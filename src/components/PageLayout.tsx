import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const PageLayout = ({ children, className, title }: PageLayoutProps) => {
  return (
    <div className={cn("flex-1 w-full", className)}>
      {children}
    </div>
  );
};