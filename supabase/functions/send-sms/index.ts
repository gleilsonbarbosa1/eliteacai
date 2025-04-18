import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface SmsRequest {
  phone: string;
  code: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    // Validate environment variables
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Missing Twilio environment variables");
      throw new Error("Configuration error: Missing Twilio credentials");
    }

    // Parse request body
    const { phone, code }: SmsRequest = await req.json();

    if (!phone || !code) {
      throw new Error("Missing required parameters: phone or code");
    }

    // Format message
    const message = `Seu código de recuperação de senha é: ${code}`;

    // Call Twilio API
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioResponse = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioPhoneNumber,
        Body: message,
      }).toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error("Twilio API error:", errorData);
      throw new Error(`Failed to send SMS: ${errorData.message}`);
    }

    const result = await twilioResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.sid }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in send-sms function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});