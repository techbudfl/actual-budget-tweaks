import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { SourceTextModule } from "node:vm";

const source = await readFile(
	new URL("../src/features/workflows/transaction-flags/data.ts", import.meta.url),
	"utf8",
);
const module = new SourceTextModule(stripTypeScriptTypes(source));
await module.link(() => {
	throw new Error("data.ts should have no runtime imports");
});
await module.evaluate();
const { asFlag, clickedFlag, flagOf, withFlag } = module.namespace;

test("a flag is read from the notes, and other emoji tags aren't flags", () => {
	assert.equal(flagOf("Groceries #🚩"), "🚩");
	assert.equal(flagOf("#🔵 refund pending"), "🔵");
	assert.equal(flagOf("#⭐️"), "⭐");
	assert.equal(flagOf("trip #vacation #🟢"), "🟢");
	assert.equal(flagOf("#vacation#🟢"), null);
	assert.equal(flagOf("#🍕 lunch"), null);
	assert.equal(flagOf("no#🚩"), null);
	assert.equal(flagOf("#🚩🚩"), null);
	assert.equal(flagOf(""), null);
	assert.equal(flagOf(null), null);
});

test("flagging appends the tag, and replaces a flag already there", () => {
	assert.equal(withFlag("Groceries", "🚩"), "Groceries #🚩");
	assert.equal(withFlag(null, "🚩"), "#🚩");
	assert.equal(withFlag("", "🚩"), "#🚩");
	assert.equal(withFlag("Groceries #🚩", "🔵"), "Groceries #🔵");
	assert.equal(withFlag("#🟠 Groceries #🚩", "🔵"), "Groceries #🔵");
});

test("unflagging removes only the flag, leaving the rest of the notes as they were", () => {
	assert.equal(withFlag("Groceries #🚩", null), "Groceries");
	assert.equal(withFlag("#🚩 Groceries", null), "Groceries");
	assert.equal(withFlag("Groceries #🚩 and  more", null), "Groceries and  more");
	assert.equal(withFlag("trip #vacation #🚩", null), "trip #vacation");
	assert.equal(withFlag("#🚩", null), null);
	assert.equal(withFlag("Lunch #🍕", null), "Lunch #🍕");
	assert.equal(withFlag("  spaced  ", null), "  spaced  ");
	assert.equal(withFlag(null, null), null);
});

test("a click toggles: off when flagged, the last flag used when not", () => {
	assert.equal(clickedFlag("🔵", "🚩"), null);
	assert.equal(clickedFlag(null, "🔵"), "🔵");
});

test("only the known flags are read from storage or tag text", () => {
	assert.equal(asFlag("🟣"), "🟣");
	assert.equal(asFlag("#🟣"), "🟣");
	assert.equal(asFlag("🍕"), null);
	assert.equal(asFlag(undefined), null);
	assert.equal(asFlag(7), null);
});

test("the filter's chip names round-trip, and other names aren't ABT's", () => {
	const { filterName, filterOf } = module.namespace;
	assert.equal(filterName(null), "Flagged");
	assert.equal(filterName("🔵"), "Flagged 🔵");
	assert.equal(filterOf("Flagged"), "any");
	assert.equal(filterOf("Flagged 🔵"), "🔵");
	assert.equal(filterOf("Flagged 🍕"), null);
	assert.equal(filterOf("Selected transactions"), null);
	assert.equal(filterOf(undefined), null);
});

test("the filter's query matches the flag's tag in the notes, as Actual's REGEXP runs it", () => {
	const { flagQuery } = module.namespace;
	const matches = (flag, notes) => new RegExp(flagQuery(flag).notes.$regexp).test(notes);
	assert.equal(matches("🔵", "Refund #🔵"), true);
	assert.equal(matches("🔵", "#🔵 refund"), true);
	assert.equal(matches("🔵", "#🔵️"), true);
	assert.equal(matches("🔵", "Refund #🚩"), false);
	assert.equal(matches("🔵", "Gas #car"), false);
	assert.equal(matches("🔵", "##🔵"), false);
	assert.equal(matches("🔵", "#🔵🔵"), false);
	assert.equal(matches(null, "Groceries #🟢"), true);
	assert.equal(matches(null, "trip #car #❓"), true);
	assert.equal(matches(null, "Gas #car"), false);
	assert.equal(matches(null, "Lunch #🍕"), false);
});
