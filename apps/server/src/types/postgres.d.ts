declare module "postgres" {
  export type Options = {
    prepare?: boolean;
  };

  export interface Sql<T extends Record<string, never> = Record<string, never>> {
    options?: Options;
  }

  export default function postgres(connectionString: string, options?: Options): Sql;
}
