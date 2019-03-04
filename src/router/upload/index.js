const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const Router = express.Router();
const _ = require('lodash');
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const CheckAuth = require('../auth/Check');
const FileModel = require('../../db/File');
const RoomModel = require('../../db/Room');
const Upload = require('./upload');

const uploadValidation = (req) => {
    if (_.isEmpty(req.body) && _.isEmpty(req.files)) {
        return { type: 'error', status: 400, message: 'Bad request!', valid: false };
    }

    const  image = req.files.image || req.files.file;

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

    const photoMeta = await Upload.photo(image, FileModel.updateMetaById)
        .then(data => data)
        .catch(err => res.status(500).send(err.message));

    const data = await FileModel.save(photoMeta)
        .then(data => data)
        .catch(err => res.status(500).send(err.message));

    return res.status(200).send(await FileModel.getById(data.insertedId.toString()));

});

Router.post('/avatar', multipartMiddleware, async (req, res, next) => {

    const { type, status, message, valid, image } = uploadValidation(req);

    if (!valid) {
        return res.status(status).send({ type, message });
    }

    const imageMeta = await Upload.avatar(image, FileModel.updateMetaById)
        .then(data => data)
        .catch(err => res.status(500).send(err.message));

    const data = await FileModel.save(imageMeta)
        .then(data => data)
        .catch(err => res.status(500).send(err.message));

    return res.status(200).send(await FileModel.getById(data.insertedId.toString()));
});

Router.delete('/:fileId', CheckAuth, async(req, res, next) => {
    const fileId = req.params.fileId;
    try {
        const data = await RoomModel.removePhoto(fileId);
        FileModel.remove(req.params.fileId);

        return res.status(200).send({ type: 'success', message: 'delete in processing...', data });
    } catch (err) {
        console.error(err);
        return res.status(err.status || 500).send({ type: 'error', message: err.message });
    }
});

module.exports = Router;
