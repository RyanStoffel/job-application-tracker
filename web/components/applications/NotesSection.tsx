"use client";

import { useState, type FormEvent } from "react";
import { ApiError, createNote, deleteNote, updateNote } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { Note } from "@/lib/types";

function NoteItem({
  applicationId,
  note,
  onUpdated,
  onDeleted,
}: {
  applicationId: string;
  note: Note;
  onUpdated: (note: Note) => void;
  onDeleted: (noteId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      const updated = await updateNote(applicationId, note.id, content.trim());
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update note.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      await deleteNote(applicationId, note.id);
      onDeleted(note.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete note.");
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      {error && <div className="mb-2"><InlineError message={error} /></div>}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setContent(note.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={busy || !content.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="whitespace-pre-wrap text-sm text-neutral-800">{note.content}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-neutral-400">{formatDateTime(note.updatedAt)}</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function NotesSection({
  applicationId,
  notes,
  onNotesChange,
}: {
  applicationId: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await createNote(applicationId, content.trim());
      onNotesChange([created, ...notes]);
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add note.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <InlineError message={error} />}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          className="block w-full rounded-md px-3 py-2 text-sm text-neutral-900 ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !content.trim()}>
            {submitting ? "Adding…" : "Add note"}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Jot down interview prep, contacts, or reminders." />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              applicationId={applicationId}
              note={note}
              onUpdated={(updated) =>
                onNotesChange(notes.map((n) => (n.id === updated.id ? updated : n)))
              }
              onDeleted={(noteId) => onNotesChange(notes.filter((n) => n.id !== noteId))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
