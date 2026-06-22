import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const MOBILE_CHROME_BUDGET_PX = 96;

function readMaxHeight(cssPath, className, media = "@media (max-width: 640px)") {
  const css = readFileSync(cssPath, "utf8");
  const mediaIndex = css.indexOf(media);
  assert.notEqual(mediaIndex, -1, `${cssPath} missing mobile media query`);

  const scoped = css.slice(mediaIndex);
  const blockStart = scoped.indexOf(`.${className}`);
  assert.notEqual(blockStart, -1, `${cssPath} missing .${className} mobile rule`);

  const block = scoped.slice(blockStart, scoped.indexOf("}", blockStart));
  const match = block.match(/max-height:\s*(\d+)px/);
  assert.ok(match, `${cssPath} .${className} must declare max-height in px`);
  return Number(match[1]);
}

function main() {
  const stripMax = readMaxHeight("src/components/ActivityStrip.module.css", "strip");
  const hubMax = readMaxHeight("src/components/MobileQuestHub.module.css", "collapsedBar");

  assert.equal(stripMax, 48, "ActivityStrip mobile max-height should be 48px");
  assert.equal(hubMax, 48, "Quest Hub collapsed bar mobile max-height should be 48px");
  assert.ok(
    stripMax + hubMax <= MOBILE_CHROME_BUDGET_PX,
    `combined mobile chrome ${stripMax + hubMax}px exceeds ${MOBILE_CHROME_BUDGET_PX}px budget`,
  );

  console.log(`mobile quest chrome height check passed (${stripMax + hubMax}px ≤ ${MOBILE_CHROME_BUDGET_PX}px).`);
}

main();
