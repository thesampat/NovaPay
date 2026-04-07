import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  console.log('--- Starting Huge Payroll API Test ---');

  const senderId = 3000;
  const numEmployees = 100;
  const payAmount = 10;
  const initialSenderBalance = 100000;

  // 1. Create Sender User
  let res = http.post(`${BASE_URL}/user`, JSON.stringify({
    account_id: senderId,
    name: "Employer Corp",
    currency: "USD",
    balance: initialSenderBalance
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    '[User] Create Sender returns 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // 2. Create Receiver Users and build paylist
  let paylist = [];
  for (let i = 1; i <= numEmployees; i++) {
    const receiverId = 3000 + i;
    res = http.post(`${BASE_URL}/user`, JSON.stringify({
      account_id: receiverId,
      name: `Employee ${i}`,
      currency: "USD",
      balance: 100
    }), { headers: { 'Content-Type': 'application/json' } });

    if (res.status !== 200 && res.status !== 201) {
      console.log(`Failed to create employee ${i}: ${res.status}`);
    }

    paylist.push({ receiver: receiverId, amount: payAmount });
  }

  console.log(`Created ${numEmployees} employees. Sending payroll request...`);

  // 3. Process Payroll
  res = http.post(`${BASE_URL}/payroll/process`, JSON.stringify({
    sender: senderId,
    transactionId: "huge-payroll-" + Date.now(),
    paylist: paylist
  }), { headers: { 'Content-Type': 'application/json' }, timeout: '120s' });

  check(res, {
    '[Payroll] Process returns 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // 4. Wait for async processing (BullMQ)
  console.log('Waiting 15 seconds for BullMQ to process the huge paylist...');
  sleep(15);

  // 5. Verify Balances
  // Check Sender Balance
  res = http.get(`${BASE_URL}/wallet/balance?userId=${senderId}`);
  check(res, {
    '[Balance] Fetch sender balance returns 200': (r) => r.status === 200,
  });
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    const expected = initialSenderBalance - (numEmployees * payAmount);
    if (body.balance === expected) {
      console.log(`Sender balance verified: ${body.balance}`);
    } else {
      console.log(`Sender balance MISMATCH. Expected ${expected}, got ${body.balance}`);
    }
  }

  // Check some receivers
  let allMatched = true;
  for (let i = 1; i <= numEmployees; i++) {
    const receiverId = 3000 + i;
    res = http.get(`${BASE_URL}/wallet/balance?userId=${receiverId}`);
    if (res.status === 200) {
      const body = JSON.parse(res.body);
      if (body.balance !== 100 + payAmount) {
        allMatched = false;
        console.log(`Receiver ${receiverId} balance MISMATCH. Expected ${100 + payAmount}, got ${body.balance}`);
      }
    } else {
      allMatched = false;
      console.log(`Failed to fetch receiver ${receiverId} balance.`);
    }
  }

  if (allMatched) {
    console.log(`All ${numEmployees} receiver balances verified successfully!`);
  } else {
    console.log(`Some receiver balances were incorrect.`);
  }

  console.log('--- Finished Huge Payroll API Test ---');
}
