const mongoose = require('mongoose');
const Joi = require('joi');
const _ = require('lodash');
const { list, create } = require('../router/room/validation');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;
const { OBJECT_ID_REGEX } = require('../const');

const RoomSchema = new Schema(
    {
        title: { type : String },
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

    async ListRooms(filter = {}, search, count = 10, page = 1, sort) {
        return Joi.validate(
            { filter, search, count, page, sort },
            list,
            async (err, params) => {
                if (err) {
                    err.status = 400;
                    console.log(err);
                    throw err;
                }

                const pipeline = [];

                if (!_.isEmpty(params.search)) {
                    pipeline.push({
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
                    });
                }

                if (!_.isEmpty(params.filter)) {
                    pipeline.push({
                        $match: {
                            $and: filterBuilder(params.filter)
                        }
                    })
                }

                pipeline.push(...[
                    {
                        $skip: parseInt(params.page)
                    },
                    {
                        $limit: parseInt(params.count)
                    },
                    {
                        $sort: {
                            [params.sort.by]: params.sort.order
                        }
                    }
                ]);

                return {
                    total: await this.Model.countDocuments({}),
                    items: await this.Model.aggregate(pipeline).exec()
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
            throw new Error("_id is not valid");
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

        return this.Model.aggregate(pipeline).cursor({}).exec().next();

    }
};

const filterBuilder = (filters) => {
    const $and = [];

    for (let filter in filters) {
        switch (filter) {
            case "type":
                $and.push({type: { $in: filters.type} });
                break;
            case "rooms":
                $and.push({rooms: { $in: filters.rooms} });
                break;
        }
    }

    return $and;
};

const isIdValid = (id) => {
    const result = Joi.validate(id, Joi.string().regex(OBJECT_ID_REGEX));

    return !result.error;
}
