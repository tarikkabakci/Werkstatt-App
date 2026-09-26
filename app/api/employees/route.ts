import { noCache, readState } from "../../../lib/netlify-data";

export async function GET() {
  const state = await readState();
  return Response.json(
    { employees: [...state.employees].sort((a, b) => b.id - a.id) },
    { headers: noCache },
  );
}

export async function POST() {
  return Response.json({ error: "Mitarbeiterverwaltung ist deaktiviert" }, { status: 410 });
}

export async function PUT() {
  return Response.json({ error: "Mitarbeiterverwaltung ist deaktiviert" }, { status: 410 });
}

export async function DELETE() {
  return Response.json({ error: "Mitarbeiterverwaltung ist deaktiviert" }, { status: 410 });
}
