import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { registerZtoolsUser } from '@/lib/ztools';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(10),
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  requested_tool_ids: z.array(z.number().int().positive()).min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request));
    const id = await registerZtoolsUser(body);
    return jsonOk(
      {
        id,
        message:
          'Registration submitted. An admin will verify your request and approve your tool access. You can sign in once approved.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('Invalid payload — password min 10 chars, select at least one tool', 400);
    }
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return jsonError('An account with this email already exists', 409);
    }
    if (error instanceof Error && error.message === 'TOOLS_REQUIRED') {
      return jsonError('Select at least one tool', 400);
    }
    console.error(error);
    return jsonError('Registration failed', 500);
  }
}
