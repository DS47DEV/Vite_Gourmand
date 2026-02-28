import { MongoClient } from 'mongodb';

let client;
let db;

export async function getMongoDb() {
  if (db) return db;
  client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  db = client.db(); // DB name from URL
  return db;
}

export async function closeMongo() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}
