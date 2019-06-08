const Joi = require('joi');
const _ = require('lodash');
const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
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
                RoomData.createdAt = new Date();

                RoomData.totalViews = 0;
                RoomData.uniqueViews = 0;

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
                                    'location.address': {
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

                pipeline.push(...[
                    {
                        $lookup: {
                            from: "users",
                            let: {createdBy: "$createdBy"},
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$_id", "$$createdBy"]
                                        }
                                    },
                                },
                                {
                                    $project: {
                                        name: 1,
                                        surname: 1,
                                    }
                                }
                            ],
                            as: "createdBy"
                        }
                    },
                    {
                        $unwind: {
                            path: '$createdBy',
                            preserveNullAndEmptyArrays: true,
                        }
                    },
                ]);

                pipeline.push(...FileMode.lookupFilesPipeline);
                countTotalPipeline.push( { $group: { _id: null, total: { $sum: 1 } } }); // compute count of document by filter

                const Count = await Collections.rooms.aggregate(countTotalPipeline).next();

                return {
                    items: await Collections.rooms.aggregate(pipeline).toArray(),
                    total: Count ? Count.total : 1,
                };
            });
    },

    async increaseUniqViews(_id) {
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
                    'dailyViews.$.uniqueViews': 1
                }
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
                                uniqueViews: 1,
                            }
                        ]
                    }
                }
            })
        }


        Collections.rooms.updateOne({ _id: ObjectId(_id) }, {
            $inc: {
                uniqueViews: 1,
            }
        });
    },

    async increaseTotalViews (_id) {
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
                    'dailyViews.$.totalViews': 1
                }
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
                                totalViews: 1
                            }
                        ]
                    }
                }
            })
        }

        Collections.rooms.updateOne({ _id: ObjectId(_id) }, {
            $inc: {
                totalViews: 1,
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

    async changeStatus(_id, status, rejectionReason) {
        await Collections.rooms.updateOne({
            _id: ObjectId(_id),
        }, {
            $set: { status, rejectionReason: rejectionReason || null },
        });

        return this.GetFullInfoWithRoomById(_id);
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
                    "totalViews": -1
                }
            },
            {
                $limit: 5
            },
        ]);

        pipeline.push(...FileMode.lookupFilesPipeline);

        return Collections.rooms.aggregate(pipeline).toArray();
    },

    async getStatByDate(userId, roomId, { groupBy = 'Day', timePeriod = null, customTimePeriod = {} } = {}) {
        const pipeline = [];

        const groupByTime = groupBy;
        let fromTime, toTime;

        switch (groupBy) {
            case 'Day':
                groupBy = {
                    $group: {
                        _id: { $dayOfYear: '$dailyViews.createdAt' },
                        date: {
                            $first: '$dailyViews.createdAt'
                        },
                        totalViews: {
                            $sum: '$dailyViews.totalViews'
                        },
                        uniqueViews: {
                            $sum: '$dailyViews.uniqueViews'
                        }
                    }
                };
                break;
            case 'Week':
                groupBy = {
                    $group: {
                        _id: { $week: '$dailyViews.createdAt' },
                        date: {
                            $first: '$dailyViews.createdAt'
                        },
                        totalViews: {
                            $sum: '$dailyViews.totalViews'
                        },
                        uniqueViews: {
                            $sum: '$dailyViews.uniqueViews'
                        }
                    }
                };
                break;
            case 'Month':
                groupBy = {
                    $group: {
                        _id: { $month: '$dailyViews.createdAt' },
                        date: {
                            $first: '$dailyViews.createdAt'
                        },
                        totalViews: {
                            $sum: '$dailyViews.totalViews'
                        },
                        uniqueViews: {
                            $sum: '$dailyViews.uniqueViews'
                        }
                    }
                };
                break;
            case 'Year':
                groupBy = {
                    $group: {
                        _id: { $year: '$dailyViews.createdAt' },
                        date: {
                            $first: '$dailyViews.createdAt'
                        },
                        totalViews: {
                            $sum: '$dailyViews.totalViews'
                        },
                        uniqueViews: {
                            $sum: '$dailyViews.uniqueViews'
                        }
                    }
                };
                break;
            default:
                groupBy = {
                    $group: {
                        _id: { $week: '$dailyViews.createdAt' },
                        date: {
                            $first: '$dailyViews.createdAt'
                        },
                        totalViews: {
                            $sum: '$dailyViews.totalViews'
                        },
                        uniqueViews: {
                            $sum: '$dailyViews.uniqueViews'
                        }
                    }
                };
                break;
        }

        switch (timePeriod) {
            case 'Custom':
                fromTime = moment(customTimePeriod.from, "YYYY-MM-DD").startOf('day').format();
                toTime = moment(customTimePeriod.to,"YYYY-MM-DD").endOf('day').format();
                break;
            case 'Week':
                fromTime = moment().startOf('week').format();
                toTime = moment().endOf('day').format();
                break;
            case 'Month':
                fromTime = moment().startOf('month').format();
                toTime = moment().endOf('day').format();
                break;
            case 'Year':
                fromTime = moment().startOf('year').format();
                toTime = moment().endOf('day').format();
                break;
            default:
                fromTime = moment().startOf('month').format();
                toTime = moment().endOf('day').format();
                break;
        }

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
                $match: {
                    'dailyViews.createdAt': { $gte: new Date(fromTime), $lte: new Date(toTime) },
                },
            },
            groupBy,
            {
                $sort: {
                    'date': 1
                }
            },
        ]);

        const range = Array.from(
            moment.range(moment(fromTime), moment(toTime))
                .by(groupByTime)
        );

        const Statistics = await Collections.rooms.aggregate(pipeline).toArray();

        return _
            .orderBy(
                range
                    .map(m => m.format())
                    .map(date => {
                        if (groupByTime === 'Day') {
                            const DataWithSameDay = _.find(Statistics, el => moment(el.date).isSame(date));

                            if (DataWithSameDay)
                                return {
                                    ...DataWithSameDay,
                                    label: moment(DataWithSameDay.date).format('YYYY-MM-DD'),
                                };

                            return {
                                date,
                                label: moment(date).format('YYYY-MM-DD'),
                                uniqueViews: 0,
                                totalViews: 0,
                            };
                        } else if (groupByTime === 'Week') {
                            const DataWithSameWeek  = _.find(Statistics, el => moment(el.date).week() === moment(date).week());

                            if (DataWithSameWeek)
                                return {
                                    ...DataWithSameWeek,
                                    label: moment(DataWithSameWeek.date).format('YYYY-MM-DD'),
                                };

                           return  {
                               date,
                               label: moment(date).format('YYYY-MM-DD'),
                               uniqueViews: 0,
                               totalViews: 0,
                           };

                        } else if (groupByTime === 'Month') {
                            const DataWithSameMonth = _.find(Statistics, el => moment(el.date).month() === moment(date).month());

                            if (DataWithSameMonth)
                                return {
                                    ...DataWithSameMonth,
                                    label: moment(DataWithSameMonth.date).format('MMMM'),
                                };

                            return  {
                                date,
                                label: moment(date).format('MMMM'),
                                uniqueViews: 0,
                                totalViews: 0,
                            };

                        } else if (groupByTime === 'Year') {
                            const DataWithSameYear = _.find(Statistics, el => moment(el.date).year() === moment(date).year());

                            if (DataWithSameYear) {
                                return {
                                    ...DataWithSameYear,
                                    label: moment(DataWithSameYear.date).year(),
                                }
                            }

                            return {
                                date,
                                label: moment(date).year(),
                                uniqueViews: 0,
                                totalViews: 0,
                            }
                        }
                    }),
                ['date'],
                ['asc']
            )
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
                                surname: 1,
                                name: 1,
                                contact: 1,
                                avatar: 1,
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

        room.photos = room.photos.filter(photo => !!photo);

        room.createdBy.avatar = await FileMode.getById(room.createdBy.avatar);

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
            case "status":
                $and.push({ status: { $in: filters.status } });
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
