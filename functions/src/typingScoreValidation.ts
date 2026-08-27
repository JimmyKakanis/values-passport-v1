import { onDocumentWritten } from "firebase-functions/v2/firestore";

const MAX_WPM = 180;

/**
 * Validates typing_scores writes and removes entries that fail basic bounds checks.
 * Client-side anti-cheat is the first line; this catches obviously invalid scores.
 */
export const validateTypingScore = onDocumentWritten(
  { document: "typing_scores/{studentId}" },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data() as {
      wpm?: number;
      accuracy?: number;
      adjustedWpm?: number;
      durationMs?: number;
      studentId?: string;
    };

    const studentId = event.params.studentId;
    const invalid =
      data.studentId !== studentId ||
      typeof data.wpm !== "number" ||
      typeof data.accuracy !== "number" ||
      typeof data.adjustedWpm !== "number" ||
      data.wpm < 0 ||
      data.wpm > MAX_WPM ||
      data.accuracy < 0 ||
      data.accuracy > 100 ||
      Math.abs(data.wpm * (data.accuracy / 100) - data.adjustedWpm) > 1.5 ||
      (typeof data.durationMs === "number" && data.durationMs < 500);

    if (invalid) {
      await after.ref.delete().catch(() => undefined);
    }
  }
);
