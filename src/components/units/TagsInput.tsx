import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const search = inputValue.trim().toLowerCase();
  const availableSuggestions = suggestedTags.filter(
    (tag) => !value.includes(tag) && tag.toLowerCase().includes(search)
  );

  const canCreate = search.length > 0 && !value.some((t) => t.toLowerCase() === search);

  return (
    <div className="space-y-2" ref={wrapperRef}>
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
                aria-label={`Remover tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Free-typing input with inline suggestions */}
      {value.length < maxTags && (
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              const raw = e.target.value;
              // Typing a comma commits the tag
              if (raw.includes(',')) {
                raw.split(',').forEach((part) => addTag(part));
                return;
              }
              setInputValue(raw);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className="pr-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim()}
            aria-label="Adicionar tag"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {showDropdown && (availableSuggestions.length > 0 || canCreate) && (
            <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-md shadow-lg z-50 p-2 space-y-2">
              {availableSuggestions.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium px-1">Sugestões</p>
                  <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                    {availableSuggestions.slice(0, 8).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={`${getTagColor(tag)} cursor-pointer hover:opacity-80 transition-opacity`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addTag(tag);
                          inputRef.current?.focus();
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
              {canCreate && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(inputValue);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-1 py-1 text-xs text-primary hover:bg-accent/50 rounded flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  Criar "{inputValue.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {value.length >= maxTags && (
        <p className="text-xs text-muted-foreground">Limite de {maxTags} tags atingido</p>
      )}
    </div>
  );
}
