import { readState, updateState } from "../../../lib/netlify-data";

export async function GET() {
  const state = await readState();
  return Response.json({ settings: state.settings });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  const settings = {
    id: 1 as const,
    workshopName: payload.workshopName?.trim() ?? "",
    owner: payload.owner?.trim() ?? "",
    street: payload.street?.trim() ?? "",
    postalCode: payload.postalCode?.trim() ?? "",
    city: payload.city?.trim() ?? "",
    phone: payload.phone?.trim() ?? "",
    email: payload.email?.trim() ?? "",
    taxNumber: payload.taxNumber?.trim() ?? "",
    iban: payload.iban?.trim().replace(/\s/g, "").toUpperCase() ?? "",
    bic: payload.bic?.trim().toUpperCase() ?? "",
    bank: payload.bank?.trim() ?? "",
    smallBusinessNotice: payload.smallBusinessNotice?.trim() ?? "",
    paymentDays: Number(payload.paymentDays) || 14,
    invoicePrefix: payload.invoicePrefix?.trim().toUpperCase() || "RE",
    estimatePrefix: payload.estimatePrefix?.trim().toUpperCase() || "KV",
  };
  await updateState((state) => {
    state.settings = settings;
  });
  return Response.json({ settings });
}
