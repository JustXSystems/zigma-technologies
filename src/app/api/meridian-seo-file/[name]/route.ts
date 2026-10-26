import { GET as getSeoFile } from '../route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ name: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return getSeoFile(request, ctx);
}
