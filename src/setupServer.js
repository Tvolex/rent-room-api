const bodyParser = require ('body-parser');
const cookieParser = require ('cookie-parser');
const session = require ('express-session');
const cors = require('cors');

const setup = function (app) {
    app.use(bodyParser.json({
        strict: false,
    }));

    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(cookieParser('Kvb6swFdB&m66sk4aSB9pSKm'));
    app.use(session({
        secret: 'Kvb6swFdB&m66sk4aSB9pSKm',
        resave: true,
        saveUninitialized: true,
        expires: new Date(Date.now() + (360000))
    }));

    app.use(cors());

    app.all((req, res, next) => {
        console.log(req.sessionID);
        next();
    });
};

module.exports = setup;
