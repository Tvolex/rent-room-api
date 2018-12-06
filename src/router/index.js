const express = require('express');
const Router = express.Router();
const { Router: AuthRouter }= require('./auth');
const UserRouter = require('./user');
const error = require('./error');

Router.use('/api/auth', AuthRouter);
Router.use('/api/user', UserRouter);

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
