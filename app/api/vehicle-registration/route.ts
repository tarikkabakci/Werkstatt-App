import { readState, updateState } from "../../../lib/netlify-data";
import { adminBucket } from "../../../lib/firebase-admin";

const noCache = { "Cache-Control": "private, no-store" };
const maxBytes = 12 * 1024 * 1024;

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("vehicleId"));
  if (!Number.isInteger(id)) return Response.json({ error: "Ungültiges Fahrzeug" }, { status: 400 });
  const state = await readState();
  const vehicle = state.vehicles.find((item) => item.id === id);
  if (!vehicle?.registrationImageKey)
    return Response.json({ error: "Kein Fahrzeugschein gespeichert" }, { status: 404 });
  const storedFile = adminBucket().file(vehicle.registrationImageKey);
  const [exists] = await storedFile.exists();
  if (!exists) return Response.json({ error: "Foto nicht gefunden" }, { status: 404 });
  const [contents] = await storedFile.download();
  return new Response(new Uint8Array(contents), {
    headers: {
      ...noCache,
      "Content-Type": vehicle.registrationImageType || "image/jpeg",
      "Content-Disposition": `inline; filename="${(vehicle.registrationImageName || "fahrzeugschein").replace(/["\\]/g, "")}"`,
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const id = Number(form.get("vehicleId"));
  const file = form.get("file");
  if (!Number.isInteger(id) || !(file instanceof File))
    return Response.json({ error: "Foto und Fahrzeug fehlen" }, { status: 400 });
  if (!file.type.startsWith("image/") || file.size > maxBytes)
    return Response.json({ error: "Bitte ein Bild mit höchstens 12 MB auswählen" }, { status: 400 });
  const state = await readState();
  const existing = state.vehicles.find((item) => item.id === id);
  if (!existing) return Response.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const key = `vehicle-registration/${id}/${crypto.randomUUID()}.${extension}`;
  const storedFile = adminBucket().file(key);
  await storedFile.save(Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    metadata: { metadata: { originalName: file.name.slice(0, 180) } },
  });
  try {
    await updateState((current) => {
      const vehicle = current.vehicles.find((item) => item.id === id);
      if (!vehicle) throw new Error("Fahrzeug nicht gefunden");
      vehicle.registrationImageKey = key;
      vehicle.registrationImageName = file.name.slice(0, 180);
      vehicle.registrationImageType = file.type;
    });
  } catch (error) {
    await storedFile.delete({ ignoreNotFound: true });
    throw error;
  }
  if (existing.registrationImageKey)
    await adminBucket().file(existing.registrationImageKey).delete({ ignoreNotFound: true });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("vehicleId"));
  if (!Number.isInteger(id)) return Response.json({ error: "Ungültiges Fahrzeug" }, { status: 400 });
  const key = await updateState((state) => {
    const vehicle = state.vehicles.find((item) => item.id === id);
    if (!vehicle) return null;
    const current = vehicle.registrationImageKey ?? null;
    vehicle.registrationImageKey = null;
    vehicle.registrationImageName = null;
    vehicle.registrationImageType = null;
    return current;
  });
  if (key) await adminBucket().file(key).delete({ ignoreNotFound: true });
  return Response.json({ ok: true });
}
