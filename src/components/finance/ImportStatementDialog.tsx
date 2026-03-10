import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";

interface ImportStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId?: string;
  onSuccess: () => void;
}

interface ParsedEntry {
  description: string;
  amount: number;
  entry_date: string;
  is_credit: boolean;
}

interface OFXBalanceInfo {
  ledgerBalance: number | null;
  balanceDate: string | null;
}

export function ImportStatementDialog({
  open,
  onOpenChange,
  bankAccountId: initialBankAccountId = "",
  onSuccess,
}: ImportStatementDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(initialBankAccountId);
  const [importComplete, setImportComplete] = useState(false);
  const [extractedBalance, setExtractedBalance] = useState<OFXBalanceInfo | null>(null);

  // Fetch existing imports for duplicate detection
  const { data: existingImports = [] } = useQuery({
    queryKey: ["statement-imports-today", selectedBankAccountId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("bank_statement_imports")
        .select("file_name, entries_count, created_at")
        .eq("bank_account_id", selectedBankAccountId)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBankAccountId,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreview([]);
    setDuplicateWarning(null);
    setExtractedBalance(null);

    // Check for duplicate file
    const existingDuplicate = existingImports.find(
      (imp) => imp.file_name === selectedFile.name
    );
    if (existingDuplicate) {
      setDuplicateWarning(
        `Atenção: Um arquivo com o nome "${selectedFile.name}" já foi importado hoje. Deseja continuar mesmo assim?`
      );
    }

    // Parse CSV - detect delimiter (comma or semicolon)
    if (selectedFile.name.endsWith(".csv")) {
      const text = await selectedFile.text();
      const firstLine = text.split('\n')[0] || '';
      const delimiter = firstLine.includes(';') ? ';' : ',';
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        complete: (results) => {
          try {
            const entries = parseCSVData(results.data as any[]);
            setPreview(entries.slice(0, 5)); // Preview first 5
          } catch (err: any) {
            setError(err.message);
          }
        },
        error: (err) => {
          setError(`Erro ao ler arquivo: ${err.message}`);
        },
      });
    } else if (selectedFile.name.endsWith(".ofx")) {
      // OFX parsing with balance extraction
      const text = await selectedFile.text();
      try {
        const { entries, balanceInfo } = parseOFXDataWithBalance(text);
        setPreview(entries.slice(0, 5));
        setExtractedBalance(balanceInfo);
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      setError("Formato não suportado. Use CSV ou OFX.");
    }
  };

  const parseCSVData = (data: any[]): ParsedEntry[] => {
    // Try to detect columns
    if (data.length === 0) throw new Error("Arquivo vazio");

    const entries: ParsedEntry[] = [];
    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Common column names
    const descCol = keys.find((k) => 
      k.toLowerCase().includes("descri") || 
      k.toLowerCase().includes("historico") ||
      k.toLowerCase().includes("memo")
    );
    const valueCol = keys.find((k) => 
      k.toLowerCase().includes("valor") || 
      k.toLowerCase().includes("amount") ||
      k.toLowerCase().includes("value")
    );
    const dateCol = keys.find((k) => 
      k.toLowerCase().includes("data") || 
      k.toLowerCase().includes("date")
    );

    if (!descCol || !valueCol || !dateCol) {
      throw new Error("Colunas obrigatórias não encontradas. Use: Data, Descrição, Valor");
    }

    for (const row of data) {
      const amount = parseFloat(String(row[valueCol]).replace(",", ".").replace(/[^\d.-]/g, ""));
      if (isNaN(amount)) continue;

      // Parse date (try multiple formats)
      let entryDate = "";
      const dateStr = String(row[dateCol]);
      
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts;
          entryDate = `${y.length === 2 ? "20" + y : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
      } else if (dateStr.includes("-")) {
        entryDate = dateStr.split("T")[0];
      }

      if (!entryDate) continue;

      // Determine credit/debit - if amount was negative, it's a debit (expense)
      const isCredit = amount > 0;

      entries.push({
        description: String(row[descCol]).trim(),
        amount: Math.abs(amount),
        entry_date: entryDate,
        is_credit: isCredit,
      });
    }

    if (entries.length === 0) throw new Error("Nenhuma entrada válida encontrada");
    return entries;
  };

  const parseOFXDataWithBalance = (text: string): { entries: ParsedEntry[]; balanceInfo: OFXBalanceInfo } => {
    const entries: ParsedEntry[] = [];
    let balanceInfo: OFXBalanceInfo = { ledgerBalance: null, balanceDate: null };

    // Extract LEDGERBAL (Ledger Balance) - The bank's official balance
    const ledgerBalMatch = text.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i);
    if (ledgerBalMatch) {
      const ledgerBlock = ledgerBalMatch[1];
      const balAmtMatch = ledgerBlock.match(/<BALAMT>\s*([^<\s]+)/i);
      const dtAsOfMatch = ledgerBlock.match(/<DTASOF>\s*([^<\s]+)/i);
      
      if (balAmtMatch) {
        balanceInfo.ledgerBalance = parseFloat(balAmtMatch[1].trim().replace(',', '.'));
      }
      if (dtAsOfMatch) {
        const rawDateStr = dtAsOfMatch[1].trim().replace(/[^\d]/g, '');
        if (rawDateStr.length >= 8) {
          balanceInfo.balanceDate = `${rawDateStr.slice(0, 4)}-${rawDateStr.slice(4, 6)}-${rawDateStr.slice(6, 8)}`;
        }
      }
    }

    // Fallback: Try AVAILBAL (Available Balance) if no LEDGERBAL
    if (balanceInfo.ledgerBalance === null) {
      const availBalMatch = text.match(/<AVAILBAL>([\s\S]*?)<\/AVAILBAL>/i);
      if (availBalMatch) {
        const availBlock = availBalMatch[1];
        const balAmtMatch = availBlock.match(/<BALAMT>\s*([^<\s]+)/i);
        const dtAsOfMatch = availBlock.match(/<DTASOF>\s*([^<\s]+)/i);
        
        if (balAmtMatch) {
          balanceInfo.ledgerBalance = parseFloat(balAmtMatch[1].trim().replace(',', '.'));
        }
        if (dtAsOfMatch) {
          const rawDateStr = dtAsOfMatch[1].trim().replace(/[^\d]/g, '');
          if (rawDateStr.length >= 8) {
            balanceInfo.balanceDate = `${rawDateStr.slice(0, 4)}-${rawDateStr.slice(4, 6)}-${rawDateStr.slice(6, 8)}`;
          }
        }
      }
    }

    // Parse transactions (STMTTRN blocks)
    const stmtTrnRegex = /<STMTTRN>\s*([\s\S]*?)\s*<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(text)) !== null) {
      const block = match[1];
      
      const amountMatch = block.match(/<TRNAMT>\s*([^<\s]+)/i);
      const dateMatch = block.match(/<DTPOSTED>\s*([^<\s]+)/i);
      const memoMatch = block.match(/<MEMO>\s*([^<]+)/i);
      const nameMatch = block.match(/<NAME>\s*([^<]+)/i);

      if (amountMatch && dateMatch) {
        const amount = parseFloat(amountMatch[1].trim().replace(',', '.'));
        const rawDateStr = dateMatch[1].trim().replace(/[^\d]/g, '');
        const entryDate = `${rawDateStr.slice(0, 4)}-${rawDateStr.slice(4, 6)}-${rawDateStr.slice(6, 8)}`;

        const description = (memoMatch?.[1] || nameMatch?.[1] || "Sem descrição").trim();

        entries.push({
          description,
          amount: Math.abs(amount),
          entry_date: entryDate,
          is_credit: amount > 0,
        });
      }
    }

    if (entries.length === 0) throw new Error("Nenhuma transação encontrada no OFX");
    return { entries, balanceInfo };
  };

  const handleImport = async () => {
    if (!file || preview.length === 0 || !selectedBankAccountId) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Parse full file
      let entries: ParsedEntry[] = [];
      let balanceInfo: OFXBalanceInfo = { ledgerBalance: null, balanceDate: null };
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const firstLine = text.split('\n')[0] || '';
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const results = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
        entries = parseCSVData(results.data as any[]);
      } else {
        const text = await file.text();
        const parsed = parseOFXDataWithBalance(text);
        entries = parsed.entries;
        balanceInfo = parsed.balanceInfo;
      }

      // First, create the import record
      const { data: importRecord, error: importError } = await supabase
        .from("bank_statement_imports")
        .insert({
          broker_id: user.id,
          bank_account_id: selectedBankAccountId,
          file_name: file.name,
          file_type: fileExtension,
          entries_count: entries.length,
        })
        .select()
        .single();

      if (importError) throw importError;

      // Insert entries linked to the import
      const insertData = entries.map((entry) => ({
        broker_id: user.id,
        bank_account_id: selectedBankAccountId,
        description: entry.description,
        amount: entry.amount,
        entry_date: entry.entry_date,
        is_credit: entry.is_credit,
        import_id: importRecord.id,
      }));

      const { error } = await supabase.from("bank_statement_entries").insert(insertData);
      if (error) throw error;

      // Update bank account with extracted balance if available (OFX only)
      if (balanceInfo.ledgerBalance !== null && balanceInfo.balanceDate) {
        const { error: updateError } = await supabase
          .from("bank_accounts")
          .update({
            last_reconciled_balance: balanceInfo.ledgerBalance,
            last_reconciled_date: balanceInfo.balanceDate,
          })
          .eq("id", selectedBankAccountId);

        if (updateError) {
          console.error("Failed to update bank account balance:", updateError);
        } else {
          // Invalidate bank accounts cache to refresh data
          queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
        }
      }

      const balanceMessage = balanceInfo.ledgerBalance !== null 
        ? ` Saldo do extrato: R$ ${balanceInfo.ledgerBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : "";

      toast({ 
        title: `${entries.length} entradas importadas com sucesso!${balanceMessage}`,
      });
      setImportComplete(true);
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview([]);
    setError(null);
    setDuplicateWarning(null);
    setImportComplete(false);
    setExtractedBalance(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGoToReconciliation = () => {
    onSuccess();
    resetForm();
    onOpenChange(false);
    navigate("/finance/reconciliation");
  };

  const handleClose = () => {
    if (importComplete) {
      onSuccess();
    }
    resetForm();
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar Extrato</DialogTitle>
          <DialogDescription>
            Importe um arquivo CSV ou OFX do seu banco
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bank Account Selector */}
          <div className="space-y-2">
            <Label>Conta Bancária</Label>
            <Select
              value={selectedBankAccountId}
              onValueChange={setSelectedBankAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} {acc.bank_name && `- ${acc.bank_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Arquivo</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.ofx"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSV ou OFX</p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Balance Info (OFX only) */}
          {extractedBalance && extractedBalance.ledgerBalance !== null && (
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                <span className="font-medium">Saldo detectado no OFX:</span>{" "}
                {formatCurrency(extractedBalance.ledgerBalance)}
                {extractedBalance.balanceDate && (
                  <span className="text-xs ml-2">
                    (em {new Date(extractedBalance.balanceDate + "T12:00:00").toLocaleDateString("pt-BR")})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {duplicateWarning}
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Pré-visualização</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((entry, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{entry.entry_date}</td>
                        <td className="p-2 truncate max-w-[150px]">{entry.description}</td>
                        <td
                          className={`p-2 text-right font-medium ${
                            entry.is_credit ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {entry.is_credit ? "+" : "-"}
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Mostrando as primeiras 5 entradas
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {importComplete ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={handleGoToReconciliation} className="gap-2">
                Ir para Conciliação
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={isLoading || preview.length === 0}>
                {isLoading ? "Importando..." : "Importar Extrato"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}