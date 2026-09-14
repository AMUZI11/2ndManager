/**
 * scratch/test_anomalies_api.cjs
 * Reproduce and verify fix for TypeError: anomalies.some is not a function
 */

const assert = require('assert');

// 1. Simulate the exact API parsing bug that caused anomalies.some is not a function
function buggyParseResponse(res) {
  return res?.data?.data || [];
}

function fixedParseResponse(res) {
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.anomalies)) return payload.anomalies;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

// Simulating backend response from successResponse({ anomalies: [{ id: '1', is_read: false }], unread_count: 1 })
const mockBackendResponse = {
  ok: true,
  status: 200,
  data: {
    success: true,
    data: {
      anomalies: [
        { id: '1', event_type: 'HEM', severity: 'WARNING', is_read: false, is_read_by_owner: false }
      ],
      unread_count: 1
    }
  }
};

console.log('--- REPRODUCING BUG ---');
const buggyData = buggyParseResponse(mockBackendResponse);
console.log('buggyData type:', typeof buggyData, 'isArray:', Array.isArray(buggyData));

let errorCaught = false;
try {
  // This was failing in SecurityForensicDrawer.jsx:191:26
  buggyData.some(a => !a.is_read);
} catch (err) {
  errorCaught = true;
  console.log('✅ Successfully reproduced error:', err.message);
  assert(err instanceof TypeError, 'Expected TypeError');
  assert(err.message.includes('.some is not a function'), 'Expected .some is not a function');
}
assert(errorCaught, 'Should throw TypeError in buggy version');

console.log('\n--- TESTING FIXED VERSION ---');
const fixedData = fixedParseResponse(mockBackendResponse);
console.log('fixedData type:', typeof fixedData, 'isArray:', Array.isArray(fixedData));
assert(Array.isArray(fixedData), 'fixedData must be an Array');
assert.strictEqual(fixedData.length, 1);
assert.strictEqual(fixedData.some(a => !a.is_read), true, 'some() must work');

// Also test defensive empty / error responses
const mockErrorResponse = { ok: false, status: 500, data: { message: 'Server error' } };
const fixedErrorData = fixedParseResponse(mockErrorResponse);
assert(Array.isArray(fixedErrorData), 'Must fallback to empty array on error response');
assert.strictEqual(fixedErrorData.length, 0);
assert.strictEqual(fixedErrorData.some(a => !a.is_read), false);

console.log('\n🎉 TEST PASSED! The root cause and fix logic are 100% verified.');
