"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useSession } from "@/lib/app/session";
import { createClient } from "@/lib/supabase/client";
import { isNetworkError, useOnline } from "@/hooks/use-online";
import { normalisePhone } from "@/lib/phone";
import { Avatar } from "@/components/app/avatar";

/**
 * People I trust — the survivor's own private directory. Every row is
 * theirs alone (RLS: owner_id = auth.uid()), every action is an explicit
 * tap on an explicit link: FAST never messages, calls or texts anyone by
 * itself. Names, numbers and notes stay behind their sign-in like every
 * other private surface in FAST.
 */

type PreferredMethod = "call" | "sms" | "email" | "whatsapp";

const METHODS: { value: PreferredMethod; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  notes: string | null;
  preferred_method: PreferredMethod;
  is_emergency: boolean;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  relationship: "",
  notes: "",
  preferred_method: "call" as PreferredMethod,
  is_emergency: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** wa.me expects the international number with no punctuation or plus. */
function whatsappHref(phone: string | null): string | null {
  if (!phone) return null;
  const e164 = normalisePhone(phone);
  return e164 ? `https://wa.me/${e164.replace(/\D/g, "")}` : null;
}

export default function ContactsPage() {
  const { user, loading } = useSession();
  const supabase = createClient();
  const online = useOnline();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "error" | "missing-table">("loading");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setListState("loading");
    const { data, error } = await supabase
      .from("contacts")
      .select("id,name,phone,email,relationship,notes,preferred_method,is_emergency")
      .order("is_emergency", { ascending: false })
      .order("name", { ascending: true });
    if (error) {
      // 42P01 = the contacts table does not exist yet on this Supabase
      // project (migration 0008 has not been applied). Say so honestly
      // instead of a dead error.
      if ((error as { code?: string }).code === "42P01") {
        setListState("missing-table");
      } else {
        setListState("error");
      }
      return;
    }
    setContacts((data ?? []) as ContactRow[]);
    setListState("ready");
  }, [supabase, user]);

  useEffect(() => {
    if (loading || !user) return;
    // Deferred one tick: load() sets its list state synchronously at the
    // start, and the first render must not setState from inside the effect.
    const initial = setTimeout(() => void load(), 0);
    return () => clearTimeout(initial);
  }, [load, loading, user]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(contact: ContactRow) {
    setForm({
      name: contact.name,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      relationship: contact.relationship ?? "",
      notes: contact.notes ?? "",
      preferred_method: contact.preferred_method,
      is_emergency: contact.is_emergency,
    });
    setEditingId(contact.id);
    setFormError(null);
    setFormOpen(true);
    // Bring the form into view on tall phone screens.
    requestAnimationFrame(() =>
      document.getElementById("contact-form")?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("A name is the one thing this entry needs.");
      return;
    }
    const phoneE164 = normalisePhone(form.phone);
    if (form.phone.trim() && !phoneE164) {
      setFormError("That phone number does not look complete — use a full South African number, like 082 123 4567.");
      return;
    }
    const email = form.email.trim();
    if (email && !EMAIL_RE.test(email)) {
      setFormError("That email address does not look complete — check it for a missing @ or full stop.");
      return;
    }
    if (!phoneE164 && !email) {
      setFormError("Add at least one way to reach them — a phone number or an email address.");
      return;
    }

    setBusy(true);
    const payload = {
      name,
      phone: phoneE164,
      email: email || null,
      relationship: form.relationship.trim() || null,
      notes: form.notes.trim() || null,
      preferred_method: form.preferred_method,
      is_emergency: form.is_emergency,
      updated_at: new Date().toISOString(),
    };
    const { error } = editingId
      ? await supabase.from("contacts").update(payload).eq("id", editingId)
      : await supabase.from("contacts").insert({ ...payload, owner_id: user!.id });
    setBusy(false);
    if (error) {
      setFormError(
        isNetworkError(error)
          ? "You are offline — this entry was not saved. Try again once the connection is back."
          : "This entry could not be saved. Please try again.",
      );
      return;
    }
    closeForm();
    void load();
  }

  async function removeContact(id: string) {
    if (confirmDeleteId !== id) {
      // Two taps, no modal: first tap arms, second tap deletes. Tapping
      // anything else disarms.
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) setContacts((rows) => rows.filter((r) => r.id !== id));
  }

  async function toggleEmergency(contact: ContactRow) {
    const next = !contact.is_emergency;
    setContacts((rows) => rows.map((r) => (r.id === contact.id ? { ...r, is_emergency: next } : r)));
    const { error } = await supabase
      .from("contacts")
      .update({ is_emergency: next, updated_at: new Date().toISOString() })
      .eq("id", contact.id);
    if (error) void load();
  }

  if (loading) return <p className="text-base text-body">One moment…</p>;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-display text-4xl font-black tracking-tight text-foreground">
          People I <span className="text-brand">trust</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-body">
          Your own private list — family, friends, a counsellor, a lawyer.
          Only you can see them, and Fast never contacts anyone unless you
          tap the button yourself.
        </p>
      </section>

      {!online && (
        <p role="status" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
          You are offline. Entries already on this screen stay readable;
          saving changes needs your connection back.
        </p>
      )}

      {/* Add / edit form */}
      <section aria-label="Add or edit a contact">
        {!formOpen ? (
          <button
            onClick={openAdd}
            className="lift inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand/60 bg-brand/10 px-5 text-sm font-bold text-brand sm:w-auto"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add someone you trust
          </button>
        ) : (
          <form
            id="contact-form"
            onSubmit={submitForm}
            className="card-surface flex flex-col gap-5 p-6"
            aria-label={editingId ? "Edit contact" : "New contact"}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {editingId ? "Edit this person" : "New person"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close the form"
                className="lift min-h-11 rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Name *</span>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Who is this?"
                className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Phone</span>
                <input
                  type="tel"
                  autoComplete="off"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="082 123 4567"
                  className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Email</span>
                <input
                  type="email"
                  autoComplete="off"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="them@example.co.za"
                  className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Relationship</span>
              <input
                type="text"
                autoComplete="off"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                placeholder="Sister, friend, counsellor, lawyer…"
                className="min-h-12 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-base text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
              />
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
                Preferred way to reach them
              </legend>
              <div className="grid grid-cols-4 gap-2 rounded-2xl border-2 border-taupe bg-taupe/15 p-1.5">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, preferred_method: m.value })}
                    aria-pressed={form.preferred_method === m.value}
                    className={`min-h-10 rounded-xl text-xs font-bold sm:text-sm ${
                      form.preferred_method === m.value ? "bg-brand text-ink" : "text-body"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Notes (private, optional)</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything you want to remember — work hours, the safe word, their shade of calm."
                className="resize-none rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-faint focus:border-brand focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setForm({ ...form, is_emergency: !form.is_emergency })}
              aria-pressed={form.is_emergency}
              className={`lift inline-flex min-h-11 items-center gap-2 self-start rounded-2xl border-2 px-4 text-sm font-bold ${
                form.is_emergency ? "border-brand bg-brand/10 text-brand" : "border-taupe bg-taupe/15 text-body"
              }`}
            >
              <Star className="h-4 w-4" aria-hidden="true" />
              {form.is_emergency ? "Emergency contact — pinned first" : "Mark as emergency contact"}
            </button>

            {formError && (
              <p role="alert" className="rounded-xl border-2 border-taupe bg-taupe/20 px-4 py-3 text-sm text-body">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="lift inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-bold text-ink disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Save this person"}
            </button>
          </form>
        )}
      </section>

      {/* List */}
      <section aria-label="Your contacts">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">
          {contacts.length > 0 ? `${contacts.length} ${contacts.length === 1 ? "person" : "people"}` : "Your list"}
        </h2>

        {listState === "loading" && <p className="mt-3 text-sm text-body">One moment…</p>}

        {listState === "error" && (
          <div className="card-surface mt-3 p-7 text-center">
            <p className="text-sm font-bold text-foreground">Your list could not load.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              {online
                ? "Something went wrong on the way. Nothing was lost."
                : "You are offline. Your list is safe — try again once the connection is back."}
            </p>
            <button
              onClick={() => void load()}
              className="lift mt-4 inline-flex min-h-11 items-center rounded-2xl border-2 border-taupe bg-taupe/15 px-4 text-sm font-bold text-body hover:border-brand"
            >
              Try again
            </button>
          </div>
        )}

        {listState === "missing-table" && (
          <div className="card-surface mt-3 p-7 text-center">
            <p className="text-sm font-bold text-foreground">Contacts arrive with the next Fast update.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              The database behind Fast is one small migration away from
              storing your list. Everything else keeps working in the
              meantime.
            </p>
          </div>
        )}

        {listState === "ready" && contacts.length === 0 && (
          <div className="card-surface mt-3 p-7 text-center">
            <p className="text-sm font-bold text-foreground">Nobody here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              Add the people you would call first — when something happens,
              this list is faster than memory.
            </p>
          </div>
        )}

        {listState === "ready" && contacts.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2.5">
            {contacts.map((c) => {
              const wa = whatsappHref(c.phone);
              return (
                <li
                  key={c.id}
                  className={`card-surface flex flex-col gap-3 px-5 py-4 ${c.is_emergency ? "border-brand/60" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <span className="truncate">{c.name}</span>
                        {c.is_emergency && (
                          <Star className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Emergency contact" />
                        )}
                      </p>
                      <p className="truncate text-xs text-dim">
                        {c.relationship || "Trusted person"}
                        {c.notes ? ` · ${c.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => void toggleEmergency(c)}
                        aria-label={
                          c.is_emergency
                            ? `Remove ${c.name} from emergency contacts`
                            : `Mark ${c.name} as an emergency contact`
                        }
                        aria-pressed={c.is_emergency}
                        className={`lift min-h-10 rounded-xl border-2 p-2 ${
                          c.is_emergency
                            ? "border-brand/60 bg-brand/10 text-brand"
                            : "border-taupe text-dim hover:border-brand hover:text-brand"
                        }`}
                      >
                        <Star className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        aria-label={`Edit ${c.name}`}
                        className="lift min-h-10 rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => void removeContact(c.id)}
                        aria-label={
                          confirmDeleteId === c.id
                            ? `Tap again to permanently delete ${c.name}`
                            : `Delete ${c.name}`
                        }
                        className={`lift min-h-10 rounded-xl border-2 p-2 ${
                          confirmDeleteId === c.id
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-taupe text-dim hover:border-brand hover:text-brand"
                        }`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {c.phone && (
                      <a
                        href={`tel:${normalisePhone(c.phone) ?? ""}`}
                        className={`lift inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                          c.preferred_method === "call"
                            ? "bg-brand text-ink"
                            : "border-2 border-taupe bg-taupe/15 text-body hover:border-brand"
                        }`}
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        Call
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`sms:${normalisePhone(c.phone) ?? ""}`}
                        className={`lift inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                          c.preferred_method === "sms"
                            ? "bg-brand text-ink"
                            : "border-2 border-taupe bg-taupe/15 text-body hover:border-brand"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        SMS
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className={`lift inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                          c.preferred_method === "email"
                            ? "bg-brand text-ink"
                            : "border-2 border-taupe bg-taupe/15 text-body hover:border-brand"
                        }`}
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        Email
                      </a>
                    )}
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`lift inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                          c.preferred_method === "whatsapp"
                            ? "bg-brand text-ink"
                            : "border-2 border-taupe bg-taupe/15 text-body hover:border-brand"
                        }`}
                      >
                        WhatsApp
                      </a>
                    )}
                    {confirmDeleteId === c.id && (
                      <button
                        onClick={() => void removeContact(c.id)}
                        className="lift inline-flex min-h-10 items-center rounded-xl bg-brand px-3 text-xs font-bold text-ink"
                      >
                        Tap again to delete {c.name.split(" ")[0]} forever
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
