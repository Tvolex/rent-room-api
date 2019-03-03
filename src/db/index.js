const { MongoClient}= require('mongodb');
const { DB_URI } = require('../config');

const Collections = {};
let isConnected = false;
let Client;

const init = async () => {
    try {
        Client = await MongoClient.connect(DB_URI, { useNewUrlParser: true });
        isConnected = !!Client;
    } catch (err) {
        console.log(err);
        throw err;
    }

    console.log(`DB connected successfully`);

    return Client;
}

const checkIsConnected = () => {
    return isConnected;
};

const initCollections = async () => {
    if (isConnected) {
        Collections.users = Client.db('dev').collection('users');
        Collections.files = Client.db('dev').collection('files');
        Collections.rooms = Client.db('dev').collection('rooms');
        return Collections;
    }
    return null;
};

const getCollections = () => {
    return Collections;
};

module.exports = { init, checkIsConnected, initCollections, getCollections };
