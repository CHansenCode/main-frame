import { NextResponse } from "next/server";

import { verifyCredentials } from "@/lib/credentials";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = body?.username;
  const password = body?.password;

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "username and password are required" }, { status: 400 });
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = await signMobileToken(user);
  return NextResponse.json({
    token,
    user: { username: user.username, displayName: user.displayName },
  });
}
