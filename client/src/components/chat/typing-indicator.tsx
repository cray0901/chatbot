export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%]">
        <div className="bg-muted border p-4 rounded-2xl rounded-bl-md">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm">AI is thinking</span>
            <div className="flex gap-1 ml-2">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
