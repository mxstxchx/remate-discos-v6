import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

interface FilterCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterCard({ title, children, className = "" }: FilterCardProps) {
  return (
    <Card className={`sticky top-4 mb-4 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}