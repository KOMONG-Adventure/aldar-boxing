import test from "node:test";
import assert from "node:assert/strict";
import { monthlyDueDate, studentPaymentState } from "../src/lib/billing.ts";

test("fixed monthly due days handle year rollover and short months", () => {
  assert.equal(monthlyDueDate("2026-12-20", 20, 1), "2027-01-20");
  assert.equal(monthlyDueDate("2027-01-19", 31, 1), "2027-02-28");
  assert.equal(monthlyDueDate("2028-01-19", 29, 1), "2028-02-29");
  assert.equal(monthlyDueDate("2026-11-05", 20, 3), "2027-02-20");
});

test("expiry remains valid through today and the five-day boundary is inclusive", () => {
  const check = expireDate => studentPaymentState({ status: "PAID", expireDate }, "2026-11-17");
  assert.deepEqual(check("2026-11-16"), { kind: "expired", daysLeft: -1 });
  assert.deepEqual(check("2026-11-17"), { kind: "expiring", daysLeft: 0 });
  assert.deepEqual(check("2026-11-22"), { kind: "expiring", daysLeft: 5 });
  assert.deepEqual(check("2026-11-23"), { kind: "active", daysLeft: 6 });
});

test("unpaid students and legacy empty or invalid dates need attention", () => {
  for (const expireDate of ["", "invalid", "2026-02-30"]) {
    assert.equal(studentPaymentState({ status: "PAID", expireDate }, "2026-11-17").kind, "unpaid");
  }
  assert.equal(studentPaymentState({ status: "UNPAID", expireDate: "2027-01-01" }, "2026-11-17").kind, "unpaid");
});
