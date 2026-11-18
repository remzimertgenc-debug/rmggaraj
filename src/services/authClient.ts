export interface AuthMeResponse {
  uid: string | null;
  email: string | null;
  dbUserId: number | null;
}

export async function fetchCurrentUserAccount(
  idToken: string,
  signal?: AbortSignal
): Promise<AuthMeResponse> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    signal,
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errBody.error ||
        `Hesap bilgileri sunucudan alınamadı (HTTP ${response.status}).`
    );
  }

  const data = (await response.json()) as Partial<AuthMeResponse>;
  return {
    uid: typeof data.uid === 'string' ? data.uid : null,
    email: typeof data.email === 'string' ? data.email : null,
    dbUserId: typeof data.dbUserId === 'number' ? data.dbUserId : null,
  };
}
