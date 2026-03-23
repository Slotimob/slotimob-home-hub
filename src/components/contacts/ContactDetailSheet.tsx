import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, MapPin, FileText, Pencil, MessageSquare, Trash2 } from 'lucide-react';
import { ContactCategoryBadges } from './ContactCategoryFilter';
import { UnifiedContact } from './ContactCard';
import { formatPhoneForWhatsApp } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ContactDetailSheetProps {
  contact: UnifiedContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ContactDetailSheet = ({
  contact,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
}: ContactDetailSheetProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = contact?.whatsapp || contact?.phone;
    if (phoneNumber) {
      const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  // RULE 1: Sheet is ALWAYS rendered - visibility controlled by `open` prop only
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        {contact ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={contact.avatar_url || undefined} alt={contact.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl truncate">{contact.name}</SheetTitle>
                  {contact.document_number && (
                    <p className="text-sm text-muted-foreground">
                      {contact.document_type}: {contact.document_number}
                    </p>
                  )}
                  <div className="mt-2">
                    <ContactCategoryBadges categories={contact.categories} />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                {(contact.whatsapp || contact.phone) && (
                  <Button variant="outline" size="sm" onClick={handleWhatsAppClick} className="text-green-600">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
            </SheetHeader>

            <Separator />

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="mt-4 space-y-4">
                {/* Contact Info Card */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 py-0 pb-4">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {contact.phone}
                      </div>
                    )}
                    {(contact.address || contact.city) && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>
                          {[contact.address, contact.neighborhood, contact.city, contact.state]
                            .filter(Boolean)
                            .join(', ')}
                          {contact.postal_code && ` - CEP: ${contact.postal_code}`}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes Card */}
                {contact.notes && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Observações
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {contact.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum contato selecionado</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
