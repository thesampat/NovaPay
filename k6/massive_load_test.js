import http from 'k6/http';
import { check, sleep } from 'k6';
import execution from 'k6/execution';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';


export const options = {
  vus: 1,
  iterations: 1,
};

const payload = open('./transaction_payload.json');

export default function () {
  const url = 'http://localhost:3000/payroll/process';


  const params = {
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': uuidv4(),
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 201': (r) => r.status === 201,
  });
}
