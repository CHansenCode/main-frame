import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { verifyCredentials } from "./credentials";

// For a future web login. The mobile app does not use this — it hits
// /api/mobile/login instead, since NextAuth's cookie-based session
// doesn't suit a bare fetch client. Both paths check the same users
// table (src/lib/credentials.ts).
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await verifyCredentials(credentials.username, credentials.password);
        if (!user) return null;
        return { id: String(user.id), name: user.displayName, username: user.username };
      },
    }),
  ],
  session: {
    // Required by the Credentials provider — NextAuth can't persist a
    // Credentials-based session server-side, only encode it in a JWT.
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
