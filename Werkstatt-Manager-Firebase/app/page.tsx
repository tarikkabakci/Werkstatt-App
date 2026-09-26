import WorkshopApp from "./workshop-app";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <WorkshopApp userEmail="Passwortgeschützt" />;
}
