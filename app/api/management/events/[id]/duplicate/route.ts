import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type Params = Promise<{ id: string }>;

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const [eventRes, tasksRes, teamRes] = await Promise.all([
    supabaseServer.from("events").select("*").eq("id", id).single(),
    supabaseServer.from("tasks").select("*").eq("event_id", id),
    supabaseServer.from("event_team").select("*").eq("event_id", id),
  ]);

  if (eventRes.error || !eventRes.data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const src = eventRes.data;

  const { data: newEvent, error: eventErr } = await supabaseServer
    .from("events")
    .insert({
      name: `${src.name} (Copy)`,
      status: "planned",
      format: src.format,
      theme: src.theme,
      key_points: src.key_points,
      target_count: src.target_count,
      narasumber: src.narasumber,
      mc: src.mc,
      platform_link: src.platform_link,
      folder_link: src.folder_link,
      // event_date and event_time intentionally not copied — new event, new date
    })
    .select()
    .single();

  if (eventErr || !newEvent) {
    return NextResponse.json({ error: eventErr?.message || "Failed to duplicate event" }, { status: 500 });
  }

  const tasks = tasksRes.data || [];
  const team = teamRes.data || [];

  const inserts: Promise<unknown>[] = [];

  if (tasks.length > 0) {
    inserts.push(
      supabaseServer.from("tasks").insert(
        tasks.map((t: { title: string; category: string; pic: string | null; deadline: string | null }) => ({
          event_id: newEvent.id,
          title: t.title,
          category: t.category,
          pic: t.pic,
          deadline: t.deadline,
          status: "todo",
        }))
      )
    );
  }

  if (team.length > 0) {
    inserts.push(
      supabaseServer.from("event_team").insert(
        team.map((m: { name: string; role: string }) => ({
          event_id: newEvent.id,
          name: m.name,
          role: m.role,
        }))
      )
    );
  }

  await Promise.all(inserts);

  return NextResponse.json(newEvent, { status: 201 });
}
