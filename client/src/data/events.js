// Phase 0 ships exactly ONE scenario. Famous events only is a hard constraint:
// answer quality is proportional to how deeply the model knows the event from
// training. The model knows Gandhi / Partition / 1948 India intimately.
//
// `anchor` is the FACTUAL ANCHOR — real history we write by hand. It is the
// ground truth every alternate branch must never deny.

export const GANDHI_EVENT = {
  id: "gandhi_survives",
  title: "Gandhi survives",
  year: 1948,
  pivot: "Nathuram Godse's assassination attempt fails, 30 January 1948",
  anchor:
    "On 30 January 1948, Nathuram Godse, a Hindu nationalist, shot and killed Mahatma Gandhi at Birla House, New Delhi — months after the Partition of India. Gandhi was 78. His death caused an enormous outpouring of national grief, prompted a government crackdown that banned the RSS, and helped consolidate Nehru's secular vision of the Indian state. At the time of his death, Partition was already complete, an India–Pakistan war over Kashmir was underway, and Gandhi had recently fasted to pressure India into releasing funds owed to Pakistan.",
};

// REAL_TIMELINE — the true sequence of events, the bright continuous "Sacred
// Timeline" spine. Events run chronologically; the user asks a "what if" on any
// of them and an alternate branch tendrils off. These are REAL (kind: "real"),
// confidence 1, establish no alternate facts. The first entry MUST keep id
// "root" (the tree is rooted there). The "Gandhi survives" divergence lives on
// the assassination node — it carries the starter question.
export const REAL_TIMELINE = [
  {
    id: "root",
    year: "15 Aug 1947",
    branchName: "The Partition",
    description:
      "British India is divided into the dominions of India and Pakistan. Independence arrives alongside one of history's largest mass migrations and catastrophic communal violence across Punjab and Bengal.",
  },
  {
    id: "kashmir-war",
    year: "Oct 1947",
    branchName: "War in Kashmir",
    description:
      "Tribal fighters from Pakistan invade Kashmir; its Maharaja accedes to India, and the first India–Pakistan war begins over the contested princely state.",
  },
  {
    id: "last-fast",
    year: "13 Jan 1948",
    branchName: "Gandhi's Last Fast",
    description:
      "Gandhi begins a fast unto death in Delhi to halt communal killings and to press India into releasing the cash balances owed to Pakistan. The fast stirs the nation and briefly quiets the violence.",
  },
  {
    id: "assassination",
    year: "30 Jan 1948",
    branchName: "The Assassination",
    description:
      "At Birla House, New Delhi, Nathuram Godse fires three shots at point-blank range. Mohandas Karamchand Gandhi, 78, dies within minutes. Nehru tells the nation over All India Radio: \"the light has gone out of our lives.\"",
    starter: "What if Godse's bullet missed and Gandhi survived?",
  },
  {
    id: "rss-ban",
    year: "Feb 1948",
    branchName: "The Crackdown",
    description:
      "Godse and his co-conspirators are arrested and the RSS is banned. The shock of the killing discredits Hindu-nationalist extremism and rallies the country behind Nehru's secular vision of India.",
  },
  {
    id: "integration",
    year: "1948–49",
    branchName: "One Union",
    description:
      "Sardar Vallabhbhai Patel completes the integration of the princely states into the Indian Union, including the police action in Hyderabad. The fragile new nation is consolidated.",
  },
  {
    id: "godse-executed",
    year: "15 Nov 1949",
    branchName: "Justice Done",
    description:
      "Nathuram Godse and Narayan Apte are executed at Ambala Jail. Gandhi's sons had appealed for clemency, opposing the death penalty in keeping with his philosophy, but the appeal was rejected.",
  },
  {
    id: "republic",
    year: "26 Jan 1950",
    branchName: "The Republic",
    description:
      "India adopts its Constitution and becomes a sovereign republic, with Rajendra Prasad as its first President. The secular, democratic framework Gandhi and Nehru envisioned is enshrined in law.",
  },
  {
    id: "first-elections",
    year: "1951–52",
    branchName: "The People Vote",
    description:
      "India holds its first general elections — at the time the largest exercise of universal adult franchise the world had ever seen. Nehru's Congress wins decisively.",
  },
  {
    id: "states-reorg",
    year: "1956",
    branchName: "States Reborn",
    description:
      "The States Reorganisation Act redraws India's internal map along linguistic lines, reshaping the federation and easing regional tensions.",
  },
  {
    id: "nehru-death",
    year: "27 May 1964",
    branchName: "End of an Era",
    description:
      "Jawaharlal Nehru dies in office after 17 years as India's first Prime Minister, closing the founding chapter of the republic.",
  },
];
