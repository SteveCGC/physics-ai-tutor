export type User = {
  id: string;
  aud: string;
  role?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  phone?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<Record<string, unknown>>;
  created_at?: string;
  updated_at?: string;
  is_anonymous?: boolean;
};

type SupabaseAuthResponse = {
  user: User | null;
};

type SupabaseErrorResponse = {
  msg?: string;
  error_description?: string;
  error?: string;
};

export function createSupabaseClient(url: string, anonKey: string) {
  return {
    auth: {
      async getUser(token: string) {
        const response = await fetch(`${url}/auth/v1/user`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as SupabaseErrorResponse | null;

          return {
            data: { user: null },
            error: new Error(body?.msg ?? body?.error_description ?? body?.error ?? "Unauthorized"),
          };
        }

        const user = (await response.json()) as User;
        return {
          data: { user: user satisfies SupabaseAuthResponse["user"] },
          error: null,
        };
      },
    },
  };
}
