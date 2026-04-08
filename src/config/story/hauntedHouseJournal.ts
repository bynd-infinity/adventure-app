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
    text: "The arch is dry except for one strip of frost. No window is open. The cold comes from the frame itself.",
    unlockFlag: "searched_doorway",
  },
  {
    id: "letter_fragment_1",
    title: "Burned Letter Fragment",
    text: "A burned scrap was packed into the mortar. The hand is formal, the ink rushed, as if the writer heard footsteps.",
    unlockFlag: "found_letter_fragment",
  },
  {
    id: "house_sigil_name",
    title: "The Name Behind Your Eyes",
    text: "The marks in the molding match the fragment. Taken together they form a name. The owner signed this place repeatedly.",
    unlockFlag: "read_house_sigil",
  },
  {
    id: "boss_antechamber_warning",
    title: "Chains at the Heart",
    text: "The altar room is prepared, not abandoned. Chains, marks, and spacing all suggest a planned confrontation.",
    unlockFlag: "journal_boss_warning",
  },
  {
    id: "registry_entries_staged",
    title: "Staged Registry",
    text: "Recent signatures were copied from older entries. The guest list is being manufactured.",
    unlockFlag: "registry_names_staged",
  },
  {
    id: "party_names_prelisted",
    title: "Names Already Listed",
    text: "A service route board lists your party in order. This run was expected before you arrived.",
    unlockFlag: "twist_party_listed",
  },
];
