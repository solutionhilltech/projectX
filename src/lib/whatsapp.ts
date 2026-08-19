import type { Business, SettingsForm } from "@/lib/types";

const API_VERSION = "v21.0";

/** Template must exist and be APPROVED in Meta first — see scripts/submit-whatsapp-template.mjs. */
const TEMPLATE_NAME = "freewebsiteredesign";
const TEMPLATE_LANGUAGE = "en";

/** WhatsApp caps a template to one header image, so N images = N messages. */
const IMAGE_SEND_DELAY_MS = 1200;

/** Meta's Cloud API wants digits only — country code + number, no "+". */
function toWhatsappId(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return phone.trim().startsWith("+") ? digits : `91${digits}`;
}

async function sendImageTemplate(
  to: string,
  imageUrl: string,
  businessName: string,
  accessToken: string,
  phoneNumberId: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: TEMPLATE_LANGUAGE },
          // Header image is passed by public link at send-time — no Meta
          // resumable-upload handle needed here (that's only required for
          // the *example* image when submitting the template for approval).
          components: [
            { type: "header", parameters: [{ type: "image", image: { link: imageUrl } }] },
            { type: "body", parameters: [{ type: "text", text: businessName }] },
          ],
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sends every image in `business.redesign_image_urls` as its own WhatsApp
 * message, straight through Meta's WhatsApp Cloud API — no reseller in the
 * loop. Business-initiated + the customer has never messaged us, so each
 * send MUST use an approved template, not free-form text.
 *
 * WhatsApp templates carry exactly one header image each, so multiple
 * images become multiple messages, spaced out to avoid rate limits.
 */
export async function sendRedesignReadyMessage(
  business: Business,
  settings: SettingsForm
): Promise<{ ok: boolean; messageIds: string[]; error?: string }> {
  if (!settings.whatsapp_access_token || !settings.whatsapp_phone_number_id) {
    return {
      ok: false,
      messageIds: [],
      error: "WhatsApp isn't configured. Add the access token and phone number ID in Settings.",
    };
  }
  if (!business.phone_number) {
    return { ok: false, messageIds: [], error: "Business has no phone number." };
  }
  const images = business.redesign_image_urls ?? [];
  if (images.length === 0) {
    return { ok: false, messageIds: [], error: "No redesign image available yet." };
  }

  const to = toWhatsappId(business.phone_number);
  const messageIds: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const result = await sendImageTemplate(
      to,
      images[i],
      business.name,
      settings.whatsapp_access_token,
      settings.whatsapp_phone_number_id
    );
    if (!result.ok) {
      return { ok: false, messageIds, error: `Image ${i + 1}/${images.length}: ${result.error}` };
    }
    if (result.messageId) messageIds.push(result.messageId);
    if (i < images.length - 1) await new Promise((r) => setTimeout(r, IMAGE_SEND_DELAY_MS));
  }

  return { ok: true, messageIds };
}
