import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type AwardCategory, AWARD_CATEGORIES } from '@/types/nomination';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: AwardCategory;
  selected?: boolean;
  onClick?: () => void;
  index?: number;
}

export function CategoryCard({ category, selected, onClick, index = 0 }: CategoryCardProps) {
  const categoryInfo = AWARD_CATEGORIES[category];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card
        onClick={onClick}
        className={cn(
          'cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden group',
          selected
            ? 'ring-2 ring-primary shadow-lg shadow-primary/10'
            : 'border-border/50 hover:border-primary/30'
        )}
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-5">
            {/* Icon */}
            <div className={cn(
              'h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-all duration-300',
              selected 
                ? 'gradient-primary shadow-lg' 
                : 'bg-secondary group-hover:bg-primary/10'
            )}>
              {categoryInfo.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {categoryInfo.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {categoryInfo.description}
              </p>
            </div>

            {/* Arrow */}
            <ChevronRight 
              className={cn(
                'h-5 w-5 shrink-0 transition-all duration-300',
                selected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary group-hover:translate-x-1'
              )} 
            />
          </div>

          {/* Selected indicator */}
          {selected && (
            <motion.div
              layoutId="selectedCategory"
              className="h-1 gradient-primary"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
