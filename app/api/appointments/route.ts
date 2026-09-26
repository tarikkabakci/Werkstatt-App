import { nextId, noCache, readState, updateState } from "../../../lib/netlify-data";

type Payload = {
  id?: string;
  customerId?: string;
  vehicleId?: string;
  startsAt?: string;
  service?: string;
  status?: string;
};

function validate(state: Awaited<ReturnType<typeof readState>>, customerId: number, vehicleId: number) {
  const customer = state.customers.find((item) => item.id === customerId);
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  return Boolean(customer && vehicle && vehicle.customerId === customer.id);
}

export async function GET() {
  const state = await readState();
  return Response.json(
    { appointments: [...state.appointments].sort((a, b) => b.startsAt.localeCompare(a.startsAt)) },
    { headers: noCache },
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;
  const customerId = Number(payload.customerId);
  const vehicleId = Number(payload.vehicleId);
  if (!Number.isInteger(customerId) || !Number.isInteger(vehicleId) || !payload.startsAt || !payload.service?.trim())
    return Response.json({ error: "Pflichtangaben fehlen" }, { status: 400 });
  const result = await updateState((state) => {
    if (!validate(state, customerId, vehicleId)) return null;
    const appointment = {
      id: nextId(state.appointments), customerId, vehicleId,
      startsAt: payload.startsAt!, service: payload.service!.trim(),
      status: payload.status || "Geplant",
    };
    state.appointments.push(appointment);
    return appointment;
  });
  return result
    ? Response.json({ appointment: result }, { status: 201 })
    : Response.json({ error: "Kunde oder Fahrzeug wurde nicht gefunden" }, { status: 404 });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as Payload;
  const id = Number(payload.id);
  const customerId = Number(payload.customerId);
  const vehicleId = Number(payload.vehicleId);
  if (!Number.isInteger(id) || !Number.isInteger(customerId) || !Number.isInteger(vehicleId) || !payload.startsAt || !payload.service?.trim())
    return Response.json({ error: "Pflichtangaben fehlen" }, { status: 400 });
  const result = await updateState((state) => {
    if (!validate(state, customerId, vehicleId)) return "party" as const;
    const index = state.appointments.findIndex((item) => item.id === id);
    if (index < 0) return "missing" as const;
    state.appointments[index] = {
      ...state.appointments[index], customerId, vehicleId,
      startsAt: payload.startsAt!, service: payload.service!.trim(),
      status: payload.status || "Geplant",
    };
    return state.appointments[index];
  });
  if (result === "party") return Response.json({ error: "Kunde oder Fahrzeug wurde nicht gefunden" }, { status: 404 });
  if (result === "missing") return Response.json({ error: "Termin wurde nicht gefunden" }, { status: 404 });
  return Response.json({ appointment: result });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Ungültiger Termin" }, { status: 400 });
  await updateState((state) => {
    state.appointments = state.appointments.filter((item) => item.id !== id);
  });
  return Response.json({ ok: true });
}
