import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, User, X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  categories: string[];
}

interface ContactSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Filter contacts by specific categories */
  filterCategories?: string[];
  /** Category to auto-add when selecting a contact that doesn't have it */
  autoAddCategory?: string;
  /** Show button to create new contact */
  showCreateButton?: boolean;
  /** Callback when create button is clicked */
  onCreateClick?: () => void;
}

export function ContactSelector({ 
  value, 
  onChange, 
  placeholder = 'Selecione um contato...',
  disabled = false,
  filterCategories,
  autoAddCategory,
  showCreateButton = false,
  onCreateClick,
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  // Fetch a recently created contact that may not be in the initial list yet.
  useEffect(() => {
    if (!value) return;
    if (contacts.some((c) => c.id === value)) return;

    let cancelled = false;
    const fetchSingle = async () => {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, email, phone, whatsapp, categories')
          .eq('id', value)
          .maybeSingle();

        if (error) throw error;
        if (data && !cancelled) {
          setContacts((prev) =>
            prev.some((c) => c.id === data.id) ? prev : [...prev, data]
          );
        }
      } catch (error) {
        console.error('Error loading selected contact:', error);
      }
    };

    fetchSingle();
    return () => {
      cancelled = true;
    };
  }, [value]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, whatsapp, categories')
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts based on search and optional category filter
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone?.includes(search) ||
      contact.whatsapp?.includes(search);

    if (!matchesSearch) return false;
    
    // If no category filter, show all
    if (!filterCategories || filterCategories.length === 0) return true;
    
    // Check if contact has at least one of the required categories
    return filterCategories.some(cat => contact.categories.includes(cat));
  });

  const selectedContact = contacts.find((c) => c.id === value);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleSelect = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    
    // Auto-add category if needed
    if (contact && autoAddCategory && !contact.categories.includes(autoAddCategory)) {
      try {
        const newCategories = [...contact.categories, autoAddCategory];
        await supabase
          .from('contacts')
          .update({ categories: newCategories })
          .eq('id', contactId);
        
        // Update local state
        setContacts(prev => prev.map(c => 
          c.id === contactId ? { ...c, categories: newCategories } : c
        ));
      } catch (error) {
        console.error('Error updating contact category:', error);
      }
    }
    
    onChange(contactId);
    setOpen(false);
    setSearch('');
  };

  const getCategoryBadge = (categories: string[]) => {
    if (categories.length === 0) return null;
    const primary = categories[0];
    return (
      <Badge variant="secondary" className="text-xs py-0 px-1.5">
        {primary}
        {categories.length > 1 && ` +${categories.length - 1}`}
      </Badge>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between font-normal"
          disabled={disabled}
        >
          {selectedContact ? (
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedContact.name}</span>
              {getCategoryBadge(selectedContact.categories)}
              {selectedContact.phone && (
                <span className="text-muted-foreground text-sm truncate hidden sm:inline">
                  ({selectedContact.phone})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {selectedContact && (
              <X 
                className="h-4 w-4 text-muted-foreground hover:text-foreground" 
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[250px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Nenhum contato encontrado.</p>
                  {showCreateButton && onCreateClick && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(false);
                        // Use setTimeout to ensure popover closes before opening dialog
                        setTimeout(() => {
                          onCreateClick();
                        }, 100);
                      }}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Novo Contato
                    </Button>
                  )}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={() => handleSelect(contact.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === contact.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{contact.name}</span>
                      {getCategoryBadge(contact.categories)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.phone && <span>{contact.phone}</span>}
                      {!contact.phone && contact.whatsapp && <span>{contact.whatsapp} (WA)</span>}
                      {(contact.phone || contact.whatsapp) && contact.email && <span>•</span>}
                      {contact.email && <span className="truncate">{contact.email}</span>}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreateButton && onCreateClick && filteredContacts.length > 0 && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    // Use setTimeout to ensure popover closes before opening dialog
                    setTimeout(() => {
                      onCreateClick();
                    }, 100);
                  }}
                  className="cursor-pointer text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Novo Contato
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
