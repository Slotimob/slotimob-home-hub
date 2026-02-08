import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestedTags?: string[];
  placeholder?: string;
  maxTags?: number;
}

// Predefined color palette for tags
const TAG_COLORS = [
  'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
  'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400',
  'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400',
  'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400',
  'bg-pink-500/15 text-pink-700 border-pink-500/30 dark:text-pink-400',
  'bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-400',
  'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400',
  'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
];

// Default suggested tags for real estate
const DEFAULT_SUGGESTIONS = [
  'Exclusividade',
  'Oportunidade',
  'Frente Mar',
  'Vista Panorâmica',
  'Pronto para Morar',
  'Alto Padrão',
  'Investimento',
  'Primeira Locação',
  'Aceita Permuta',
  'Urgente',
];

export function getTagColor(tag: string): string {
  // Generate consistent color based on tag string
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function TagsInput({
  value,
  onChange,
  suggestedTags = DEFAULT_SUGGESTIONS,
  placeholder = 'Adicionar tag...',
  maxTags = 10,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag &&
      !value.includes(trimmedTag) &&
      value.length < maxTags
    ) {
      onChange([...value, trimmedTag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const availableSuggestions = suggestedTags.filter(
    (tag) => !value.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Display current tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`${getTagColor(tag)} px-2 py-0.5 text-xs font-medium`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:opacity-70 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with suggestions */}
      {value.length < maxTags && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="pr-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => addTag(inputValue)}
                disabled={!inputValue.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium px-1">Sugestões</p>
              <div className="flex flex-wrap gap-1">
                {availableSuggestions.slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`${getTagColor(tag)} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => {
                      addTag(tag);
                      setIsOpen(false);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {availableSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">
                    {inputValue ? 'Pressione Enter para criar tag' : 'Nenhuma sugestão disponível'}
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {value.length >= maxTags && (
        <p className="text-xs text-muted-foreground">Limite de {maxTags} tags atingido</p>
      )}
    </div>
  );
}
