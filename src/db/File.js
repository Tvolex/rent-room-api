const Joi = require('joi');
const _ = require('lodash');
const ObjectId = require('mongodb').ObjectId;
const { getCollections } = require('../db/index');
const { OBJECT_ID_REGEX } = require('../const');
const config = require('../config');
const Collections = getCollections();

module.exports = {

    async remove(_id) {
        return Collections.files.findOneAndDelete({_id: ObjectId(_id)})

        //TODO: make functionality for remove from AWS S3 Bucket
    },

    async save(image, callback) {
        return Collections.files.insertOne({
            _id: ObjectId(image.name),
            ...image,
        }, callback);
    },

    async getById(_id) {
        let file;

        try {
            file = await Collections.files.find({_id: ObjectId(_id.toString())}).next();
        } catch (err) {
            console.error(err);
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
