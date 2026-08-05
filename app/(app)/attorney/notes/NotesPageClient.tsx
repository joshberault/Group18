"use client";

import { useState } from "react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { formatDate } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export function NotesPageClient() {
  const { notes, matters, profileId, addNote, updateNote, deleteNote } = useAttorneyData();
  const [matterId, setMatterId] = useState(matters[0]?.id ?? "");
  const [noteText, setNoteText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addNote({ matter_id: matterId, profile_id: profileId, note_text: noteText });
    setNoteText("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Notes"
        description="Internal attorney notes tied to matters. Not visible to clients."
      />

      <Card padding="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select
            label="Matter"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            options={matters.map((m) => ({ value: m.id, label: m.title }))}
          />
          <Textarea
            label="Note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Strategy, client conversations, research findings..."
            required
          />
          <Button type="submit">Add Note</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {notes.map((note) => (
          <Card key={note.id} padding="md">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-navy-900">{note.matter?.title}</p>
              <p className="text-xs text-muted">
                {note.author?.full_name} · {formatDate(note.created_at.slice(0, 10))}
              </p>
            </div>
            {editingId === note.id ? (
              <div className="space-y-3">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateNote(note.id, editText);
                      setEditingId(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{note.note_text}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditingId(note.id);
                  setEditText(note.note_text);
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteNote(note.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
