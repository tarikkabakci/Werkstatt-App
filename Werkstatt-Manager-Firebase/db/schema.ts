import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  street: text("street").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  city: text("city").notNull().default(""),
});
export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  plate: text("plate").notNull().unique(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  vin: text("vin"),
  mileage: integer("mileage").default(0),
  registrationImageKey: text("registration_image_key"),
  registrationImageName: text("registration_image_name"),
  registrationImageType: text("registration_image_type"),
});
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  startsAt: text("starts_at").notNull(),
  service: text("service").notNull(),
  status: text("status").notNull().default("geplant"),
});
export const workOrders = sqliteTable("work_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customer: text("customer").notNull().default(""),
  car: text("car").notNull().default(""),
  plate: text("plate").notNull().default(""),
  appointmentDate: text("appointment_date").notNull().default(""),
  appointmentTime: text("appointment_time").notNull().default(""),
  title: text("title").notNull(),
  technician: text("technician").notNull().default("Noch nicht zugewiesen"),
  status: text("status").notNull().default("Neu"),
  priority: text("priority").notNull().default("normal"),
  amount: real("amount").default(0),
});
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  price: real("price").notNull().default(0),
});
export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("mechaniker"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workOrderId: integer("work_order_id").notNull(),
  number: text("number").notNull().unique(),
  type: text("type").notNull().default("rechnung"),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("offen"),
  dueAt: text("due_at"),
  issuedAt: text("issued_at").notNull().default(""),
  paidAt: text("paid_at"),
  paymentMethod: text("payment_method").notNull().default("ueberweisung"),
  vatEnabled: integer("vat_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  vatRate: real("vat_rate").notNull().default(19),
});
export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id").notNull(),
    category: text("category").notNull().default("service"),
    description: text("description").notNull(),
    quantity: real("quantity").notNull().default(1),
    unitPrice: real("unit_price").notNull().default(0),
  },
  (table) => [index("idx_invoice_items_invoice_id").on(table.invoiceId)],
);
export const companySettings = sqliteTable("company_settings", {
  id: integer("id").primaryKey(),
  workshopName: text("workshop_name").notNull().default(""),
  owner: text("owner").notNull().default(""),
  street: text("street").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  city: text("city").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  taxNumber: text("tax_number").notNull().default(""),
  iban: text("iban").notNull().default(""),
  bic: text("bic").notNull().default(""),
  bank: text("bank").notNull().default(""),
  smallBusinessNotice: text("small_business_notice")
    .notNull()
    .default("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."),
  paymentDays: integer("payment_days").notNull().default(14),
  invoicePrefix: text("invoice_prefix").notNull().default("RE"),
  estimatePrefix: text("estimate_prefix").notNull().default("KV"),
});
