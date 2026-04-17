import http from 'k6/http';
import { check, sleep } from 'k6';
import execution from 'k6/execution';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  vus: 10,
  iterations: 10,
};

export default function () {
  const url = 'http://localhost:3000/payroll/process';

  const vuIndex = (execution.vu ? execution.vu.idInTest : 1) - 1;
  const startId = 2 + (vuIndex * 2000);

  const paylist = [];
  for (let i = 0; i < 2000; i++) {
    const receiverId = startId + i;
    if (receiverId > 20000) break; // Safety fence
    
    paylist.push({
      receiver: receiverId,
      amount: Math.floor(Math.random() * 50) + 1,
    });
  }

  const payload = JSON.stringify({
    sender: 1,
    paylist: paylist,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': `massive_unique_batch_${uuidv4()}`,
    },
    timeout: '180s',
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 201': (r) => r.status === 201,
    'has batchId': (r) => r.json().batchId !== undefined,
  });

  console.log(`VU ${execution.vu.idInTest}: Group starting at ID ${startId} queued successfully.`);
}
