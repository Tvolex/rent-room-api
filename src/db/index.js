const mongoose = require('mongoose');
const { DB_URI } = require('../config');
async function init () {
    try {
        await mongoose.connect(DB_URI, { useNewUrlParser: true });
    } catch (err) {
        console.log(err);
        throw err;
    }

    console.log(`DB connected successfully`);
};

module.exports = { init };
