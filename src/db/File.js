const mongoose = require('mongoose');
const Joi = require('joi');
const _ = require('lodash');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;
const { OBJECT_ID_REGEX } = require('../const');
const config = require('../config');

const FileSchema = new Schema(
    {
        originalName: String,
        name: String,
        type: String,
        meta: {
            original: Object,
            thumb: Object,
            fit: Object,
        }
    },
    {
        collection: 'files',
    }
);

module.exports = {
    Model: mongoose.model('File', FileSchema),

    remove(_id) {
        return this.Model.findOneAndDelete({_id});
    },

    async save(image, callback) {
        return this.Model.create({
            _id: ObjectId(image.name),
            ...image,
        }, callback);
    },

    async getById(_id) {
        let file;

        try {
            file = await this.Model.findById(_id).lean().exec();
        } catch (err) {
            console.log(err);
            return {
                type: 'error',
                message: err.message,
                status: err.status || 500
            }
        }

        return {
            ...file,
            location: {
                original: file.meta.original ? `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_original/${file.name}.${file.type}` : null,
                thumb:  file.meta.thumb ? `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_thumb/${file.name}.${file.type}` : null,
                fit: file.meta.fit ? `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_fit/${file.name}.${file.type}` : null,
            }
        }
    },
};

const isIdValid = (id) => {
    const result = Joi.validate(id.toString(), Joi.string().regex(OBJECT_ID_REGEX));

    return !result.error;
}
