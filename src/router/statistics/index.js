const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const RoomModel = require('../../db/Room');
const CheckAuth = require('../auth/Check');

Router.get('/most-viewed/:id', async (req, res, next) => {
    const { filter } = req.query;

    RoomModel.getMostViewed(req.params.id, filter ).then((rooms) => {
        return res.status(200).send(rooms);
    }).catch((err) => {
        console.error(err);
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    });
});
module.exports = Router;
