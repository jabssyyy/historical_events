// The trunk header: what really happened. Everything below it on the page is
// the alternate world branching off this real-history baseline.
export default function EventHeader({ event }) {
  return (
    <header className="event-header" id="event-header">
      <h1>{event.title}</h1>
      <p className="pivot">
        {event.pivot} ({event.year})
      </p>
      <p className="subtitle">
        Below is real history. Ask a what-if on any card to branch the timeline —
        each branch inherits every fact established above it, so the alternate
        world stays consistent however deep you go.
      </p>
    </header>
  );
}
