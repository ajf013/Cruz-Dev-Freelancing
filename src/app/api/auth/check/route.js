import { NextResponse } from "next/server";
import { validateSessionToken } from "../../../../config/auth-helper";

export async function GET(request) {
  try {
    const sessionToken = request.cookies.get("cruzdev_admin_session")?.value;
    const session = validateSessionToken(sessionToken);

    const azureAdEnabled = !!process.env.AZURE_AD_CLIENT_ID;
    const clientId = process.env.AZURE_AD_CLIENT_ID || "";
    const tenantId = process.env.AZURE_AD_TENANT_ID || "common";
    const adminEmail = process.env.ADMIN_EMAIL || "";

    if (session) {
      // Enforce email check if ADMIN_EMAIL is configured
      if (adminEmail && session.email.toLowerCase() !== adminEmail.toLowerCase()) {
        return NextResponse.json({
          authenticated: false,
          azureAdEnabled,
          clientId,
          tenantId,
          error: "Unauthorized email address.",
        });
      }

      return NextResponse.json({
        authenticated: true,
        email: session.email,
        azureAdEnabled,
        clientId,
        tenantId,
      });
    }

    return NextResponse.json({
      authenticated: false,
      azureAdEnabled,
      clientId,
      tenantId,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
