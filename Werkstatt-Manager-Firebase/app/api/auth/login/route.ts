import { adminAuth } from "../../../../lib/firebase-admin";

export async function POST(request: Request) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey)
    return Response.json(
      { error: "In Firebase fehlt FIREBASE_WEB_API_KEY." },
      { status: 503 },
    );
  const payload = (await request.json()) as { email?: string; password?: string };
  const identityResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: payload.email?.trim(),
        password: payload.password,
        returnSecureToken: true,
      }),
    },
  );
  if (!identityResponse.ok)
    return Response.json({ error: "E-Mail-Adresse oder Passwort ist nicht korrekt." }, { status: 401 });
  const identity = (await identityResponse.json()) as { idToken: string };
  const token = await adminAuth.createSessionCookie(identity.idToken, {
    expiresIn: 14 * 24 * 60 * 60 * 1000,
  });
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `werkstatt_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600`,
        "Cache-Control": "no-store",
      },
    },
  );
}
