import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collapseName,
  isValidWorkspaceId,
  normalizeInviteCode,
  slugify,
  validateLabelColor,
  validateLabelName,
  validatePassword,
  validateUsername,
  validateWorkspaceName,
} from "../../app/modules/membership/validation";

const nameRange = /2 to 60/;
const userRange = /2 to 24/;
const passwordRange = /8 to 128/;
const labelRange = /2 to 30/;
const labelColors = /label colors/;

describe("membership validation", () => {
  it("collapses extra whitespace so signup and login agree", () => {
    assert.equal(collapseName("  ada   lovelace  "), "ada lovelace");
  });

  it("accepts invite codes with or without dashes and spaces", () => {
    assert.equal(normalizeInviteCode("stu-4f8k2"), "STU4F8K2");
    assert.equal(normalizeInviteCode("STU 4F8K2"), "STU4F8K2");
    assert.equal(normalizeInviteCode("stu4f8k2"), "STU4F8K2");
  });

  it("builds URL-safe slugs with a fallback", () => {
    assert.equal(slugify("War Room!", "lockin"), "war-room");
    assert.equal(slugify("!!!", "lockin"), "lockin");
  });

  it("rejects short workspace names", () => {
    assert.throws(() => validateWorkspaceName("a"), nameRange);
    assert.equal(validateWorkspaceName("  The studio "), "The studio");
  });

  it("rejects bad usernames", () => {
    assert.throws(() => validateUsername("x"), userRange);
    assert.throws(() => validateUsername("no*stars"), userRange);
    assert.equal(validateUsername("Ada Lovelace"), "Ada Lovelace");
  });

  it("bounds passwords on both ends", () => {
    assert.throws(() => validatePassword("short"), passwordRange);
    assert.throws(() => validatePassword("x".repeat(129)), passwordRange);
    assert.equal(validatePassword("signal-strong-1"), "signal-strong-1");
  });

  it("spots malformed workspace ids for cookie names", () => {
    assert.equal(isValidWorkspaceId("war-room"), true);
    assert.equal(isValidWorkspaceId("a;b=c"), false);
    assert.equal(isValidWorkspaceId(""), false);
  });

  it("bounds label names and colors", () => {
    assert.throws(() => validateLabelName("x"), labelRange);
    assert.equal(validateLabelName("  Launch stuff "), "Launch stuff");
    assert.throws(() => validateLabelColor("neon"), labelColors);
    assert.equal(validateLabelColor("green"), "green");
  });
});

describe("public origin", () => {
  it("uses forwarded proto and host behind a proxy", async () => {
    process.env.DATABASE_URL ??= "postgresql://lockin:test@localhost:1/lockin";
    const { publicOrigin } =
      await import("../../app/modules/membership/auth.server");
    assert.equal(
      publicOrigin(new Request("http://127.0.0.1:3001/w/abc")),
      "http://127.0.0.1:3001",
    );
    assert.equal(
      publicOrigin(
        new Request("http://127.0.0.1:3001/w/abc", {
          headers: {
            "x-forwarded-proto": "https",
            "x-forwarded-host": "everyonelockin.com",
          },
        }),
      ),
      "https://everyonelockin.com",
    );
  });
});
