import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ScaleV webhook payload (adapt fields as needed based on actual ScaleV docs)
    const {
      reference_id,
      transaction_id,
      status,
      // Alternative field names ScaleV might use:
      payment_id,
      order_id,
      trx_id,
      payment_status,
    } = body;

    const refId = reference_id || payment_id || order_id;
    const txId = transaction_id || trx_id || refId;
    const txStatus = status || payment_status;

    if (!refId) {
      return new Response("Missing reference_id", { status: 400 });
    }

    // Find the payment by reference ID (our payment_id)
    const { data: payment, error: fetchError } = await supabaseServer
      .from("payments")
      .select("id, analysis_id, status")
      .eq("id", refId)
      .single();

    if (fetchError || !payment) {
      console.error("Payment not found:", refId, fetchError);
      return new Response("Payment not found", { status: 404 });
    }

    // Only process if status is success
    const isSuccess =
      txStatus === "success" ||
      txStatus === "paid" ||
      txStatus === "settlement" ||
      txStatus === "capture" ||
      txStatus === "completed";

    if (isSuccess) {
      // Update payment record
      await supabaseServer
        .from("payments")
        .update({
          scalev_transaction_id: txId || refId,
          status: "success",
        })
        .eq("id", refId);

      // Unlock the analysis
      await supabaseServer
        .from("analyses")
        .update({ is_paid: true })
        .eq("id", payment.analysis_id);
    } else if (txStatus === "failed" || txStatus === "expired" || txStatus === "cancel") {
      await supabaseServer
        .from("payments")
        .update({ status: txStatus })
        .eq("id", refId);
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

// Also handle GET for verification pings from ScaleV
export async function GET() {
  return new Response("Webhook endpoint active", { status: 200 });
}
