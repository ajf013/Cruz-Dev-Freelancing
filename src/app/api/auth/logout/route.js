import { NextResponse } from "next/server";

export async function GET(request) {
  const adminPath = process.env.ADMIN_PATH || "/admin";
  const redirectUrl = new URL(adminPath, request.url);
  const response = NextResponse.redirect(redirectUrl);

  // Clear session cookie
  response.cookies.set("cruzdev_admin_session", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
