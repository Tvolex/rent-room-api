const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const Joi = require('joi');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const moment = require('moment');
const { UserModel } = require('../../db/models');
const CheckAuth = require('../auth/Check');
const ValidationSchema = require('./validation');

Router.get('/:_id', async (req, res, next) => {
    res.status(200).send(await UserModel.getById(req.params._id));
});

Router.delete('/:_id', CheckAuth, async (req, res, next) => {
    const { params: { _id }, body } = req;

    const existUser = await UserModel.getById(_id);

    if (!existUser) {
        return res.status(400).send('Такого користувача не існує!');
    }

    let deleted;
    try {
        deleted = await UserModel.remove(_id);
    } catch (err) {
        err.status = 500;
        console.log(err);
        throw err;
    }

    if (deleted.result.ok) {
        return res.status(200).send({type: 'info', message: "Видалено!"});
    }

    res.status(500).send({type: 'warning', message: "Не видалено!"});
});

Router.get('/list', async (req, res, next) => {
    UserModel.get(req).then((users) => {
        res.send(users);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});

Router.post('/', async (req, res, next) => {
    const { body } = req;

    let user;
    try {
        user = await Joi.validate(body, ValidationSchema.create);
    } catch (err) {
        err.status = 400;
        console.log(err);
        throw err;
    }

    UserModel.create(user).then((user) => {
        return res.status(200).send(user);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });

    return res.status(400).send({type: 'error', message: "Need a valid data"});
});

module.exports = Router;
