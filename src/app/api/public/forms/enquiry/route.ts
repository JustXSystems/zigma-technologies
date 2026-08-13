import { jsonError, jsonOk } from '@/lib/api';
import { getDefaultForm } from '@/lib/catalog';

export async function GET() {
  try {
    const form = await getDefaultForm();
    if (!form) return jsonError('Form not configured', 404);
    return jsonOk({
      form: {
        id: form.id,
        form_key: form.form_key,
        name: form.name,
        fields: (form.fields || []).filter((f) => f.enabled),
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load form', 500);
  }
}
