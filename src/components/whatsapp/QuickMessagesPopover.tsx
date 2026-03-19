import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Plus, Trash2, X } from 'lucide-react';
import { useQuickMessages } from '@/hooks/useQuickMessages';
import { QUICK_REPLIES } from './mockData';

interface QuickMessagesPopoverProps {
  onSelect: (content: string) => void;
}

export function QuickMessagesPopover({ onSelect }: QuickMessagesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const { messages, addMessage, deleteMessage } = useQuickMessages();

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await addMessage({ title: newTitle.trim(), content: newContent.trim() });
    setNewTitle('');
    setNewContent('');
    setShowAdd(false);
  };

  // Merge static defaults with user custom messages
  const allMessages = [
    ...QUICK_REPLIES.map(qr => ({ ...qr, isDefault: true })),
    ...messages.map(m => ({ id: m.id, title: m.title, content: m.content, isDefault: false })),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground hover:text-foreground h-9 w-9">
          <Zap className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">Respostas Rápidas</h4>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {showAdd && (
          <div className="p-3 border-b space-y-2">
            <Input
              placeholder="Título"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="h-8 text-xs"
            />
            <textarea
              placeholder="Conteúdo da mensagem..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs min-h-[60px]"
            />
            <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd}>
              Salvar
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-60">
          <div className="p-1">
            {allMessages.map((qr) => (
              <div key={qr.id} className="flex items-start group">
                <button
                  onClick={() => handleSelect(qr.content)}
                  className="flex-1 text-left px-3 py-2.5 hover:bg-accent/50 rounded-md transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{qr.title}</span>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{qr.content}</p>
                </button>
                {!qr.isDefault && (
                  <button
                    onClick={() => deleteMessage(qr.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
