import { useState, useEffect } from 'react';
import { Tag, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { getTagColor } from './TagsInput';

interface TagsFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  standalone?: boolean; // Filter for standalone or development units
}

export function TagsFilter({ selectedTags, onTagsChange, standalone }: TagsFilterProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAvailableTags();
  }, [standalone]);

  const loadAvailableTags = async () => {
    try {
      let query = supabase
        .from('units')
        .select('tags');

      if (standalone !== undefined) {
        query = query.eq('is_standalone', standalone);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Extract unique tags from all units
      const allTags = new Set<string>();
      data?.forEach((unit) => {
        if (unit.tags && Array.isArray(unit.tags)) {
          unit.tags.forEach((tag: string) => allTags.add(tag));
        }
      });

      setAvailableTags(Array.from(allTags).sort());
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          Tags
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filtrar por Tags</p>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs"
                onClick={clearTags}
              >
                Limpar
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? `${getTagColor(tag)} ring-2 ring-offset-1 ring-primary/30`
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                  {tag}
                </Badge>
              );
            })}
          </div>

          {selectedTags.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Tags selecionadas:</p>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
