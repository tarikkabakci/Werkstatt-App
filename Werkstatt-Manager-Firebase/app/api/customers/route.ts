import { nextId, noCache, readState, updateState } from "../../../lib/netlify-data";

function values(payload: Record<string, string>) {
  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";
  const street = payload.street?.trim() ?? "";
  const postalCode = payload.postalCode?.trim() ?? "";
  const city = payload.city?.trim() ?? "";
  return {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" "),
    email: payload.email?.trim(),
    phone: payload.phone?.trim(),
    street,
    postalCode,
    city,
    address: [street, [postalCode, city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function GET() {
  const state = await readState();
  return Response.json(
    { customers: [...state.customers].sort((a, b) => b.id - a.id) },
    { headers: noCache },
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  const data = values(payload);
  if (!data.firstName || !data.lastName)
    return Response.json(
      { error: "Bitte Vorname und Nachname eingeben" },
      { status: 400 },
    );
  const customer = await updateState((state) => {
    const created = { id: nextId(state.customers), ...data };
    state.customers.push(created);
    return created;
  });
  return Response.json({ customer }, { status: 201 });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  const id = Number(payload.id);
  const data = values(payload);
  if (!Number.isInteger(id) || !data.firstName || !data.lastName)
    return Response.json({ error: "Ungültige Kundendaten" }, { status: 400 });
  const customer = await updateState((state) => {
    const index = state.customers.findIndex((item) => item.id === id);
    if (index < 0) return null;
    state.customers[index] = { ...state.customers[index], ...data };
    return state.customers[index];
  });
  return customer
    ? Response.json({ customer })
    : Response.json({ error: "Kunde wurde nicht gefunden" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id))
    return Response.json({ error: "Ungültige Kundennummer" }, { status: 400 });
  const result = await updateState((state) => {
    if (state.vehicles.some((vehicle) => vehicle.customerId === id))
      return "linked" as const;
    const before = state.customers.length;
    state.customers = state.customers.filter((item) => item.id !== id);
    return before === state.customers.length ? "missing" as const : "deleted" as const;
  });
  if (result === "linked")
    return Response.json(
      { error: "Bitte zuerst die Fahrzeuge dieses Kunden löschen" },
      { status: 409 },
    );
  return result === "deleted"
    ? Response.json({ ok: true })
    : Response.json({ error: "Kunde wurde nicht gefunden" }, { status: 404 });
}
