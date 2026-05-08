import { getParentClient } from './supabase';

export async function getParentFirstName(): Promise<string | null> {
  const { data } = await getParentClient().auth.getSession();
  const md = data.session?.user?.user_metadata ?? {};
  const raw: string | undefined = md.full_name ?? md.name ?? md.given_name;
  if (!raw) return null;
  const first = String(raw).trim().split(/\s+/)[0];
  return first || null;
}
