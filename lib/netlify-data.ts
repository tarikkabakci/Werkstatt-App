import { adminDb } from "./firebase-admin";

export type CustomerRecord = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  street: string;
  postalCode: string;
  city: string;
};

export type VehicleRecord = {
  id: number;
  customerId: number;
  plate: string;
  make: string;
  model: string;
  vin?: string;
  mileage: number;
  registrationImageKey?: string | null;
  registrationImageName?: string | null;
  registrationImageType?: string | null;
};

export type AppointmentRecord = {
  id: number;
  customerId: number;
  vehicleId: number;
  startsAt: string;
  service: string;
  status: string;
};

export type WorkOrderRecord = {
  id: number;
  customer: string;
  car: string;
  plate: string;
  appointmentDate: string;
  appointmentTime: string;
  title: string;
  technician: string;
  status: string;
  priority: string;
  amount: number;
};

export type InvoiceItemRecord = {
  id: number;
  invoiceId: number;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceRecord = {
  id: number;
  workOrderId: number;
  number: string;
  type: string;
  amount: number;
  status: string;
  dueAt: string | null;
  issuedAt: string;
  paidAt: string | null;
  paymentMethod: string;
  vatEnabled: boolean;
  vatRate: number;
};

export type InventoryRecord = {
  id: number;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  price: number;
};

export type EmployeeRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type SettingsRecord = {
  id: 1;
  workshopName: string;
  owner: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  taxNumber: string;
  iban: string;
  bic: string;
  bank: string;
  smallBusinessNotice: string;
  paymentDays: number;
  invoicePrefix: string;
  estimatePrefix: string;
};

export type WorkshopState = {
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  appointments: AppointmentRecord[];
  workOrders: WorkOrderRecord[];
  invoices: InvoiceRecord[];
  invoiceItems: InvoiceItemRecord[];
  inventory: InventoryRecord[];
  employees: EmployeeRecord[];
  settings: SettingsRecord | null;
};

const EMPTY_STATE: WorkshopState = {
  customers: [],
  vehicles: [],
  appointments: [],
  workOrders: [],
  invoices: [],
  invoiceItems: [],
  inventory: [],
  employees: [],
  settings: null,
};

const stateDocument = adminDb.collection("werkstatt").doc("state");

function normalized(value: Partial<WorkshopState> | null): WorkshopState {
  return {
    customers: value?.customers ?? [],
    vehicles: value?.vehicles ?? [],
    appointments: value?.appointments ?? [],
    workOrders: value?.workOrders ?? [],
    invoices: value?.invoices ?? [],
    invoiceItems: value?.invoiceItems ?? [],
    inventory: value?.inventory ?? [],
    employees: value?.employees ?? [],
    settings: value?.settings ?? null,
  };
}

export async function readState(): Promise<WorkshopState> {
  const snapshot = await stateDocument.get();
  const value = snapshot.exists
    ? (snapshot.data() as Partial<WorkshopState>)
    : null;
  return value ? normalized(value) : structuredClone(EMPTY_STATE);
}

export async function updateState<T>(
  mutate: (state: WorkshopState) => T,
): Promise<T> {
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateDocument);
    const state = snapshot.exists
      ? normalized(snapshot.data() as Partial<WorkshopState>)
      : structuredClone(EMPTY_STATE);
    const result = mutate(state);
    transaction.set(stateDocument, state);
    return result;
  });
}

export function nextId(rows: Array<{ id: number }>) {
  return rows.reduce((highest, row) => Math.max(highest, row.id), 0) + 1;
}

export function smallestFreeId(rows: Array<{ id: number }>) {
  const used = new Set(rows.map((row) => row.id));
  let id = 1;
  while (used.has(id)) id += 1;
  return id;
}

export const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};
