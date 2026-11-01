// Checks a payment receipt before the registration form is shown.
// The browser posts { file: <base64>, mediaType } here. Claude reads the
// receipt, this function applies the rules below, and only a receipt that
// passes gets the form link back.
import Anthropic from "@anthropic-ai/sdk";

const ACCOUNT_NUMBER = "8108229724"; // OPay
const ACCOUNT_NAME_PARTS = ["awotipe", "roseline"];
const MIN_AMOUNT = 100000; // naira
const FORM_URL =
  process.env.REGISTRATION_FORM_URL || "https://forms.gle/jy5curP7vkNFCM9dA";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BASE64_CHARS = 4_200_000; // stays under Vercel's 4.5 MB request limit

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    is_payment_receipt: {
      type: "boolean",
      description: "True only if the file is a bank transfer or payment receipt/confirmation.",
    },
    status: {
      type: "string",
      enum: ["successful", "pending", "failed", "unknown"],
      description: "Transaction status as printed on the receipt.",
    },
    amount_naira: {
      type: "number",
      description: "Amount transferred in naira, excluding fees. 0 if it cannot be read.",
    },
    recipient_account_number: {
      type: "string",
      description: "Beneficiary account number exactly as printed, keeping any * or x masking. Empty if not shown.",
    },
    recipient_name: { type: "string", description: "Beneficiary name as printed. Empty if not shown." },
    recipient_bank: { type: "string", description: "Beneficiary bank as printed. Empty if not shown." },
    sender_name: { type: "string", description: "Sender name as printed. Empty if not shown." },
    transaction_date: { type: "string", description: "Date and time as printed. Empty if not shown." },
    transaction_reference: {
      type: "string",
      description: "Transaction reference, session ID or transaction number as printed. Empty if not shown.",
    },
    looks_edited: {
      type: "boolean",
      description: "True if parts of the receipt look altered, pasted over or inconsistent.",
    },
  },
  required: [
    "is_payment_receipt",
    "status",
    "amount_naira",
    "recipient_account_number",
    "recipient_name",
    "recipient_bank",
    "sender_name",
    "transaction_date",
    "transaction_reference",
    "looks_edited",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You read Nigerian bank transfer receipts (OPay, Moniepoint, PalmPay, Kuda, GTBank and other banks).
Report only what is printed on the receipt. Do not guess or fill in values that are not visible.
The amount is the transferred amount in naira as a plain number (for example "₦100,000.00" is 100000). Ignore fees and balances.
Copy account numbers exactly as printed, including masking characters such as * or x.
If the file is not a payment receipt, set is_payment_receipt to false and leave the other text fields empty.`;

const client = new Anthropic();

function json(res, status, body) {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.json(body);
}

function formatNaira(n) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

// Accepts the full number, or a masked one like 810****724 / ******9724.
function accountMatches(printed) {
  const cleaned = String(printed || "").replace(/[^0-9*xX•]/g, "");
  if (!cleaned) return false;
  if (cleaned === ACCOUNT_NUMBER) return true;
  const isMask = (c) => c === "*" || c === "x" || c === "X" || c === "•";
  if (cleaned.length === ACCOUNT_NUMBER.length) {
    let visible = 0;
    for (let i = 0; i < cleaned.length; i++) {
      if (isMask(cleaned[i])) continue;
      if (cleaned[i] !== ACCOUNT_NUMBER[i]) return false;
      visible++;
    }
    return visible >= 4;
  }
  const tail = cleaned.split("").reverse().join("").match(/^\d+/);
  return Boolean(tail && tail[0].length >= 4 && ACCOUNT_NUMBER.endsWith(tail[0].split("").reverse().join("")));
}

function nameMatches(printed) {
  const name = String(printed || "").toLowerCase();
  return ACCOUNT_NAME_PARTS.every((part) => name.includes(part));
}

export function decide(r) {
  const reasons = [];
  if (!r.is_payment_receipt) {
    reasons.push("This file doesn't look like a payment receipt. Upload the receipt from your bank app.");
    return reasons;
  }
  if (r.status !== "successful") {
    reasons.push("The receipt doesn't show a successful transfer.");
  }
  if (!(r.amount_naira >= MIN_AMOUNT)) {
    reasons.push(
      r.amount_naira > 0
        ? `The receipt shows ${formatNaira(r.amount_naira)}. The retreat fee is ₦100,000.`
        : "We couldn't read the amount on the receipt. Upload a clearer screenshot."
    );
  }
  if (!accountMatches(r.recipient_account_number) && !nameMatches(r.recipient_name)) {
    reasons.push("The payment wasn't made to the Goal Achievers account (OPay 8108229724, Awotipe Roseline).");
  }
  if (r.looks_edited) {
    reasons.push("Parts of this receipt look edited. Upload the original receipt from your bank app.");
  }
  return reasons;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, reasons: ["Use POST."] });
  }

  const { file, mediaType } = req.body || {};
  if (typeof file !== "string" || !file || !ALLOWED_TYPES.includes(mediaType)) {
    return json(res, 400, { ok: false, reasons: ["Upload your receipt as an image (JPG or PNG) or a PDF."] });
  }
  if (file.length > MAX_BASE64_CHARS) {
    return json(res, 413, { ok: false, reasons: ["That file is too large. Upload a screenshot under 3 MB."] });
  }

  const fileBlock =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: file } };

  let response;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RECEIPT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: "Extract the details of this payment receipt." }],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Receipt check rejected:", error.message);
      return json(res, 400, { ok: false, reasons: ["We couldn't open that file. Try a screenshot of the receipt instead."] });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("Rate limited");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status}:`, error.message);
    } else {
      console.error(error);
    }
    return json(res, 503, { ok: false, reasons: ["The receipt checker is busy. Please try again in a minute."] });
  }

  if (response.stop_reason === "refusal") {
    return json(res, 422, { ok: false, reasons: ["We couldn't read that file. Try a clear screenshot of the receipt."] });
  }

  let receipt;
  try {
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    receipt = JSON.parse(text);
  } catch {
    return json(res, 422, { ok: false, reasons: ["We couldn't read that receipt. Try a clearer screenshot."] });
  }

  const reasons = decide(receipt);
  console.log(
    JSON.stringify({
      event: "receipt_check",
      passed: reasons.length === 0,
      amount: receipt.amount_naira,
      reference: receipt.transaction_reference,
      sender: receipt.sender_name,
      date: receipt.transaction_date,
    })
  );

  if (reasons.length) {
    return json(res, 200, { ok: false, reasons });
  }
  return json(res, 200, {
    ok: true,
    amount: formatNaira(receipt.amount_naira),
    reference: receipt.transaction_reference || "Not shown on receipt",
    sender: receipt.sender_name,
    formUrl: FORM_URL,
  });
}
