import { strict as assert } from "node:assert";
import {
  evaluateQuestBonusEligibility,
  resolveQuestBonusGrant,
} from "../src/lib/server/questBonus";

function badges(...kinds: string[]) {
  return new Set(kinds);
}

function main() {
  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges("quest_master"),
      dailySettlementsToday: 0,
      hasCoachingNoteToday: false,
      hasQuestStarBonusToday: false,
      reason: "quest_star",
    }),
    true,
  );

  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges(),
      dailySettlementsToday: 0,
      hasCoachingNoteToday: false,
      hasQuestStarBonusToday: false,
      reason: "quest_star",
    }),
    false,
  );

  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges("quest_master"),
      dailySettlementsToday: 0,
      hasCoachingNoteToday: false,
      hasQuestStarBonusToday: true,
      reason: "quest_master",
    }),
    true,
  );

  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges("quest_master"),
      dailySettlementsToday: 0,
      hasCoachingNoteToday: false,
      hasQuestStarBonusToday: false,
      reason: "quest_master",
    }),
    false,
  );

  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges("grinder"),
      dailySettlementsToday: 0,
      hasCoachingNoteToday: true,
      hasQuestStarBonusToday: false,
      reason: "quest_core",
    }),
    true,
  );

  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges(),
      dailySettlementsToday: 1,
      hasCoachingNoteToday: true,
      hasQuestStarBonusToday: false,
      reason: "quest_core",
    }),
    true,
  );

  assert.equal(
    evaluateQuestBonusEligibility({
      badgeKinds: badges("grinder"),
      dailySettlementsToday: 0,
      hasCoachingNoteToday: false,
      hasQuestStarBonusToday: false,
      reason: "quest_core",
    }),
    false,
  );

  assert.deepEqual(resolveQuestBonusGrant({ id: "ledger_1" }, true), { conflict: true });
  assert.deepEqual(resolveQuestBonusGrant(null, false), { conflict: false, ineligible: true });
  assert.deepEqual(resolveQuestBonusGrant(null, true), { conflict: false, grant: true });

  console.log("quest bonus smoke tests passed.");
}

main();
