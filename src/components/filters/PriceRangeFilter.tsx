import * as React from "react";
import * as Slider from "@radix-ui/react-slider";
import { useFilters } from '@/hooks/useFilters';

export function PriceRangeFilter() {
  const { priceRange, setPriceRange } = useFilters();
  
  const handleChange = (value: number[]) => {
    setPriceRange({ min: value[0], max: value[1] });
  };

  return (
    <div className="space-y-4">
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[priceRange.min, priceRange.max]}
        min={3}
        max={20}
        step={1}
        onValueChange={handleChange}
      >
        <Slider.Track className="bg-secondary relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-primary rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-5 h-5 bg-background border-2 border-primary rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Min price"
        />
        <Slider.Thumb
          className="block w-5 h-5 bg-background border-2 border-primary rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Max price"
        />
      </Slider.Root>
      <div className="flex justify-between text-sm">
        <span>{priceRange.min}€</span>
        <span>{priceRange.max}€</span>
      </div>
    </div>
  );
}