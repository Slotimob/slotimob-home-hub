import { generateAssetReportPdf } from '@/utils/assetReportPdfGenerator';
import type { AssetReportData, AssetReportAsset } from '@/lib/asset-report-data';
import fs from 'fs';

const mkAsset = (i: number): AssetReportAsset => ({
  id: 'a'+i, type: i%2 ? 'unit':'property', name: `Edifício Solar das Águas — Unidade ${i}0${i}`,
  address: 'Rua das Acácias, 123 — Centro, São Paulo/SP',
  acquisition: { value: 400000, date: '2021-03-15', costs: 22000, total_invested: 465000, notes: 'Compra via financiamento Caixa.' },
  improvements: { items: [
    { id:'i1', type:'Reforma', description:'Reforma completa da cozinha e banheiros', cost: 28000, completed_at:'2026-02-10', affects_market_value:true },
    { id:'i2', type:'Pintura', description:'Pintura externa', cost: 15000, completed_at:'2026-03-01', affects_market_value:true },
  ], total: 43000 },
  market: { current_value: 615000, last_updated:'2026-07-01', history_series: [], appreciation_abs: 150000, appreciation_pct: 32.26 },
  period: {
    income_total: 42000, expenses_total: 13500,
    expenses_by_category: { condominio: 6000, iptu: 4200, manutencao: 3300 },
    top_expenses: [
      { description:'Taxa condominial mês 03', amount: 1200, date:'2026-03-05', category:'condominio' },
      { description:'IPTU parcela 4', amount: 1050, date:'2026-04-10', category:'iptu' },
    ],
    activities_count: 3,
    activities_by_type: {},
    activities_items: [
      { date:'2026-06-12T14:32:00Z', group:'Contratos', description:'Aluguel reajustado de R$ 2.500,00 para R$ 2.613,45 (+4,538%)', user_name:'Maria Fernanda Souza', changes:[{label:'Valor do aluguel', from:'R$ 2.500,00', to:'R$ 2.613,45'},{label:'Índice', from:'IGP-M', to:'IPCA'}], action:'UPDATE', table_label:'Contrato' },
      { date:'2026-05-02T09:10:00Z', group:'Documentos', description:'Documento "Contrato assinado.pdf" adicionado', user_name:'João Pedro', changes:[], action:'INSERT', table_label:'Documento' },
      { date:'2026-04-20T18:00:00Z', group:'Notas manuais', description:'Vistoria semestral realizada', user_name:'Sistema', changes:[], action:null, table_label:'Nota manual' },
    ],
    maintenance_items: [
      { id:'m1', date:'2026-06-01', activity_type:'manutencao', type_label:'Manutenção', title:'Troca do motor do portão', description:null, responsible:'Eletro Serviços Ltda', estimated_cost: 1200, has_transaction:true, attachments_count:2, is_completed:true, completed_at:'2026-06-03', outcome:null, group_size:1 },
      { id:'m2', date:'2026-06-20', activity_type:'vistoria', type_label:'Vistoria', title:'Vistoria de saída', description:null, responsible:null, estimated_cost: null, has_transaction:false, attachments_count:0, is_completed:false, completed_at:null, outcome:null, group_size:1 },
    ],
    maintenance_count: 2, maintenance_pending_count: 1, maintenance_by_type: {}, maintenance_estimated_cost: 1200,
    roi_pct: 6.13, monthly_yield: 0.51, cap_rate: 5.56,
  },
});

function build(n: number): AssetReportData {
  const assets = Array.from({length:n}, (_,i)=>mkAsset(i+1));
  return {
    generated_at: new Date().toISOString(),
    period: { from:'2026-01-01', to:'2026-08-18' },
    summary: { total_assets:n, total_invested:465000*n, total_market_value:615000*n, total_appreciation_abs:150000*n, total_appreciation_pct:32.26, period_income:42000*n, period_expenses:13500*n, period_net:28500*n, period_roi_pct:6.13, monthly_yield_avg:0.51, cap_rate_avg:5.56 },
    assets,
  };
}

const saved: Record<string,Uint8Array> = {};
(globalThis as any).__save = saved;

for (const [name, n] of [['single',1],['multi',3]] as [string,number][]) {
  const jsPDFmod = await import('jspdf');
  const origSave = jsPDFmod.default.prototype.save;
  jsPDFmod.default.prototype.save = function() {
    fs.writeFileSync(`/tmp/qa/${name}.pdf`, Buffer.from(this.output('arraybuffer')));
    return this;
  };
  await generateAssetReportPdf(build(n));
  jsPDFmod.default.prototype.save = origSave;
}
console.log('ok');
