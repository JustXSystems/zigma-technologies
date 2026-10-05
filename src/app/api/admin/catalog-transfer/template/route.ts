import { requireSession } from '@/lib/auth';
import { getThemeSettings } from '@/lib/cms';
import { buildCatalogWorkbook, catalogTypesFrom, logExportJob } from '@/lib/catalog-transfer';
import { transferActor, transferRouteError, xlsxResponse } from '@/lib/catalog-transfer-route';
import { mergeSiteSettings } from '@/lib/site-settings';

/** GET ?types=product,service&mode=blank|data&examples=1&ids=4,9 → filled-in or blank import workbook. */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const params = new URL(request.url).searchParams;
    const types = catalogTypesFrom(params.get('types'));
    const withData = params.get('mode') !== 'blank';
    const examples = params.get('examples') === '1';
    const ids = String(params.get('ids') || '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 5_000);
    const site = mergeSiteSettings((await getThemeSettings()).site);
    const actor = transferActor(session);

    const { buffer, counts, fileName } = await buildCatalogWorkbook({ types, withData, examples, ids, companyName: site.companyName, actor });
    await logExportJob(actor, fileName, { types, withData, examples, counts, selected: ids.length || undefined }).catch((err) =>
      console.error('[catalog-transfer:template] log', err)
    );

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return xlsxResponse(buffer, fileName, { 'X-Export-Count': String(total) });
  } catch (error) {
    return transferRouteError(error, 'template');
  }
}
