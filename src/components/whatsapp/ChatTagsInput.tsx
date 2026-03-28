import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhatsAppTag } from '@/hooks/useWhatsAppTags';

interface ChatTagsInputProps {
  conversationTagIds: string[];
  allTags: WhatsAppTag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<WhatsAppTag | null>;
  compact?: boolean;
}

const TAG_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#EF4444', '#06B6D4', '#84CC16',
];

export function ChatTagsInput({
  conversationTagIds,
  allTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  compact = false,
}: ChatTagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activeTags = allTags.filter(t => conversationTagIds.includes(t.id));
  const search = inputValue.trim().toLowerCase();

  const suggestions = allTags.filter(
    t => !conversationTagIds.includes(t.id) && t.name.includes(search)
  );

  const exactMatch = allTags.find(t => t.name === search);
  const showCreateOption = search.length > 0 && !exactMatch;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    if (!search) return;
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    const tag = await onCreateTag(search, color);
    if (tag) {
      onAddTag(tag.id);
      setInputValue('');
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (tagId: string) => {
    onAddTag(tagId);
    setInputValue('');
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className={cn('flex items-center gap-1 flex-wrap', compact && 'max-w-[250px]')}>
      {activeTags.map(tag => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-5 gap-0.5 cursor-default border"
          style={{
            backgroundColor: tag.color + '20',
            color: tag.color,
            borderColor: tag.color + '40',
          }}
        >
          {tag.name}
          <button onClick={() => onRemoveTag(tag.id)} className="ml-0.5 hover:opacity-70">
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (suggestions.length > 0 && search) {
                handleSelectSuggestion(suggestions[0].id);
              } else if (showCreateOption) {
                handleCreate();
              }
            }
          }}
          placeholder="+ tag"
          className="h-5 w-20 text-[10px] px-1.5 border-dashed"
        />
        {showDropdown && (search || suggestions.length > 0) && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-popover border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
            {suggestions.slice(0, 8).map(tag => (
              <button
                key={tag.id}
                onClick={() => handleSelectSuggestion(tag.id)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/50 flex items-center gap-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
            {showCreateOption && (
              <button
                onClick={handleCreate}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/50 flex items-center gap-1.5 text-primary border-t"
              >
                <Plus className="h-3 w-3" />
                Criar "{search}"
              </button>
            )}
            {suggestions.length === 0 && !showCreateOption && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma tag encontrada</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
