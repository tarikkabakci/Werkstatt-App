import { nextId, noCache, readState, updateState } from "../../../lib/netlify-data";

function values(payload: Record<string, string>) {
  return {
    sku: payload.sku.trim().toUpperCase(),
    name: payload.name.trim(),
    stock: Math.max(0, Number(payload.stock) || 0),
    minStock: Math.max(0, Number(payload.minStock) || 0),
    price: Math.max(0, Number(payload.price) || 0),
  };
}

export async function GET() {
  const state = await readState();
  return Response.json(
    { inventory: [...state.inventory].sort((a, b) => b.id - a.id) },
    { headers: noCache },
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  if (!payload.sku?.trim() || !payload.name?.trim())
    return Response.json({ error: "Artikelnummer und Bezeichnung sind erforderlich" }, { status: 400 });
  const data = values(payload);
  const item = await updateState((state) => {
    if (state.inventory.some((entry) => entry.sku === data.sku)) return null;
    const created = { id: nextId(state.inventory), ...data };
    state.inventory.push(created);
    return created;
  });
  return item
    ? Response.json({ item }, { status: 201 })
    : Response.json({ error: "Diese Artikelnummer ist bereits vorhanden" }, { status: 409 });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  const id = Number(payload.id);
  if (!Number.isInteger(id) || !payload.sku?.trim() || !payload.name?.trim())
    return Response.json({ error: "Ungültige Artikeldaten" }, { status: 400 });
  const data = values(payload);
  const result = await updateState((state) => {
    if (state.inventory.some((entry) => entry.id !== id && entry.sku === data.sku)) return "duplicate" as const;
    const index = state.inventory.findIndex((entry) => entry.id === id);
    if (index < 0) return "missing" as const;
    state.inventory[index] = { ...state.inventory[index], ...data };
    return state.inventory[index];
  });
  if (result === "duplicate") return Response.json({ error: "Diese Artikelnummer ist bereits vorhanden" }, { status: 409 });
  if (result === "missing") return Response.json({ error: "Artikel wurde nicht gefunden" }, { status: 404 });
  return Response.json({ item: result });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Ungültige Artikelnummer" }, { status: 400 });
  const deleted = await updateState((state) => {
    const before = state.inventory.length;
    state.inventory = state.inventory.filter((item) => item.id !== id);
    return before !== state.inventory.length;
  });
  return deleted ? Response.json({ ok: true }) : Response.json({ error: "Artikel wurde nicht gefunden" }, { status: 404 });
}
