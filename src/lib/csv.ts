import type { Business } from "@/lib/types";

const CSV_COLUMNS: { key: keyof Business; header: string }[] = [
  { key: "place_id", header: "Place ID" },
  { key: "name", header: "Name" },
  { key: "category", header: "Category" },
  { key: "address", header: "Address" },
  { key: "latitude", header: "Latitude" },
  { key: "longitude", header: "Longitude" },
  { key: "google_maps_url", header: "Google Maps URL" },
  { key: "website", header: "Website" },
  { key: "phone_number", header: "Phone Number" },
  { key: "rating", header: "Rating" },
  { key: "review_count", header: "Review Count" },
  { key: "opening_hours", header: "Opening Hours" },
  { key: "primary_image_url", header: "Primary Image URL" },
  { key: "short_description", header: "Short Description" },
  { key: "queried_at", header: "Queried At" },
  { key: "query", header: "Query" },
  { key: "redesign_status", header: "Redesign Status" },
  { key: "redesign_prompt", header: "Redesign Prompt" },
  { key: "redesign_image_urls", header: "Redesign Image URLs" },
  { key: "stitch_project_id", header: "Stitch Project ID" },
  { key: "redesigned_at", header: "Redesigned At" },
  { key: "whatsapp_status", header: "WhatsApp Status" },
  { key: "whatsapp_message_ids", header: "WhatsApp Message IDs" },
  { key: "whatsapp_error", header: "WhatsApp Error" },
  { key: "whatsapp_sent_at", header: "WhatsApp Sent At" },
];

/**
 * RFC 4180 field escaping: only wraps a value in quotes when it actually
 * contains a comma, quote, or newline, and doubles any embedded quotes —
 * so commas/quotes/newlines inside names, addresses, or descriptions never
 * shift a value into the wrong column.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function businessesToCsv(businesses: Business[]): string {
  const header = CSV_COLUMNS.map((c) => csvCell(c.header)).join(",");
  const rows = businesses.map((b) => CSV_COLUMNS.map((c) => csvCell(b[c.key])).join(","));
  return [header, ...rows].join("\r\n");
}

export function runCsvSelfCheck(): boolean {
  const cases: [unknown, string][] = [
    ["plain", "plain"],
    ["has,comma", '"has,comma"'],
    ['has"quote', '"has""quote"'],
    ["has\nnewline", '"has\nnewline"'],
    ["has\rcarriage", '"has\rcarriage"'],
    [null, ""],
    [undefined, ""],
    [42, "42"],
    [["a", "b,c"], '"a; b,c"'],
  ];
  for (const [input, expected] of cases) {
    if (csvCell(input) !== expected) return false;
  }

  const csv = businessesToCsv([
    {
      place_id: "1",
      name: 'Joe, "The Baker"',
      category: "bakery",
      address: "1 Main St",
      latitude: 0,
      longitude: 0,
      google_maps_url: "https://maps",
      website: null,
      phone_number: null,
      rating: null,
      review_count: null,
      opening_hours: null,
      primary_image_url: "",
      short_description: "Line one\nLine two",
    },
  ]);
  const rows = csv.split("\r\n");
  if (rows.length !== 2) return false;
  if (!rows[1].includes('"Joe, ""The Baker"""')) return false;

  return true;
}

/** Triggers a browser download — no server round-trip, no library. */
export function downloadCsv(filename: string, csv: string) {
  // Leading BOM so Excel opens the file as UTF-8 instead of guessing a local codepage.
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
