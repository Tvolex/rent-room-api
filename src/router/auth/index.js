const _ = require('lodash');
const express = require('express');
const bcrypt = require('bcrypt');

const Router = express.Router();
const UserModel = require('../../db/User');
const SessionModel = require('../../db/Session');
const FileModel  = require('../../db/File');

Router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;

    let user;

    try {
        user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400)
                .send({
                    type: 'error',
                    message: "Wrong E-mail"
                })
        }

        if (!await bcrypt.compare(password, user.password)) {
            return res.status(400)
                .send({
                    type: 'error',
                    message: "Wrong password!"
                })
        }

        user.avatar = await FileModel.getById(user.avatar);

        req.session.uId = user._id;
        req.session.id = req.sessionID;

        await SessionModel.updateUserSession(user._id, { sessionId: req.sessionID });
        await UserModel.updateUserSession(user._id,  req.sessionID);

        console.log(`User ${user._id} logged in`);

    } catch (err) {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    }

    delete user.password;
    delete user.session;

    return res
        .status(200)
        .send(user);
});

Router.get('/check', async (req, res, next) => {
    const {
        session: {
            uId,
            id
        } = {},
    } = req;

    let user;
    try {
        user = uId && id ? await UserModel.checkUserSession(uId, id) : null;
    } catch (err) {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    }

    if (!user || _.isEmpty(req.session) || !id || !uId) {
        return res.status(401)
            .send({
                type: 'error',
                message: "Not authorized"
            })
    }

    delete user.password;
    delete user.session;

    return res.status(200)
        .send(user)

});

Router.get('/logout', async (req, res, next) => {
    const { session: { uId } = {} } = req;

    if (!_.isEmpty(req.session) && uId) {
        console.log(`User ${req.session.uId} logged out`);

        await UserModel.destroyUserSession(uId, req.sessionID);
    }

    req.session.destroy();

    return res.status(200)
        .send({
            type: 'info',
            message: 'ok',
        })
});

module.exports = { Router };
