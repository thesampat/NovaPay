import http from 'k6/http';
import { check, sleep } from 'k6';

// No load testing initially - just a single run
export const options = {
  vus: 1, // 1 virtual user
  iterations: 1, // run exact 1 time
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  console.log('--- Starting Simple APi Test ---');

  // 1. Create Sender User
  let res = http.post(`${BASE_URL}/user`, JSON.stringify({
    account_id: 2001,
    name: "Alice Sender",
    currency: "USD",
    balance: 5000
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    '[User] Create Sender returns 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // 2. Create Receiver User
  res = http.post(`${BASE_URL}/user`, JSON.stringify({
    account_id: 2002,
    name: "Bob Receiver",
    currency: "EUR",
    balance: 1000
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    '[User] Create Receiver returns 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // 3. Check Balance
  res = http.get(`${BASE_URL}/wallet/balance?userId=2001`);
  check(res, {
    '[Balance] Fetch balance returns 200': (r) => r.status === 200,
  });

  // 4. Send Payment (Transaction)
  res = http.post(`${BASE_URL}/pay`, JSON.stringify({
    sender: 2001,
    receiver: 2002,
    amount: 100,
    transactionId: "simple-test-tx-" + Date.now()
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    '[Pay] Payment returns 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // 5. Run Payroll
  res = http.post(`${BASE_URL}/payroll/process`, JSON.stringify({
    sender: 2001,
    transactionId: "simple-test-batch-" + Date.now(),
    paylist: [
      { receiver: 2002, amount: 200 }
    ]
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    '[Payroll] Process returns 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  console.log('--- Finished Simple APi Test ---');
  sleep(1);
}
