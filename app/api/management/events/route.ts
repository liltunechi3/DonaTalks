import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data: events, error } = await supabaseServer
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch participant counts and task stats for all events
  const eventIds = (events || []).map((e: { id: string }) => e.id);

  const [participantsRes, tasksRes] = await Promise.all([
    supabaseServer
      .from("participants")
      .select("event_id")
      .in("event_id", eventIds.length > 0 ? eventIds : [""]),
    supabaseServer
      .from("tasks")
      .select("event_id, status")
      .in("event_id", eventIds.length > 0 ? eventIds : [""]),
  ]);

  const participantCounts: Record<string, number> = {};
  for (const p of participantsRes.data || []) {
    participantCounts[p.event_id] = (participantCounts[p.event_id] || 0) + 1;
  }

  const taskStats: Record<string, { total: number; done: number }> = {};
  for (const t of tasksRes.data || []) {
    if (!taskStats[t.event_id]) taskStats[t.event_id] = { total: 0, done: 0 };
    taskStats[t.event_id].total++;
    if (t.status === "done") taskStats[t.event_id].done++;
  }

  const enriched = (events || []).map((e: { id: string }) => ({
    ...e,
    participant_count: participantCounts[e.id] || 0,
    task_stats: taskStats[e.id] || { total: 0, done: 0 },
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, status, event_date, event_time, format, theme, key_points, target_count, folder_link } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("events")
    .insert({
      name,
      status: status || "planned",
      event_date: event_date || null,
      event_time: event_time || null,
      format: format || "online",
      theme: theme || null,
      key_points: key_points || null,
      target_count: target_count || null,
      folder_link: folder_link || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
