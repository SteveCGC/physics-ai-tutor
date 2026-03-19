import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type HyperdriveBinding = {
  connectionString: string;
};

export type DatabaseEnv = {
  HYPERDRIVE?: HyperdriveBinding;
  SUPABASE_DATABASE_URL?: string;
};

function getConnectionString(env?: DatabaseEnv): string {
  const connectionString = env?.HYPERDRIVE?.connectionString ?? env?.SUPABASE_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing PostgreSQL connection string. Set env.HYPERDRIVE or env.SUPABASE_DATABASE_URL."
    );
  }

  return connectionString;
}

export function createDb(env?: DatabaseEnv) {
  const client = postgres(getConnectionString(env), {
    prepare: false,
  });

  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
