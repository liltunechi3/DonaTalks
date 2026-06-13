import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";

const PRICE = 10000;

export async function POST(request: NextRequest) {
  try {
    const { analysis_id } = await request.json();

    if (!analysis_id) {
      return Response.json({ error: "analysis_id wajib diisi" }, { status: 400 });
    }

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

    const { error: paymentError } = await supabaseServer.from("payments").insert({
      id: payment_id,
      analysis_id,
      amount: PRICE,
      currency: "IDR",
      status: "pending",
      scalev_transaction_id: null,
    });

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return Response.json({ error: `Gagal membuat pembayaran: ${paymentError.message} (${paymentError.code})` }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const scaleVApiKey = process.env.SCALEV_API_KEY;
    const scaleVMerchantId = process.env.SCALEV_MERCHANT_ID;

    if (scaleVApiKey && scaleVMerchantId) {
      try {
        // Try ScaleV payment link creation
        const scaleVRes = await fetch("https://api.scalev.id/v1/payment-link", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${scaleVApiKey}`,
            "Content-Type": "application/json",
            "X-Merchant-ID": scaleVMerchantId,
          },
          body: JSON.stringify({
            merchant_id: scaleVMerchantId,
            amount: PRICE,
            currency: "IDR",
            title: "DonaTalks — Analisa CV & Personal Brand",
            description: `Buka analisa penuh untuk laporan ID ${analysis_id.slice(0, 8)}`,
            reference_id: payment_id,
            callback_url: `${appUrl}/api/payment/webhook`,
            success_redirect_url: `${appUrl}/analisa/${analysis_id}`,
            failure_redirect_url: `${appUrl}/analisa/${analysis_id}`,
          }),
        });

        const scaleVText = await scaleVRes.text();
        console.log("ScaleV response:", scaleVRes.status, scaleVText);

        if (scaleVRes.ok) {
          const scaleVData = JSON.parse(scaleVText);
          const paymentUrl =
            scaleVData.payment_url ||
            scaleVData.redirect_url ||
            scaleVData.checkout_url ||
            scaleVData.url ||
            scaleVData.data?.payment_url ||
            scaleVData.data?.url;

          if (paymentUrl) {
            return Response.json({ payment_id, payment_url: paymentUrl });
          }
        }
      } catch (scaleVErr) {
        console.error("ScaleV API error:", scaleVErr);
      }
    }

    // Fallback: mock payment page
    const mockPaymentUrl = `${appUrl}/payment-pending?payment_id=${payment_id}&analysis_id=${analysis_id}`;
    return Response.json({ payment_id, payment_url: mockPaymentUrl });
  } catch (err: unknown) {
    console.error("Payment create error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
