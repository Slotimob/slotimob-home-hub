import { format } from 'date-fns';

export function buildReportFileName(opts: {
  reportKey: string;
  dateRange?: { from: Date; to: Date };
  extra?: string;
}): string {
  const slug = opts.reportKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const date = opts.dateRange
    ? `${format(opts.dateRange.from, 'yyyyMMdd')}-${format(opts.dateRange.to, 'yyyyMMdd')}`
    : format(new Date(), 'yyyyMMdd');
  const extra = opts.extra ? `-${opts.extra.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}` : '';
  return `slotimob-${slug}-${date}${extra}`;
}
