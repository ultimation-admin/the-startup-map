import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ error: "Webhook signature or secret missing." }, { status: 400 });
    }

    const payload = await request.text();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.warn("Invalid Razorpay webhook signature");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    console.info("Received valid Razorpay webhook event", { bytes: payload.length });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("POST /api/razorpay/webhook error:", error);
    return NextResponse.json({ error: "Webhook verification failed." }, { status: 500 });
  }
}
