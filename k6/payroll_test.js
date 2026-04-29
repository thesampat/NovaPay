import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
    vus: 100,
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


// docker exec novapay-mongodb-1 mongosh --quiet --eval '
// var db = db.getSiblingDB("ledger");
// var last = db.ledgers.find().sort({_id: -1}).limit(1).toArray()[0];
// if(last) {
//   var parts = last.transaction_id.split("_");
//   parts.pop(); 
//   var prefix = parts.join("_");
  
//   var firstInBatch = db.ledgers.find({ transaction_id: { $regex: "^" + prefix } }).sort({_id: 1}).limit(1).toArray()[0];
//   var lastInBatch = db.ledgers.find({ transaction_id: { $regex: "^" + prefix } }).sort({_id: -1}).limit(1).toArray()[0];
  
//   print("Batch ID: " + prefix);
//   print("First Entry: " + firstInBatch._id.getTimestamp());
//   print("Last Entry: " + lastInBatch._id.getTimestamp());
//   print("Total Processing Time: " + (lastInBatch._id.getTimestamp() - firstInBatch._id.getTimestamp()) / 1000 + " seconds");
  
//   var count = db.ledgers.countDocuments({ transaction_id: { $regex: "^" + prefix } });
//   var txnCount = count / 6; 
//   print("Estimated Transactions: " + txnCount);
//   print("Throughput: " + (txnCount / ((lastInBatch._id.getTimestamp() - firstInBatch._id.getTimestamp()) / 1000)).toFixed(2) + " TPS");
// } else {
//   print("No entries found");
// }
// '