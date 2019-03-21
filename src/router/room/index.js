const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const RoomModel = require('../../db/Room');
const SessionModel = require('../../db/Session');
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
    const roomId = req.params._id;

    let room;
    try {
        room = await RoomModel.GetFullInfoWithRoomById(roomId);
    } catch (err) {
        console.error(err);
        return res.status(err.status || 500).send({type: 'error', message: err.message})
    }

    const isViewed = await SessionModel.isRoomViewedBySession(roomId, req.session.id);
    const isOwnerRoom = _.isEqual(room.createdBy.toString(), req.session.uId);

    if (!isOwnerRoom && !isViewed) {
        RoomModel.increaseUniqViews(roomId);
        SessionModel.trackSessionForView(roomId, req.session.id)
    }

    RoomModel.increaseTotalViews(roomId);

    return res.status(200).send(room);
});

module.exports = Router;
