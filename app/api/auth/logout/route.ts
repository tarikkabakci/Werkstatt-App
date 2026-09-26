export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": "werkstatt_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
        "Cache-Control": "no-store",
      },
    },
  );
}
