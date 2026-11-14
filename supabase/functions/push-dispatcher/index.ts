// Supabase Edge Function: push-dispatcher
// Sends Expo push notifications triggered by Database Webhooks or direct invocations.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  table: string;
  record: Record<string, any>;
  schema: string;
}

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: WebhookPayload = await req.json();
    const { table, record } = body;

    let targetUserId: string | null = null;
    let title = "Khidmat";
    let messageBody = "";
    let dataPayload: Record<string, any> = {};

    if (table === "notifications") {
      targetUserId = record.user_id;
      messageBody = record.message || "You have a new notification";
      title = record.type === "job_accepted"
        ? "Booking Confirmed"
        : record.type === "job_completed"
        ? "Service Completed"
        : record.type === "kyc"
        ? "Account Verification"
        : "Khidmat Alert";
      dataPayload = {
        type: record.type,
        bookingId: record.booking_id,
        notificationId: record.id,
      };
    } else if (table === "messages") {
      const { booking_id, sender_id, content } = record;
      const { data: booking } = await supabase
        .from("bookings")
        .select("customer_id, provider_id")
        .eq("id", booking_id)
        .single();

      if (booking) {
        targetUserId = booking.customer_id === sender_id
          ? booking.provider_id
          : booking.customer_id;
        title = "New Message";
        let displayContent = content;
        try {
          const parsed = JSON.parse(content);
          if (parsed?.text) displayContent = parsed.text;
        } catch {
          // keep as plain text
        }
        messageBody = displayContent;
        dataPayload = {
          type: "new_message",
          bookingId: booking_id,
        };
      }
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ status: "ignored_no_recipient" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Retrieve active push tokens for target user
    const { data: tokens, error: tokenErr } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", targetUserId);

    if (tokenErr || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ status: "no_tokens_found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title,
      body: messageBody,
      data: dataPayload,
      sound: "default",
      priority: "high",
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoData = await expoRes.json();

    return new Response(JSON.stringify({ status: "sent", result: expoData }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
