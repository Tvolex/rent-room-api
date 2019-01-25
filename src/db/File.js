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

    getByIds(files) {
        return Promise.all(files.map(async file => await this.getById(file)));
    },

    lookupFilesPipeline: [
        {
            $lookup: {
                from: "files",
                let: {files: "$photos"},
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ["$_id", "$$files"]
                            }
                        },
                    },
                    {
                        $project: {
                            name: 1,
                            originalName: 1,
                            type: 1,
                            meta: 1,
                            location: {
                                original: {
                                    $cond: [
                                        {
                                            $or: [
                                                { $eq: ['$meta', null] },
                                                { $eq: ['$meta.original', null] },
                                            ]
                                        },
                                        null,
                                        // `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_original/${file.name}.${file.type}`
                                        {
                                            $concat: [
                                                `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_original/`,
                                                '$name', '.', '$type'
                                            ]
                                        }
                                    ]
                                },
                                fit: {
                                    $cond: [
                                        {
                                            $or: [
                                                { $eq: ['$meta', null] },
                                                { $eq: ['$meta.fit', null] },
                                            ]
                                        },
                                        null,
                                        // `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_original/${file.name}.${file.type}`
                                        {
                                            $concat: [
                                                `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_fit/`,
                                                '$name', '.', '$type'
                                            ]
                                        }
                                    ]
                                },
                                thumb: {
                                    $cond: [
                                        {
                                            $or: [
                                                { $eq: ['$meta', null] },
                                                { $eq: ['$meta.thumb', null] },
                                            ]
                                        },
                                        null,
                                        // `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_original/${file.name}.${file.type}`
                                        {
                                            $concat: [
                                                `https://s3.${config.AWS_S3_BUCKET_REGION}.amazonaws.com/${config.AWS_S3_BUCKET_NAME}/images_thumb/`,
                                                '$name', '.', '$type'
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                as: "photos"
            }
        }
    ]
};

const isIdValid = (id) => {
    const result = Joi.validate(id.toString(), Joi.string().regex(OBJECT_ID_REGEX));

    return !result.error;
}
