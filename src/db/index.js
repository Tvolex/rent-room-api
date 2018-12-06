const mongodb = require ('mongodb');
const MongoClient = mongodb.MongoClient;
const { DB_URI } = require('../config');

const Collections = [];
let isConnected = false;
let client = null;

async function init () {
    try {
        client = await MongoClient.connect(DB_URI, { useNewUrlParser: true });
        isConnected = !!client;
    } catch (err) {
        console.log(err);
        throw err;
    }

    console.log(`DB connected successfully`);

    return client;
};

const checkIsConnected = () => {
    return isConnected;
};

const initCollections = async () => {
    if (isConnected) {
        Collections.users = client.db('dev').collection('users');
        Collections.users = client.db('dev').collection('items');
        return Collections;
    }
    return null;
};

const getCollections = () => {
    return Collections;
};

module.exports = { init, initCollections, getCollections, checkIsConnected };
