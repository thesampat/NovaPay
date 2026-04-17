import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
    vus: 10,
    duration: '1s',
};

export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'idempotency-key': uuidv4(), // Generate unique key for each iteration
        },
    };

    const body = JSON.stringify({
        sender: 1,
        paylist: [
            { receiver: 2, amount: 10 },
            { receiver: 3, amount: 20 },
            { receiver: 4, amount: 30 },
        ],
    });

    const res = http.post('http://localhost:3000/payroll/process', body, params);

    check(res, {
        'status is 201': (r) => r.status === 201 || r.status === 200,
    });

    sleep(0.5);
}