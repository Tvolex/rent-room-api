const express = require ('express');
const app = express();
const router = require('./router');
const config = require('./config');
const setup = require('./setupServer');
const { init, initCollections } = require('./db');

setup(app);

app.use(router);

(async function () {
    const db = await init();
    await initCollections();

    app.listen(config.PORT, () => {
        console.log('Server start on port ' + config.PORT);
    });
}());

