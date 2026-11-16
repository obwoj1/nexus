import test from "node:test";
import assert from "node:assert/strict";
import { rankStudySources } from "../lib/study/search.js";

test("ranks matching sources and returns bounded excerpts with safe citation metadata", () => {
  const sourceText = `${"Unrelated lecture text. ".repeat(200)} Photosynthesis converts light energy to chemical energy in plants.`;
  const results = rankStudySources("How does photosynthesis convert light energy?", [
    { id: "1", title: "Lecture", source_name: "Notes", content: sourceText },
    { id: "2", title: "Other", source_name: "Notes", content: "Mitochondria produce ATP." },
  ]);
  assert.equal(results[0].id, "1");
  assert.ok(results[0].excerpt.includes("Photosynthesis"));
  assert.ok(results[0].excerpt.length <= 1800);
  assert.equal(results[0].sourceName, "Notes");
});

test("uses deterministic lexical fallback and ignores stopword-only queries", () => {
  const sources = [{ id: "a", title: "Linear algebra", source_name: "Class notes", content: "Eigenvectors represent stable directions under a linear transformation." }];
  assert.deepEqual(rankStudySources("why are eigenvectors stable", sources).map((item) => item.id), ["a"]);
  assert.deepEqual(rankStudySources("what is the", sources), []);
});
