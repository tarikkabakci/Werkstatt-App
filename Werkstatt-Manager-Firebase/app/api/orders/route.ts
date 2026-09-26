import { readState, smallestFreeId, updateState } from "../../../lib/netlify-data";

export async function GET() {
  try {
    const state = await readState();
    return Response.json({ orders: [...state.workOrders].sort((a, b) => b.id - a.id).slice(0, 100) });
  } catch {
    return Response.json({ orders: [] });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string>;
    for (const key of ["customer", "car", "plate", "title", "appointmentDate", "appointmentTime"])
      if (!payload[key]?.trim()) return Response.json({ error: `${key} fehlt` }, { status: 400 });
    const order = await updateState((state) => {
      const reserved = [
        ...state.workOrders,
        ...state.invoices.map((invoice) => ({ id: invoice.workOrderId })),
      ];
      const created = {
        id: smallestFreeId(reserved), customer: payload.customer.trim(),
        car: payload.car.trim(), plate: payload.plate.trim().toUpperCase(),
        title: payload.title.trim(), appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        technician: payload.technician?.trim() || "Noch nicht zugewiesen",
        status: "Neu", priority: "normal", amount: 0,
      };
      state.workOrders.push(created);
      return created;
    });
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string>;
    const id = Number(payload.id);
    if (!Number.isInteger(id)) return Response.json({ error: "Ungültiger Auftrag" }, { status: 400 });
    const order = await updateState((state) => {
      const index = state.workOrders.findIndex((item) => item.id === id);
      if (index < 0) return null;
      state.workOrders[index] = {
        ...state.workOrders[index], customer: payload.customer.trim(), car: payload.car.trim(),
        plate: payload.plate.trim().toUpperCase(), title: payload.title.trim(),
        appointmentDate: payload.appointmentDate, appointmentTime: payload.appointmentTime,
        technician: payload.technician.trim(), status: payload.status,
      };
      return state.workOrders[index];
    });
    return order ? Response.json({ order }) : Response.json({ error: "Auftrag nicht gefunden" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ändern fehlgeschlagen" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id)) return Response.json({ error: "Ungültiger Auftrag" }, { status: 400 });
    await updateState((state) => {
      state.workOrders = state.workOrders.filter((item) => item.id !== id);
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Löschen fehlgeschlagen" }, { status: 500 });
  }
}
