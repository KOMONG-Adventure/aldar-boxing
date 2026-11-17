import test from "node:test";
import assert from "node:assert/strict";
import { studentPaymentState } from "../src/lib/billing.ts";

test("expiry remains valid through today and the seven-day boundary is inclusive", () => {
  const check = expireDate => studentPaymentState({ status: "PAID", expireDate }, "2026-11-17");
  assert.deepEqual(check("2026-11-16"), { kind: "expired", daysLeft: -1 });
  assert.deepEqual(check("2026-11-17"), { kind: "expiring", daysLeft: 0 });
  assert.deepEqual(check("2026-11-24"), { kind: "expiring", daysLeft: 7 });
  assert.deepEqual(check("2026-11-25"), { kind: "active", daysLeft: 8 });
});

test("unpaid students and legacy empty or invalid dates need attention", () => {
  for (const expireDate of ["", "invalid", "2026-02-30"]) {
    assert.equal(studentPaymentState({ status: "PAID", expireDate }, "2026-11-17").kind, "unpaid");
  }
  assert.equal(studentPaymentState({ status: "UNPAID", expireDate: "2027-01-01" }, "2026-11-17").kind, "unpaid");
});
