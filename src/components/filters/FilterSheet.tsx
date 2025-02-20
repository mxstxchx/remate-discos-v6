import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
 PriceRangeFilter,
 ConditionFilter,
 ArtistFilter,
 LabelFilter,
 StyleFilter,
 FilterCard,
 ActiveFilters
} from '@/components/filters'

interface FilterSheetProps {
 open: boolean
 onOpenChange: (open: boolean) => void
}

export function FilterSheet({ open, onOpenChange }: FilterSheetProps) {
 return (
   <Sheet open={open} onOpenChange={onOpenChange}>
     <SheetContent side="left" className="w-full sm:w-[540px] overflow-y-auto">
       <SheetHeader>
         <SheetTitle>Filters</SheetTitle>
       </SheetHeader>
       
       <div className="mt-4 space-y-6 pb-20">
         <ActiveFilters />
         
         <FilterCard title="Price Range">
           <PriceRangeFilter />
         </FilterCard>
         
         <FilterCard title="Condition">
           <ConditionFilter />
         </FilterCard>
         
         <FilterCard title="Artists">
           <ArtistFilter />
         </FilterCard>
         
         <FilterCard title="Labels">
           <LabelFilter />
         </FilterCard>
         
         <FilterCard title="Styles">
           <StyleFilter />
         </FilterCard>
       </div>
     </SheetContent>
   </Sheet>
 )
}