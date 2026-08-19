"use client";

import { useState, type FormEvent } from "react";
import { saveSettings } from "@/lib/api";
import type { BackendStatus, SettingsForm } from "@/lib/types";

function ConnectionBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)]">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
      <span className={`text-[11px] ml-auto ${ok ? "text-emerald-600" : "text-red-600"}`}>
        {ok ? "Connected" : "Not configured"}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-[var(--muted-foreground)] font-semibold">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-[var(--background)] px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm transition duration-150 focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[var(--foreground)]">{title}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function SettingsView({
  initialForm,
  status,
  onSaved,
}: {
  initialForm: SettingsForm;
  status: BackendStatus | null;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<SettingsForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveSettings(form);
      await onSaved();
      setForm((prev) => ({
        ...prev,
        openrouter_api_key: "",
        google_places_api_key: "",
        serper_api_key: "",
        whatsapp_access_token: "",
      }));
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings. Check that the backend is running.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Agent Settings</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Configure the credentials and search provider the scout agent runs on.
        </p>
      </div>

      {status && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          <ConnectionBadge ok={status.database.connected} label="MongoDB" />
          <ConnectionBadge ok={status.config.openrouter_api_key_configured} label="OpenRouter" />
          <ConnectionBadge ok={status.config.google_places_api_key_configured} label="Google Places" />
          <ConnectionBadge ok={status.config.whatsapp_configured} label="WhatsApp" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Section title="Search provider" description="Where the agent looks up businesses when scouting.">
          <Field label="Default Search Provider">
            <select
              value={form.search_provider}
              onChange={(e) => update({ search_provider: e.target.value })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="google">Google Places API (Official, Default)</option>
              <option value="osm">OpenStreetMap (Free, no setup)</option>
              <option value="maps_scraper">Google Maps Extractor (Local desktop app required)</option>
              <option value="serper">Serper Maps API (Key required)</option>
            </select>
          </Field>

          {form.search_provider === "google" && (
            <Field label="Google Places API Key">
              <input
                type="password"
                value={form.google_places_api_key}
                onChange={(e) => update({ google_places_api_key: e.target.value })}
                placeholder="Paste GOOGLE_PLACES_API_KEY (leave blank to keep current)"
                className={inputClass}
              />
            </Field>
          )}

          {form.search_provider === "serper" && (
            <Field label="Serper API Key">
              <input
                type="password"
                value={form.serper_api_key}
                onChange={(e) => update({ serper_api_key: e.target.value })}
                placeholder="Paste SERPER_API_KEY (leave blank to keep current)"
                className={inputClass}
              />
            </Field>
          )}
        </Section>

        <Section title="AI" description="Powers the redesign prompt writer and agent reasoning.">
          <Field label="OpenRouter API Key">
            <input
              type="password"
              value={form.openrouter_api_key}
              onChange={(e) => update({ openrouter_api_key: e.target.value })}
              placeholder="Paste OPENROUTER_API_KEY (leave blank to keep current)"
              className={inputClass}
            />
          </Field>
        </Section>

        <Section title="WhatsApp delivery" description="Sends the finished redesign to the business's WhatsApp number.">
          <Field label="WhatsApp Access Token">
            <input
              type="password"
              value={form.whatsapp_access_token}
              onChange={(e) => update({ whatsapp_access_token: e.target.value })}
              placeholder="Paste Meta WhatsApp Cloud API access token"
              className={inputClass}
            />
          </Field>
          <Field label="WhatsApp Phone Number ID">
            <input
              type="text"
              value={form.whatsapp_phone_number_id}
              onChange={(e) => update({ whatsapp_phone_number_id: e.target.value })}
              placeholder="From Meta Business > WhatsApp > API Setup"
              className={inputClass}
            />
          </Field>
        </Section>

        {error && (
          <p role="alert" className="text-[var(--destructive)] text-xs">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-white text-sm font-medium rounded-full transition duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-[0_8px_20px_-6px_rgba(0,102,204,0.5)]"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-focus))" }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
