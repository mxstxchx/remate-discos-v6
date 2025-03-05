import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useFilters } from '@/hooks/useFilters';

const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Very Good Plus",
  "Very Good"
] as const;

export function ConditionFilter() {
  const { t } = useTranslation('filters');
  const [availableConditions, setAvailableConditions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useFilters();
  const { conditions, setConditions } = useFilters();

  useEffect(() => {
    console.log('[FILTER_DYNAMIC_OPTIONS] ConditionFilter - Fetching available conditions');
    async function fetchConditions() {
      try {
        setIsLoading(true);
        setError(null);
        const options = await filters.getFilteredOptions('conditions');
        console.log('[FILTER_DYNAMIC_OPTIONS] ConditionFilter - Received options:', options);
        setAvailableConditions(options);
      } catch (err) {
        console.error('[FILTER_DYNAMIC_OPTIONS] ConditionFilter - Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConditions();
  }, [
    filters.artists,
    filters.labels,
    filters.styles
    // Excluding conditions as we don't want to refetch when conditions change
  ]);

  const handleConditionChange = (condition: string, checked: boolean) => {
    if (checked) {
      setConditions([...conditions, condition]);
    } else {
      setConditions(conditions.filter((c) => c !== condition));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('conditions.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-destructive">
          {t('conditions.error')}: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {CONDITIONS.map((condition) => {
        const isAvailable = availableConditions.includes(condition);
        return (
          <div key={condition} className="flex items-center space-x-2">
            <Checkbox
              id={condition}
              checked={conditions.includes(condition)}
              onCheckedChange={(checked) =>
                handleConditionChange(condition, checked as boolean)
              }
              disabled={!isAvailable}
              className={!isAvailable ? 'opacity-50' : ''}
            />
            <Label
              htmlFor={condition}
              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70
                ${!isAvailable ? 'opacity-50' : ''}`}
            >
              {t(['filters', `conditions.${condition.toLowerCase().replace(/ /g, '')}`], {defaultValue: condition})}
            </Label>
          </div>
        );
      })}
    </div>
  );
}