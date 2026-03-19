import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatTagsInputProps {
  conversationId: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  compact?: boolean;
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
];

function getTagColor(tag: string) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function ChatTagsInput({ conversationId, tags, onTagsChange, compact = false }: ChatTagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const updateTags = async (newTags: string[]) => {
    onTagsChange(newTags);
    await supabase
      .from('whatsapp_conversations')
      .update({ tags: newTags } as any)
      .eq('id', conversationId);
  };

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    updateTags([...tags, tag]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    updateTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', compact && 'max-w-[200px]')}>
      {tags.map(tag => (
        <Badge
          key={tag}
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0 h-5 gap-0.5 cursor-default', getTagColor(tag))}
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="ml-0.5 hover:opacity-70">
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="+ tag"
          className="h-5 w-16 text-[10px] px-1.5 border-dashed"
        />
      </div>
    </div>
  );
}
