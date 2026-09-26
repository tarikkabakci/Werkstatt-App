"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ComponentType,
} from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Car,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Menu,
  Mic,
  MicOff,
  Package,
  Plus,
  Search,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const nav = [
  ["Dashboard", Activity],
  ["Termine", CalendarDays],
  ["Kunden & Fahrzeuge", Car],
  ["Rechnungen", CircleDollarSign],
  ["Lager", Package],
  ["Auswertungen", BarChart3],
] as const;
const appointments = [
  ["08:00", "Oliver Schmidt", "HU/AU · Mercedes Vito"],
  ["09:15", "Miriam König", "Bremsen · BMW 320d"],
  ["10:30", "Daniel Weber", "Inspektion · VW Golf"],
  ["11:45", "Sabrina Alkan", "Diagnose · Audi A4"],
];
type Order = {
  dbId: number;
  id: string;
  customer: string;
  car: string;
  plate: string;
  task: string;
  tech: string;
  status: string;
  color: string;
  date: string;
  time: string;
};

type StoredOrderRow = {
  id: number;
  customer: string;
  car: string;
  plate: string;
  title: string;
  technician: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string;
};

function mapStoredOrder(o: StoredOrderRow): Order {
  return {
    dbId: o.id,
    id: `A-${String(o.id).padStart(4, "0")}`,
    customer: o.customer,
    car: o.car,
    plate: o.plate,
    task: o.title,
    tech: o.technician,
    status: o.status,
    color:
      o.status === "Bereit"
        ? "green"
        : o.status === "In Arbeit"
          ? "amber"
          : o.status === "Wartet auf Teil"
            ? "violet"
            : "blue",
    date: o.appointmentDate,
    time: o.appointmentTime,
  };
}

function countOpenMaintenanceReminders(
  rows: Array<{ startsAt: string; status: string }>,
) {
  const now = Date.now();
  const reminderWindow = now + 7 * 24 * 60 * 60 * 1000;
  return rows.filter((item) => {
    const startsAt = new Date(item.startsAt).getTime();
    return (
      !["Erledigt", "Abgesagt"].includes(item.status) &&
      Number.isFinite(startsAt) &&
      startsAt <= reminderWindow
    );
  }).length;
}

export default function WorkshopApp({ userEmail }: { userEmail: string }) {
  const [active, setActive] = useState("Dashboard"),
    [mobile, setMobile] = useState(false),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [orderRows, setOrderRows] = useState<Order[]>([]),
    [employeeRows, setEmployeeRows] = useState<Employee[]>([]),
    [customerRows, setCustomerRows] = useState<Customer[]>([]),
    [vehicleRows, setVehicleRows] = useState<Vehicle[]>([]),
    [newOrderCustomerId, setNewOrderCustomerId] = useState(""),
    [editOrderCustomerId, setEditOrderCustomerId] = useState(""),
    [maintenanceReminderCount, setMaintenanceReminderCount] = useState(0),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<Order | null>(null),
    [deleting, setDeleting] = useState(false);
  const filtered = useMemo(
    () =>
      orderRows.filter((o) =>
        Object.values(o).join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [query, orderRows],
  );
  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then(({ orders: rows }) => setOrderRows((rows ?? []).map(mapOrder)))
      .catch(() => flash("Aufträge konnten nicht geladen werden"));
  }, []);
  useEffect(() => {
    fetch("/api/appointments", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) =>
        setMaintenanceReminderCount(
          countOpenMaintenanceReminders(data.appointments ?? []),
        ),
      )
      .catch(() => setMaintenanceReminderCount(0));
  }, []);
  useEffect(() => {
    fetch("/api/employees", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setEmployeeRows(data.employees ?? []))
      .catch(() => flash("Mitarbeiter konnten nicht geladen werden"));
  }, [active, open, editing?.dbId]);
  useEffect(() => {
    Promise.all([
      fetch("/api/customers", { cache: "no-store" }).then((response) =>
        response.json(),
      ),
      fetch("/api/vehicles", { cache: "no-store" }).then((response) =>
        response.json(),
      ),
    ])
      .then(([customerData, vehicleData]) => {
        const nextCustomers = customerData.customers ?? [];
        setCustomerRows(nextCustomers);
        setVehicleRows(vehicleData.vehicles ?? []);
        setNewOrderCustomerId((current) =>
          current || String(nextCustomers[0]?.id ?? ""),
        );
      })
      .catch(() => {
        setCustomerRows([]);
        setVehicleRows([]);
      });
  }, [active, open]);
  useEffect(() => {
    if (!editing) return;
    const vehicle = vehicleRows.find(
      (row) => row.plate.toLowerCase() === editing.plate.toLowerCase(),
    );
    const customer =
      customerRows.find((row) => row.id === vehicle?.customerId) ??
      customerRows.find(
        (row) => row.name.toLowerCase() === editing.customer.toLowerCase(),
      );
    setEditOrderCustomerId(String(customer?.id ?? ""));
  }, [editing, customerRows, vehicleRows]);
  const mapOrder = mapStoredOrder;
  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }
  function orderParty(form: FormData) {
    const customerId = Number(form.get("customerId"));
    const vehicleId = Number(form.get("vehicleId"));
    const customer = customerRows.find((row) => row.id === customerId);
    const vehicle = vehicleRows.find(
      (row) => row.id === vehicleId && row.customerId === customerId,
    );
    if (!customer || !vehicle) return null;
    return {
      customer: customer.name,
      car: `${vehicle.make} ${vehicle.model}`.trim(),
      plate: vehicle.plate,
    };
  }
  async function saveOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    const party = orderParty(f);
    if (!party) {
      flash("Bitte Kunde und zugehöriges Fahrzeug auswählen");
      return;
    }
    const payload = {
      ...party,
      title: String(f.get("task")),
      appointmentDate: String(f.get("date")),
      appointmentTime: String(f.get("time")),
      technician: String(f.get("technician")),
    };
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error();
      const { order } = await response.json(),
        next = mapOrder(order);
      setOrderRows((rows) => [next, ...rows]);
      setOpen(false);
      form.reset();
      flash(`${next.id} wurde dauerhaft gespeichert`);
      setActive("Aufträge");
    } catch {
      flash("Auftrag konnte nicht gespeichert werden");
    }
  }
  async function updateOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget),
      party = orderParty(f),
      payload = {
        id: String(editing.dbId),
        ...(party ?? {
          customer: editing.customer,
          car: editing.car,
          plate: editing.plate,
        }),
        title: String(f.get("task")),
        appointmentDate: String(f.get("date")),
        appointmentTime: String(f.get("time")),
        technician: String(f.get("technician")),
        status: String(f.get("status")),
      };
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error();
      const { order } = await response.json(),
        updated = mapOrder(order);
      setOrderRows((rows) =>
        rows.map((o) => (o.dbId === updated.dbId ? updated : o)),
      );
      setEditing(null);
      flash(`${updated.id} wurde aktualisiert`);
    } catch {
      flash("Änderungen konnten nicht gespeichert werden");
    }
  }
  async function deleteOrder() {
    if (!editing) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/orders?id=${editing.dbId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      setOrderRows((rows) => rows.filter((o) => o.dbId !== editing.dbId));
      flash(`${editing.id} wurde gelöscht`);
      setEditing(null);
    } catch {
      flash("Auftrag konnte nicht gelöscht werden");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span
            className="brand-logo"
            role="img"
            aria-label="Werkstatt Verkauf und Service Logo"
          />
          <b>
            AAAmann<i> Performance</i>
          </b>
          <button
            aria-label="Menü schließen"
            className="close-nav"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => {
                setActive(label);
                setMobile(false);
                setQuery("");
              }}
              className={active === label ? "active" : ""}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={active === "Einstellungen" ? "active" : ""}
            onClick={() => {
              setActive("Einstellungen");
              setMobile(false);
            }}
          >
            <Settings />
            Einstellungen
          </button>
          <div className="profile">
            <div>TY</div>
            <span>
              <strong>Tarik Y.</strong>
              <small>{userEmail}</small>
            </span>
            <button
              type="button"
              className="profile-logout"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.assign("/login");
              }}
            >
              Abmelden
            </button>
          </div>
        </div>
      </aside>
      <main className="content">
        <header>
          <button
            aria-label="Menü öffnen"
            className="menu-btn"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div>
            <p>
              {new Intl.DateTimeFormat("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </p>
            <h1>{active}</h1>
          </div>
          <div className="header-actions">
            <label>
              <Search />
              <Input
                aria-label="Bereich durchsuchen"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen …"
              />
            </label>
            <button
              aria-label={`${maintenanceReminderCount} offene Wartungserinnerungen`}
              onClick={() => {
                setActive("Termine");
                flash(
                  maintenanceReminderCount
                    ? `${maintenanceReminderCount} Wartungstermin${maintenanceReminderCount === 1 ? "" : "e"} ist in den nächsten 7 Tagen fällig oder bereits überfällig`
                    : "Keine Wartungserinnerungen offen",
                );
              }}
              className="icon-btn"
            >
              <Bell />
              {maintenanceReminderCount > 0 && <i />}
            </button>
            <Button onClick={() => setActive("Rechnungen")}>
              <CircleDollarSign /> Rechnungen
            </Button>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            ✓ {notice}
          </div>
        )}
        {active === "Dashboard" ? (
          <Dashboard
            orders={orderRows}
            create={() => setActive("Rechnungen")}
            showOrders={() => setActive("Rechnungen")}
            showCalendar={() => setActive("Termine")}
            showInvoices={() => setActive("Rechnungen")}
            showInventory={() => setActive("Lager")}
          />
        ) : active === "Termine" ? (
          <AppointmentManager
            flash={flash}
            onReminderCountChange={setMaintenanceReminderCount}
          />
        ) : active === "Kunden & Fahrzeuge" ? (
          <CustomerVehicleManager flash={flash} query={query} />
        ) : active === "Rechnungen" ? (
          <InvoiceManager flash={flash} query={query} orders={orderRows} />
        ) : active === "Lager" ? (
          <InventoryManager flash={flash} query={query} />
        ) : active === "Auswertungen" ? (
          <AnalyticsManager />
        ) : active === "Einstellungen" ? (
          <SettingsForm flash={flash} />
        ) : (
          <Module
            title={active}
            orders={filtered}
            query={query}
            create={() => setOpen(true)}
            edit={setEditing}
          />
        )}
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Auftrag anlegen</DialogTitle>
            <DialogDescription>
              Kunde, Fahrzeug und gewünschte Arbeit erfassen.
            </DialogDescription>
          </DialogHeader>
          <form className="order-form" onSubmit={saveOrder}>
            <label>
              Kunde
              <select
                name="customerId"
                value={newOrderCustomerId}
                onChange={(event) =>
                  setNewOrderCustomerId(event.target.value)
                }
                required
              >
                <option value="">Kunde auswählen</option>
                {customerRows.map((customer) => (
                  <option value={customer.id} key={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fahrzeug
              <select name="vehicleId" required defaultValue="">
                <option value="">Fahrzeug auswählen</option>
                {vehicleRows
                  .filter(
                    (vehicle) =>
                      !newOrderCustomerId ||
                      vehicle.customerId === Number(newOrderCustomerId),
                  )
                  .map((vehicle) => (
                    <option value={vehicle.id} key={vehicle.id}>
                      {vehicle.make} {vehicle.model} · {vehicle.plate}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Arbeitsauftrag
              <Input
                name="task"
                placeholder="z. B. Inspektion und Ölwechsel"
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Termin
                <Input name="date" type="date" required />
              </label>
              <label>
                Uhrzeit
                <Input name="time" type="time" required />
              </label>
            </div>
            <label>
              Mitarbeiter
              <select name="technician" defaultValue="Noch nicht zugewiesen">
                <option>Noch nicht zugewiesen</option>
                {employeeRows
                  .filter((employee) => employee.active)
                  .map((employee) => (
                    <option key={employee.id} value={employee.name}>
                      {employee.name} · {employee.role}
                    </option>
                  ))}
              </select>
            </label>
            <Button type="submit">Auftrag speichern</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id} bearbeiten</DialogTitle>
            <DialogDescription>
              Auftragsdaten, Zuweisung und Arbeitsstatus ändern.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form className="order-form" onSubmit={updateOrder}>
              <label>
                Kunde
                <select
                  name="customerId"
                  value={editOrderCustomerId}
                  onChange={(event) =>
                    setEditOrderCustomerId(event.target.value)
                  }
                  required
                >
                  <option value="">Kunde auswählen</option>
                  {customerRows.map((customer) => (
                    <option value={customer.id} key={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fahrzeug
                <select
                  name="vehicleId"
                  defaultValue={
                    vehicleRows.find(
                      (vehicle) =>
                        vehicle.plate.toLowerCase() ===
                        editing.plate.toLowerCase(),
                    )?.id ?? ""
                  }
                  required
                >
                  <option value="">Fahrzeug auswählen</option>
                  {vehicleRows
                    .filter(
                      (vehicle) =>
                        !editOrderCustomerId ||
                        vehicle.customerId === Number(editOrderCustomerId),
                    )
                    .map((vehicle) => (
                      <option value={vehicle.id} key={vehicle.id}>
                        {vehicle.make} {vehicle.model} · {vehicle.plate}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Arbeitsauftrag
                <Input name="task" defaultValue={editing.task} required />
              </label>
              <div className="form-grid">
                <label>
                  Termin
                  <Input
                    name="date"
                    type="date"
                    defaultValue={editing.date}
                    required
                  />
                </label>
                <label>
                  Uhrzeit
                  <Input
                    name="time"
                    type="time"
                    defaultValue={editing.time}
                    required
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Mechaniker
                  <select name="technician" defaultValue={editing.tech}>
                    <option>Noch nicht zugewiesen</option>
                    {editing.tech !== "Noch nicht zugewiesen" &&
                      !employeeRows.some(
                        (employee) =>
                          employee.active && employee.name === editing.tech,
                      ) && (
                        <option value={editing.tech}>
                          {editing.tech} · nicht mehr aktiv
                        </option>
                      )}
                    {employeeRows
                      .filter((employee) => employee.active)
                      .map((employee) => (
                        <option key={employee.id} value={employee.name}>
                          {employee.name} · {employee.role}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={editing.status}>
                    <option>Neu</option>
                    <option>In Arbeit</option>
                    <option>Wartet auf Teil</option>
                    <option>Bereit</option>
                    <option>Abgeschlossen</option>
                  </select>
                </label>
              </div>
              <div className="edit-actions">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={deleteOrder}
                >
                  {deleting ? "Wird gelöscht …" : "Auftrag löschen"}
                </Button>
                <Button type="submit">Änderungen speichern</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Dashboard({
  orders,
  create,
  showOrders,
  showCalendar,
  showInvoices,
  showInventory,
}: {
  orders: Order[];
  create: () => void;
  showOrders: () => void;
  showCalendar: () => void;
  showInvoices: () => void;
  showInventory: () => void;
}) {
  const [dashboardAppointments, setDashboardAppointments] = useState<
    Appointment[]
  >([]);
  const [inventoryWarnings, setInventoryWarnings] = useState(0);
  const [dashboardInvoices, setDashboardInvoices] = useState<Invoice[]>([]);
  useEffect(() => {
    fetch("/api/appointments", { cache: "no-store" })
      .then((r) => r.json())
      .then((x) =>
        setDashboardAppointments(
          (x.appointments ?? []).map(
            (a: {
              id: number;
              service: string;
              startsAt: string;
              status: string;
            }) => {
              let details = { customer: "", vehicle: "", service: a.service };
              try {
                details = JSON.parse(a.service);
              } catch {}
              return {
                id: a.id,
                ...details,
                startsAt: a.startsAt,
                status: a.status,
              };
            },
          ),
        ),
      )
      .catch(() => setDashboardAppointments([]));
  }, []);
  useEffect(() => {
    fetch("/api/inventory", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) =>
        setInventoryWarnings(
          (data.inventory ?? []).filter(
            (item: InventoryItem) => item.stock <= item.minStock,
          ).length,
        ),
      )
      .catch(() => setInventoryWarnings(0));
  }, []);
  useEffect(() => {
    fetch("/api/invoices", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setDashboardInvoices(data.invoices ?? []))
      .catch(() => setDashboardInvoices([]));
  }, []);
  const today = new Date().toLocaleDateString("sv-SE");
  const todayAppointments = dashboardAppointments.filter(
    (a) => a.startsAt.slice(0, 10) === today,
  );
  const upcomingAppointments = dashboardAppointments
    .filter((a) => a.startsAt.slice(0, 10) >= today && a.status !== "Abgesagt")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const activeOrders = orders.filter(
    (order) => order.status !== "Abgeschlossen",
  );
  const dailyRevenue = dashboardInvoices
    .filter(
      (invoice) => invoice.type === "rechnung" && invoice.paidAt === today,
    )
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const overdueInvoices = dashboardInvoices.filter(
    (invoice) =>
      invoice.type === "rechnung" &&
      invoice.status === "offen" &&
      Boolean(invoice.dueAt) &&
      invoice.dueAt! < today,
  ).length;
  const euro = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const monday = new Date();
  const dayFromMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayFromMonday);
  const weeklyOrderCounts = weekdayLabels.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = date.toLocaleDateString("sv-SE");
    return orders.filter((order) => order.date === key).length;
  });
  const maxDailyOrders = Math.max(1, ...weeklyOrderCounts);
  const weeklyOrders = weeklyOrderCounts.reduce((sum, count) => sum + count, 0);
  return (
    <div className="dashboard">
      <section className="welcome">
        <div>
          <p>Willkommen zurück, Tarik</p>
          <h2>Das Wichtigste auf einen Blick.</h2>
          <span>
            {todayAppointments.length} Termine heute ·{" "}
            {orders.filter((o) => o.status === "In Arbeit").length} Fahrzeuge in
            Bearbeitung
          </span>
        </div>
        <Button onClick={create}>
          <Plus /> Rechnung erstellen
        </Button>
      </section>
      <section className="kpis">
        <Kpi
          icon={CalendarDays}
          label="Termine heute"
          value={String(todayAppointments.length)}
          note={`${todayAppointments.filter((a) => a.status !== "Erledigt" && a.status !== "Abgesagt").length} noch offen`}
          tone="blue"
        />
        <Kpi
          icon={Wrench}
          label="Aktive Aufträge"
          value={String(activeOrders.length)}
          note={`${orders.filter((o) => o.status === "In Arbeit").length} in Arbeit`}
          tone="orange"
        />
        <Kpi
          icon={CircleDollarSign}
          label="Tagesumsatz"
          value={euro.format(dailyRevenue)}
          note="Heute bezahlte Rechnungen"
          tone="green"
        />
        <Kpi
          icon={Package}
          label="Lagerwarnungen"
          value={String(inventoryWarnings)}
          note={inventoryWarnings ? "Bestand prüfen" : "Alles ausreichend"}
          tone="red"
        />
      </section>
      <section className="grid-main">
        <div className="panel orders">
          <div className="panel-head">
            <div>
              <h3>Aktuelle Aufträge</h3>
              <p>Live-Status aus der Werkstatt</p>
            </div>
            <button onClick={showOrders}>
              Alle anzeigen <ChevronRight />
            </button>
          </div>
          <div className="order-list">
            {activeOrders.slice(0, 6).map((o) => (
              <div className="order" key={o.id}>
                <span className={`status-dot ${o.color}`} />
                <div className="car-icon">
                  <Car />
                </div>
                <div className="order-main">
                  <strong>{o.car}</strong>
                  <span>
                    {o.plate} · {o.task}
                  </span>
                </div>
                <div className="tech">
                  <small>Mechaniker</small>
                  <span>{o.tech}</span>
                </div>
                <Badge className={`badge-${o.color}`}>{o.status}</Badge>
                <strong className="order-id">{o.id}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel schedule">
          <div className="panel-head">
            <div>
              <h3>Nächste Termine</h3>
              <p>Heute und kommende Tage</p>
            </div>
            <button aria-label="Terminübersicht öffnen" onClick={showCalendar}>
              <Plus />
            </button>
          </div>
          {upcomingAppointments.slice(0, 4).map((a) => (
            <div className="appointment" key={a.id}>
              <div>
                <strong>
                  {a.startsAt.slice(0, 10) === today
                    ? a.startsAt.slice(11, 16)
                    : new Date(a.startsAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                </strong>
                <span>{a.status}</span>
              </div>
              <i />
              <p>
                <strong>{a.customer}</strong>
                <span>
                  {a.service} · {a.vehicle}
                </span>
              </p>
            </div>
          ))}
          {upcomingAppointments.length === 0 && (
            <div className="schedule-empty">
              Es sind keine kommenden Termine eingetragen.
            </div>
          )}
          <button onClick={showCalendar} className="calendar-link">
            Kalender öffnen <ChevronRight />
          </button>
        </div>
      </section>
      <section className="bottom-grid">
        <div className="panel utilization">
          <div className="panel-head">
            <div>
              <h3>Aufträge diese Woche</h3>
              <p>Nach geplantem Termin</p>
            </div>
            <strong>{weeklyOrders}</strong>
          </div>
          <div className="bars">
            {weekdayLabels.map((label, index) => (
              <div key={label}>
                <span
                  style={{
                    height: `${Math.max(4, (weeklyOrderCounts[index] / maxDailyOrders) * 100)}%`,
                  }}
                  className={new Date().getDay() === index + 1 ? "today" : ""}
                />
                <small>{label}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="panel reminders">
          <div className="panel-head">
            <div>
              <h3>Handlungsbedarf</h3>
              <p>Aktueller Stand</p>
            </div>
            <Badge>{overdueInvoices + inventoryWarnings} offen</Badge>
          </div>
          <button
            type="button"
            className="reminder-action"
            onClick={showInvoices}
          >
            <span className="round purple" aria-hidden="true">€</span>
            <p>
              <strong>Überfällige Rechnungen</strong>
              <small>{overdueInvoices} Dokumente</small>
            </p>
            <span className="reminder-open">Öffnen</span>
          </button>
          <button
            type="button"
            className="reminder-action"
            onClick={showInventory}
          >
            <span className="round blue" aria-hidden="true">!</span>
            <p>
              <strong>Lager nachbestellen</strong>
              <small>{inventoryWarnings} Artikel</small>
            </p>
            <span className="reminder-open">Öffnen</span>
          </button>
        </div>
      </section>
    </div>
  );
}
function Kpi({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: ComponentType;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="kpi">
      <span className={`kpi-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}
type Appointment = {
  id: number;
  customerId: number;
  vehicleId: number;
  customer: string;
  vehicle: string;
  service: string;
  startsAt: string;
  status: string;
};
function AppointmentManager({
  flash,
  onReminderCountChange,
}: {
  flash: (message: string) => void;
  onReminderCountChange: (count: number) => void;
}) {
  const [rows, setRows] = useState<Appointment[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [vehicles, setVehicles] = useState<Vehicle[]>([]),
    [appointmentCustomerId, setAppointmentCustomerId] = useState(""),
    [appointmentVehicleId, setAppointmentVehicleId] = useState(""),
    [edit, setEdit] = useState<Appointment | null>(null),
    [open, setOpen] = useState(false);
  function map(
    a: {
      id: number;
      customerId: number;
      vehicleId: number;
      service: string;
      startsAt: string;
      status: string;
    },
    customerRows: Customer[],
    vehicleRows: Vehicle[],
  ) {
    let legacy = { customer: "", vehicle: "", service: a.service };
    try {
      const parsed = JSON.parse(a.service);
      if (parsed && typeof parsed === "object") legacy = parsed;
    } catch {}
    const customer = customerRows.find((item) => item.id === a.customerId);
    const vehicle = vehicleRows.find((item) => item.id === a.vehicleId);
    return {
      id: a.id,
      customerId: a.customerId,
      vehicleId: a.vehicleId,
      customer: customer?.name || legacy.customer,
      vehicle: vehicle
        ? `${vehicle.make} ${vehicle.model} · ${vehicle.plate}`.trim()
        : legacy.vehicle,
      service: legacy.service,
      startsAt: a.startsAt,
      status: a.status,
    };
  }
  function load() {
    Promise.all([
      fetch("/api/appointments", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/customers", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/vehicles", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([appointmentData, customerData, vehicleData]) => {
        const nextCustomers = customerData.customers ?? [];
        const nextVehicles = vehicleData.vehicles ?? [];
        const nextRows = (appointmentData.appointments ?? []).map(
          (item: Parameters<typeof map>[0]) =>
            map(item, nextCustomers, nextVehicles),
        );
        setCustomers(nextCustomers);
        setVehicles(nextVehicles);
        setRows(nextRows);
        onReminderCountChange(
          countOpenMaintenanceReminders(nextRows),
        );
      })
      .catch(() => flash("Termine konnten nicht geladen werden"));
  }
  useEffect(load, []);
  const matchingVehicles = vehicles.filter(
    (vehicle) => vehicle.customerId === Number(appointmentCustomerId),
  );
  useEffect(() => {
    if (
      appointmentVehicleId &&
      !matchingVehicles.some(
        (vehicle) => String(vehicle.id) === appointmentVehicleId,
      )
    ) {
      setAppointmentVehicleId("");
    }
  }, [appointmentCustomerId, appointmentVehicleId, matchingVehicles]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      payload = Object.fromEntries(f);
    if (edit) payload.id = String(edit.id);
    const r = await fetch("/api/appointments", {
      method: edit ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      setOpen(false);
      setEdit(null);
      load();
      flash(edit ? "Termin wurde aktualisiert" : "Termin wurde angelegt");
    } else flash("Termin konnte nicht gespeichert werden");
  }
  async function remove() {
    if (!edit) return;
    const r = await fetch(`/api/appointments?id=${edit.id}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setOpen(false);
      setEdit(null);
      load();
      flash("Termin wurde gelöscht");
    }
  }
  function show(a?: Appointment) {
    setEdit(a ?? null);
    setAppointmentCustomerId(a?.customerId ? String(a.customerId) : "");
    setAppointmentVehicleId(a?.vehicleId ? String(a.vehicleId) : "");
    setOpen(true);
  }
  return (
    <div className="module-page">
      <div className="module-toolbar">
        <div>
          <h2>Termine</h2>
          <p>{rows.length} Termine · Zum Bearbeiten Zeile anklicken</p>
        </div>
        <Button onClick={() => show()}>
          <Plus /> Termin anlegen
        </Button>
      </div>
      <div className="data-card">
        <table>
          <thead>
            <tr>
              {[
                "Datum & Uhrzeit",
                "Kunde",
                "Fahrzeug",
                "Leistung",
                "Status",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr className="clickable-row" key={a.id} onClick={() => show(a)}>
                <td>
                  <strong>
                    {new Date(a.startsAt).toLocaleString("de-DE")}
                  </strong>
                </td>
                <td>{a.customer}</td>
                <td>{a.vehicle}</td>
                <td>{a.service}</td>
                <td>
                  <Badge>{a.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty-orders">
            <CalendarDays />
            <strong>Noch keine Termine</strong>
            <Button onClick={() => show()}>Termin anlegen</Button>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit ? "Termin bearbeiten" : "Termin anlegen"}
            </DialogTitle>
            <DialogDescription>
              Kundendaten, Fahrzeug und Werkstattleistung erfassen.
            </DialogDescription>
          </DialogHeader>
          <form className="order-form" onSubmit={save} key={edit?.id ?? "new"}>
            <label>
              Kunde
              <select
                name="customerId"
                value={appointmentCustomerId}
                onChange={(event) =>
                  setAppointmentCustomerId(event.target.value)
                }
                required
              >
                <option value="">Kunde auswählen</option>
                {customers.map((customer) => (
                  <option value={customer.id} key={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fahrzeug
              <select
                name="vehicleId"
                value={appointmentVehicleId}
                onChange={(event) =>
                  setAppointmentVehicleId(event.target.value)
                }
                disabled={!appointmentCustomerId}
                required
              >
                <option value="">
                  {appointmentCustomerId
                    ? "Fahrzeug auswählen"
                    : "Zuerst Kunde auswählen"}
                </option>
                {matchingVehicles.map((vehicle) => (
                  <option value={vehicle.id} key={vehicle.id}>
                    {vehicle.make} {vehicle.model} · {vehicle.plate}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Leistung
              <Input name="service" defaultValue={edit?.service} required />
            </label>
            <label>
              Datum und Uhrzeit
              <Input
                name="startsAt"
                type="datetime-local"
                defaultValue={edit?.startsAt?.slice(0, 16)}
                required
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={edit?.status ?? "Geplant"}>
                <option>Geplant</option>
                <option>Eingecheckt</option>
                <option>In Arbeit</option>
                <option>Erledigt</option>
                <option>Abgesagt</option>
              </select>
            </label>
            <div className="edit-actions">
              {edit && (
                <Button type="button" variant="destructive" onClick={remove}>
                  Termin löschen
                </Button>
              )}
              <Button type="submit">Termin speichern</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SpeechResultEvent = {
  results: ArrayLike<{ 0?: { transcript?: string } }>;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function VoiceDictation({
  label,
  example,
  onTranscript,
}: {
  label: string;
  example: string;
  onTranscript: (transcript: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
    return () => recognitionRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Die Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        onTranscript(transcript);
        setMessage(`Erkannt: „${transcript}“`);
      }
    };
    recognition.onerror = (event) => {
      setMessage(
        event.error === "not-allowed"
          ? "Bitte erlauben Sie den Mikrofonzugriff im Browser."
          : "Die Sprache konnte nicht erkannt werden. Bitte erneut versuchen.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    setMessage("Ich höre zu …");
    setListening(true);
    recognition.start();
  }

  return (
    <div className={`voice-dictation ${listening ? "listening" : ""}`}>
      <Button
        type="button"
        variant={listening ? "destructive" : "outline"}
        onClick={toggle}
        disabled={!supported}
      >
        {listening ? <MicOff /> : <Mic />}
        {listening ? "Diktat beenden" : label}
      </Button>
      <div>
        <small>{supported ? example : "Spracherkennung ist in diesem Browser nicht verfügbar."}</small>
        {message && <span role="status">{message}</span>}
      </div>
    </div>
  );
}

type DictationSpec = { name: string; labels: string[] };

function extractDictation(text: string, specs: DictationSpec[]) {
  const labels = specs
    .flatMap((spec) => spec.labels)
    .sort((a, b) => b.length - a.length);
  const escaped = labels.map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const matcher = new RegExp(
    `(?:^|[,.!?;]\\s*|\\s+)(${escaped.join("|")})\\s*(?::|ist|lautet)?\\s*`,
    "gi",
  );
  const matches = Array.from(text.matchAll(matcher));
  const values: Record<string, string> = {};
  matches.forEach((match, index) => {
    const label = match[1].toLocaleLowerCase("de-DE");
    const spec = specs.find((entry) =>
      entry.labels.some(
        (candidate) => candidate.toLocaleLowerCase("de-DE") === label,
      ),
    );
    if (!spec || match.index === undefined) return;
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const value = text.slice(start, end).replace(/^[,.;:\s]+|[,.;:\s]+$/g, "").trim();
    if (value) values[spec.name] = value;
  });
  return values;
}

function fillForm(formId: string, values: Record<string, string>) {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  if (!form) return;
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const customerDictationSpecs: DictationSpec[] = [
  { name: "fullName", labels: ["kundenname", "kunde", "name"] },
  { name: "firstName", labels: ["vorname"] },
  { name: "lastName", labels: ["nachname", "familienname"] },
  { name: "phone", labels: ["telefon", "telefonnummer", "handynummer"] },
  { name: "email", labels: ["e-mail", "email"] },
  {
    name: "street",
    labels: ["straße", "strasse", "anschrift", "adresse"],
  },
  { name: "postalCode", labels: ["postleitzahl", "plz"] },
  { name: "city", labels: ["stadt", "ort"] },
];

const vehicleDictationSpecs: DictationSpec[] = [
  { name: "make", labels: ["hersteller", "marke"] },
  { name: "model", labels: ["modell"] },
  { name: "plate", labels: ["kennzeichen", "nummernschild"] },
  { name: "vin", labels: ["fahrgestellnummer", "fin"] },
  { name: "mileage", labels: ["kilometerstand", "kilometer"] },
];

function normalizeCustomerDictation(values: Record<string, string>) {
  if (values.fullName && (!values.firstName || !values.lastName)) {
    const nameParts = values.fullName.trim().split(/\s+/);
    if (!values.firstName) values.firstName = nameParts.shift() ?? "";
    if (!values.lastName) values.lastName = nameParts.join(" ");
  }
  delete values.fullName;
  if (values.postalCode)
    values.postalCode = values.postalCode.replace(/\D/g, "").slice(0, 5);
  if (values.email)
    values.email = values.email
      .replace(/\s+(?:at|ät|klammeraffe)\s+/gi, "@")
      .replace(/\s+punkt\s+/gi, ".")
      .replace(/\s/g, "");
  return values;
}

function normalizeVehicleDictation(values: Record<string, string>) {
  if (values.plate) values.plate = values.plate.toLocaleUpperCase("de-DE");
  if (values.vin)
    values.vin = values.vin.replace(/\s/g, "").toLocaleUpperCase("de-DE");
  if (values.mileage) values.mileage = values.mileage.replace(/\D/g, "");
  return values;
}

const invoiceDictationSpecs: DictationSpec[] = [
  {
    name: "description",
    labels: [
      "arbeitsleistung",
      "ersatzteil",
      "beschreibung",
      "position",
      "arbeit",
      "leistung",
      "teil",
    ],
  },
  { name: "quantity", labels: ["menge", "anzahl"] },
  { name: "unitPrice", labels: ["einzelpreis", "preis"] },
];

function parseGermanNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  let cleaned = value.replace(/[^\d,.-]/g, "");
  if (cleaned.includes(","))
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Customer = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  street: string;
  postalCode: string;
  city: string;
};

type Vehicle = {
  id: number;
  customerId: number;
  plate: string;
  make: string;
  model: string;
  vin: string | null;
  mileage: number | null;
  registrationImageKey: string | null;
  registrationImageName: string | null;
  registrationImageType: string | null;
};

function CustomerVehicleManager({
  flash,
  query,
}: {
  flash: (message: string) => void;
  query: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingRegistration, setViewingRegistration] =
    useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [customerResponse, vehicleResponse] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
      ]);
      if (!customerResponse.ok || !vehicleResponse.ok) throw new Error();
      const [customerData, vehicleData] = await Promise.all([
        customerResponse.json(),
        vehicleResponse.json(),
      ]);
      setCustomers(customerData.customers ?? []);
      setVehicles(vehicleData.vehicles ?? []);
    } catch {
      flash("Kunden und Fahrzeuge konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/customers", { cache: "no-store" }),
      fetch("/api/vehicles", { cache: "no-store" }),
    ])
      .then(async ([customerResponse, vehicleResponse]) => {
        if (!customerResponse.ok || !vehicleResponse.ok) throw new Error();
        const [customerData, vehicleData] = await Promise.all([
          customerResponse.json(),
          vehicleResponse.json(),
        ]);
        if (active) {
          setCustomers(customerData.customers ?? []);
          setVehicles(vehicleData.vehicles ?? []);
        }
      })
      .catch(() => flash("Kunden und Fahrzeuge konnten nicht geladen werden"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function errorMessage(response: Response, fallback: string) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return body?.error ?? fallback;
  }

  async function saveCustomer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    if (editingCustomer) payload.id = String(editingCustomer.id);
    const response = await fetch("/api/customers", {
      method: editingCustomer ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      flash(
        await errorMessage(response, "Kunde konnte nicht gespeichert werden"),
      );
      return;
    }
    setCustomerDialog(false);
    setEditingCustomer(null);
    await load();
    flash(
      editingCustomer ? "Kunde wurde aktualisiert" : "Kunde wurde angelegt",
    );
  }

  async function saveVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const registrationImage = formData.get("registrationImage");
    formData.delete("registrationImage");
    const payload = Object.fromEntries(formData);
    if (editingVehicle) payload.id = String(editingVehicle.id);
    const response = await fetch("/api/vehicles", {
      method: editingVehicle ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      flash(
        await errorMessage(
          response,
          "Fahrzeug konnte nicht gespeichert werden",
        ),
      );
      return;
    }
    const { vehicle } = await response.json();
    if (registrationImage instanceof File && registrationImage.size > 0) {
      const imageForm = new FormData();
      imageForm.set("vehicleId", String(vehicle.id));
      imageForm.set("file", registrationImage);
      const imageResponse = await fetch("/api/vehicle-registration", {
        method: "POST",
        body: imageForm,
      });
      if (!imageResponse.ok) {
        setVehicleDialog(false);
        setEditingVehicle(null);
        flash(
          await errorMessage(
            imageResponse,
            "Fahrzeug gespeichert, Fahrzeugschein-Foto konnte nicht hochgeladen werden",
          ),
        );
        await load();
        return;
      }
    }
    setVehicleDialog(false);
    setEditingVehicle(null);
    await load();
    flash(
      editingVehicle
        ? "Fahrzeug wurde aktualisiert"
        : "Fahrzeug wurde angelegt",
    );
  }

  async function removeCustomer() {
    if (!editingCustomer) return;
    const response = await fetch(`/api/customers?id=${editingCustomer.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      flash(await errorMessage(response, "Kunde konnte nicht gelöscht werden"));
      return;
    }
    setCustomerDialog(false);
    setEditingCustomer(null);
    await load();
    flash("Kunde wurde gelöscht");
  }

  async function removeVehicle() {
    if (!editingVehicle) return;
    const response = await fetch(`/api/vehicles?id=${editingVehicle.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      flash(
        await errorMessage(response, "Fahrzeug konnte nicht gelöscht werden"),
      );
      return;
    }
    setVehicleDialog(false);
    setEditingVehicle(null);
    await load();
    flash("Fahrzeug wurde gelöscht");
  }

  function showCustomer(customer?: Customer) {
    setEditingCustomer(customer ?? null);
    setCustomerDialog(true);
  }

  function showVehicle(vehicle?: Vehicle) {
    setEditingVehicle(vehicle ?? null);
    setVehicleDialog(true);
  }

  const needle = query.trim().toLowerCase();
  const visibleCustomers = customers.filter((customer) =>
    [
      customer.firstName,
      customer.lastName,
      customer.name,
      customer.email,
      customer.phone,
      customer.street,
      customer.postalCode,
      customer.city,
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
  const visibleVehicles = vehicles.filter((vehicle) =>
    [
      vehicle.plate,
      vehicle.make,
      vehicle.model,
      vehicle.vin,
      customers.find((customer) => customer.id === vehicle.customerId)?.name,
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );

  return (
    <div className="module-page customer-vehicle-page">
      <div className="module-toolbar">
        <div>
          <h2>Kunden & Fahrzeuge</h2>
          <p>
            {customers.length} Kunden · {vehicles.length} Fahrzeuge · Zeile zum
            Bearbeiten anklicken
          </p>
        </div>
        <div className="customer-vehicle-actions">
          <Button variant="outline" onClick={() => showCustomer()}>
            <Plus /> Kunde
          </Button>
          <Button
            onClick={() => showVehicle()}
            disabled={customers.length === 0}
          >
            <Plus /> Fahrzeug
          </Button>
        </div>
      </div>

      <div className="customer-vehicle-grid">
        <section className="data-card">
          <div className="data-card-section-head">
            <div>
              <h3>Kunden</h3>
              <span>{visibleCustomers.length} Einträge</span>
            </div>
            <Users />
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kontakt</th>
                <th>Adresse</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((customer) => (
                <tr
                  className="clickable-row"
                  key={customer.id}
                  tabIndex={0}
                  onClick={() => showCustomer(customer)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      showCustomer(customer);
                  }}
                >
                  <td>
                    <strong>{customer.name}</strong>
                  </td>
                  <td>
                    {customer.phone || "–"}
                    <small className="table-subline">
                      {customer.email || ""}
                    </small>
                  </td>
                  <td>
                    {customer.street || customer.address || "–"}
                    <small className="table-subline">
                      {[customer.postalCode, customer.city]
                        .filter(Boolean)
                        .join(" ")}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && visibleCustomers.length === 0 && (
            <div className="empty-orders">
              <Users />
              <strong>Noch keine Kunden</strong>
              <Button onClick={() => showCustomer()}>Kunde anlegen</Button>
            </div>
          )}
        </section>

        <section className="data-card">
          <div className="data-card-section-head">
            <div>
              <h3>Fahrzeuge</h3>
              <span>{visibleVehicles.length} Einträge</span>
            </div>
            <Car />
          </div>
          <table>
            <thead>
              <tr>
                <th>Fahrzeug</th>
                <th>Kennzeichen</th>
                <th>Kunde</th>
                <th>Kilometer</th>
                <th>Fahrzeugschein</th>
              </tr>
            </thead>
            <tbody>
              {visibleVehicles.map((vehicle) => (
                <tr
                  className="clickable-row"
                  key={vehicle.id}
                  tabIndex={0}
                  onClick={() => showVehicle(vehicle)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      showVehicle(vehicle);
                  }}
                >
                  <td>
                    <strong>
                      {vehicle.make} {vehicle.model}
                    </strong>
                    <small className="table-subline">{vehicle.vin || ""}</small>
                  </td>
                  <td>{vehicle.plate}</td>
                  <td>
                    {customers.find(
                      (customer) => customer.id === vehicle.customerId,
                    )?.name ?? "Unbekannt"}
                  </td>
                  <td>
                    {Number(vehicle.mileage ?? 0).toLocaleString("de-DE")} km
                  </td>
                  <td>
                    {vehicle.registrationImageKey ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewingRegistration(vehicle);
                        }}
                      >
                        Foto öffnen
                      </Button>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && visibleVehicles.length === 0 && (
            <div className="empty-orders">
              <Car />
              <strong>Noch keine Fahrzeuge</strong>
              <span>Lege zuerst einen Kunden und danach sein Fahrzeug an.</span>
            </div>
          )}
        </section>
      </div>

      <Dialog open={customerDialog} onOpenChange={setCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Kunde bearbeiten" : "Kunde anlegen"}
            </DialogTitle>
            <DialogDescription>
              Kontaktdaten des Kunden erfassen.
            </DialogDescription>
          </DialogHeader>
          <form
            id="customer-details-form"
            className="order-form"
            onSubmit={saveCustomer}
            key={editingCustomer?.id ?? "new-customer"}
          >
            <VoiceDictation
              label="Kundendaten diktieren"
              example="Zum Beispiel: Vorname Max, Nachname Mustermann, Straße Hauptstraße 12, Postleitzahl 75015, Stadt Bretten."
              onTranscript={(transcript) => {
                const values = normalizeCustomerDictation(
                  extractDictation(transcript, customerDictationSpecs),
                );
                fillForm("customer-details-form", values);
                flash(
                  Object.keys(values).length
                    ? "Erkannte Kundendaten wurden eingetragen"
                    : "Keine Feldnamen erkannt – bitte Vorname, Nachname, Straße, Postleitzahl und Stadt mitsprechen",
                );
              }}
            />
            <div className="form-grid">
              <label>
                Vorname
                <Input
                  name="firstName"
                  defaultValue={editingCustomer?.firstName ?? ""}
                  required
                />
              </label>
              <label>
                Nachname
                <Input
                  name="lastName"
                  defaultValue={
                    editingCustomer?.lastName || editingCustomer?.name || ""
                  }
                  required
                />
              </label>
            </div>
            <label>
              Telefon
              <Input name="phone" defaultValue={editingCustomer?.phone ?? ""} />
            </label>
            <label>
              E-Mail
              <Input
                name="email"
                type="email"
                defaultValue={editingCustomer?.email ?? ""}
              />
            </label>
            <label>
              Straße und Hausnummer
              <Input
                name="street"
                defaultValue={
                  editingCustomer?.street || editingCustomer?.address || ""
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Postleitzahl
                <Input
                  name="postalCode"
                  inputMode="numeric"
                  defaultValue={editingCustomer?.postalCode ?? ""}
                />
              </label>
              <label>
                Stadt
                <Input
                  name="city"
                  defaultValue={editingCustomer?.city ?? ""}
                />
              </label>
            </div>
            <div className="edit-actions">
              {editingCustomer && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeCustomer}
                >
                  Kunde löschen
                </Button>
              )}
              <Button type="submit">Kunde speichern</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={vehicleDialog} onOpenChange={setVehicleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Fahrzeug bearbeiten" : "Fahrzeug anlegen"}
            </DialogTitle>
            <DialogDescription>
              Fahrzeug zuordnen und den Fahrzeugschein als Foto hinterlegen.
            </DialogDescription>
          </DialogHeader>
          <form
            id="vehicle-details-form"
            className="order-form"
            onSubmit={saveVehicle}
            key={editingVehicle?.id ?? "new-vehicle"}
          >
            <VoiceDictation
              label="Fahrzeugdaten diktieren"
              example="Zum Beispiel: Hersteller BMW, Modell 320d, Kennzeichen KA AB 123, FIN WBA…, Kilometerstand 85000."
              onTranscript={(transcript) => {
                const values = normalizeVehicleDictation(
                  extractDictation(transcript, vehicleDictationSpecs),
                );
                fillForm("vehicle-details-form", values);
                flash(
                  Object.keys(values).length
                    ? "Erkannte Fahrzeugdaten wurden eingetragen"
                    : "Keine Feldnamen erkannt – bitte Hersteller, Modell, Kennzeichen, FIN und Kilometerstand mitsprechen",
                );
              }}
            />
            <label>
              Kunde
              <select
                name="customerId"
                defaultValue={editingVehicle?.customerId ?? customers[0]?.id}
                required
              >
                {customers.map((customer) => (
                  <option value={customer.id} key={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hersteller
              <Input name="make" defaultValue={editingVehicle?.make} required />
            </label>
            <label>
              Modell
              <Input
                name="model"
                defaultValue={editingVehicle?.model}
                required
              />
            </label>
            <label>
              Kennzeichen
              <Input
                name="plate"
                defaultValue={editingVehicle?.plate}
                required
              />
            </label>
            <label>
              Fahrgestellnummer (FIN)
              <Input name="vin" defaultValue={editingVehicle?.vin ?? ""} />
            </label>
            <label>
              Kilometerstand
              <Input
                name="mileage"
                type="number"
                min="0"
                defaultValue={editingVehicle?.mileage ?? 0}
              />
            </label>
            <label className="vehicle-document-upload">
              Fahrzeugschein-Foto
              <Input
                name="registrationImage"
                type="file"
                accept="image/*"
                capture="environment"
              />
              <small>JPG, PNG oder Handyfoto · maximal 12 MB</small>
            </label>
            {editingVehicle?.registrationImageKey && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingRegistration(editingVehicle)}
              >
                <Camera /> Gespeicherten Fahrzeugschein öffnen
              </Button>
            )}
            <div className="edit-actions">
              {editingVehicle && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeVehicle}
                >
                  Fahrzeug löschen
                </Button>
              )}
              <Button type="submit">Fahrzeug speichern</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!viewingRegistration}
        onOpenChange={(value) => !value && setViewingRegistration(null)}
      >
        <DialogContent className="vehicle-document-dialog">
          <DialogHeader>
            <DialogTitle>Fahrzeugschein</DialogTitle>
            <DialogDescription>
              {viewingRegistration
                ? `${viewingRegistration.make} ${viewingRegistration.model} · ${viewingRegistration.plate}`
                : "Gespeichertes Dokument"}
            </DialogDescription>
          </DialogHeader>
          {viewingRegistration && (
            <a
              className="vehicle-document-full-link"
              href={`/api/vehicle-registration?vehicleId=${viewingRegistration.id}`}
              target="_blank"
              rel="noreferrer"
              title="Foto in Originalgröße öffnen"
            >
              <img
                src={`/api/vehicle-registration?vehicleId=${viewingRegistration.id}`}
                alt={`Fahrzeugschein ${viewingRegistration.plate}`}
              />
              <span>Zum Öffnen in Originalgröße anklicken</span>
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Invoice = {
  id: number;
  workOrderId: number;
  number: string;
  type: string;
  amount: number;
  status: string;
  dueAt: string | null;
  issuedAt: string;
  paidAt: string | null;
  paymentMethod: "ueberweisung" | "bar";
  vatEnabled: boolean;
  vatRate: number;
  items: InvoiceItem[];
};

type InvoiceItem = {
  id?: number;
  invoiceId?: number;
  category: "service" | "part";
  description: string;
  quantity: number;
  unitPrice: number;
};

function InvoiceManager({
  flash,
  query,
  orders,
}: {
  flash: (message: string) => void;
  query: string;
  orders: Order[];
}) {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [linkedOrders, setLinkedOrders] = useState<Order[]>(orders);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([
    { category: "service", description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState(19);
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [printing, setPrinting] = useState<Invoice | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [invoiceVehicleId, setInvoiceVehicleId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const [response, orderResponse] = await Promise.all([
        fetch("/api/invoices", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
      ]);
      if (!response.ok || !orderResponse.ok) throw new Error();
      const [data, orderData] = await Promise.all([
        response.json(),
        orderResponse.json(),
      ]);
      setRows(data.invoices ?? []);
      setLinkedOrders(
        (orderData.orders ?? []).map((order: StoredOrderRow) =>
          mapStoredOrder(order),
        ),
      );
    } catch {
      flash("Rechnungen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/invoices", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (active) setRows(data.invoices ?? []);
      })
      .catch(() => flash("Rechnungen konnten nicht geladen werden"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSettings(data.settings ?? {}))
      .catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers", { cache: "no-store" }).then((response) =>
        response.json(),
      ),
      fetch("/api/vehicles", { cache: "no-store" }).then((response) =>
        response.json(),
      ),
    ])
      .then(([customerData, vehicleData]) => {
        const nextCustomers = customerData.customers ?? [];
        const nextVehicles = vehicleData.vehicles ?? [];
        setCustomers(nextCustomers);
        setVehicles(nextVehicles);
        setInvoiceCustomerId((current) =>
          current || String(nextCustomers[0]?.id ?? ""),
        );
      })
      .catch(() => {
        setCustomers([]);
        setVehicles([]);
      });
  }, []);

  useEffect(() => {
    setLinkedOrders(orders);
  }, [orders]);

  useEffect(() => {
    const matchingVehicles = vehicles.filter(
      (vehicle) => vehicle.customerId === Number(invoiceCustomerId),
    );
    if (!matchingVehicles.some((vehicle) => String(vehicle.id) === invoiceVehicleId))
      setInvoiceVehicleId(String(matchingVehicles[0]?.id ?? ""));
  }, [invoiceCustomerId, invoiceVehicleId, vehicles]);

  async function responseError(response: Response, fallback: string) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return data?.error ?? fallback;
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      ...Object.fromEntries(new FormData(e.currentTarget)),
      items,
      vatEnabled,
      vatRate,
      ...(editing
        ? { id: String(editing.id) }
        : {
            customerId: invoiceCustomerId,
            vehicleId: invoiceVehicleId,
          }),
    };
    const response = await fetch("/api/invoices", {
      method: editing ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      flash(
        await responseError(
          response,
          "Dokument konnte nicht gespeichert werden",
        ),
      );
      return;
    }
    setOpen(false);
    setEditing(null);
    await load();
    flash(editing ? "Dokument wurde aktualisiert" : "Dokument wurde angelegt");
  }

  async function remove() {
    if (!editing || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/invoices?id=${editing.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        flash(
          await responseError(
            response,
            "Dokument konnte nicht gelöscht werden",
          ),
        );
        return;
      }
      setDeleteOpen(false);
      setOpen(false);
      setEditing(null);
      await load();
      flash("Dokument wurde gelöscht");
    } finally {
      setDeleting(false);
    }
  }

  function show(invoice?: Invoice) {
    setEditing(invoice ?? null);
    const invoiceVatEnabled = invoice?.vatEnabled ?? true;
    const invoiceVatRate = Number(invoice?.vatRate ?? 19);
    const legacyNetAmount = invoice
      ? Number(invoice.amount) /
        (invoiceVatEnabled ? 1 + invoiceVatRate / 100 : 1)
      : 0;
    setItems(
      invoice?.items?.length
        ? invoice.items.map((item) => ({ ...item }))
        : [
            {
              category: "service",
              description: invoice
                ? orderFor(invoice)?.task || "Arbeitsleistung"
                : "",
              quantity: 1,
              unitPrice: Math.round(legacyNetAmount * 100) / 100,
            },
          ],
    );
    setVatEnabled(invoiceVatEnabled);
    setVatRate(invoiceVatRate);
    setOpen(true);
  }

  function updateItem(index: number, values: Partial<InvoiceItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...values } : item,
      ),
    );
  }

  function addItem(category: "service" | "part") {
    setItems((current) => [
      ...current,
      { category, description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function addDictatedInvoiceItem(transcript: string) {
    const values = extractDictation(transcript, invoiceDictationSpecs);
    const description = values.description?.trim();
    if (!description) {
      flash(
        "Keine Rechnungsposition erkannt – bitte mit Arbeit oder Ersatzteil beginnen",
      );
      return;
    }
    const item: InvoiceItem = {
      category: /ersatzteil|\bteil\b/i.test(transcript) ? "part" : "service",
      description,
      quantity: Math.max(0.01, parseGermanNumber(values.quantity, 1)),
      unitPrice: Math.max(0, parseGermanNumber(values.unitPrice, 0)),
    };
    setItems((current) =>
      current.length === 1 && !current[0].description
        ? [item]
        : [...current, item],
    );
    flash("Diktierte Rechnungsposition wurde hinzugefügt");
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function printDocument(invoice: Invoice) {
    setPrinting(invoice);
    window.setTimeout(() => window.print(), 100);
  }

  function orderFor(invoice: Invoice) {
    return linkedOrders.find((order) => order.dbId === invoice.workOrderId);
  }

  function vehicleFor(invoice: Invoice) {
    const order = orderFor(invoice);
    if (!order) return undefined;
    const normalizePlate = (value: string) =>
      value.toLocaleUpperCase("de-DE").replace(/[^A-ZÄÖÜ0-9]/g, "");
    const exactPlate = vehicles.find(
      (vehicle) => normalizePlate(vehicle.plate) === normalizePlate(order.plate),
    );
    if (exactPlate) return exactPlate;
    const customer = customers.find(
      (row) => row.name.trim().toLowerCase() === order.customer.trim().toLowerCase(),
    );
    const normalizedCar = order.car.replace(/\s+/g, " ").trim().toLowerCase();
    return vehicles.find(
      (vehicle) =>
        vehicle.customerId === customer?.id &&
        `${vehicle.make} ${vehicle.model}`
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase() === normalizedCar,
    );
  }

  function customerFor(invoice: Invoice) {
    const order = orderFor(invoice);
    const vehicle = vehicleFor(invoice);
    return (
      customers.find((customer) => customer.id === vehicle?.customerId) ??
      customers.find(
        (customer) =>
          customer.name.trim().toLowerCase() ===
          order?.customer.trim().toLowerCase(),
      )
    );
  }

  const euro = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });
  const needle = query.trim().toLowerCase();
  const visibleRows = rows.filter((invoice) => {
    const order = orderFor(invoice);
    const matchesSearch = [
        invoice.number,
        invoice.type,
        invoice.status,
        invoice.dueAt,
        order?.customer,
        order?.car,
        order?.plate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    const matchesNumber = invoice.number
      .toLowerCase()
      .includes(invoiceNumberFilter.trim().toLowerCase());
    const matchesDueDate =
      !dueDateFilter || invoice.dueAt === dueDateFilter;
    return matchesSearch && matchesNumber && matchesDueDate;
  });
  const openAmount = rows
    .filter(
      (invoice) => invoice.type === "rechnung" && invoice.status === "offen",
    )
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paidAmount = rows
    .filter(
      (invoice) => invoice.type === "rechnung" && invoice.status === "bezahlt",
    )
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const defaultDueDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toLocaleDateString("sv-SE");
  })();
  const statusOptions =
    editing?.type === "kostenvoranschlag"
      ? ["entwurf", "angenommen", "abgelehnt"]
      : ["offen", "bezahlt", "storniert"];

  return (
    <div className="module-page invoice-page">
      <div className="module-toolbar">
        <div>
          <h2>Rechnungen & Kostenvoranschläge</h2>
          <p>{rows.length} Dokumente · Zeile zum Bearbeiten anklicken</p>
        </div>
        <Button
          onClick={() => show()}
          disabled={customers.length === 0 || vehicles.length === 0}
        >
          <Plus /> Dokument anlegen
        </Button>
      </div>

      <div className="invoice-summary">
        <div>
          <span>Offene Rechnungen</span>
          <strong>{euro.format(openAmount)}</strong>
        </div>
        <div>
          <span>Bezahlte Rechnungen</span>
          <strong>{euro.format(paidAmount)}</strong>
        </div>
        <div>
          <span>Kostenvoranschläge</span>
          <strong>
            {
              rows.filter((invoice) => invoice.type === "kostenvoranschlag")
                .length
            }
          </strong>
        </div>
      </div>

      <div className="invoice-filters" aria-label="Rechnungen filtern">
        <label>
          Rechnungsnummer
          <Input
            value={invoiceNumberFilter}
            onChange={(event) => setInvoiceNumberFilter(event.target.value)}
            placeholder="z. B. RE-2026-0001"
          />
        </label>
        <label>
          Fällig am
          <Input
            type="date"
            value={dueDateFilter}
            onChange={(event) => setDueDateFilter(event.target.value)}
          />
        </label>
        {(invoiceNumberFilter || dueDateFilter) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInvoiceNumberFilter("");
              setDueDateFilter("");
            }}
          >
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Typ</th>
              <th>Kunde & Fahrzeug</th>
              <th>Betrag</th>
              <th>Fällig</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((invoice) => {
              const order = orderFor(invoice);
              return (
                <tr
                  className="clickable-row"
                  key={invoice.id}
                  tabIndex={0}
                  onClick={() => show(invoice)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") show(invoice);
                  }}
                >
                  <td>
                    <strong>{invoice.number}</strong>
                  </td>
                  <td>
                    {invoice.type === "kostenvoranschlag"
                      ? "Kostenvoranschlag"
                      : "Rechnung"}
                  </td>
                  <td>
                    {order?.customer ?? "Kundendaten nicht verfügbar"}
                    <small className="table-subline">
                      {order ? `${order.car} · ${order.plate}` : ""}
                    </small>
                  </td>
                  <td>{euro.format(Number(invoice.amount))}</td>
                  <td>
                    {invoice.dueAt
                      ? new Date(
                          `${invoice.dueAt}T12:00:00`,
                        ).toLocaleDateString("de-DE")
                      : "–"}
                  </td>
                  <td>
                    <Badge className={`invoice-status ${invoice.status}`}>
                      {invoice.status.charAt(0).toUpperCase() +
                        invoice.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && visibleRows.length === 0 && (
          <div className="empty-orders">
            <CircleDollarSign />
            <strong>Noch keine Dokumente</strong>
            <span>Erstelle eine Rechnung oder einen Kostenvoranschlag.</span>
            {customers.length > 0 && vehicles.length > 0 && (
              <Button onClick={() => show()}>Dokument anlegen</Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="invoice-editor-dialog">
          <DialogHeader>
            <DialogTitle>
              {editing ? editing.number : "Dokument anlegen"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Betrag, Fälligkeit und Zahlungsstatus bearbeiten."
                : "Kunde und Fahrzeug auswählen und Dokument direkt erstellen."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="order-form"
            onSubmit={save}
            key={editing?.id ?? "new-invoice"}
          >
            {!editing && (
              <>
                <div className="form-grid">
                  <label>
                    Kunde
                    <select
                      value={invoiceCustomerId}
                      onChange={(event) =>
                        setInvoiceCustomerId(event.target.value)
                      }
                      required
                    >
                      <option value="">Kunde auswählen</option>
                      {customers.map((customer) => (
                        <option value={customer.id} key={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fahrzeug
                    <select
                      value={invoiceVehicleId}
                      onChange={(event) =>
                        setInvoiceVehicleId(event.target.value)
                      }
                      required
                    >
                      <option value="">Fahrzeug auswählen</option>
                      {vehicles
                        .filter(
                          (vehicle) =>
                            vehicle.customerId === Number(invoiceCustomerId),
                        )
                        .map((vehicle) => (
                          <option value={vehicle.id} key={vehicle.id}>
                            {vehicle.make} {vehicle.model} · {vehicle.plate}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label>
                  Dokumenttyp
                  <select
                    name="type"
                    defaultValue="rechnung"
                  >
                    <option value="rechnung">Rechnung</option>
                    <option value="kostenvoranschlag">Kostenvoranschlag</option>
                  </select>
                </label>
              </>
            )}
            <div className="invoice-items-editor">
              <div className="invoice-items-head">
                <strong>Positionen</strong>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addItem("service")}
                  >
                    <Plus /> Arbeit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addItem("part")}
                  >
                    <Plus /> Teil
                  </Button>
                </div>
              </div>
              <VoiceDictation
                label="Position diktieren"
                example="Zum Beispiel: Arbeit Ölwechsel, Menge 1, Preis 85 Euro – oder: Ersatzteil Motoröl, Menge 5, Preis 12 Komma 50 Euro."
                onTranscript={addDictatedInvoiceItem}
              />
              {items.map((item, index) => (
                <div
                  className="invoice-item-row"
                  key={`${item.id ?? "new"}-${index}`}
                >
                  <select
                    aria-label="Positionsart"
                    value={item.category}
                    onChange={(e) =>
                      updateItem(index, {
                        category: e.target.value as "service" | "part",
                      })
                    }
                  >
                    <option value="service">Arbeit</option>
                    <option value="part">Ersatzteil</option>
                  </select>
                  <Input
                    aria-label="Beschreibung"
                    placeholder="Beschreibung"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, { description: e.target.value })
                    }
                    required
                  />
                  <Input
                    aria-label="Menge"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, { quantity: Number(e.target.value) })
                    }
                    required
                  />
                  <Input
                    aria-label="Einzelpreis"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, { unitPrice: Number(e.target.value) })
                    }
                    required
                  />
                  <span>{euro.format(item.quantity * item.unitPrice)}</span>
                  <button
                    type="button"
                    className="remove-invoice-item"
                    aria-label="Position entfernen"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <X />
                  </button>
                </div>
              ))}
            </div>
            <div className="vat-controls">
              <label>
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                />
                Mehrwertsteuer ausweisen
              </label>
              {vatEnabled && (
                <label>
                  MwSt.-Satz
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                  />
                </label>
              )}
            </div>
            <div className="invoice-live-totals">
              <span>
                Netto <strong>{euro.format(subtotal)}</strong>
              </span>
              {vatEnabled && (
                <span>
                  MwSt. ({vatRate} %) <strong>{euro.format(vatAmount)}</strong>
                </span>
              )}
              <span className="invoice-grand-total">
                Gesamt <strong>{euro.format(subtotal + vatAmount)}</strong>
              </span>
            </div>
            <label>
              Fällig am
              <Input
                name="dueAt"
                type="date"
                defaultValue={editing?.dueAt ?? defaultDueDate}
              />
            </label>
            <label>
              Zahlungsart
              <select
                name="paymentMethod"
                defaultValue={editing?.paymentMethod ?? "ueberweisung"}
              >
                <option value="ueberweisung">Überweisung</option>
                <option value="bar">Barzahlung</option>
              </select>
            </label>
            {!editing && (
              <label className="invoice-paid-now">
                <input type="checkbox" name="paidNow" />
                Kunde hat bereits bezahlt
              </label>
            )}
            {editing && (
              <label>
                Status
                <select name="status" defaultValue={editing.status}>
                  {statusOptions.map((status) => (
                    <option value={status} key={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="edit-actions">
              {editing && (
                <div className="invoice-secondary-actions">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    {editing.type === "kostenvoranschlag"
                      ? "Kostenvoranschlag löschen"
                      : "Rechnung löschen"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      printDocument({
                        ...editing,
                        items,
                        vatEnabled,
                        vatRate,
                        amount: subtotal + vatAmount,
                      })
                    }
                  >
                    Drucken
                  </Button>
                </div>
              )}
              <Button type="submit">
                {editing ? "Änderungen speichern" : "Dokument erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing?.type === "kostenvoranschlag"
                ? "Kostenvoranschlag endgültig löschen?"
                : "Rechnung endgültig löschen?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editing?.number
                ? `${editing.number} wird mit allen Positionen dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`
                : "Das Dokument wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleting ? "Wird gelöscht …" : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {printing && (
        <InvoicePrintSheet
          invoice={printing}
          order={orderFor(printing)}
          customer={customerFor(printing)}
          vehicle={vehicleFor(printing)}
          settings={settings}
          euro={euro}
        />
      )}
    </div>
  );
}

function InvoicePrintSheet({
  invoice,
  order,
  customer,
  vehicle,
  settings,
  euro,
}: {
  invoice: Invoice;
  order?: Order;
  customer?: Customer;
  vehicle?: Vehicle;
  settings: Record<string, string | number>;
  euro: Intl.NumberFormat;
}) {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const vat = invoice.vatEnabled ? subtotal * (invoice.vatRate / 100) : 0;
  const documentTitle =
    invoice.type === "kostenvoranschlag" ? "Kostenvoranschlag" : "Rechnung";
  const formatDate = (value?: string | null) =>
    value
      ? new Date(`${value}T12:00:00`).toLocaleDateString("de-DE")
      : "–";
  const issuedAt = invoice.issuedAt || new Date().toLocaleDateString("sv-SE");
  const legacyAddressLines = String(customer?.address || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const recipientName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    customer?.name ||
    order?.customer ||
    "Kunde";
  const recipientStreet = customer?.street || legacyAddressLines[0] || "";
  const recipientCity =
    [customer?.postalCode, customer?.city].filter(Boolean).join(" ") ||
    legacyAddressLines.slice(1).join(" ");
  return (
    <article className="invoice-print-sheet">
      <header className="invoice-print-header">
        <div className="invoice-brand">
          <img src="/werkstatt-logo.png" alt="AAAmann Performance" />
          <div>
            <strong>
              {String(settings.workshopName || "AAAmann Performance")}
            </strong>
            {settings.owner && <span>{String(settings.owner)}</span>}
            <span>{String(settings.street || "Waldstraße 1a")}</span>
            <span>
              {String(settings.postalCode || "75015")}{" "}
              {String(settings.city || "Bretten-Bauerbach")}
            </span>
          </div>
        </div>
        <div className="invoice-document-title">
          <span>{documentTitle}</span>
          <strong>{invoice.number}</strong>
        </div>
      </header>
      <section className="invoice-address-row">
        <div className="invoice-recipient">
          <small>
            {String(settings.workshopName || "AAAmann Performance")} · {String(settings.street || "Waldstraße 1a")} · {String(settings.postalCode || "75015")} {String(settings.city || "Bretten-Bauerbach")}
          </small>
          <strong>{recipientName}</strong>
          <span className={!recipientStreet ? "invoice-missing-field" : ""}>
            {recipientStreet || "Straße in den Kundendaten ergänzen"}
          </span>
          <span className={!recipientCity ? "invoice-missing-field" : ""}>
            {recipientCity || "PLZ und Stadt in den Kundendaten ergänzen"}
          </span>
        </div>
        <dl className="invoice-document-meta">
          <div><dt>Rechnungsnummer</dt><dd>{invoice.number}</dd></div>
          <div><dt>Rechnungsdatum</dt><dd>{formatDate(issuedAt)}</dd></div>
          <div><dt>Leistungsdatum</dt><dd>{formatDate(order?.date)}</dd></div>
          {invoice.dueAt && <div><dt>Fällig am</dt><dd>{formatDate(invoice.dueAt)}</dd></div>}
        </dl>
      </section>
      <section className="invoice-vehicle-strip">
        <div>
          <small>Fahrzeug</small>
          <strong>
            {order?.car ||
              (vehicle ? `${vehicle.make} ${vehicle.model}` : "–")}
          </strong>
        </div>
        <div><small>Kennzeichen</small><strong>{vehicle?.plate || order?.plate || "–"}</strong></div>
        <div><small>FIN</small><strong>{vehicle?.vin || "–"}</strong></div>
        <div>
          <small>Kilometerstand</small>
          <strong>
            {vehicle?.mileage
              ? `${vehicle.mileage.toLocaleString("de-DE")} km`
              : "–"}
          </strong>
        </div>
      </section>
      <p className="invoice-introduction">
        {invoice.type === "kostenvoranschlag"
          ? "Gerne bieten wir Ihnen die folgenden Arbeiten und Ersatzteile an:"
          : "Für die ausgeführten Arbeiten und gelieferten Ersatzteile berechnen wir Ihnen:"}
      </p>
      <section className="invoice-print-group invoice-all-items">
        <table>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Art / Beschreibung</th>
              <th>Menge</th>
              <th>Einheit</th>
              <th>Einzelpreis netto</th>
              <th>Gesamt netto</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.category}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  <span className={`invoice-item-kind ${item.category}`}>
                    {item.category === "service"
                      ? "Arbeitsleistung"
                      : "Ersatzteil"}
                  </span>
                  <strong>{item.description}</strong>
                </td>
                <td>{item.quantity.toLocaleString("de-DE")}</td>
                <td>{item.category === "service" ? "Std." : "Stk."}</td>
                <td>{euro.format(item.unitPrice)}</td>
                <td>{euro.format(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="invoice-print-totals">
        <span>
          Zwischensumme netto <strong>{euro.format(subtotal)}</strong>
        </span>
        {invoice.vatEnabled && (
          <span>
            Mehrwertsteuer {invoice.vatRate} %{" "}
            <strong>{euro.format(vat)}</strong>
          </span>
        )}
        <span className="invoice-print-grand-total">
          Gesamtbetrag <strong>{euro.format(subtotal + vat)}</strong>
        </span>
      </section>
      {!invoice.vatEnabled && (
        <p className="invoice-tax-note">
          {String(
            settings.smallBusinessNotice ||
              "Es wird keine Mehrwertsteuer ausgewiesen.",
          )}
        </p>
      )}
      {invoice.type === "rechnung" && (
        <section className="invoice-payment-note">
          <strong>Zahlungshinweis</strong>
          {invoice.status === "bezahlt" ? (
            <p>
              Der Rechnungsbetrag wurde
              {invoice.paymentMethod === "bar"
                ? " bar bezahlt."
                : " per Überweisung bezahlt."}
            </p>
          ) : invoice.paymentMethod === "bar" ? (
            <p>Der Gesamtbetrag ist bar zu zahlen.</p>
          ) : (
            <p>
              Bitte überweisen Sie den Gesamtbetrag
              {invoice.dueAt
                ? ` bis zum ${formatDate(invoice.dueAt)}`
                : " innerhalb des vereinbarten Zahlungsziels"}{" "}
              unter Angabe der Rechnungsnummer <strong>{invoice.number}</strong>.
            </p>
          )}
        </section>
      )}
      <footer className="invoice-print-footer">
        <div>
          <strong>Kontakt</strong>
          <span>{String(settings.phone || "0179 / 3962652")}</span>
          <span>{String(settings.email || "aaa2058man@gmail.com")}</span>
        </div>
        <div>
          <strong>Bankverbindung</strong>
          <span>
            {String(settings.bank || "Bank in Einstellungen ergänzen")}
          </span>
          <span>
            IBAN: {String(settings.iban || "in Einstellungen ergänzen")}
          </span>
          {settings.bic && <span>BIC: {String(settings.bic)}</span>}
        </div>
        <div>
          <strong>Steuerangaben</strong>
          <span>
            USt-IdNr.:{" "}
            {String(settings.taxNumber || "in Einstellungen ergänzen")}
          </span>
          {settings.owner && <span>Inhaber: {String(settings.owner)}</span>}
        </div>
      </footer>
    </article>
  );
}

type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  price: number;
};

type PartScanDraft = {
  partNumber: string;
  brand: string;
  description: string;
};

function parsePartText(text: string): PartScanDraft {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const labeled = lines.find((line) =>
    /(?:artikel|teile|part|oem|oe)[- ]?(?:nr|no|nummer)/i.test(line),
  );
  const labeledValue = labeled
    ?.replace(/^.*?(?:nr|no|nummer)\s*[:#.-]?\s*/i, "")
    .match(/[A-Z0-9][A-Z0-9 .\/-]{3,24}/i)?.[0];
  const barcode = text.match(/\b\d{8}(?:\d{4,6})?\b/)?.[0];
  const genericCode = lines
    .flatMap((line) => line.match(/[A-Z0-9][A-Z0-9-]{4,20}/gi) ?? [])
    .find((value) => /[A-Z]/i.test(value) && /\d/.test(value));
  const brandLine = lines.find((line) =>
    /(?:hersteller|manufacturer|brand|marke)\s*[:.-]/i.test(line),
  );
  return {
    partNumber: (labeledValue ?? barcode ?? genericCode ?? "")
      .trim()
      .toUpperCase(),
    brand:
      brandLine
        ?.replace(/^.*?(?:hersteller|manufacturer|brand|marke)\s*[:.-]?\s*/i, "")
        .trim() ?? "",
    description: "",
  };
}

function InventoryManager({
  flash,
  query,
}: {
  flash: (message: string) => void;
  query: string;
}) {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newItemDefaults, setNewItemDefaults] = useState<PartScanDraft | null>(null);
  const [partScanDialog, setPartScanDialog] = useState(false);
  const [partScanPreview, setPartScanPreview] = useState("");
  const [partScanProgress, setPartScanProgress] = useState(0);
  const [partScanning, setPartScanning] = useState(false);
  const [partDraft, setPartDraft] = useState<PartScanDraft>({
    partNumber: "",
    brand: "",
    description: "",
  });

  async function load() {
    try {
      const response = await fetch("/api/inventory", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data.inventory ?? []);
    } catch {
      flash("Lagerbestand konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/inventory", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setRows(data.inventory ?? []))
      .catch(() => flash("Lagerbestand konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    if (editing) payload.id = String(editing.id);
    const response = await fetch("/api/inventory", {
      method: editing ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      flash(data?.error ?? "Artikel konnte nicht gespeichert werden");
      return;
    }
    setOpen(false);
    setEditing(null);
    await load();
    flash(editing ? "Artikel wurde aktualisiert" : "Artikel wurde angelegt");
  }

  async function remove() {
    if (!editing) return;
    const response = await fetch(`/api/inventory?id=${editing.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      flash("Artikel konnte nicht gelöscht werden");
      return;
    }
    setOpen(false);
    setEditing(null);
    await load();
    flash("Artikel wurde gelöscht");
  }

  function show(item?: InventoryItem) {
    setNewItemDefaults(null);
    setEditing(item ?? null);
    setOpen(true);
  }

  async function scanPart(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("Bitte ein Foto des Ersatzteils oder Etiketts auswählen");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      flash("Das Foto darf höchstens 12 MB groß sein");
      return;
    }
    if (partScanPreview) URL.revokeObjectURL(partScanPreview);
    setPartScanPreview(URL.createObjectURL(file));
    setPartScanning(true);
    setPartScanProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("deu+eng", undefined, {
        logger: (message) => {
          if (message.status === "recognizing text")
            setPartScanProgress(Math.round((message.progress ?? 0) * 100));
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      setPartDraft(parsePartText(result.data.text));
      flash("Teilenummer erkannt – bitte kontrollieren");
    } catch {
      flash("Die Teilenummer konnte nicht gelesen werden");
    } finally {
      setPartScanning(false);
    }
  }

  function partSearchQuery() {
    return [partDraft.brand, partDraft.partNumber, partDraft.description, "Autoteil"]
      .filter(Boolean)
      .join(" ");
  }

  function useScannedPart() {
    setNewItemDefaults(partDraft);
    setEditing(null);
    setPartScanDialog(false);
    setOpen(true);
  }

  const euro = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });
  const needle = query.trim().toLowerCase();
  const visibleRows = rows.filter((item) =>
    [item.sku, item.name].join(" ").toLowerCase().includes(needle),
  );
  const lowStock = rows.filter((item) => item.stock <= item.minStock);
  const inventoryValue = rows.reduce(
    (sum, item) => sum + item.stock * item.price,
    0,
  );

  return (
    <div className="module-page">
      <div className="module-toolbar">
        <div>
          <h2>Ersatzteile & Lagerbestand</h2>
          <p>
            {rows.length} Artikel · {lowStock.length} Bestandswarnungen
          </p>
        </div>
        <div className="customer-vehicle-actions">
          <Button variant="outline" onClick={() => setPartScanDialog(true)}>
            <Camera /> Teil scannen
          </Button>
          <Button onClick={() => show()}>
            <Plus /> Artikel anlegen
          </Button>
        </div>
      </div>
      <Dialog open={partScanDialog} onOpenChange={setPartScanDialog}>
        <DialogContent className="registration-scan-dialog">
          <DialogHeader>
            <DialogTitle>Ersatzteil scannen</DialogTitle>
            <DialogDescription>
              Etikett, Verpackung oder eingeprägte Teilenummer möglichst nah und
              scharf fotografieren. Das Foto wird nicht gespeichert.
            </DialogDescription>
          </DialogHeader>
          <label className="registration-upload">
            <Camera aria-hidden="true" />
            <strong>{partScanPreview ? "Anderes Foto aufnehmen" : "Teil fotografieren"}</strong>
            <span>Die Teilenummer oder der Barcode muss gut lesbar sein.</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={partScanning}
              onChange={(event) => scanPart(event.target.files?.[0])}
            />
          </label>
          {partScanPreview && (
            <img className="registration-preview" src={partScanPreview} alt="Aufgenommenes Ersatzteil" />
          )}
          {partScanning && (
            <div className="scan-status" role="status">
              <span>Teilenummer wird gelesen … {partScanProgress}%</span>
              <progress max="100" value={partScanProgress} />
            </div>
          )}
          {!partScanning && partScanPreview && (
            <div className="order-form scan-form">
              <div className="scan-section-title">Erkannte Angaben kontrollieren</div>
              <label>
                Teilenummer / EAN
                <Input value={partDraft.partNumber} onChange={(e) => setPartDraft((draft) => ({ ...draft, partNumber: e.target.value.toUpperCase() }))} required />
              </label>
              <label>
                Hersteller
                <Input value={partDraft.brand} onChange={(e) => setPartDraft((draft) => ({ ...draft, brand: e.target.value }))} />
              </label>
              <label>
                Bezeichnung
                <Input value={partDraft.description} onChange={(e) => setPartDraft((draft) => ({ ...draft, description: e.target.value }))} placeholder="z. B. Bremsscheibe vorne" />
              </label>
              <div className="supplier-searches">
                <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(partSearchQuery())}`} target="_blank" rel="noreferrer">Google Shopping <span>↗</span></a>
                <a href={`https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${encodeURIComponent(partSearchQuery())}`} target="_blank" rel="noreferrer">Idealo <span>↗</span></a>
                <a href={`https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(partSearchQuery())}&_sop=15`} target="_blank" rel="noreferrer">eBay: günstigste zuerst <span>↗</span></a>
              </div>
              <p className="scan-hint">Vor dem Kauf Fahrzeugkompatibilität, Versandkosten und Lieferzeit kontrollieren.</p>
              <Button type="button" disabled={!partDraft.partNumber.trim()} onClick={useScannedPart}>
                Als Lagerartikel übernehmen
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div className="management-summary">
        <div>
          <span>Artikel</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Nachbestellen</span>
          <strong>{lowStock.length}</strong>
        </div>
        <div>
          <span>Lagerwert</span>
          <strong>{euro.format(inventoryValue)}</strong>
        </div>
      </div>
      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>Artikelnummer</th>
              <th>Bezeichnung</th>
              <th>Bestand</th>
              <th>Mindestbestand</th>
              <th>Preis</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((item) => {
              const warning = item.stock <= item.minStock;
              return (
                <tr
                  className="clickable-row"
                  tabIndex={0}
                  key={item.id}
                  onClick={() => show(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") show(item);
                  }}
                >
                  <td>
                    <strong>{item.sku}</strong>
                  </td>
                  <td>{item.name}</td>
                  <td>{item.stock.toLocaleString("de-DE")}</td>
                  <td>{item.minStock.toLocaleString("de-DE")}</td>
                  <td>{euro.format(item.price)}</td>
                  <td>
                    <Badge className={warning ? "stock-warning" : "stock-ok"}>
                      {warning ? "Nachbestellen" : "Verfügbar"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && visibleRows.length === 0 && (
          <div className="empty-orders">
            <Package />
            <strong>Noch keine Lagerartikel</strong>
            <Button onClick={() => show()}>Artikel anlegen</Button>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Artikel bearbeiten" : "Artikel anlegen"}
            </DialogTitle>
            <DialogDescription>
              Bestand, Mindestbestand und Einkaufspreis erfassen.
            </DialogDescription>
          </DialogHeader>
          <form
            className="order-form"
            onSubmit={save}
            key={editing?.id ?? "new-item"}
          >
            <label>
              Artikelnummer
              <Input name="sku" defaultValue={editing?.sku ?? newItemDefaults?.partNumber} required />
            </label>
            <label>
              Bezeichnung
              <Input name="name" defaultValue={editing?.name ?? [newItemDefaults?.brand, newItemDefaults?.description].filter(Boolean).join(" ")} required />
            </label>
            <div className="form-grid">
              <label>
                Bestand
                <Input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing?.stock ?? 0}
                  required
                />
              </label>
              <label>
                Mindestbestand
                <Input
                  name="minStock"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={editing?.minStock ?? 0}
                  required
                />
              </label>
            </div>
            <label>
              Preis pro Einheit (€)
              <Input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editing?.price ?? 0}
                required
              />
            </label>
            <div className="edit-actions">
              {editing && (
                <Button type="button" variant="destructive" onClick={remove}>
                  Artikel löschen
                </Button>
              )}
              <Button type="submit">Artikel speichern</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

function EmployeeManager({
  flash,
  query,
}: {
  flash: (message: string) => void;
  query: string;
}) {
  const [rows, setRows] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data.employees ?? []);
    } catch {
      flash("Mitarbeiter konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/employees", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setRows(data.employees ?? []))
      .catch(() => flash("Mitarbeiter konnten nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    if (editing) payload.id = String(editing.id);
    const response = await fetch("/api/employees", {
      method: editing ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      flash(data?.error ?? "Mitarbeiter konnte nicht gespeichert werden");
      return;
    }
    setOpen(false);
    setEditing(null);
    await load();
    flash(
      editing ? "Mitarbeiter wurde aktualisiert" : "Mitarbeiter wurde angelegt",
    );
  }

  async function remove() {
    if (!editing) return;
    const response = await fetch(`/api/employees?id=${editing.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      flash("Mitarbeiter konnte nicht gelöscht werden");
      return;
    }
    setOpen(false);
    setEditing(null);
    await load();
    flash("Mitarbeiter wurde gelöscht");
  }

  function show(employee?: Employee) {
    setEditing(employee ?? null);
    setOpen(true);
  }

  const needle = query.trim().toLowerCase();
  const visibleRows = rows.filter((employee) =>
    [employee.name, employee.email, employee.role]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
  const activeCount = rows.filter((employee) => employee.active).length;

  return (
    <div className="module-page">
      <div className="module-toolbar">
        <div>
          <h2>Mitarbeiter & Rollen</h2>
          <p>
            {rows.length} Mitarbeiter · {activeCount} aktiv
          </p>
        </div>
        <Button onClick={() => show()}>
          <Plus /> Mitarbeiter anlegen
        </Button>
      </div>
      <div className="management-summary two-columns">
        <div>
          <span>Mitarbeiter gesamt</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Aktive Mitarbeiter</span>
          <strong>{activeCount}</strong>
        </div>
      </div>
      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((employee) => (
              <tr
                className="clickable-row"
                tabIndex={0}
                key={employee.id}
                onClick={() => show(employee)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") show(employee);
                }}
              >
                <td>
                  <strong>{employee.name}</strong>
                </td>
                <td>{employee.email}</td>
                <td>{employee.role}</td>
                <td>
                  <Badge
                    className={
                      employee.active ? "stock-ok" : "employee-inactive"
                    }
                  >
                    {employee.active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && visibleRows.length === 0 && (
          <div className="empty-orders">
            <Users />
            <strong>Noch keine Mitarbeiter</strong>
            <Button onClick={() => show()}>Mitarbeiter anlegen</Button>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Mitarbeiter bearbeiten" : "Mitarbeiter anlegen"}
            </DialogTitle>
            <DialogDescription>
              Kontaktdaten, Rolle und Aktivstatus verwalten.
            </DialogDescription>
          </DialogHeader>
          <form
            className="order-form"
            onSubmit={save}
            key={editing?.id ?? "new-employee"}
          >
            <label>
              Name
              <Input name="name" defaultValue={editing?.name} required />
            </label>
            <label>
              E-Mail
              <Input
                name="email"
                type="email"
                defaultValue={editing?.email}
                required
              />
            </label>
            <label>
              Rolle
              <select
                name="role"
                defaultValue={editing?.role ?? "Mechatroniker/in"}
              >
                <option>Leitung</option>
                <option>Meister/in</option>
                <option>Mechatroniker/in</option>
                <option>Service</option>
                <option>Buchhaltung</option>
              </select>
            </label>
            <label>
              Status
              <select
                name="active"
                defaultValue={String(editing?.active ?? true)}
              >
                <option value="true">Aktiv</option>
                <option value="false">Inaktiv</option>
              </select>
            </label>
            <div className="edit-actions">
              {editing && (
                <Button type="button" variant="destructive" onClick={remove}>
                  Mitarbeiter löschen
                </Button>
              )}
              <Button type="submit">Mitarbeiter speichern</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalyticsManager() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/inventory", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/customers", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([invoiceData, inventoryData, customerData]) => {
        setInvoices(invoiceData.invoices ?? []);
        setInventory(inventoryData.inventory ?? []);
        setCustomerCount((customerData.customers ?? []).length);
      })
      .catch(() => {
        setInvoices([]);
        setInventory([]);
        setCustomerCount(0);
      });
  }, []);

  const euro = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });
  const monthKey = new Date().toLocaleDateString("sv-SE").slice(0, 7);
  const paidInvoices = invoices.filter(
    (invoice) => invoice.type === "rechnung" && invoice.status === "bezahlt",
  );
  const monthlyRevenue = paidInvoices
    .filter((invoice) => invoice.paidAt?.startsWith(monthKey))
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const totalRevenue = paidInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount),
    0,
  );
  const openReceivables = invoices
    .filter(
      (invoice) => invoice.type === "rechnung" && invoice.status === "offen",
    )
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const averageInvoice = paidInvoices.length
    ? totalRevenue / paidInvoices.length
    : 0;
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + item.stock * item.price,
    0,
  );
  const lowStock = inventory.filter(
    (item) => item.stock <= item.minStock,
  ).length;
  const documentStatuses = [
    { status: "Offen", count: invoices.filter((item) => item.status === "offen").length },
    { status: "Bezahlt", count: invoices.filter((item) => item.status === "bezahlt").length },
    { status: "Storniert", count: invoices.filter((item) => item.status === "storniert").length },
    {
      status: "Kostenvoranschläge",
      count: invoices.filter((item) => item.type === "kostenvoranschlag").length,
    },
  ];
  const maxDocuments = Math.max(
    1,
    ...documentStatuses.map((item) => item.count),
  );
  const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "short" });
  const monthlySeries = Array.from({ length: 6 }, (_, reverseIndex) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - reverseIndex));
    const key = date.toLocaleDateString("sv-SE").slice(0, 7);
    return {
      label: monthFormatter.format(date),
      value: paidInvoices
        .filter((invoice) => invoice.paidAt?.startsWith(key))
        .reduce((sum, invoice) => sum + Number(invoice.amount), 0),
    };
  });
  const maxRevenue = Math.max(1, ...monthlySeries.map((item) => item.value));

  return (
    <div className="module-page analytics-page">
      <div className="module-toolbar">
        <div>
          <h2>Auswertungen</h2>
          <p>Aktuelle Kennzahlen aus gespeicherten Werkstattdaten</p>
        </div>
      </div>
      <div className="analytics-kpis">
        <div>
          <span>Bezahlter Umsatz diesen Monat</span>
          <strong>{euro.format(monthlyRevenue)}</strong>
        </div>
        <div>
          <span>Offene Forderungen</span>
          <strong>{euro.format(openReceivables)}</strong>
        </div>
        <div>
          <span>Ø bezahlte Rechnung</span>
          <strong>{euro.format(averageInvoice)}</strong>
        </div>
        <div>
          <span>Kunden gesamt</span>
          <strong>{customerCount}</strong>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel analytics-panel">
          <div className="panel-head">
            <div>
              <h3>Umsatzentwicklung</h3>
              <p>Bezahlte Rechnungen · letzte 6 Monate</p>
            </div>
          </div>
          <div className="analytics-chart">
            {monthlySeries.map((item) => (
              <div key={item.label}>
                <span>{item.value ? euro.format(item.value) : "–"}</span>
                <i
                  style={{
                    height: `${Math.max(3, (item.value / maxRevenue) * 100)}%`,
                  }}
                />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel analytics-panel">
          <div className="panel-head">
            <div>
              <h3>Dokumentstatus</h3>
              <p>Rechnungen und Kostenvoranschläge</p>
            </div>
          </div>
          <div className="status-analysis">
            {documentStatuses.map((item) => (
              <div key={item.status}>
                <span>{item.status}</span>
                <div>
                  <i
                    style={{
                      width: `${(item.count / maxDocuments) * 100}%`,
                    }}
                  />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="analytics-details">
        <section className="panel">
          <h3>Betrieb</h3>
          <p>
            <span>Kunden</span>
            <strong>{customerCount}</strong>
          </p>
          <p>
            <span>Rechnungen gesamt</span>
            <strong>
              {invoices.filter((invoice) => invoice.type === "rechnung").length}
            </strong>
          </p>
          <p>
            <span>Offene Rechnungen</span>
            <strong>
              {invoices.filter((invoice) => invoice.status === "offen").length}
            </strong>
          </p>
          <p>
            <span>Bezahlte Rechnungen</span>
            <strong>
              {invoices.filter((invoice) => invoice.status === "bezahlt").length}
            </strong>
          </p>
        </section>
        <section className="panel">
          <h3>Finanzen & Lager</h3>
          <p>
            <span>Bezahlter Umsatz gesamt</span>
            <strong>{euro.format(totalRevenue)}</strong>
          </p>
          <p>
            <span>Lagerwert</span>
            <strong>{euro.format(inventoryValue)}</strong>
          </p>
          <p>
            <span>Bestandswarnungen</span>
            <strong>{lowStock}</strong>
          </p>
          <p>
            <span>Kostenvoranschläge</span>
            <strong>
              {
                invoices.filter(
                  (invoice) => invoice.type === "kostenvoranschlag",
                ).length
              }
            </strong>
          </p>
        </section>
      </div>
    </div>
  );
}

function SettingsForm({ flash }: { flash: (message: string) => void }) {
  const [data, setData] = useState<Record<string, string | number>>({
    smallBusinessNotice: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    paymentDays: 14,
    invoicePrefix: "RE",
    estimatePrefix: "KV",
  });
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((x) => x.settings && setData(x.settings))
      .catch(() => flash("Firmendaten konnten nicht geladen werden"));
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    flash(
      r.ok
        ? "Firmendaten wurden gespeichert"
        : "Firmendaten konnten nicht gespeichert werden",
    );
  }
  const field = (name: string, label: string, type = "text") => (
    <label>
      {label}
      <Input name={name} type={type} defaultValue={String(data[name] ?? "")} />
    </label>
  );
  return (
    <div className="module-page">
      <div className="module-toolbar">
        <div>
          <h2>Firmendaten</h2>
          <p>
            Diese Angaben werden für Kostenvoranschläge und Rechnungen
            verwendet.
          </p>
        </div>
      </div>
      <div className="settings-logo">
        <span
          className="settings-logo-image"
          role="img"
          aria-label="Firmenlogo"
        />
        <div>
          <strong>Firmenlogo</strong>
          <small>Wird in der App und auf Dokumenten verwendet</small>
        </div>
      </div>
      <form
        className="settings-card"
        key={JSON.stringify(data)}
        onSubmit={save}
      >
        <h3>Unternehmen</h3>
        <div className="settings-grid">
          {field("workshopName", "Werkstattname")}
          {field("owner", "Inhaber")}
          {field("street", "Straße und Hausnummer")}
          {field("postalCode", "PLZ")}
          {field("city", "Ort")}
          {field("phone", "Telefon")}
          {field("email", "E-Mail", "email")}
          {field("taxNumber", "USt-IdNr.")}
        </div>
        <h3>Bankverbindung</h3>
        <div className="settings-grid">
          {field("iban", "IBAN")}
          {field("bic", "BIC")}
          {field("bank", "Bank")}
        </div>
        <h3>Rechnungen</h3>
        <div className="settings-grid">
          {field("invoicePrefix", "Rechnungspräfix")}
          {field("estimatePrefix", "Angebotspräfix")}
          {field("paymentDays", "Zahlungsziel in Tagen", "number")}
        </div>
        <label>
          Kleinunternehmer-Hinweis
          <Input
            name="smallBusinessNotice"
            defaultValue={String(data.smallBusinessNotice ?? "")}
          />
        </label>
        <div className="settings-actions">
          <Button type="submit">Einstellungen speichern</Button>
        </div>
      </form>
    </div>
  );
}

const moduleData: Record<string, { head: string[]; rows: string[][] }> = {
  Termine: {
    head: ["Uhrzeit", "Kunde", "Fahrzeug", "Leistung", "Status"],
    rows: appointments.map((a, i) => [
      a[0],
      a[1],
      a[2].split(" · ")[1],
      a[2].split(" · ")[0],
      i < 2 ? "Eingecheckt" : "Geplant",
    ]),
  },
  "Kunden & Fahrzeuge": {
    head: ["Kunde", "Fahrzeug", "Kennzeichen", "Telefon", "Nächster Termin"],
    rows: [
      [
        "Daniel Weber",
        "VW Golf VIII",
        "DO · TF 2024",
        "0172 456 7890",
        "Heute, 10:30",
      ],
      [
        "Miriam König",
        "BMW 320d",
        "BO · MK 381",
        "0151 882 1134",
        "Heute, 09:15",
      ],
      [
        "Oliver Schmidt",
        "Mercedes Vito",
        "E · SV 911",
        "0160 447 2901",
        "Heute, 08:00",
      ],
      [
        "Sabrina Alkan",
        "Audi A4 Avant",
        "RE · SA 551",
        "0176 332 8255",
        "Heute, 11:45",
      ],
    ],
  },
  Rechnungen: {
    head: ["Nummer", "Kunde", "Auftrag", "Betrag", "Status"],
    rows: [
      ["R-2026-0881", "Oliver Schmidt", "A-1046", "689,00 €", "Bezahlt"],
      ["R-2026-0880", "Miriam König", "A-1047", "1.248,50 €", "Offen"],
      ["KV-2026-0192", "Sabrina Alkan", "A-1045", "420,00 €", "Entwurf"],
    ],
  },
  Lager: {
    head: ["Artikel", "Artikelnummer", "Bestand", "Mindestbestand", "Status"],
    rows: [
      ["Motoröl 5W-30", "ÖL-530-20", "18 l", "20 l", "Nachbestellen"],
      ["Bremsbeläge Vorderachse", "BR-VW-441", "3 Satz", "2 Satz", "Verfügbar"],
      ["Ölfilter Mahle", "OF-MA-127", "8 Stk.", "5 Stk.", "Verfügbar"],
      ["Wischerblätter 650 mm", "WI-650", "2 Stk.", "4 Stk.", "Nachbestellen"],
    ],
  },
  Mitarbeiter: {
    head: ["Name", "Rolle", "Heutige Aufträge", "Auslastung", "Status"],
    rows: [
      ["Mehmet Yılmaz", "Meister", "3", "92 %", "Aktiv"],
      ["Lena Becker", "Mechatronikerin", "2", "78 %", "Aktiv"],
      ["Ahmet Kaya", "Mechatroniker", "2", "74 %", "Aktiv"],
      ["Tarik Y.", "Leitung", "1", "65 %", "Aktiv"],
    ],
  },
  Auswertungen: {
    head: ["Kennzahl", "Heute", "Diese Woche", "Veränderung"],
    rows: [
      ["Umsatz", "4.860 €", "22.440 €", "+12,4 %"],
      ["Aufträge", "12", "58", "+6,1 %"],
      ["Ø Auftragswert", "405 €", "387 €", "+4,7 %"],
      ["Auslastung", "82 %", "79 %", "+3,0 %"],
    ],
  },
};
function Module({
  title,
  orders,
  query,
  create,
  edit,
}: {
  title: string;
  orders: Order[];
  query: string;
  create: () => void;
  edit: (order: Order) => void;
}) {
  if (title === "Aufträge")
    return (
      <div className="module-page">
        <div className="module-toolbar">
          <div>
            <h2>Reparaturaufträge</h2>
            <p>
              {orders.length} Aufträge gefunden · Zum Bearbeiten Zeile anklicken
            </p>
          </div>
          <Button onClick={create}>
            <Plus /> Auftrag anlegen
          </Button>
        </div>
        <div className="data-card">
          <table>
            <thead>
              <tr>
                {[
                  "Auftrag",
                  "Fahrzeug",
                  "Kennzeichen",
                  "Arbeit",
                  "Mechaniker",
                  "Status",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  className="clickable-row"
                  tabIndex={0}
                  onClick={() => edit(o)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") edit(o);
                  }}
                  key={o.id}
                >
                  <td>
                    <strong>{o.id}</strong>
                  </td>
                  <td>{o.car}</td>
                  <td>{o.plate}</td>
                  <td>{o.task}</td>
                  <td>{o.tech}</td>
                  <td>
                    <Badge className={`badge-${o.color}`}>{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="empty-orders">
              <Wrench />
              <strong>Noch keine Aufträge</strong>
              <span>Lege den ersten Werkstattauftrag an.</span>
              <Button onClick={create}>Auftrag anlegen</Button>
            </div>
          )}
        </div>
      </div>
    );
  const d = moduleData[title],
    rows =
      d?.rows.filter((r) =>
        r.join(" ").toLowerCase().includes(query.toLowerCase()),
      ) ?? [];
  return (
    <div className="module-page">
      <div className="module-toolbar">
        <div>
          <h2>{title}</h2>
          <p>{rows.length} Einträge</p>
        </div>
      </div>
      <div className="data-card">
        <table>
          <thead>
            <tr>
              {d?.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{j === 0 ? <strong>{c}</strong> : c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
