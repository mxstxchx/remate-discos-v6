import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { useFilters } from '@/hooks/useFilters';

export function PriceRangeFilter() {
  const { priceRange, setPriceRange } = useFilters();
  
  const handleChange = (value: number[]) => {
    setPriceRange({ min: value[0], max: value[1] });
  };

  return (
    <div className="space-y-4">
      <Slider
        variant="pitchControl"
        defaultValue={[priceRange.min, priceRange.max]}
        min={3}
        max={20}
        step={1}
        onValueChange={handleChange}
        className="mt-2"
      />
      <div className="flex justify-between">
        <div className="text-sm font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-primary-dark">€</span>
          <span>{priceRange.min}</span>
        </div>
        <div className="text-sm font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-primary-dark">€</span>
          <span>{priceRange.max}</span>
        </div>
      </div>
    </div>
  );
}