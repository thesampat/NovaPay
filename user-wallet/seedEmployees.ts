import mongoose, { mongo } from "mongoose";
import { Queue, Worker } from "bullmq";
import IORedis from 'ioredis';



const connection = new IORedis({ maxRetriesPerRequest: null });


new Worker('foo', async job => {
    console.log(job.data, 'from worker 1')
}, { connection, concurrency: 3 })

new Worker('foo', async job => {
    console.log(job.data, 'from worker 2')
}, { connection })



const MyQueue = new Queue('foo', { connection })
const addJobs = async () => {
    await MyQueue.add('myJob1', { foo: 'bar' })
    await MyQueue.add('myJob2', { foo: 'baz' })
    await MyQueue.add('myJob3', { foo: 'bar' })
    await MyQueue.add('myJob4', { foo: 'baz' })
    await MyQueue.add('myJob5', { foo: 'bar' })
    await MyQueue.add('myJob6', { foo: 'bar' })
    await MyQueue.add('myJob7', { foo: 'baz' })
    await MyQueue.add('myJob8', { foo: 'bar' })
    await MyQueue.add('myJob9', { foo: 'baz' })
    await MyQueue.add('myJob`0', { foo: 'bar' })
}

addJobs()

const currencies = ['JPY', 'USD', 'EUR', 'PHP', 'JOD', 'IDR', 'CAD', 'BGN', 'SAR', 'INR'];


interface User {
    account_id: number,
    balance: number,
    currrency: string
}

const UserSchema = new mongoose.Schema({
    account_id: { type: Number, required: true },
    balance: { type: Number, required: true },
    currency: { type: String, required: true },
});

const UserModel = mongoose.model('users', UserSchema);

const generateEmployee = () => {
    return Array.from({ length: 1000 }, (_, i) => ({
        account_id: i,
        balance: i == 1 ? 100000 : 0,
        currency: currencies[Math.floor(Math.random() * currencies.length)]
    }));
};


async function seedEmployees() {
    await mongoose.connect('mongodb://localhost:27017/users');
    const users = generateEmployee();
    await UserModel.deleteMany({});
    await UserModel.insertMany(users);
    await mongoose.disconnect()

    console.log('users created')
}

async function updateEmployeerBalance() {
    await mongoose.connect('mongodb://localhost:27017/users');
    await UserModel.findOneAndUpdate({ account_id: 1 }, { $set: { balance: 1000000 } });
    await mongoose.disconnect()
}

// updateEmployeerBalance();

function randomFail() {
    if (Math.random() * 10 < 3) {
        throw new Error("Random network error");
    }
}

// async function transfer(sender_id: number, receiver_id: number, amount: number) {
//     const session = await mongoose.startSession();

//     try {
//         session.startTransaction();
//         let receiver_details = await UserModel.findOne({ account_id: receiver_id });

//         if (!receiver_details) {
//             console.log('user not found');
//             return;
//         }

//         await UserModel.updateOne({ account_id: sender_id, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { session })
//         randomFail()
//         await UserModel.updateOne({ account_id: receiver_id }, { $inc: { balance: amount } }, { session })
//         await session.commitTransaction()
//         console.log('money sent to ' + receiver_id, amount)

//     } catch (error) {
//         await session.abortTransaction()
//         console.log('error happend', error)
//     } finally {
//         await session.endSession();
//     }

// }

// let redislock = new Map<string, boolean>()
// async function transferInMemory(sender_id: number, receiver_id: number, amount: number) {
//     // while (redislock.get('processing')) {
//     //     await new Promise(res => setTimeout(res, 50))
//     // }

//     // redislock.set('processing', true)

//     const session = await mongoose.startSession();
//     try {
//         session.startTransaction();
//         let receiver_details = await UserModel.findOne({ account_id: receiver_id }).session(session);

//         if (!receiver_details) {
//             console.log('user not found');
//             return;
//         }

//         let sender_details = await UserModel.findOne({ account_id: sender_id }).session(session);
//         if (!sender_details || sender_details.balance < amount) {
//             console.log('not enough amount')
//             return
//         }

//         sender_details.balance -= amount;
//         receiver_details.balance += amount;

//         await UserModel.updateOne({ account_id: sender_id }, { $set: { balance: sender_details.balance } }, { session })
//         await UserModel.updateOne({ account_id: receiver_id }, { $set: { balance: receiver_details.balance } }, { session })
//         await session.commitTransaction()
//         console.log('money sent to ' + receiver_id, amount)

//     } catch (error) {
//         await session.abortTransaction()
//         console.log('error happend', error)
//     } finally {
//         await session.endSession();
//         redislock.delete('processing')
//     }
// }


interface ReciversPayroll {
    account_id: number;
    amount: number
}


// async function transferWithRetry(sender_id, receiver_id, amount, retries = 3) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             await transfer(sender_id, receiver_id, amount);
//             return; // Success!
//         } catch (error) {
//             if (error.codeName === 'WriteConflict' && i < retries - 1) {
//                 console.log(`Conflict detected! Retrying... (${i + 1})`);
//                 await new Promise(res => setTimeout(res, 50 * (i + 1))); // Wait a bit
//                 continue;
//             }
//             throw error; // Permanent failure
//         }
//     }
// }


const payroll = async (sender_id: number, reciver_details: ReciversPayroll[]) => {
    let totalamount = reciver_details.reduce((acc, reciver) => acc + reciver.amount, 0);
    await mongoose.connect('mongodb://localhost:27017/users');

    let sender_details = await UserModel.findOne({ account_id: sender_id });

    if (!sender_details || sender_details.balance < totalamount) {
        console.log('not enough amount')
        return
    }

    // for (let reciver of reciver_details) {
    //     // await transfer(sender_id, reciver.account_id, reciver.amount)
    //     await transfer(sender_id, reciver.account_id, reciver.amount)
    // }

    await Promise.all(reciver_details.map(async (reciver) => {
        // await transferInMemory(sender_id, reciver.account_id, reciver.amount)
    }))

    console.log('all transaction are completed')
}


let users: ReciversPayroll[] = [];
for (let i = 60; i <= 600; i++) {
    let user = { account_id: i, amount: 100 }
    users.push(user)
}

// seedEmployees().then(() => {
//     payroll(1, users)
// });


