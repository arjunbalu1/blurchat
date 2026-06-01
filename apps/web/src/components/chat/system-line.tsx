// Centered, muted status line that separates sessions in the transcript
// ("now chatting…", "Stranger has disconnected.", "You ended the chat.").
export function SystemLine({ text }: { text: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="px-3 text-center text-xs text-muted-foreground">
        {text}
      </span>
    </div>
  );
}
