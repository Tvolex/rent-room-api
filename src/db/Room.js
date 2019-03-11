const Joi = require('joi');
const _ = require('lodash');
const moment = require('moment');
const { list, create } = require('../router/room/validation');
const { getCollections } = require('../db/index');
const FileMode = require('./File');
const ObjectId = require('mongodb').ObjectId;
const { OBJECT_ID_REGEX } = require('../const');
const Collections = getCollections();

module.exports = {
    async findByMatch(match) {
        return Collections.files.find(match);
    },

    async AddRoom (data, uId) {
        return Joi.validate(
            Object.assign(
                {},
                data
            ),
            create,
            async (err, RoomData) => {
                if (err) {
                    err.status = 400;
                    console.log(err);
                    throw err;
                }

                RoomData.createdBy = ObjectId(uId);
                RoomData.createdAt = new Date().toISOString();

                RoomData.views = 0;

                if (RoomData.photos) {
                    RoomData.photos = RoomData.photos.map(ObjectId)
                }

                let CreatedRoom;
                try {
                    CreatedRoom = await Collections.rooms.insertOne(RoomData);
                } catch (err) {
                    err.status = 400;
                    console.log(err);
                    throw err;
                }

                return this.getById(CreatedRoom._id);

            });
    },

    async ListRooms(filter = {}, search, count = 10, page = 1, sort, options) {
        filter = filterValidation(filter);

        return Joi.validate(
            { filter, search, count, page, sort },
            list,
            async (err, params) => {
                if (err) {
                    err.status = 400;
                    console.log(err.message);
                    throw err;
                }

                const skip = (parseInt(params.page) - 1) * parseInt(params.count);
                const pipeline = [];
                const countTotalPipeline = [];

                if (!_.isEmpty(params.search)) {
                    const match = {
                        $match: {
                            $or: [
                                {
                                    title: {
                                        $regex: `.*${search}.*`,
                                        $options: 'i',
                                    }
                                },
                                {
                                    description: {
                                        $regex: `.*${search}.*`,
                                        $options: 'i',
                                    }
                                },
                            ],
                        }
                    };

                    pipeline.push(match);
                    countTotalPipeline.push(match);
                }

                if (!_.isEmpty(params.filter)) {
                    const match = { $match: { $and: filterBuilder(params.filter) } };

                    pipeline.push(match);
                    countTotalPipeline.push(match);
                }

                if (options && options.id) {
                    const match = {
                        $match: {
                            createdBy: ObjectId(options.id)
                        }
                    };

                    pipeline.push(match);
                    countTotalPipeline.push(match);
                }

                pipeline.push(...[
                    {
                        $sort: {
                            [params.sort.by]: params.sort.order
                        }
                    },
                    {
                        $skip: skip
                    },
                    {
                        $limit: parseInt(params.count)
                    },
                ]);

                pipeline.push(...FileMode.lookupFilesPipeline);

                return {
                    items: await Collections.rooms.aggregate(pipeline).toArray(),
                    total: await Collections.rooms.aggregate(countTotalPipeline).toArray()
                        .then(result => {
                            return result.length
                        }).catch(err => {
                            console.error(err);
                            throw err;
                        }),
                };
            });
    },

    async increaseViews(_id) {
        const existViewDay = await Collections.rooms.find({
            _id: ObjectId(_id),
            dailyViews: {
                $elemMatch: {
                    createdAt: {
                        $eq: moment().startOf('date').toDate(),
                    }
                }
            }
        }).hasNext();

        if (existViewDay) {
            Collections.rooms.updateOne({
                _id: ObjectId(_id),
                dailyViews: {
                    $elemMatch: {
                        createdAt: {
                            $eq: moment().startOf('date').toDate(),
                        }
                    }
                }
            }, {
                $inc: {
                    'dailyViews.$.views': 1
                }
            }, {
                upsert: true
            });
        } else {
            Collections.rooms.updateOne({
                _id: ObjectId(_id),
            }, {
                $push: {
                    dailyViews: {
                        $each: [
                            {
                                createdAt: moment().startOf('date').toDate(),
                                views: 1
                            }
                        ]
                    }
                }
            })
        }


        Collections.rooms.updateOne({ _id: ObjectId(_id) }, {
            $inc: {
                views: 1,
            }
        });
    },

    async findOne(match) {
        return Collections.rooms.findOne(match);
    },

    async getCountForMyRooms(id) {
        return Collections.rooms.aggregate([
            {
                $match: {
                    'createdBy': ObjectId(id),
                }
            },
            {
                $facet: {
                    rooms: [
                        {
                            $group: {
                                _id: "$rooms",
                                count: {$sum: 1}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                name: '$_id',
                                count: 1,
                            }
                        }
                    ],
                    types: [
                        {
                            $group: {
                                _id: "$type",
                                count: {$sum: 1}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                name: '$_id',
                                count: 1,
                            }
                        }
                    ],
                    terms: [
                        {
                            $group: {
                                _id: "$term",
                                count: {$sum: 1}
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                name: '$_id',
                                count: 1,
                            }
                        }
                    ]
                }
            }
        ]).next();
    },

    async create(user) {
        return Collections.rooms.insertOne(user);
    },

    remove(_id) {
        return Collections.rooms.findOneAndDelete({_id});
    },

    async getById(_id) {
        return isIdValid(_id) ? Collections.rooms.findOne({
            _id: ObjectId(_id)
        }) : null;
    },

    async getMostViewed(userId, { time } = {}) {
        const pipeline = [];

        if (time && !_.isEmpty(time.from)) {
            pipeline.push({
                $match: {
                    createdAt: {
                        $gte: new Date(time.from)
                    }
                }
            });
        }

        if (time && !_.isEmpty(time.to)) {
            pipeline.push({
                $match: {
                    createdAt: {
                        $lte: new Date(time.to)
                    }
                }
            });
        }

        if (!_.isEmpty(userId)) {
            pipeline.push({
                $match: {
                    createdBy: ObjectId(userId)
                }
            });
        }

        pipeline.push(...[
            {
                $sort: {
                    "views": -1
                }
            },
            {
                $limit: 5
            },
        ]);

        pipeline.push(...FileMode.lookupFilesPipeline);

        return Collections.rooms.aggregate(pipeline).toArray();
    },

    async getStatByDate(userId, roomId) {
        const pipeline = [];

        if (userId) {
            pipeline.push({
                $match: {
                    createdBy: ObjectId(userId)
                }
            })
        }

        if (roomId) {
            pipeline.push({
                $match: {
                    _id: ObjectId(roomId)
                }
            })
        }

        pipeline.push(...[
            {
                $unwind: {
                    path: "$dailyViews",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$dailyViews.createdAt',
                    total: {
                        $sum: "$dailyViews.views"
                    }
                }
            },
            {
                $sort: {
                    '_id': 1
                }
            },
        ]);

        return Collections.rooms.aggregate(pipeline).toArray();
    },

    async GetFullInfoWithRoomById(_id) {
        if (!isIdValid(_id)) {
            const err = new Error("_id is not valid", 400);
            err.status = 400;

            throw err;
        }

        const pipeline = [
            {
                $match: {
                    _id: ObjectId(_id),
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { user: '$createdBy' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$user', '$_id']
                                }
                            }
                        },
                        {
                            $project: {
                                email: 1,
                                name: 1,
                            }
                        }
                    ],
                    as: 'createdBy'
                }
            },
            {
                $unwind: {
                    path: '$createdBy',
                    preserveNullAndEmptyArrays: true,
                }
            }
        ];

        const room = await Collections.rooms.aggregate(pipeline).next();

        if (!room) {
            return room;
        }

        room.photos = await FileMode.getByIds(room.photos);

        return room;

    },

    async removePhoto(_id) {
        return Collections.rooms.updateMany({}, {
            $pull: {
                photos: ObjectId(_id.toString())
            },
        }, {
            new: true
        });
    }
};

const filterValidation = (filters) => {
    filters = JSON.parse(filters);

    Object.keys(filters).forEach(key => {
        if (_.isEmpty(filters[key]))  {
            delete filters[key];
        }
    });

    return filters;
};

const filterBuilder = (filters) => {
    const $and = [];

    for (let filter in filters) {
        switch (filter) {
            case "type":
                $and.push({type: { $in: filters.type} });
                break;
            case "term":
                $and.push({term: { $in: filters.term} });
                break;
            case "rooms":
                $and.push({rooms: { $in: filters.rooms} });
                break;
            case "price":
                $and.push({ price: { $gte: filters.price.min }});
                $and.push({ price: { $lte: filters.price.max }});
                break;
            default:
                $and.push({})
        }
    }

    return $and;
};

const isIdValid = (id) => {
    const result = Joi.validate(id, Joi.string().regex(OBJECT_ID_REGEX));

    return !result.error;
}
