import type { NextAuthOptions } from "next-auth";

// No providers are configured yet. Add one (e.g. GitHub, Google, Credentials)
// to src/lib/auth.ts once a provider has been decided on.
export const authOptions: NextAuthOptions = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
};
