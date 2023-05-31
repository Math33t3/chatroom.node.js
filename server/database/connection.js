const { MongoClient } = require('mongodb');


const URL = "mongodb://127.0.0.1:27017";

const client = new MongoClient(URL);

const db = client.db("fullstackChatroom");

module.exports = {
    users: db.collection("users")
};