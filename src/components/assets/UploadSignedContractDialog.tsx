import { useState, useRef } from "react";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Download, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateLeaseSignature } from "@/hooks/useLeases";
import { toast } from "sonner";

interface UploadSignedContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: {
    id: string;
    unit_id: string;
    unit?: { unit_number: string } | null;
    tenant_contact?: { name: string } | null;
    signed_contract_path?: string | null;
    signature_status?: string | null;
  } | null;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadSignedContractDialog({
  open,
  onOpenChange,
  lease,
  onSuccess,
}: UploadSignedContractDialogProps) {
  const { user } = useAuth();
  const updateSignature = useUpdateLeaseSignature();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Formato inválido", {
        description: "Por favor, selecione um arquivo PDF.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande", {
        description: "O arquivo deve ter no máximo 10MB.",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !lease || !user) return;

    setIsUploading(true);
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const filePath = `${user.id}/contracts/${lease.id}/${timestamp}_signed_contract.pdf`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update lease with signed contract path
      await updateSignature.mutateAsync({
        leaseId: lease.id,
        signatureStatus: "signed",
        signedContractPath: filePath,
      });

      await invalidateLeaseQueries(queryClient);

      toast.success("Contrato assinado enviado!", {
        description: "O status foi atualizado para 'Assinado'.",
      });

      onSuccess?.();
      handleClose();
    } catch (error: any) {
      toast.error("Erro ao enviar contrato", {
        description: error.message,
      });
    } finally {
      // CRITICAL: Always reset loading state to prevent UI freeze
      setIsUploading(false);
    }
  };

  const handleDownloadExisting = async () => {
    if (!lease?.signed_contract_path) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(lease.signed_contract_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Contrato_Assinado_${lease.unit?.unit_number || "contrato"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Erro ao baixar contrato", {
        description: error.message,
      });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setIsUploading(false);
    onOpenChange(false);
  };

  if (!lease) return null;

  const hasExistingContract = !!lease.signed_contract_path;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Contrato Assinado
          </DialogTitle>
          <DialogDescription>
            {lease.unit?.unit_number} • {lease.tenant_contact?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Contract Info */}
          {hasExistingContract && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Contrato já enviado</span>
                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                    <Check className="h-3 w-3 mr-1" />
                    Assinado
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownloadExisting}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}
              ${selectedFile ? "border-primary bg-primary/5" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />

            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-medium">
                  {hasExistingContract ? "Substituir contrato" : "Arraste o PDF aqui"}
                </p>
                <p className="text-xs text-muted-foreground">
                  ou clique para selecionar (máx. 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {hasExistingContract ? "Substituir" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}