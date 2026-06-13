import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { analysis_id } = await request.json();

    if (!analysis_id) {
      return Response.json({ error: "analysis_id wajib diisi" }, { status: 400 });
    }

    // Verify analysis exists
    const { data: analysis, error: fetchError } = await supabaseServer
      .from("analyses")
      .select("id, is_paid")
      .eq("id", analysis_id)
      .single();

    if (fetchError || !analysis) {
      return Response.json({ error: "Analisa tidak ditemukan" }, { status: 404 });
    }

    if (analysis.is_paid) {
      return Response.json({ error: "Analisa ini sudah dibayar" }, { status: 400 });
    }

    const payment_id = uuidv4();
    const amount = 99000;
    const currency = "IDR";

    // Insert pending payment
    const { error: paymentError } = await supabaseServer.from("payments").insert({
      id: payment_id,
      analysis_id,
      amount,
      currency,
      status: "pending",
      scalev_transaction_id: null,
    });

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return Response.json({ error: "Gagal membuat pembayaran" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // ScaleV payment integration
    const scaleVApiKey = process.env.SCALEV_API_KEY;
    const scaleVMerchantId = process.env.SCALEV_MERCHANT_ID;

    if (scaleVApiKey && scaleVMerchantId && scaleVApiKey !== "your-scalev-api-key-here") {
      try {
        const scaleVRes = await fetch("https://api.scalev.id/v1/payment/create", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${scaleVApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merchant_id: scaleVMerchantId,
            amount,
            currency,
            description: `DonaTalks Analisa CV - ${analysis_id}`,
            reference_id: payment_id,
            callback_url: `${appUrl}/api/payment/webhook`,
            return_url: `${appUrl}/analisa/${analysis_id}`,
          }),
        });

        if (scaleVRes.ok) {
          const scaleVData = await scaleVRes.json();
          return Response.json({
            payment_id,
            payment_url: scaleVData.payment_url || scaleVData.redirect_url,
          });
        }
      } catch (scaleVErr) {
        console.error("ScaleV API error:", scaleVErr);
      }
    }

    // Fallback: return a mock payment URL for development/testing
    const mockPaymentUrl = `${appUrl}/payment-pending?payment_id=${payment_id}&analysis_id=${analysis_id}`;
    return Response.json({ payment_id, payment_url: mockPaymentUrl });
  } catch (err: unknown) {
    console.error("Payment create error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
