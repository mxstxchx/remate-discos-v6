import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTranslation } from 'react-i18next';
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
 const { t } = useTranslation('filters');
 return (
   <Sheet open={open} onOpenChange={onOpenChange}>
     <SheetContent side="left" className="w-[90%] max-w-[400px] overflow-y-auto">
       <SheetHeader>
         <SheetTitle>{t('title')}</SheetTitle>
       </SheetHeader>
       
       <div className="mt-4 space-y-6 pb-20">
         
         <FilterCard title={t('price.title')}>
           <PriceRangeFilter />
         </FilterCard>
         
         <FilterCard title={t('conditions.title')}>
           <ConditionFilter />
         </FilterCard>
         
         <FilterCard title={t('artists.title')}>
           <ArtistFilter />
         </FilterCard>
         
         <FilterCard title={t('labels.title')}>
           <LabelFilter />
         </FilterCard>
         
         <FilterCard title={t('styles.title')}>
           <StyleFilter />
         </FilterCard>
       </div>
     </SheetContent>
   </Sheet>
 )
}