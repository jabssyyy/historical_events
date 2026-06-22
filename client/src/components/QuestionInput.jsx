import { useState } from "react";

// A controlled what-if input. Submits the trimmed value on Enter or button
// click, ignores empty input, clears itself afterwards, and locks while the
// parent is generating (so you can't fire two questions at once on one node).
//
// `starterHint` is an optional suggested question shown as a clickable chip.
export default function QuestionInput({ onSubmit, loading, starterHint }) {
  const [value, setValue] = useState("");

  function submit() {
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
    setValue("");
  }

  function useStarter() {
    if (loading) return;
    onSubmit(starterHint);
  }

  return (
    <div>
      <div className="question-input" id="question-input">
        <input
          type="text"
          placeholder="Ask a what-if…"
          value={value}
          disabled={loading}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-label="Ask a what-if question"
        />
        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className={loading ? "loading" : ""}
          aria-label="Submit question"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {/* Starter suggestion chip — only shown when provided and input is empty */}
      {starterHint && !value && !loading && (
        <button className="starter-chip" onClick={useStarter} type="button">
          <span className="chip-icon">💡</span>
          {starterHint}
        </button>
      )}
    </div>
  );
}
