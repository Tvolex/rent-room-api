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

Router.get('/by-date/:id', (req, res, next) => {
    const groupBy = req.query.groupBy;
    const timePeriod = req.query.timePeriod;
    const customTimePeriod = req.query.customTimePeriod ? JSON.parse(req.query.customTimePeriod) : null;

    RoomModel.getStatByDate(req.params.id, null, { groupBy, timePeriod, customTimePeriod }).then(data => {
        return res.status(200).send(data);
    }).catch(err => {
        console.error(err);
        return res.status(err.status || 500).send( { type: "error", message: err.message } );
    })
});

Router.get('/by-status/:id', CheckAuth, (req, res, next) => {
    return res.status(200).send([
        {
            status: 'In Use',
            value: 15,
        },
        {
            status: 'Is Free',
            value: 5,
        },
    ]);
});

Router.get('/room/:id', CheckAuth, (req, res, next) => {
    const groupBy = req.query.groupBy;
    const timePeriod = req.query.timePeriod;

    RoomModel.getStatByDate(req.session.uId, req.params.id, { groupBy, timePeriod }).then(data => {
        return res.status(200).send(data);
    }).catch(err => {
        console.error(err);
        return res.status(err.status || 500).send( { type: "error", message: err.message } );
    })
});

module.exports = Router;
