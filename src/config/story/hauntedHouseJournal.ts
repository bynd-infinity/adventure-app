export type HauntedHouseJournalEntry = {
  id: string;
  title: string;
  text: string;
  /** Entry appears when this flag is true in runtime `storyFlags`. */
  unlockFlag: string;
};

/**
 * Discovered notes for the haunted house run (unlocked by story flags only).
 */
export const HAUNTED_HOUSE_JOURNAL_ENTRIES: HauntedHouseJournalEntry[] = [
  {
    id: "doorway_cold_search",
    title: "Cold Doorway",
    text: "You swept the arch with your hands. Frost clings where no draft should be—the frame remembers every foot that passed.",
    unlockFlag: "searched_doorway",
  },
  {
    id: "letter_fragment_1",
    title: "Burned Letter Fragment",
    text: "The handwriting trembles across charred paper. Half a sentence begs you to look away; the other half dares you to read on.",
    unlockFlag: "found_letter_fragment",
  },
  {
    id: "house_sigil_name",
    title: "The Name Behind Your Eyes",
    text: "The letters you saw do not match any tongue you know, yet your pulse answers them. Whatever owns this house signed its work.",
    unlockFlag: "read_house_sigil",
  },
  {
    id: "boss_antechamber_warning",
    title: "Chains at the Heart",
    text: "The path to the altar did not open by luck. Whatever waits there has been counting your steps since the foyer.",
    unlockFlag: "journal_boss_warning",
  },
];
