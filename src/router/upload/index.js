const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const CheckAuth = require('../auth/Check');
const Image = require('./image');

const uploadValidation = (req) => {
    if (!req.body && !req.files) {
        return { type: 'error', status: 400, message: 'Bad request!', valid: false };
    }

    const { image = null } = req.files;

    if (!image) {
        return { type: 'error', status: 400, message: "Photo wasn't upload!", valid: false };
    }

    const { type } = image;

    if (!["image/jpeg", "image/pipeg", "image/svg+xml", "image/tiff", "image/bmp", "image/x-icon", "image/png", "image/pjpeg", "image/webp", "image/gif"].includes(type)) {
        return { type: 'error', status: 400, message: `Type: ${type} - not supported!`, valid: false };
    }

    return {
        type: 'success',
        valid: true,
        image,
    }
};

Router.post('/photo', multipartMiddleware, async (req, res, next) => {

    const { type, status, message, valid, image } = uploadValidation(req);

    if (!valid) {
        return res.status(status).send({ type, message });
    }

    Image.photo(image).then(data => {
        return res.status(200).send(data);
    }).catch(err => {
        return res.status(500).send(err.message);
    });

});

Router.post('/avatar', multipartMiddleware, async (req, res, next) => {

    const { type, status, message, valid, image } = uploadValidation(req);

    if (!valid) {
        return res.status(status).send({ type, message });
    }

    Image.avatar(image).then(data => {
        return res.status(200).send(data);
    }).catch(err => {
        return res.status(500).send(err.message);
    });

});

module.exports = Router;
