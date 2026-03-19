import type { Db } from "./db/client";
import type { Profile } from "./db/schema";
import type { User } from "./lib/supabase";

export type Bindings = {
  HYPERDRIVE: { connectionString: string };
  LESSON_PLANS: R2Bucket;
  QUESTION_BANKS: R2Bucket;
  STUDENT_UPLOADS: R2Bucket;
  EXPORTS: R2Bucket;
  AVATARS: R2Bucket;
  ZHIPU_API_KEY: string;
  DASHSCOPE_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FRONTEND_URL: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
};

export type Variables = {
  user: User;
  profile: Profile;
  db: Db;
};

export type AppContext = {
  Bindings: Bindings;
  Variables: Variables;
};
