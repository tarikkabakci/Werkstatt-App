import { configuredPassword, expectedSessionToken } from "../../../../lib/password-auth";

export async function POST(request: Request) {
  const configured = configuredPassword();
  if (!configured)
    return Response.json(
      { error: "In Netlify fehlt die Umgebungsvariable APP_PASSWORD." },
      { status: 503 },
    );
  const payload = (await request.json()) as { password?: string };
  if (payload.password !== configured)
    return Response.json({ error: "Das Passwort ist nicht korrekt." }, { status: 401 });
  const token = await expectedSessionToken();
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `werkstatt_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
        "Cache-Control": "no-store",
      },
    },
  );
}
