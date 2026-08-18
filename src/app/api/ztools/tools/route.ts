import { jsonOk } from '@/lib/api';
import { listZtoolsTools, ztoolsPublicToolUrl } from '@/lib/ztools';

/** Public catalog of tools available for self-registration. */
export async function GET() {
  const tools = await listZtoolsTools();
  return jsonOk({
    tools: tools.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      icon: t.icon,
      route_path: t.route_path,
      url: ztoolsPublicToolUrl(t.route_path),
    })),
  });
}
