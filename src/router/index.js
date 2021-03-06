const express = require('express');
const Router = express.Router();
const SessionModel = require('../db/Session');
const { Router: AuthRouter }= require('./auth');
const UserRouter = require('./user');
const StatisticsRouter = require('./statistics');
const RoomRouter = require('./room');
const UploadRouter = require('./upload');
const error = require('./error');

Router.use((req, res, next) => {
    console.log(req.originalUrl);
    next();
});

Router.use(SessionModel.justMiddleware);

Router.use('/api/auth', AuthRouter);
Router.use('/api/user', UserRouter);
Router.use('/api/room', RoomRouter);
Router.use('/api/statistics', StatisticsRouter);
Router.use('/api/upload', UploadRouter);

Router.get('/ping', (req, res) => res.status(200).send('pong'));

Router.use((req, res) => {
    res
        .status(error.NotFound.status)
        .send({
            type: error.NotFound.type,
            message: error.NotFound.message,
        })
});

module.exports = Router;
