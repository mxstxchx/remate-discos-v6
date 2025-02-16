import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selectedValues: string[];
  onApply: (values: string[]) => void;
}

export function FilterModal({
  isOpen,
  onClose,
  title,
  options = [],
  selectedValues = [],
  onApply,
}: FilterModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(selectedValues);

  useEffect(() => {
    setSelected(selectedValues);
  }, [selectedValues]);

  const filteredOptions = options.filter((option) =>
    option?.toLowerCase?.().includes(search.toLowerCase()) ?? false
  );

  const toggleOption = (option: string) => {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="grid grid-cols-2 gap-2">
              {filteredOptions.map((option) => (
                <Badge
                  key={option}
                  variant={selected.includes(option) ? "default" : "outline"}
                  className="cursor-pointer justify-between"
                  onClick={() => toggleOption(option)}
                >
                  <span className="truncate">{option}</span>
                  {selected.includes(option) && (
                    <Check className="ml-2 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}