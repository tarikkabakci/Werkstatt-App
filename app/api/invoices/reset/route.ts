import { updateState } from "../../../../lib/netlify-data";

export async function POST() {
  const result = await updateState((state) => {
    const deleted = state.invoices.length;
    const linkedWorkOrderIds = new Set(
      state.invoices.map((invoice) => invoice.workOrderId),
    );
    state.invoices = [];
    state.invoiceItems = [];
    state.workOrders = state.workOrders.filter(
      (order) =>
        !linkedWorkOrderIds.has(order.id) ||
        order.technician !== "Nicht erforderlich",
    );
    return { deleted };
  });
  return Response.json({ ok: true, ...result });
}
