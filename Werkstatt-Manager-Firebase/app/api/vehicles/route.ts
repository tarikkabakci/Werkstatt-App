import { nextId, noCache, readState, updateState } from "../../../lib/netlify-data";
import { adminBucket } from "../../../lib/firebase-admin";

function values(payload: Record<string, string>) {
  return {
    customerId: Number(payload.customerId),
    plate: payload.plate.trim().toUpperCase(),
    make: payload.make.trim(),
    model: payload.model.trim(),
    vin: payload.vin?.trim(),
    mileage: Math.max(0, Number(payload.mileage) || 0),
  };
}

export async function GET() {
  const state = await readState();
  return Response.json(
    { vehicles: [...state.vehicles].sort((a, b) => b.id - a.id) },
    { headers: noCache },
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  if (!payload.plate?.trim() || !payload.make?.trim() || !payload.model?.trim())
    return Response.json(
      { error: "Hersteller, Modell und Kennzeichen sind erforderlich" },
      { status: 400 },
    );
  const data = values(payload);
  const result = await updateState((state) => {
    if (!state.customers.some((item) => item.id === data.customerId)) return "customer" as const;
    if (state.vehicles.some((item) => item.plate === data.plate)) return "plate" as const;
    const vehicle = {
      id: nextId(state.vehicles),
      ...data,
      registrationImageKey: null,
      registrationImageName: null,
      registrationImageType: null,
    };
    state.vehicles.push(vehicle);
    return vehicle;
  });
  if (result === "customer")
    return Response.json({ error: "Bitte einen gültigen Kunden wählen" }, { status: 400 });
  if (result === "plate")
    return Response.json({ error: "Dieses Kennzeichen ist bereits vorhanden" }, { status: 409 });
  return Response.json({ vehicle: result }, { status: 201 });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  const id = Number(payload.id);
  if (!Number.isInteger(id) || !payload.plate?.trim() || !payload.make?.trim() || !payload.model?.trim())
    return Response.json({ error: "Ungültige Fahrzeugdaten" }, { status: 400 });
  const data = values(payload);
  const result = await updateState((state) => {
    if (!state.customers.some((item) => item.id === data.customerId)) return "customer" as const;
    if (state.vehicles.some((item) => item.id !== id && item.plate === data.plate)) return "plate" as const;
    const index = state.vehicles.findIndex((item) => item.id === id);
    if (index < 0) return "missing" as const;
    state.vehicles[index] = { ...state.vehicles[index], ...data };
    return state.vehicles[index];
  });
  if (result === "customer")
    return Response.json({ error: "Bitte einen gültigen Kunden wählen" }, { status: 400 });
  if (result === "plate")
    return Response.json({ error: "Dieses Kennzeichen ist bereits vorhanden" }, { status: 409 });
  if (result === "missing")
    return Response.json({ error: "Fahrzeug wurde nicht gefunden" }, { status: 404 });
  return Response.json({ vehicle: result });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id))
    return Response.json({ error: "Ungültige Fahrzeugnummer" }, { status: 400 });
  const result = await updateState((state) => {
    const vehicle = state.vehicles.find((item) => item.id === id);
    if (!vehicle) return null;
    state.vehicles = state.vehicles.filter((item) => item.id !== id);
    state.appointments = state.appointments.filter((item) => item.vehicleId !== id);
    return vehicle;
  });
  if (!result)
    return Response.json({ error: "Fahrzeug wurde nicht gefunden" }, { status: 404 });
  if (result.registrationImageKey)
    await adminBucket()
      .file(result.registrationImageKey)
      .delete({ ignoreNotFound: true });
  return Response.json({ ok: true });
}
