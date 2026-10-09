import { getMenus } from "@/lib/menu-store";

export const dynamic = "force-dynamic";

/** Both branches' menus as JSON, for the order form now and a staff or customer app later */
export async function GET() {
  return Response.json(await getMenus());
}
