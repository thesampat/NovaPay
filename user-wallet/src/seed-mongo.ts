import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://mongodb:27017/users';

const EncryptedFieldSchema = new mongoose.Schema({
  ciphertext: String,
  authTag: String,
  encryptedDek: String,
  keyAuthTag: String,
  iv: String,
}, { _id: false });

const UserSchema = new mongoose.Schema({
  account_id: { type: Number, required: true, unique: true },
  balance: { type: Number, required: true },
  currency: { type: String, required: true },
  processed_transactions: { type: [String], default: [] },
  name: { type: EncryptedFieldSchema },
  age: { type: EncryptedFieldSchema },
  gender: { type: EncryptedFieldSchema },
});

const UserModel = mongoose.model('Users', UserSchema);

const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD'];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    console.log('Cleaning existing users...');
    await UserModel.deleteMany({});

    console.log('Generating 1000 users (IDs 1-1000)...');
    const users: any[] = [];
    for (let i = 1; i <= 1000; i++) {
      users.push({
        account_id: i,
        balance: i === 1 ? 1000000 : 1000, // ID 1 is the employer/sender with 1M, others have 1000
        currency: i === 1 ? 'USD' : currencies[Math.floor(Math.random() * currencies.length)],
        processed_transactions: [],
        // We leave encrypted fields undefined as they are optional in the schema
      });

      // Insert in batches of 100 to avoid memory issues if it were much larger
      if (users.length === 100) {
        await UserModel.insertMany(users);
        users.length = 0;
        console.log(`Inserted up to ID ${i}...`);
      }
    }

    if (users.length > 0) {
      await UserModel.insertMany(users);
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
