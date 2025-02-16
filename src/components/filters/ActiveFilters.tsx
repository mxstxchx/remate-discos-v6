import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useFilters, FilterState } from "@/hooks/useFilters";

export function ActiveFilters() {
  const filters = useFilters();
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
      const { min, max } = value as { min: number; max: number };
      return min !== 3 || max !== 20;
    }
    return false;
  });

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map(([key, value]) => (
        Array.isArray(value) ? value.map((item) => (
          <Badge
            key={`${key}-${item}`}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {item}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => {
                const newValues = (filters[key as keyof FilterState] as string[]).filter(
                  (v) => v !== item
                );
                filters[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](newValues);
              }}
            />
          </Badge>
        )) : (
          <Badge
            key={key}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {`${key}: ${JSON.stringify(value)}`}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => filters.clearFilter(key as keyof FilterState)}
            />
          </Badge>
        )
      ))}
      <Badge
        variant="destructive"
        className="cursor-pointer"
        onClick={() => filters.clearAllFilters()}
      >
        Clear All
      </Badge>
    </div>
  );
}