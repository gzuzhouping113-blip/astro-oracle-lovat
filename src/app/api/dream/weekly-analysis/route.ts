import { requireUser } from "@/lib/auth/session";
import { generateCurrentWeeklyReport, getCurrentWeeklyReport } from "@/lib/weekly-report";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await getCurrentWeeklyReport(user.id));
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Load weekly dream analysis error:", err);
    return Response.json({ error: "读取本周梦境周报失败" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    return Response.json(await generateCurrentWeeklyReport(user.id));
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Weekly dream analysis error:", err);
    return Response.json({ error: "生成本周梦境周报失败" }, { status: 500 });
  }
}
