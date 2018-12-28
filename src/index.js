const express = require ('express');
const app = express();
const router = require('./router');
const config = require('./config');
const setup = require('./setupServer');
const { init } = require('./db');

setup(app);

app.use(router);

(async function () {
    await init();

    app.listen(config.PORT, () => {
        console.log('Server start on port ' + config.PORT);
    });
}());

