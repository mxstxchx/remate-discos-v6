import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFilters } from '@/hooks/useFilters';

const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Very Good Plus",
  "Very Good"
] as const;

export function ConditionFilter() {
  const { conditions, setConditions } = useFilters();

  const handleConditionChange = (condition: string, checked: boolean) => {
    if (checked) {
      setConditions([...conditions, condition]);
    } else {
      setConditions(conditions.filter((c) => c !== condition));
    }
  };

  return (
    <div className="space-y-3">
      {CONDITIONS.map((condition) => (
        <div key={condition} className="flex items-center space-x-2">
          <Checkbox
            id={condition}
            checked={conditions.includes(condition)}
            onCheckedChange={(checked) =>
              handleConditionChange(condition, checked as boolean)
            }
          />
          <Label
            htmlFor={condition}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {condition}
          </Label>
        </div>
      ))}
    </div>
  );
}