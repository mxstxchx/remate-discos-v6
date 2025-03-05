import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import { FILTER_DEFAULTS } from "@/lib/constants";
import type { FilterState } from "@/types/database";
import { useTranslation } from "react-i18next";

export function ActiveFilters() {
  const { t } = useTranslation('filters');
  const filters = useFilters();

  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === 'priceRange') {
      const { min, max } = value as { min: number; max: number };
      return min !== FILTER_DEFAULTS.priceRange.min ||
             max !== FILTER_DEFAULTS.priceRange.max;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return false;
  });

  if (activeFilters.length === 0) return null;

  const handleRemoveFilter = (key: keyof FilterState, value?: string) => {
    if (value) {
      const currentValues = filters[key] as string[];
      const newValues = currentValues.filter(v => v !== value);
      // Using the appropriate filter method based on key
      switch(key) {
        case 'artists':
          filters.setArtists(newValues);
          break;
        case 'labels':
          filters.setLabels(newValues);
          break;
        case 'styles':
          filters.setStyles(newValues);
          break;
        case 'conditions':
          filters.setConditions(newValues);
          break;
        default:
          console.warn(`No setter found for filter key: ${key}`);
      }
    } else {
      filters.clearFilter(key);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map(([key, value]) => {
        if (key === 'priceRange') {
          const { min, max } = value as { min: number; max: number };
          return (
            <Badge
              key={key}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {`${t('price.title')}: ${min}${t('price.currency')} - ${max}${t('price.currency')}`}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveFilter(key as keyof FilterState)}
              />
            </Badge>
          );
        }

        return (Array.isArray(value) && value.map((item) => (
          <Badge
            key={`${key}-${item}`}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {item}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handleRemoveFilter(key as keyof FilterState, item)}
            />
          </Badge>
        )));
      })}
      <Badge
        variant="destructive"
        className="cursor-pointer"
        onClick={() => {
          console.log('[FILTER_DYNAMIC_OPTIONS] Clearing all filters');
          // Call the clearAllFilters method and verify it's actually resetting state
          filters.clearAllFilters();
          console.log('[FILTER_DYNAMIC_OPTIONS] Filter state after clear:', filters);
        }}
      >
        {t('clearAll')}
      </Badge>
    </div>
  );
}