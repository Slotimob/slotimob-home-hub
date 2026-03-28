import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, X, Users, LayoutGrid, LayoutList, Trash2, CheckSquare } from 'lucide-react';
import { PermissionGate } from '@/components/subscription/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { ContactCategoryFilter, ContactCategory, CONTACT_CATEGORIES } from '@/components/contacts/ContactCategoryFilter';
import { ContactCard, UnifiedContact } from '@/components/contacts/ContactCard';
import { ContactListItem } from '@/components/contacts/ContactListItem';
import { ContactDetailSheet } from '@/components/contacts/ContactDetailSheet';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { EditContactDialog } from '@/components/contacts/EditContactDialog';
import { DeleteContactDialog } from '@/components/DeleteContactDialog';
import { ContactsSortDropdown, SortField, SortDirection } from '@/components/contacts/ContactsSortDropdown';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ITEMS_PER_PAGE = 12;

const ContactsUnified = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isOwner, hasPermission } = usePermissions();
  const canEditContact = isOwner || hasPermission('crm_contacts', 'edit');
  const canDeleteContact = isOwner || hasPermission('crm_contacts', 'delete');
  
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Multi-select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteBlockedMessage, setBulkDeleteBlockedMessage] = useState<string | null>(null);
  
  // Modals
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetContact, setSheetContact] = useState<UnifiedContact | null>(null);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<UnifiedContact | null>(null);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    contact: UnifiedContact;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pre-select category based on URL slug (smart shortcuts)
  useEffect(() => {
    const slug = location.pathname.split('/').pop();
    const categoryMap: Record<string, ContactCategory> = {
      owners: 'Proprietário',
      leads: 'Lead',
      companies: 'Empresa',
    };
    if (slug && categoryMap[slug]) {
      setSelectedCategory(categoryMap[slug]);
    }
  }, []); // only on mount

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Parse metadata as JSON if it's a string
      const parsed = (data || []).map(c => ({
        ...c,
        metadata: typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata,
      })) as UnifiedContact[];
      
      setContacts(parsed);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar contatos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ContactCategory, number> = {} as Record<ContactCategory, number>;
    CONTACT_CATEGORIES.forEach(cat => {
      counts[cat] = contacts.filter(c => c.categories.includes(cat)).length;
    });
    return counts;
  }, [contacts]);

  // Filtering
  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.phone?.includes(term) ||
        contact.document_number?.includes(term)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(contact =>
        contact.categories.includes(selectedCategory)
      );
    }

    // Sorting
    return [...filtered].sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'city':
          aValue = (a.city || '').toLowerCase();
          bValue = (b.city || '').toLowerCase();
          break;
        case 'created_at':
          aValue = a.created_at || '';
          bValue = b.created_at || '';
          break;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [contacts, searchTerm, selectedCategory, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setCurrentPage(1);
  };

  // Selection handlers
  const handleToggleSelection = (contactId: string, selected: boolean) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (selected) next.add(contactId);
      else next.delete(contactId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === paginatedContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(paginatedContacts.map(c => c.id)));
    }
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedContacts(new Set());
  };

  // Check linked resources for bulk delete
  const handleBulkDeleteCheck = async () => {
    if (selectedContacts.size === 0) return;
    setIsBulkDeleting(true);

    try {
      const ids = Array.from(selectedContacts);
      
      // Check units
      const { data: linkedUnits } = await supabase
        .from('units')
        .select('id, owner_contact_id, tenant_contact_id')
        .or(ids.map(id => `owner_contact_id.eq.${id},tenant_contact_id.eq.${id}`).join(','))
        .limit(1);

      // Check transactions
      const { data: linkedTx } = await supabase
        .from('financial_transactions')
        .select('id, contact_id')
        .in('contact_id', ids)
        .limit(1);

      // Check deals
      const { data: linkedDeals } = await supabase
        .from('deals')
        .select('id, contact_id')
        .in('contact_id', ids)
        .limit(1);

      // Check leases
      const { data: linkedLeases } = await supabase
        .from('leases')
        .select('id, tenant_contact_id, owner_contact_id')
        .or(ids.map(id => `tenant_contact_id.eq.${id},owner_contact_id.eq.${id}`).join(','))
        .limit(1);

      const blockers: string[] = [];
      if (linkedUnits && linkedUnits.length > 0) blockers.push('imóveis');
      if (linkedTx && linkedTx.length > 0) blockers.push('transações financeiras');
      if (linkedDeals && linkedDeals.length > 0) blockers.push('negociações');
      if (linkedLeases && linkedLeases.length > 0) blockers.push('contratos');

      if (blockers.length > 0) {
        setBulkDeleteBlockedMessage(
          `Alguns dos contatos selecionados estão vinculados a: ${blockers.join(', ')}. Remova os vínculos antes de excluir.`
        );
        setIsBulkDeleting(false);
        return;
      }

      setShowBulkDeleteConfirm(true);
    } catch (error) {
      toast({ title: 'Erro ao verificar vínculos', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedContacts);
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({ title: `${ids.length} contato${ids.length > 1 ? 's' : ''} excluído${ids.length > 1 ? 's' : ''} com sucesso!` });
      handleExitSelectionMode();
      loadContacts();
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('foreign key') || msg.includes('violates') || msg.includes('constraint')) {
        toast({ title: 'Não é possível excluir', description: 'Alguns contatos possuem vínculos no sistema que impedem a exclusão.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  // RULE 3: Clean handlers
  const handleOpenSheet = (contact: UnifiedContact) => {
    setSheetContact(contact);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  const handleOpenEdit = (contact: UnifiedContact) => {
    setEditContact(contact);
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
  };

  const handleEditFromSheet = () => {
    const contactToEdit = sheetContact;
    setIsSheetOpen(false);
    setTimeout(() => {
      if (contactToEdit) {
        setEditContact(contactToEdit);
        setIsEditOpen(true);
      }
    }, 150);
  };

  const handleEditSuccess = () => {
    loadContacts();
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    setIsDeleting(true);
    try {
      const { count: unitsCount } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .or(`owner_contact_id.eq.${deleteDialog.contact.id},tenant_contact_id.eq.${deleteDialog.contact.id}`);

      const { count: txCount } = await supabase
        .from('financial_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', deleteDialog.contact.id);

      if ((unitsCount || 0) > 0 || (txCount || 0) > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Este contato possui imóveis ou transações vinculadas.',
          variant: 'destructive',
        });
        setDeleteDialog(null);
        setIsDeleting(false);
        return;
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', deleteDialog.contact.id);
      
      if (error) throw error;

      toast({ title: 'Contato excluído com sucesso!' });
      loadContacts();
      setDeleteDialog(null);
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('foreign key') || msg.includes('violates') || msg.includes('referenced') || msg.includes('constraint')) {
        toast({ title: 'Não é possível excluir', description: 'Este contato possui negociações ou históricos vinculados a ele no sistema.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout title="Contatos">
      <div className="space-y-6">
        {/* Category Filter */}
        <ContactCategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          counts={categoryCounts}
        />

        {/* Selection Mode Bar */}
        {selectionMode && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
            <Checkbox
              checked={selectedContacts.size === paginatedContacts.length && paginatedContacts.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium flex-1">
              {selectedContacts.size > 0 
                ? `${selectedContacts.size} selecionado${selectedContacts.size > 1 ? 's' : ''}`
                : 'Selecione contatos'}
            </span>
            {selectedContacts.size > 0 && canDeleteContact && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteCheck}
                disabled={isBulkDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selectedContacts.size})
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleExitSelectionMode}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou documento..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Clear filters */}
          {(searchTerm || selectedCategory) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          )}
          
          {/* Select mode toggle */}
          {canDeleteContact && filteredContacts.length > 0 && !selectionMode && (
            <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)} className="gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Selecionar</span>
            </Button>
          )}
          
          {/* Add button */}
          <PermissionGate permission="crm_contacts.create">
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Contato</span>
            </Button>
          </PermissionGate>
        </div>
        
        {/* Results count, sort and view toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredContacts.length} contato{filteredContacts.length !== 1 ? 's' : ''}
            {selectedCategory && ` na categoria "${selectedCategory}"`}
          </span>
          <div className="flex items-center gap-2">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
              className="border rounded-md"
            >
              <ToggleGroupItem value="list" aria-label="Lista" className="h-8 w-8 p-0">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grade" className="h-8 w-8 p-0">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <ContactsSortDropdown
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
            />
          </div>
        </div>

        {/* Contact List/Grid */}
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum contato encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || selectedCategory 
                  ? 'Tente ajustar sua busca ou filtros' 
                  : 'Comece cadastrando seu primeiro contato'}
              </p>
              {!searchTerm && !selectedCategory && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Contato
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {paginatedContacts.map((contact) => (
                  <ContactListItem
                    key={contact.id}
                    contact={contact}
                    onClick={() => handleOpenSheet(contact)}
                    onEdit={() => handleOpenEdit(contact)}
                    onDelete={() => setDeleteDialog({ open: true, contact })}
                    onCreateDeal={() => {
                      toast({ title: 'Em breve', description: 'Funcionalidade em desenvolvimento' });
                    }}
                    canEdit={canEditContact}
                    canDelete={canDeleteContact}
                    selectionMode={selectionMode}
                    isSelected={selectedContacts.has(contact.id)}
                    onSelectionChange={(selected) => handleToggleSelection(contact.id, selected)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onClick={() => handleOpenSheet(contact)}
                    onEdit={() => handleOpenEdit(contact)}
                    onDelete={() => setDeleteDialog({ open: true, contact })}
                    onCreateDeal={() => {
                      toast({ title: 'Em breve', description: 'Funcionalidade em desenvolvimento' });
                    }}
                    canEdit={canEditContact}
                    canDelete={canDeleteContact}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* RULE 1: ALL MODALS ALWAYS RENDERED - Controlled by open prop only */}
      
      {/* Create Dialog */}
      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadContacts}
        defaultCategory={selectedCategory || undefined}
      />

      {/* Edit Dialog - ALWAYS mounted, controlled by isEditOpen */}
      <EditContactDialog
        open={isEditOpen}
        onOpenChange={handleCloseEdit}
        contact={editContact}
        onSuccess={handleEditSuccess}
      />

      {/* Detail Sheet - ALWAYS mounted, controlled by isSheetOpen */}
      <ContactDetailSheet
        contact={sheetContact}
        open={isSheetOpen}
        onOpenChange={handleCloseSheet}
        onEdit={handleEditFromSheet}
        onDelete={() => {
          if (sheetContact) {
            setDeleteDialog({ open: true, contact: sheetContact });
            setIsSheetOpen(false);
          }
        }}
        canEdit={canEditContact}
        canDelete={canDeleteContact}
      />

      {/* Delete Dialog */}
      {deleteDialog && (
        <DeleteContactDialog
          open={deleteDialog.open}
          onOpenChange={(open) => !open && setDeleteDialog(null)}
          onConfirm={handleDelete}
          contactName={deleteDialog.contact.name}
          contactType="lead"
          isDeleting={isDeleting}
        />
      )}

      {/* Bulk Delete Confirm */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedContacts.size} contato{selectedContacts.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os contatos selecionados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Blocked */}
      <AlertDialog open={!!bulkDeleteBlockedMessage} onOpenChange={() => setBulkDeleteBlockedMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não é possível excluir</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteBlockedMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ContactsUnified;
