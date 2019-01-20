const _ = require('lodash');
const express = require('express');
const bcrypt = require('bcrypt');

const Router = express.Router();
const { UserModel } = require('../../db/User');
const FileModel  = require('../../db/File');

const CheckAuth = (req, res, next) => {
    const {
        session: {
            uId,
            id
        } = {},
    } = req;

    if (!_.isEmpty(req.session) && uId && id) {
        return next();
    } else {
        return res.status(401)
            .send({
                type: 'error',
                message: "Not authorized"
            })
    }
};

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

        await UserModel.updateUserSession({ _id: user._id, session: req.session.id});

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

    if (_.isEmpty(req.session) || !id || !uId) {
        return res.status(401)
            .send({
                type: 'error',
                message: "Не авторизовано!"
            })
    }

    let user;
    try {
        user = await UserModel.getById(uId);
    } catch (err) {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
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
    }

    req.session.destroy();

    return res.status(200)
        .send({
            type: 'info',
            message: 'ok',
        })
});

module.exports = { Router, CheckAuth };
