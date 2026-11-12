import test from 'node:test';
import assert from 'node:assert/strict';
import { toStudentRow, fromStudentRow } from '../src/lib/student-fields.ts';

const member = {
  id: 'm_test', name: 'Тест', lastName: 'Бат', phone: '80000000',
  gender: 'Эрэгтэй', level: 'Beginner', joinedDate: '2026-11-12',
  createdAt: '2026-11-12', status: 'UNPAID', paymentDate: '', expireDate: '',
  guardians: [{ name: 'Ээж', phone: '80000001', relation: 'Ээж' }],
  avatarUrl: 'data:image/jpeg;base64,not-for-database',
  attendancesCount: 12, fights: [{ id: 'f1' }], paymentHistory: [{ id: 'p1' }],
  assignedSessionIds: ['s1'],
};

test('registration mapping preserves Cyrillic and guardians, stores a bucket path only', () => {
  const row = toStudentRow(member, 'm_test/photo.jpg');
  assert.equal(row.name, 'Тест');
  assert.equal(row.last_name, 'Бат');
  assert.deepEqual(row.guardians, member.guardians);
  assert.equal(row.avatar_path, 'm_test/photo.jpg');
  for (const key of ['avatarUrl', 'paymentHistory', 'fights', 'attendancesCount', 'assignedSessionIds']) {
    assert.equal(key in row, false);
  }
  assert.equal(JSON.stringify(row).includes('base64'), false);
});

test('cloud profile uses a signed image URL and never restores local operational data', () => {
  const row = toStudentRow({ ...member, name: 'Шинэ нэр', status: 'PAID' }, 'm_test/photo.jpg');
  const result = fromStudentRow(row, 'https://example.test/signed-photo');
  assert.equal(result.name, 'Шинэ нэр');
  assert.equal(result.status, 'PAID');
  assert.equal(result.attendancesCount, 0);
  assert.deepEqual(result.paymentHistory, []);
  assert.deepEqual(result.assignedSessionIds, []);
  assert.equal(result.avatarUrl, 'https://example.test/signed-photo');
});

test('a cloud-only student has safe defaults for local operational data', () => {
  const result = fromStudentRow(toStudentRow(member, null));
  assert.equal(result.attendancesCount, 0);
  assert.deepEqual(result.paymentHistory, []);
  assert.deepEqual(result.assignedSessionIds, []);
  assert.equal(result.avatarUrl, '');
});
