import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, User, X, Plus, Loader2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GuarantorData } from "@/hooks/useLeases";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  metadata: unknown;
  categories: string[];
}

interface GuarantorSelectorProps {
  /** Current guarantor data from the form */
  guarantorData: GuarantorData;
  /** Callback to update guarantor data */
  onGuarantorChange: (data: GuarantorData) => void;
  /** Selected contact ID (if any) */
  selectedContactId: string | null;
  /** Callback when a contact is selected */
  onContactSelect: (contactId: string | null) => void;
  disabled?: boolean;
}

export function GuarantorSelector({
  guarantorData,
  onGuarantorChange,
  selectedContactId,
  onContactSelect,
  disabled = false,
}: GuarantorSelectorProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load contacts that have "Fiador" category
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, document_number, address, city, state, postal_code, metadata, categories")
        .eq("broker_id", user.id)
        .contains("categories", ["Fiador"])
        .order("name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error loading guarantor contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone?.includes(search) ||
      contact.document_number?.includes(search);
    return matchesSearch;
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContactSelect(null);
    // Clear guarantor data when deselecting
    onGuarantorChange({
      nome: "",
      cpf: "",
      rg: "",
      profissao: "",
      estadoCivil: "Solteiro(a)",
      cep: "",
      endereco: "",
      cidade: "",
      estado: "",
    });
  };

  const handleSelect = (contact: Contact) => {
    onContactSelect(contact.id);
    
    // Populate guarantor data from contact
    const metadata = contact.metadata as Record<string, unknown> | null;
    onGuarantorChange({
      nome: contact.name,
      cpf: contact.document_number || "",
      rg: (metadata?.rg as string) || "",
      profissao: (metadata?.profissao as string) || "",
      estadoCivil: (metadata?.estadoCivil as string) || "Solteiro(a)",
      cep: contact.postal_code || "",
      endereco: contact.address || "",
      cidade: contact.city || "",
      estado: contact.state || "",
      conjuge: metadata?.conjuge as GuarantorData["conjuge"],
      imovelGarantia: metadata?.imovelGarantia as GuarantorData["imovelGarantia"],
    });
    
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = () => {
    onContactSelect(null);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-10 py-2"
            disabled={disabled}
          >
            {selectedContact ? (
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <UserCheck className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm">{selectedContact.name}</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 hidden sm:inline-flex">
                  Fiador
                </Badge>
                {selectedContact.phone && (
                  <span className="text-muted-foreground text-xs truncate hidden md:inline">
                    ({selectedContact.phone})
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-left">
                <User className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm truncate">
                  {isMobile ? "Selecionar fiador existente..." : "Selecionar fiador existente ou preencher abaixo..."}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0 ml-1">
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
        <PopoverContent 
          className={cn(
            "p-0",
            isMobile ? "w-[calc(100vw-2rem)]" : "w-[350px]"
          )} 
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={isMobile ? "Buscar fiador..." : "Buscar fiador por nome, CPF ou telefone..."}
              value={search}
              onValueChange={setSearch}
              className="text-sm"
            />
            <CommandList className="max-h-[250px]">
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <div className="py-4 text-center px-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhum fiador encontrado.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Preencha os campos abaixo para cadastrar um novo.
                    </p>
                  </div>
                )}
              </CommandEmpty>
              {filteredContacts.length > 0 && (
                <CommandGroup heading="Fiadores Cadastrados">
                  {filteredContacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelect(contact)}
                      className="py-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate font-medium text-sm">{contact.name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {contact.document_number && <span className="truncate">{contact.document_number}</span>}
                          {contact.document_number && contact.phone && <span>•</span>}
                          {contact.phone && <span className="truncate">{contact.phone}</span>}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="cursor-pointer text-primary py-2.5"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="text-sm">Cadastrar Novo Fiador</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedContact && (
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">
          Dados preenchidos automaticamente. Você pode editar abaixo se necessário.
        </p>
      )}
    </div>
  );
}
