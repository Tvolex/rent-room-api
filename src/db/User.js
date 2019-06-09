const Joi = require('joi');
const bcrypt = require('bcrypt');
const { getCollections } = require('../db/index');
const { SALT_ROUNDS } = require('../const');
const config = require('../config');
const _ = require('lodash');
const UserValidationSchema = require('../router/user/validation');
const ObjectId = require('mongodb').ObjectId;
const FileModel = require('./File');
const Collections = getCollections();

const UserProjection = {
    _id: 1,
    name: 1,
    surname: 1,
    email: 1,
    createdAt: 1,
    status: 1,
    admin: 1,
    contact: 1,
    avatar: 1,
};

const UserModel = {

    async getAll() {
        return Collections.users.aggregate([
            {
                $lookup: {
                    from: "files",
                    let: {avatar: "$avatar"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$avatar"]
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
                    as: "avatar"
                }
            },
            {
                $unwind: {
                    path: '$avatar',
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $project: {
                    ...UserProjection,
                }
            }
        ]).toArray();
    },

    async has (match) {
        return Collections.files.findOne(match);
    },

    async findOne(match) {
        return Collections.users.find(match).next();
    },

    async create(user) {
        return Collections.users.insertOne(user);
    },

    async register(userData) {
        return Joi.validate(
            userData,
            UserValidationSchema.create,
            async (err, { name, surname, email, password, confirmPassword, admin, contact, avatar }) => {
                if (err) {
                    err.status = 400;
                    console.log(err.message);
                    throw err;
                }

                if (!_.isEqual(password, confirmPassword)) {
                    return customErr('Password didn\'t match with confirmation password', 400);
                }

                if (await this.has({ email })) {
                    return customErr('User with the same email already exist', 400);
                }

                if (await this.has({ contact })) {
                    return customErr('User with the same contact number already exist', 400);
                }

                const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

                const user = await Collections.users.create({
                    name,
                    surname,
                    email,
                    createdAt: new Date(),
                    password: hashedPassword,
                    admin,
                    contact,
                    avatar: ObjectId(avatar),
                });

                delete user.password;

                return user;
            });
    },

    async changeStatus (_id, status) {
        return Collections.users.updateOne({
            _id: ObjectId(_id),
        }, {
            $set: {
                status,
            }
        })
            .then(async data => await this.getUserById(_id))
            .catch(err => {
                console.error(err);
                throw err;
            })
    },

    remove(_id) {
        return Collections.users.deleteOne({_id});
    },

    async getUserById(id) {
        const pipeline = [
            {
                $match: {
                    _id: ObjectId(id),
                }
            },
            {
                $project: UserProjection,
            }
        ];

        const user = await Collections.users.aggregate(pipeline).next();

        if (!user) {
            throw new Error("Such user doesn't exist!").status = 400;
        }

        const avatar = await FileModel.getById(user.avatar) ;

        if (avatar && _.isEqual(avatar.type, 'error')) {
            throw new Error(avatar.message).status = avatar.message;
        }

        user.avatar = avatar;

        return user;
    },

    async updateUserSession(_id, session){
        return Collections.users.findOneAndUpdate({
            _id: ObjectId(_id),
        }, {
            $push: { sessions: session }
        }, {
            fields: UserProjection,
        });
    },

    async destroyUserSession(_id, session){
        return Collections.users.findOneAndUpdate({
            _id: ObjectId(_id),
        }, {
            $pull: { sessions: session }
        }, {
            fields: UserProjection,
        });
    },

    async checkUserSession(_id, session){
        return Collections.users.findOne({
            _id: ObjectId(_id),
            sessions: { $in: [session] }
        });
    },
};

const customErr = (description, status) => {
    const error = new Error(description);
    error.status = status || 500;
    error.isCustom = true;
    throw error;
};

module.exports = UserModel;
