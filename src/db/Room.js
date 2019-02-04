const mongoose = require('mongoose');
const Joi = require('joi');
const _ = require('lodash');
const { list, create } = require('../router/room/validation');
const Schema = mongoose.Schema;
const FileMode = require('./File');
const { ObjectId } = mongoose.Types;
const { OBJECT_ID_REGEX } = require('../const');

const RoomSchema = new Schema(
    {
        title: { type : String },
        term: { type: String },
        type: { type: String },
        rooms: { type: Number },
        price: { type: Number },
        photos: [String]
    },
    {
        collection: 'rooms',
    }
);

module.exports = {
    Model: mongoose.model('Room', RoomSchema),

    async findByMatch(match) {
        return this.Model.find(match);
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

                RoomData.createdBy = {
                    date: new Date().toISOString(),
                    user: uId,
                };

                let CreatedRoom;
                try {
                    CreatedRoom = await this.Model.insertOne(RoomData);
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
                    console.log(err);
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

                if (options && options.my) {
                    const match = {
                        $match: {
                            'createdBy.user': ObjectId(options.my)
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
                    items: await this.Model.aggregate(pipeline).exec(),
                    total: await this.Model.aggregate(countTotalPipeline).exec().then(result => result.length),
                };
            });
    },
    async findOne(match) {
        return this.Model.findOne(match);
    },

    async create(user) {
        return this.Model.insertOne(user);
    },

    remove(_id) {
        return this.Model.findOneAndDelete({_id});
    },

    async getById(_id) {
        return isIdValid(_id) ? this.Model.findOne({ _id }) : null;
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
                    let: { user: '$createdBy.user' },
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
                    as: 'createdBy.user'
                }
            },
            {
                $unwind: {
                    path: '$createdBy.user',
                    preserveNullAndEmptyArrays: true,
                }
            }
        ];

        const room = await this.Model.aggregate(pipeline).cursor({}).exec().next();

        if (!room) {
            return room;
        }

        room.photos = await FileMode.getByIds(room.photos);

        return room;

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
