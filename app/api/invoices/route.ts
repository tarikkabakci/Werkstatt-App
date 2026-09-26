import {
  nextId,
  noCache,
  readState,
  smallestFreeId,
  updateState,
  type InvoiceItemRecord,
} from "../../../lib/netlify-data";

const allowedTypes = ["rechnung", "kostenvoranschlag"];
const allowedStatuses = ["entwurf", "offen", "bezahlt", "storniert", "angenommen", "abgelehnt"];

type ItemPayload = {
  category: string;
  description: string;
  quantity: number | string;
  unit?: string;
  unitPrice: number | string;
};

type InvoicePayload = {
  id?: number | string;
  workOrderId?: number | string;
  customerId?: number | string;
  vehicleId?: number | string;
  type?: string;
  status?: string;
  dueAt?: string;
  issuedAt?: string;
  serviceDate?: string;
  vatEnabled?: boolean;
  vatRate?: number | string;
  paymentMethod?: string;
  paidNow?: boolean | string;
  items?: ItemPayload[];
};

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseItems(items: ItemPayload[] | undefined) {
  return (items ?? [])
    .map((item) => {
      const category = item.category === "part" ? "part" : "service";
      return {
        category,
        description: String(item.description ?? "").trim(),
        quantity: Number(item.quantity),
        unit:
          String(item.unit ?? "").trim().slice(0, 20) ||
          (category === "service" ? "Std." : "Stk."),
        unitPrice: Number(item.unitPrice),
      };
    })
    .filter((item) => item.description && item.quantity > 0 && Number.isFinite(item.unitPrice));
}

function totals(items: ReturnType<typeof parseItems>, vatEnabled: boolean, vatRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    amount: Math.round((subtotal + vatAmount) * 100) / 100,
  };
}

export async function GET() {
  const state = await readState();
  const rows = [...state.invoices].sort((a, b) => b.id - a.id);
  return Response.json(
    { invoices: rows.map((invoice) => ({ ...invoice, items: state.invoiceItems.filter((item) => item.invoiceId === invoice.id) })) },
    { headers: noCache },
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as InvoicePayload;
  const type = allowedTypes.includes(payload.type ?? "") ? payload.type! : "rechnung";
  const items = parseItems(payload.items);
  const vatEnabled = payload.vatEnabled !== false;
  const vatRate = Math.max(0, Number(payload.vatRate) || 19);
  const paymentMethod = payload.paymentMethod === "bar" ? "bar" : "ueberweisung";
  const paidNow = payload.paidNow === true || payload.paidNow === "on";
  const issuedAt = validDate(payload.issuedAt)
    ? payload.issuedAt!
    : new Date().toISOString().slice(0, 10);
  const serviceDate = validDate(payload.serviceDate)
    ? payload.serviceDate!
    : issuedAt;
  const calculated = totals(items, vatEnabled, vatRate);
  if (!items.length || calculated.subtotal <= 0)
    return Response.json({ error: "Bitte mindestens eine gültige Position angeben" }, { status: 400 });

  const result = await updateState((state) => {
    let workOrderId = Number(payload.workOrderId);
    if (!Number.isInteger(workOrderId)) {
      const customerId = Number(payload.customerId);
      const vehicleId = Number(payload.vehicleId);
      const customer = state.customers.find((item) => item.id === customerId);
      const vehicle = state.vehicles.find((item) => item.id === vehicleId);
      if (!customer || !vehicle || vehicle.customerId !== customer.id) return null;
      workOrderId = smallestFreeId([
        ...state.workOrders,
        ...state.invoices.map((invoice) => ({ id: invoice.workOrderId })),
      ]);
      state.workOrders.push({
        id: workOrderId, customer: customer.name,
        car: `${vehicle.make} ${vehicle.model}`.trim(), plate: vehicle.plate,
        appointmentDate: issuedAt, appointmentTime: "00:00",
        title: items[0].description, technician: "Nicht erforderlich",
        status: "Abgerechnet", priority: "normal", amount: calculated.amount,
      });
    } else if (!state.workOrders.some((item) => item.id === workOrderId)) {
      return null;
    }

    const settings = state.settings;
    const prefix = type === "kostenvoranschlag" ? settings?.estimatePrefix || "KV" : settings?.invoicePrefix || "RE";
    const year = Number(issuedAt.slice(0, 4));
    const numberBase = `${prefix}-${year}-`;
    const used = new Set(
      state.invoices
        .map(({ number }) => number.startsWith(numberBase) ? Number(number.slice(numberBase.length)) : Number.NaN)
        .filter((value) => Number.isInteger(value) && value > 0),
    );
    let sequence = 1;
    while (used.has(sequence)) sequence += 1;
    const number = `${numberBase}${String(sequence).padStart(4, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    const paymentDays = Math.max(0, Number(settings?.paymentDays) || 14);
    const dueAt = validDate(payload.dueAt)
      ? payload.dueAt!
      : addDays(issuedAt, paymentDays);
    const invoice = {
      id: nextId(state.invoices), workOrderId, number, type,
      amount: calculated.amount,
      status: type === "kostenvoranschlag" ? "entwurf" : paidNow ? "bezahlt" : "offen",
      dueAt, issuedAt, serviceDate,
      paidAt: paidNow ? today : null, paymentMethod, vatEnabled, vatRate,
    };
    state.invoices.push(invoice);
    let itemId = nextId(state.invoiceItems);
    const storedItems: InvoiceItemRecord[] = items.map((item) => ({
      id: itemId++, invoiceId: invoice.id, ...item,
    }));
    state.invoiceItems.push(...storedItems);
    return { invoice, items: storedItems };
  });
  if (!result)
    return Response.json({ error: "Kunde, Fahrzeug oder zugehöriger Datensatz wurde nicht gefunden" }, { status: 404 });
  return Response.json(
    { invoice: { ...result.invoice, items: result.items, ...calculated } },
    { status: 201 },
  );
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as InvoicePayload;
  const id = Number(payload.id);
  const items = parseItems(payload.items);
  const vatEnabled = payload.vatEnabled !== false;
  const vatRate = Math.max(0, Number(payload.vatRate) || 19);
  const paymentMethod = payload.paymentMethod === "bar" ? "bar" : "ueberweisung";
  const issuedAt = validDate(payload.issuedAt) ? payload.issuedAt! : undefined;
  const serviceDate = validDate(payload.serviceDate)
    ? payload.serviceDate!
    : issuedAt;
  const calculated = totals(items, vatEnabled, vatRate);
  if (!Number.isInteger(id) || !items.length || calculated.subtotal <= 0 || !allowedStatuses.includes(payload.status ?? ""))
    return Response.json({ error: "Bitte gültige Positionen und einen Status angeben" }, { status: 400 });
  const result = await updateState((state) => {
    const index = state.invoices.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const existing = state.invoices[index];
    const paidAt = payload.status === "bezahlt" ? existing.paidAt || new Date().toISOString().slice(0, 10) : null;
    state.invoices[index] = {
      ...existing, amount: calculated.amount, status: payload.status!,
      dueAt: validDate(payload.dueAt) ? payload.dueAt! : existing.dueAt,
      issuedAt: issuedAt ?? existing.issuedAt,
      serviceDate: serviceDate ?? existing.serviceDate ?? existing.issuedAt,
      paidAt, paymentMethod, vatEnabled, vatRate,
    };
    state.invoiceItems = state.invoiceItems.filter((item) => item.invoiceId !== id);
    let itemId = nextId(state.invoiceItems);
    const storedItems: InvoiceItemRecord[] = items.map((item) => ({ id: itemId++, invoiceId: id, ...item }));
    state.invoiceItems.push(...storedItems);
    return { invoice: state.invoices[index], items: storedItems };
  });
  return result
    ? Response.json({ invoice: { ...result.invoice, items: result.items, ...calculated } })
    : Response.json({ error: "Dokument wurde nicht gefunden" }, { status: 404 });
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as InvoicePayload;
  const id = Number(payload.id);
  const status = payload.status ?? "";
  if (!Number.isInteger(id) || !allowedStatuses.includes(status))
    return Response.json({ error: "Ungültiger Rechnungsstatus" }, { status: 400 });

  const invoice = await updateState((state) => {
    const index = state.invoices.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const existing = state.invoices[index];
    state.invoices[index] = {
      ...existing,
      status,
      paidAt:
        status === "bezahlt"
          ? existing.paidAt || new Date().toISOString().slice(0, 10)
          : null,
    };
    return state.invoices[index];
  });

  return invoice
    ? Response.json({ invoice })
    : Response.json({ error: "Dokument wurde nicht gefunden" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Ungültige Dokumentnummer" }, { status: 400 });
  const deleted = await updateState((state) => {
    const invoice = state.invoices.find((item) => item.id === id);
    if (!invoice) return false;
    state.invoices = state.invoices.filter((item) => item.id !== id);
    state.invoiceItems = state.invoiceItems.filter((item) => item.invoiceId !== id);
    if (!state.invoices.some((item) => item.workOrderId === invoice.workOrderId))
      state.workOrders = state.workOrders.filter((item) => item.id !== invoice.workOrderId);
    return true;
  });
  return deleted
    ? Response.json({ ok: true })
    : Response.json({ error: "Dokument wurde nicht gefunden" }, { status: 404 });
}
