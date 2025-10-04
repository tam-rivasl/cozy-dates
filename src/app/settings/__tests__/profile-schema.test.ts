import test from "node:test";
import assert from "node:assert/strict";

import { profileSchema } from "../profile-schema";

test("profileSchema acepta payloads válidos", () => {
  const result = profileSchema.safeParse({
    displayName: "Ana Carolina",
    theme: "blossom",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.displayName, "Ana Carolina");
    assert.equal(result.data.theme, "blossom");
  }
});

test("profileSchema normaliza espacios al validar", () => {
  const result = profileSchema.safeParse({
    displayName: "   Diego   ",
    theme: "default",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.displayName, "Diego");
  }
});

test("profileSchema rechaza nombres vacíos", () => {
  const result = profileSchema.safeParse({
    displayName: "   ",
    theme: "dark",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.message.includes("nombre")));
  }
});

