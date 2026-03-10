import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Users, Building2, Home } from 'lucide-react';
import Papa from 'papaparse';
import { readExcelFileRaw } from '@/utils/excelUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type UnitStatus = Database['public']['Enums']['unit_status'];

interface ImportUnitsDialogProps {
  propertyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  standalone?: boolean;
}

interface ImportRow {
  // Unit fields
  numero_unidade: string;
  status: string;
  tipo_imovel?: string;
  condicao?: string;
  preco?: string;
  preco_locacao?: string;
  area_m2?: string;
  area_total?: string;
  quartos?: string;
  suites?: string;
  banheiros?: string;
  vagas?: string;
  condominio?: string;
  iptu?: string;
  mobiliado?: string;
  orientacao_solar?: string;
  descricao?: string;
  email_proprietario?: string;
  nome_empreendimento?: string;
  habilitar_gestao?: string;
  tags?: string;
  // Location fields (for standalone)
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  // Property/Development fields (for creating properties)
  construtora?: string;
  estagio_obra?: string;
  data_entrega?: string;
  area_terreno?: string;
  numero_torres?: string;
  total_unidades?: string;
  amenidades?: string;
  seguranca?: string;
  sustentabilidade?: string;
  tecnologia?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportSummary {
  unitsCreated: number;
  ownersLinked: number;
  ownersCreated: number;
  propertiesCreated: number;
}

const STATUS_MAP: Record<string, UnitStatus> = {
  'disponivel': 'available',
  'disponível': 'available',
  'available': 'available',
  'reservado': 'reserved',
  'reserved': 'reserved',
  'alugado': 'rented',
  'rented': 'rented',
  'vendido': 'sold',
  'sold': 'sold',
};

const PROPERTY_TYPES = ['apartamento', 'casa', 'terreno', 'sala_comercial', 'loja', 'galpao', 'rural', 'outros'];
const CONDITIONS = ['construcao', 'na_planta', 'novo', 'usado'];

export const ImportUnitsDialog = ({ propertyId, open, onOpenChange, onSuccess, standalone = false }: ImportUnitsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId || '');
  const [importType, setImportType] = useState<'empreendimento' | 'avulso'>(standalone ? 'avulso' : 'empreendimento');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const loadProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar empreendimentos',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Reset state when dialog opens to ensure correct mode
  useEffect(() => {
    if (open) {
      // Set import type based on mode
      if (standalone) {
        setImportType('avulso');
      } else if (propertyId) {
        setImportType('empreendimento');
        setSelectedPropertyId(propertyId);
      } else {
        // Default to empreendimento when opened from Units page
        setImportType('empreendimento');
      }
      
      // Load properties for empreendimento imports
      if (!standalone) {
        loadProperties();
      }
      
      // Clear file state when opening
      setSelectedFile(null);
      setPreviewData([]);
      setValidationResult(null);
      setImportSummary(null);
    }
  }, [open, standalone, propertyId, loadProperties]);

  const effectivePropertyId = propertyId || selectedPropertyId;

  const downloadTemplate = () => {
    // Template for empreendimento imports - includes all unit fields + property creation fields
    const empreendimentoTemplate = [
      {
        numero_unidade: '101',
        status: 'disponivel',
        tipo_imovel: 'apartamento',
        condicao: 'novo',
        preco: '350000.00',
        preco_locacao: '',
        area_m2: '75.50',
        area_total: '85.00',
        quartos: '2',
        suites: '1',
        banheiros: '1',
        vagas: '1',
        condominio: '450.00',
        iptu: '1200.00',
        mobiliado: 'nao',
        orientacao_solar: 'norte',
        descricao: 'Apartamento com vista',
        email_proprietario: 'proprietario@email.com',
        nome_empreendimento: 'Residencial Aurora',
        habilitar_gestao: 'sim',
        tags: 'alto padrão,vista mar',
        // Property fields (used when creating new empreendimento)
        construtora: 'Construtora XYZ',
        estagio_obra: 'em_obras',
        data_entrega: '2026-12-01',
        area_terreno: '5000',
        numero_torres: '2',
        total_unidades: '120',
        amenidades: 'piscina_adulto,academia,salao_festas,portaria_24h',
        seguranca: 'Portaria 24h, CFTV, acesso biométrico',
        sustentabilidade: 'Captação água pluvial, energia solar',
        tecnologia: 'Tomadas USB, automação',
      },
      {
        numero_unidade: '102',
        status: 'reservado',
        tipo_imovel: 'apartamento',
        condicao: 'novo',
        preco: '380000.00',
        preco_locacao: '2500.00',
        area_m2: '82.00',
        area_total: '95.00',
        quartos: '3',
        suites: '1',
        banheiros: '2',
        vagas: '2',
        condominio: '480.00',
        iptu: '1400.00',
        mobiliado: 'nao',
        orientacao_solar: 'leste',
        descricao: '',
        email_proprietario: '',
        nome_empreendimento: 'Residencial Aurora',
        habilitar_gestao: 'nao',
        tags: '',
        construtora: '',
        estagio_obra: '',
        data_entrega: '',
        area_terreno: '',
        numero_torres: '',
        total_unidades: '',
        amenidades: '',
        seguranca: '',
        sustentabilidade: '',
        tecnologia: '',
      },
    ];

    // Template for avulso imports - includes location fields
    const avulsoTemplate = [
      {
        numero_unidade: 'Apto 101',
        status: 'disponivel',
        tipo_imovel: 'apartamento',
        condicao: 'novo',
        preco: '350000.00',
        preco_locacao: '2000.00',
        area_m2: '75.50',
        area_total: '85.00',
        quartos: '2',
        suites: '1',
        banheiros: '1',
        vagas: '1',
        condominio: '450.00',
        iptu: '1200.00',
        mobiliado: 'nao',
        orientacao_solar: 'norte',
        descricao: 'Apartamento com vista',
        email_proprietario: 'proprietario@email.com',
        habilitar_gestao: 'sim',
        tags: 'oportunidade,pronto',
        cep: '01310-100',
        endereco: 'Av. Paulista, 1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      {
        numero_unidade: 'Casa 02',
        status: 'disponivel',
        tipo_imovel: 'casa',
        condicao: 'usado',
        preco: '520000.00',
        preco_locacao: '',
        area_m2: '120.00',
        area_total: '250.00',
        quartos: '4',
        suites: '2',
        banheiros: '3',
        vagas: '2',
        condominio: '',
        iptu: '2400.00',
        mobiliado: 'parcial',
        orientacao_solar: 'sul',
        descricao: '',
        email_proprietario: '',
        habilitar_gestao: 'nao',
        tags: 'amplo quintal',
        cep: '01311-200',
        endereco: 'Rua Augusta, 500',
        bairro: 'Consolação',
        cidade: 'São Paulo',
        estado: 'SP',
      },
    ];

    const template = importType === 'empreendimento' ? empreendimentoTemplate : avulsoTemplate;

    const csv = Papa.unparse(template as Record<string, string>[], {
      delimiter: ',',
      header: true,
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = importType === 'empreendimento' 
      ? 'modelo_importacao_unidades.csv' 
      : 'modelo_importacao_imoveis_avulsos.csv';
    link.click();

    toast({
      title: 'Modelo baixado!',
      description: 'Use este arquivo como referência para importar.',
    });
  };

  const validateRow = (row: ImportRow, index: number): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lineNum = index + 2;

    if (!row.numero_unidade || row.numero_unidade.trim() === '') {
      errors.push(`Linha ${lineNum}: Número da unidade é obrigatório`);
    }

    if (!row.status || row.status.trim() === '') {
      errors.push(`Linha ${lineNum}: Status é obrigatório`);
    } else {
      const statusLower = row.status.toLowerCase().trim();
      if (!STATUS_MAP[statusLower]) {
        errors.push(`Linha ${lineNum}: Status inválido "${row.status}". Use: disponivel, reservado, alugado ou vendido`);
      }
    }

    if (row.tipo_imovel && !PROPERTY_TYPES.includes(row.tipo_imovel.toLowerCase().trim())) {
      warnings.push(`Linha ${lineNum}: Tipo de imóvel "${row.tipo_imovel}" não reconhecido`);
    }

    if (row.condicao && !CONDITIONS.includes(row.condicao.toLowerCase().trim())) {
      warnings.push(`Linha ${lineNum}: Condição "${row.condicao}" não reconhecida`);
    }

    if (row.preco && isNaN(parseFloat(row.preco))) {
      errors.push(`Linha ${lineNum}: Preço deve ser um número válido`);
    }

    if (row.area_m2 && isNaN(parseFloat(row.area_m2))) {
      errors.push(`Linha ${lineNum}: Área deve ser um número válido`);
    }

    ['quartos', 'banheiros', 'vagas'].forEach(field => {
      const value = row[field as keyof ImportRow];
      if (value && isNaN(parseInt(String(value)))) {
        errors.push(`Linha ${lineNum}: ${field} deve ser um número inteiro válido`);
      }
    });

    ['condominio', 'iptu'].forEach(field => {
      const value = row[field as keyof ImportRow];
      if (value && isNaN(parseFloat(String(value)))) {
        errors.push(`Linha ${lineNum}: ${field} deve ser um número válido`);
      }
    });

    // Validate email format if provided
    if (row.email_proprietario && row.email_proprietario.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email_proprietario.trim())) {
        warnings.push(`Linha ${lineNum}: Email do proprietário "${row.email_proprietario}" parece inválido`);
      }
    }

    return { errors, warnings };
  };

  const parseFile = async (file: File): Promise<ImportRow[]> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      return parsed.data as ImportRow[];
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const { rows } = await readExcelFileRaw(file);
      return rows.map((row: Record<string, unknown>) => {
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null) return String(row[key]);
          }
          return '';
        };

        return {
          // Unit fields
          numero_unidade: getValue(['numero_unidade', 'Numero_Unidade', 'NUMERO_UNIDADE']),
          status: getValue(['status', 'Status', 'STATUS']),
          tipo_imovel: getValue(['tipo_imovel', 'Tipo_Imovel', 'TIPO_IMOVEL']),
          condicao: getValue(['condicao', 'Condicao', 'CONDICAO']),
          preco: getValue(['preco', 'Preco', 'PRECO']),
          preco_locacao: getValue(['preco_locacao', 'Preco_Locacao', 'PRECO_LOCACAO']),
          area_m2: getValue(['area_m2', 'Area_m2', 'AREA_M2']),
          area_total: getValue(['area_total', 'Area_Total', 'AREA_TOTAL']),
          quartos: getValue(['quartos', 'Quartos', 'QUARTOS']),
          suites: getValue(['suites', 'Suites', 'SUITES']),
          banheiros: getValue(['banheiros', 'Banheiros', 'BANHEIROS']),
          vagas: getValue(['vagas', 'Vagas', 'VAGAS']),
          condominio: getValue(['condominio', 'Condominio', 'CONDOMINIO']),
          iptu: getValue(['iptu', 'Iptu', 'IPTU']),
          mobiliado: getValue(['mobiliado', 'Mobiliado', 'MOBILIADO']),
          orientacao_solar: getValue(['orientacao_solar', 'Orientacao_Solar', 'ORIENTACAO_SOLAR']),
          descricao: getValue(['descricao', 'Descricao', 'DESCRICAO']),
          email_proprietario: getValue(['email_proprietario', 'Email_Proprietario', 'EMAIL_PROPRIETARIO']),
          nome_empreendimento: getValue(['nome_empreendimento', 'Nome_Empreendimento', 'NOME_EMPREENDIMENTO']),
          habilitar_gestao: getValue(['habilitar_gestao', 'Habilitar_Gestao', 'HABILITAR_GESTAO']),
          tags: getValue(['tags', 'Tags', 'TAGS']),
          // Location fields
          cep: getValue(['cep', 'Cep', 'CEP']),
          endereco: getValue(['endereco', 'Endereco', 'ENDERECO']),
          bairro: getValue(['bairro', 'Bairro', 'BAIRRO']),
          cidade: getValue(['cidade', 'Cidade', 'CIDADE']),
          estado: getValue(['estado', 'Estado', 'ESTADO']),
          // Property fields
          construtora: getValue(['construtora', 'Construtora', 'CONSTRUTORA']),
          estagio_obra: getValue(['estagio_obra', 'Estagio_Obra', 'ESTAGIO_OBRA']),
          data_entrega: getValue(['data_entrega', 'Data_Entrega', 'DATA_ENTREGA']),
          area_terreno: getValue(['area_terreno', 'Area_Terreno', 'AREA_TERRENO']),
          numero_torres: getValue(['numero_torres', 'Numero_Torres', 'NUMERO_TORRES']),
          total_unidades: getValue(['total_unidades', 'Total_Unidades', 'TOTAL_UNIDADES']),
          amenidades: getValue(['amenidades', 'Amenidades', 'AMENIDADES']),
          seguranca: getValue(['seguranca', 'Seguranca', 'SEGURANCA']),
          sustentabilidade: getValue(['sustentabilidade', 'Sustentabilidade', 'SUSTENTABILIDADE']),
          tecnologia: getValue(['tecnologia', 'Tecnologia', 'TECNOLOGIA']),
        };
      });
    }
    
    throw new Error('Formato não suportado. Use arquivos CSV ou Excel (.xlsx, .xls)');
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setValidationResult(null);
    setPreviewData([]);
    setImportSummary(null);

    try {
      const data = await parseFile(file);
      setPreviewData(data.slice(0, 5));

      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      
      data.forEach((row, index) => {
        const { errors, warnings } = validateRow(row, index);
        allErrors.push(...errors);
        allWarnings.push(...warnings);
      });

      setValidationResult({
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
      });
    } catch (error: any) {
      setValidationResult({
        isValid: false,
        errors: [error.message],
        warnings: [],
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const findOrCreateOwner = async (email: string): Promise<{ id: string; created: boolean } | null> => {
    if (!email || !email.trim()) return null;

    const normalizedEmail = email.trim().toLowerCase();

    // First, search in owners table
    const { data: existingOwner } = await supabase
      .from('owners')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingOwner) {
      return { id: existingOwner.id, created: false };
    }

    // Create new owner
    const { data: newOwner, error } = await supabase
      .from('owners')
      .insert({
        broker_id: effectiveBrokerId,
        name: normalizedEmail.split('@')[0], // Use email prefix as name
        email: normalizedEmail,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating owner:', error);
      return null;
    }

    return { id: newOwner.id, created: true };
  };

  const findOrCreateProperty = async (name: string, row: ImportRow): Promise<{ id: string; created: boolean } | null> => {
    if (!name || !name.trim()) return null;

    const normalizedName = name.trim();

    // Search for existing property
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('id')
      .ilike('name', normalizedName)
      .maybeSingle();

    if (existingProperty) {
      return { id: existingProperty.id, created: false };
    }

    // Parse amenities from comma-separated string
    const amenities = row.amenidades?.trim() 
      ? row.amenidades.split(',').map(a => a.trim()).filter(a => a)
      : null;

    // Create new property with all available fields from import
    const { data: newProperty, error } = await supabase
      .from('properties')
      .insert({
        broker_id: effectiveBrokerId,
        name: normalizedName,
        builder_name: row.construtora?.trim() || null,
        construction_stage: row.estagio_obra?.trim() || null,
        delivery_date: row.data_entrega?.trim() || null,
        total_land_area: row.area_terreno ? parseFloat(row.area_terreno) : null,
        number_of_towers: row.numero_torres ? parseInt(row.numero_torres) : null,
        total_units_count: row.total_unidades ? parseInt(row.total_unidades) : null,
        amenities: amenities,
        security_features: row.seguranca?.trim() || null,
        sustainability_features: row.sustentabilidade?.trim() || null,
        technology_features: row.tecnologia?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return null;
    }

    return { id: newProperty.id, created: true };
  };

  const handleImport = async () => {
    if (!selectedFile || !validationResult?.isValid) return;

    // For empreendimento imports without a property from CSV, require selection
    if (importType === 'empreendimento' && !effectivePropertyId) {
      // Check if all rows have nome_empreendimento
      const data = await parseFile(selectedFile);
      const hasPropertyInFile = data.every(row => row.nome_empreendimento?.trim());
      
      if (!hasPropertyInFile) {
        toast({
          title: 'Selecione um empreendimento',
          description: 'É necessário selecionar um empreendimento ou preencher a coluna nome_empreendimento no arquivo.',
          variant: 'destructive',
        });
        return;
      }
    }

    setImporting(true);
    setImportSummary(null);

    try {
      const data = await parseFile(selectedFile);
      
      const summary: ImportSummary = {
        unitsCreated: 0,
        ownersLinked: 0,
        ownersCreated: 0,
        propertiesCreated: 0,
      };

      // Cache for owners and properties to avoid duplicate lookups
      const ownerCache = new Map<string, string>();
      const propertyCache = new Map<string, string>();

      const units = [];

      for (const row of data) {
        // Handle owner lookup/creation
        let ownerId: string | null = null;
        if (row.email_proprietario?.trim()) {
          const email = row.email_proprietario.trim().toLowerCase();
          
          if (ownerCache.has(email)) {
            ownerId = ownerCache.get(email)!;
            summary.ownersLinked++;
          } else {
            const ownerResult = await findOrCreateOwner(email);
            if (ownerResult) {
              ownerId = ownerResult.id;
              ownerCache.set(email, ownerId);
              if (ownerResult.created) {
                summary.ownersCreated++;
              } else {
                summary.ownersLinked++;
              }
            }
          }
        }

        // Determine property ID - for standalone units, property_id is NULL
        let unitPropertyId: string | null = null;
        
        if (importType === 'avulso') {
          // Standalone units don't belong to any property
          unitPropertyId = null;
        } else if (effectivePropertyId) {
          unitPropertyId = effectivePropertyId;
        } else if (row.nome_empreendimento?.trim()) {
          const propName = row.nome_empreendimento.trim();
          
          if (propertyCache.has(propName)) {
            unitPropertyId = propertyCache.get(propName)!;
          } else {
            const propResult = await findOrCreateProperty(propName, row);
            if (propResult) {
              unitPropertyId = propResult.id;
              propertyCache.set(propName, unitPropertyId);
              if (propResult.created) {
                summary.propertiesCreated++;
              }
            } else {
              // If no property found/created, this is an error for non-standalone
              throw new Error(`Não foi possível criar/encontrar o empreendimento "${propName}"`);
            }
          }
        } else {
          // For empreendimento imports without property, require selection
          throw new Error('Para importar unidades de empreendimento, selecione um empreendimento ou inclua a coluna nome_empreendimento no arquivo.');
        }

        // Parse is_managed from habilitar_gestao field
        const isManaged = row.habilitar_gestao 
          ? ['sim', 'yes', 'true', '1', 's'].includes(row.habilitar_gestao.toLowerCase().trim())
          : false;

        // Parse tags from comma-separated string
        const tags = row.tags?.trim() 
          ? row.tags.split(',').map(t => t.trim()).filter(t => t)
          : [];

        units.push({
          property_id: unitPropertyId,
          broker_id: effectiveBrokerId,
          unit_number: row.numero_unidade.trim(),
          status: STATUS_MAP[row.status.toLowerCase().trim()],
          property_type: row.tipo_imovel ? row.tipo_imovel.toLowerCase().trim() : null,
          condition: row.condicao ? row.condicao.toLowerCase().trim() : null,
          price: row.preco ? parseFloat(String(row.preco)) : null,
          rent_price: row.preco_locacao ? parseFloat(String(row.preco_locacao)) : null,
          area: row.area_m2 ? parseFloat(String(row.area_m2)) : null,
          bedrooms: row.quartos ? parseInt(String(row.quartos)) : null,
          suites: row.suites ? parseInt(String(row.suites)) : null,
          bathrooms: row.banheiros ? parseInt(String(row.banheiros)) : null,
          parking_spots: row.vagas ? parseInt(String(row.vagas)) : 0,
          condo_fee: row.condominio ? parseFloat(String(row.condominio)) : null,
          iptu: row.iptu ? parseFloat(String(row.iptu)) : null,
          furnished: row.mobiliado ? row.mobiliado.toLowerCase().trim() : null,
          solar_orientation: row.orientacao_solar ? row.orientacao_solar.toLowerCase().trim() : null,
          description: row.descricao?.trim() || null,
          is_standalone: importType === 'avulso',
          is_managed: isManaged,
          owner_id: ownerId,
          tags: tags.length > 0 ? tags : [],
          // Location fields for standalone
          postal_code: row.cep?.trim() || null,
          address: row.endereco?.trim() || null,
          neighborhood: row.bairro?.trim() || null,
          city: row.cidade?.trim() || null,
          state: row.estado?.trim() || null,
        });
      }

      // Insert units
      const { error } = await supabase.from('units').insert(units);

      if (error) throw error;

      summary.unitsCreated = units.length;
      setImportSummary(summary);

      // Save import history for empreendimento imports
      if (importType === 'empreendimento' && effectivePropertyId) {
        await supabase.from('import_history').insert({
          broker_id: user?.id,
          property_id: effectivePropertyId,
          file_name: selectedFile.name,
          file_type: selectedFile.name.split('.').pop() || 'unknown',
          units_imported: units.length,
        });
      }

      toast({
        title: 'Importação concluída!',
        description: `${summary.unitsCreated} unidades, ${summary.ownersLinked + summary.ownersCreated} proprietários vinculados, ${summary.propertiesCreated} empreendimentos criados.`,
      });

      // Keep dialog open to show summary
    } catch (error: any) {
      toast({
        title: 'Erro ao importar unidades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setValidationResult(null);
    setImportSummary(null);
    if (!propertyId) {
      setSelectedPropertyId('');
    }
    // Reset import type based on mode
    setImportType(standalone ? 'avulso' : 'empreendimento');
  };

  const closeAndReset = () => {
    resetDialog();
    onOpenChange(false);
    if (importSummary && importSummary.unitsCreated > 0) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) closeAndReset();
      else onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {standalone ? 'Importar Imóveis Avulsos' : 'Importar Unidades'}
          </DialogTitle>
          <DialogDescription>
            {standalone 
              ? 'Importe múltiplos imóveis avulsos de uma vez usando arquivos CSV ou Excel'
              : 'Importe múltiplas unidades de uma vez usando arquivos CSV ou Excel'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Summary (shown after successful import) */}
          {importSummary && (
            <Alert className="border-green-500/50 bg-green-500/5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <div className="space-y-2 text-green-700 dark:text-green-400">
                  <p className="font-semibold">Importação concluída com sucesso!</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>{importSummary.unitsCreated} unidades criadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{importSummary.ownersLinked + importSummary.ownersCreated} proprietários vinculados</span>
                    </div>
                    {importSummary.ownersCreated > 0 && (
                      <div className="text-xs text-muted-foreground col-span-2">
                        ({importSummary.ownersCreated} novos proprietários criados)
                      </div>
                    )}
                    {importSummary.propertiesCreated > 0 && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{importSummary.propertiesCreated} novos empreendimentos</span>
                      </div>
                    )}
                  </div>
                  <Button onClick={closeAndReset} className="mt-2" size="sm">
                    Fechar
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Type Selection */}
          {!standalone && !propertyId && !importSummary && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Importação</Label>
              <RadioGroup
                value={importType}
                onValueChange={(v) => setImportType(v as 'empreendimento' | 'avulso')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="empreendimento" id="type-empreendimento" />
                  <Label htmlFor="type-empreendimento" className="cursor-pointer">
                    Unidades de Empreendimento
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avulso" id="type-avulso" />
                  <Label htmlFor="type-avulso" className="cursor-pointer">
                    Imóveis Avulsos
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Property Selector (for empreendimento imports without property from CSV) */}
          {importType === 'empreendimento' && !propertyId && !importSummary && (
            <div className="space-y-2">
              <Label>Empreendimento (opcional se definido no arquivo)</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o empreendimento ou use a coluna nome_empreendimento" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Download - Prominent */}
          {!importSummary && (
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <FileSpreadsheet className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-primary mb-1">
                      📥 Baixar Planilha Modelo {importType === 'avulso' ? '(Imóveis Avulsos)' : '(Unidades)'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {importType === 'avulso' 
                        ? 'Preencha a planilha com os dados dos imóveis avulsos incluindo endereço, cidade e estado. Use status "disponivel", "vendido", etc.'
                        : 'Preencha a planilha mantendo os cabeçalhos. Para unidades vendidas, use o status \'sold\'. Para valores monetários, use apenas números (ex: 350000.00).'
                      }
                    </p>
                  </div>
                </div>
                <Button onClick={downloadTemplate} variant="default" size="default" className="flex-shrink-0 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Modelo
                </Button>
              </div>
            </div>
          )}

          {/* Format Instructions */}
          {!importSummary && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Campos do Arquivo {importType === 'avulso' ? '(Imóveis Avulsos)' : '(Unidades de Empreendimento)'}:
              </h4>
              <div className="rounded-lg border border-border bg-card p-3 text-sm max-h-48 overflow-y-auto">
                <div className="grid gap-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">numero_unidade</span>
                    <span className="text-muted-foreground">- Identificação (obrigatório)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">status</span>
                    <span className="text-muted-foreground">- disponivel, reservado, alugado, vendido (obrigatório)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">tipo_imovel</span>
                    <span className="text-muted-foreground">- apartamento, casa, terreno, etc.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">condicao</span>
                    <span className="text-muted-foreground">- construcao, na_planta, novo, usado</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">preco, preco_locacao</span>
                    <span className="text-muted-foreground">- Valores monetários (ex: 350000.00)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">area_m2, condominio, iptu</span>
                    <span className="text-muted-foreground">- Valores numéricos</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">quartos, suites, banheiros, vagas</span>
                    <span className="text-muted-foreground">- Números inteiros</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">mobiliado</span>
                    <span className="text-muted-foreground">- sim, nao, parcial</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">orientacao_solar</span>
                    <span className="text-muted-foreground">- norte, sul, leste, oeste</span>
                  </div>
                  <div className="flex gap-2 text-primary">
                    <span className="font-mono">habilitar_gestao</span>
                    <span>- sim/nao: Ativa monitoramento em Gestão de Ativos</span>
                  </div>
                  <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                    <span className="font-mono">email_proprietario</span>
                    <span>- Busca/cria proprietário automaticamente</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-primary">tags</span>
                    <span className="text-muted-foreground">- Tags separadas por vírgula</span>
                  </div>
                  {importType === 'empreendimento' && (
                    <>
                      <div className="border-t border-border my-2 pt-2">
                        <span className="text-xs font-medium text-muted-foreground">Campos de Empreendimento:</span>
                      </div>
                      <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                        <span className="font-mono">nome_empreendimento</span>
                        <span>- Busca/cria empreendimento automaticamente</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-mono text-primary">construtora, estagio_obra, data_entrega</span>
                        <span className="text-muted-foreground">- Dados do empreendimento</span>
                      </div>
                    </>
                  )}
                  {importType === 'avulso' && (
                    <>
                      <div className="border-t border-border my-2 pt-2">
                        <span className="text-xs font-medium text-muted-foreground">Campos de Localização (Avulsos):</span>
                      </div>
                      <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                        <span className="font-mono">cep</span>
                        <span>- CEP do imóvel (ex: 01310-100)</span>
                      </div>
                      <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                        <span className="font-mono">endereco</span>
                        <span>- Endereço completo (rua e número)</span>
                      </div>
                      <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                        <span className="font-mono">bairro</span>
                        <span>- Bairro do imóvel</span>
                      </div>
                      <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                        <span className="font-mono">cidade</span>
                        <span>- Cidade</span>
                      </div>
                      <div className="flex gap-2 text-blue-600 dark:text-blue-400">
                        <span className="font-mono">estado</span>
                        <span>- Estado (ex: SP, RJ, MG)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dropzone */}
          {!importSummary && (
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/50 hover:bg-muted/80",
                  selectedFile && "border-green-500/50 bg-green-500/5"
                )}
              >
                <label htmlFor="file-upload-import" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique para trocar o arquivo
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                      </p>
                      <p className="text-xs text-muted-foreground">CSV, XLSX ou XLS</p>
                    </div>
                  )}
                  <input
                    id="file-upload-import"
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={importing}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && !importSummary && (
            <div className="space-y-3">
              {validationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Erros encontrados ({validationResult.errors.length}):</p>
                      <ul className="list-disc list-inside text-sm space-y-0.5 max-h-32 overflow-y-auto">
                        {validationResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <li className="text-muted-foreground">
                            ...e mais {validationResult.errors.length - 10} erros
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Avisos ({validationResult.warnings.length}):</p>
                      <ul className="list-disc list-inside text-sm space-y-0.5 max-h-20 overflow-y-auto">
                        {validationResult.warnings.slice(0, 5).map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.isValid && (
                <Alert className="border-green-500/50 bg-green-500/5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Arquivo válido! {previewData.length > 0 && `${previewData.length}+ unidades prontas para importar.`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!importSummary && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importing || !selectedFile || !validationResult?.isValid}
              >
                {importing ? 'Importando...' : 'Importar Unidades'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
