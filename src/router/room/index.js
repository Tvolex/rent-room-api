const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const RoomModel = require('../../db/Room');
const CheckAuth = require('../auth/Check');


Router.get(['/list', '/list/:id'], async (req, res, next) => {
    const { filter, search, count, page, sort } = req.query;

    const id = req.params.id ? req.params.id : null;

    RoomModel.ListRooms(filter, search, count, page, sort, { id }).then((rooms) => {
        return res.status(200).send(rooms);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});

Router.get('/list/count/:id', async (req, res, next) => {
    const { id } = req.params;

    if (!id)
        return res.status(400).send({type: 'error', message: 'user id is not valid'});

    RoomModel.getCountForMyRooms(id).then((rooms) => {
        return res.status(200).send(rooms);
    }).catch((err) => {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});

Router.post('/', CheckAuth, async (req, res, next) => {
    let data;
    try {
        data = await RoomModel.AddRoom(req.body, req.session.uId);
    } catch (err) {
        console.error(err);
        return res.status(err.status || 500).send({type: 'error', message: err.message})
    }
    res.status(200).send(data);
});

Router.get('/:_id', async (req, res, next) => {
    let room;
    try {
        room = await RoomModel.GetFullInfoWithRoomById(req.params._id);
    } catch (err) {
        console.error(err);
        return res.status(err.status || 500).send({type: 'error', message: err.message})
    }

    if (_.isEqual(room.createdBy.toString(), req.session.uId))
        RoomModel.increaseViews(req.params._id);

    return res.status(200).send(room);
});

module.exports = Router;
