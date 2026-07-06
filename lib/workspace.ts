export async function resolveWorkspaceAccess(): Promise<{
  ownerId: string | null;
  currentUserId: string | null;
  role: 'owner' | 'admin' | 'user' | 'worker' | null;
  blocked: boolean;
}> {
  try {
    const res = await fetch('/api/check-subscription-block');
    return await res.json();
  } catch {
    return { ownerId: null, currentUserId: null, role: null, blocked: false };
  }
}