// Phase 0 ships exactly ONE event. Famous events only is a hard constraint, not
// a preference: answer quality is proportional to how deeply the model knows the
// event from training. The model knows Gandhi/Partition/1948 India intimately,
// so it reasons; an obscure event would just hallucinate confidently.
//
// `anchor` is the FACTUAL ANCHOR — real history we write by hand. It is the trunk
// the whole alternate tree branches off, and the one thing the model must never
// deny as real history.

export const GANDHI_EVENT = {
  id: "gandhi_survives",
  title: "Gandhi survives",
  year: 1948,
  pivot: "Nathuram Godse's assassination attempt fails, 30 January 1948",
  anchor:
    "On 30 January 1948, Nathuram Godse, a Hindu nationalist, shot and killed Mahatma Gandhi at Birla House, New Delhi — months after the Partition of India. Gandhi was 78. His death caused an enormous outpouring of national grief, prompted a government crackdown that banned the RSS, and helped consolidate Nehru's secular vision of the Indian state. At the time of his death, Partition was already complete, an India–Pakistan war over Kashmir was underway, and Gandhi had recently fasted to pressure India into releasing funds owed to Pakistan.",
  // Suggested starter question — the user can also type their own.
  starter: "What if Godse's bullet missed and Gandhi survived?",
};
