import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bossOutcomeCardFromFlags,
  bossOutcomeTierFromFlags,
} from "./bossOutcome";

describe("bossOutcomeTierFromFlags", () => {
  it("prefers successor over severed triple and seal", () => {
    assert.equal(
      bossOutcomeTierFromFlags({
        ending_successor: true,
        read_house_sigil: true,
        registry_names_staged: true,
        twist_party_listed: true,
        boss_seal_path: true,
      }),
      "successor",
    );
  });

  it("prefers severed triple over seal when successor is absent", () => {
    assert.equal(
      bossOutcomeTierFromFlags({
        read_house_sigil: true,
        registry_names_staged: true,
        twist_party_listed: true,
        boss_seal_path: true,
      }),
      "severed_true_read",
    );
  });

  it("reports bound bargain only when higher tiers are absent", () => {
    assert.equal(
      bossOutcomeTierFromFlags({
        boss_seal_path: true,
      }),
      "bound_bargain",
    );
  });

  it("defaults when no ending flags", () => {
    assert.equal(bossOutcomeTierFromFlags({}), "default_complete");
  });
});

describe("bossOutcomeCardFromFlags", () => {
  it("successor: broken oath uses family-line message", () => {
    const card = bossOutcomeCardFromFlags({
      ending_successor: true,
      hook_broken_oath: true,
    });
    assert.equal(card.title, "Successor");
    assert.match(card.message, /family line/i);
    assert.equal(card.next, "run_complete");
  });

  it("successor: non-oath uses generic inherit message", () => {
    const card = bossOutcomeCardFromFlags({
      ending_successor: true,
      hook_debt_collector: true,
    });
    assert.equal(card.title, "Successor");
    assert.match(card.message, /inherit the house/i);
  });

  it("severed triple: fixed title and message", () => {
    const card = bossOutcomeCardFromFlags({
      read_house_sigil: true,
      registry_names_staged: true,
      twist_party_listed: true,
    });
    assert.equal(card.title, "Severed");
    assert.match(card.message, /true name/i);
  });

  it("seal path: debt hook gets collector copy", () => {
    const card = bossOutcomeCardFromFlags({
      boss_seal_path: true,
      hook_debt_collector: true,
    });
    assert.equal(card.title, "Bound Bargain");
    assert.match(card.message, /claim/i);
  });

  it("seal path: missing hook uses bargain follow-up copy", () => {
    const card = bossOutcomeCardFromFlags({
      boss_seal_path: true,
    });
    assert.equal(card.title, "Bound Bargain");
    assert.match(card.message, /final bargain/i);
  });

  it("default ending copy", () => {
    const card = bossOutcomeCardFromFlags({});
    assert.equal(card.title, "Run Complete");
    assert.match(card.message, /binding is broken/i);
  });
});
