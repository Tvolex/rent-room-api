const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const { RoomModel } = require('../../db/models');
const CheckAuth = require('../auth/Check');

Router.get('/list', async (req, res, next) => {
    const { filter, search, count, page, sort } = req.query;

    RoomModel.ListRooms(filter, search, count, page, sort).then((rooms) => {
        res.status(200).send(rooms);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});

Router.get('/list/my', async (req, res, next) => {
    const { filter, search, count, page, sort } = req.query;

    RoomModel.ListRooms(filter, search, count, page, sort, { my: req.session.uId }).then((rooms) => {
        res.status(200).send(rooms);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});

Router.get('/count', async (req, res, next) => {
    const { filter, search, count, page, sort } = req.query;

    RoomModel.ListRooms(filter, search, count, page, sort).then((rooms) => {
        res.status(200).send(rooms);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});

Router.post('/', CheckAuth, async (req, res, next) => {
    try {
        await RoomModel.AddRoom(req.body, req.session.uId);
    } catch (err) {
        console.log(err);
        return res.status(err.status || 500).send({type: 'error', message: err.message})
    }
    res.status(200).send(room);
});

Router.get('/:_id', async (req, res, next) => {
    let room;
    try {
        room = await RoomModel.GetFullInfoWithRoomById(req.params._id);
    } catch (err) {
        console.log(err);
        return res.status(err.status || 500).send({type: 'error', message: err.message})
    }
    return res.status(200).send(room);
});

module.exports = Router;
