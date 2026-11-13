import test from "node:test";
import assert from "node:assert/strict";
import { validateSessionDraft, slotsOnDate, scheduleSummary } from "../src/lib/schedules.ts";

const draft = {
  title: "Test class", coach: "Test", capacity: 2, scheduleType: "recurring",
  startDate: "2026-11-16", endDate: "2026-11-20", enrolledMemberIds: [],
  timeSlots: [
    { dayOfWeek: 1, startTime: "16:00", endTime: "18:00" },
    { dayOfWeek: 2, startTime: "16:00", endTime: "18:00" },
    { dayOfWeek: 3, startTime: "11:00", endTime: "13:00" },
    { dayOfWeek: 5, startTime: "11:00", endTime: "13:00" },
  ],
};
const session = () => ({ id: "s_test", time: "", ...validateSessionDraft(draft) });

test("one class uses 16-18 Monday/Tuesday and 11-13 Wednesday/Friday", () => {
  const item = session();
  assert.equal(slotsOnDate(item,"2026-11-16")[0].startTime,"16:00");
  assert.equal(slotsOnDate(item,"2026-11-17")[0].endTime,"18:00");
  assert.equal(slotsOnDate(item,"2026-11-18")[0].startTime,"11:00");
  assert.equal(slotsOnDate(item,"2026-11-20")[0].endTime,"13:00");
  assert.equal(scheduleSummary(item.timeSlots).length,2);
});

test("date range is inclusive and unselected weekdays have no class", () => {
  for (const date of ["2026-11-15","2026-11-19","2026-11-21","2026-11-23","2026-02-30",""]) {
    assert.deepEqual(slotsOnDate(session(),date),[]);
  }
});

test("overlap is rejected while adjacent slots on one day are allowed", () => {
  assert.throws(()=>validateSessionDraft({...draft,timeSlots:[draft.timeSlots[0],{dayOfWeek:1,startTime:"17:00",endTime:"19:00"}]}));
  assert.equal(validateSessionDraft({...draft,timeSlots:[draft.timeSlots[0],{dayOfWeek:1,startTime:"18:00",endTime:"19:00"}]}).timeSlots.length,2);
  assert.throws(()=>validateSessionDraft({...draft,timeSlots:[{dayOfWeek:1,startTime:"18:00",endTime:"16:00"}]}));
});

test("single-day sessions only appear on the exact date", () => {
  const single = {id:"single",time:"",...validateSessionDraft({...draft,scheduleType:"single",specificDate:"2026-11-18",timeSlots:[draft.timeSlots[2]]})};
  assert.equal(slotsOnDate(single,"2026-11-18").length,1);
  assert.deepEqual(slotsOnDate(single,"2026-11-25"),[]);
  assert.throws(()=>validateSessionDraft({...draft,scheduleType:"single",specificDate:"2026-11-18",timeSlots:[draft.timeSlots[0]]}));
});

test("legacy weekday inputs remain supported and invalid dates/capacity fail", () => {
  const legacy = {...draft,timeSlots:undefined,selectedDays:[1,2],startTime:"16:00",endTime:"18:00"};
  assert.equal(validateSessionDraft(legacy).timeSlots.length,2);
  assert.throws(()=>validateSessionDraft({...draft,endDate:"2026-11-01"}));
  assert.throws(()=>validateSessionDraft({...draft,startDate:"2026-02-30"}));
  assert.throws(()=>validateSessionDraft({...draft,capacity:1,enrolledMemberIds:["one","two"]}));
});
