export type CoachingNoteFields = {
  displayMessage?: string;
  message: string;
  sourceType?: string;
};

export function isCoachingNote(note: CoachingNoteFields) {
  return note.sourceType === "coaching" || note.message.includes("Coaching");
}

export function resolveCoachingDisplayMessage(note: CoachingNoteFields) {
  const display = note.displayMessage?.trim();
  if (display) {
    return display;
  }

  return note.message
    .replace(/^用户下一手起生效的 Coaching：/, "")
    .replace(/^Coaching for next hand:\s*/i, "")
    .trim();
}
