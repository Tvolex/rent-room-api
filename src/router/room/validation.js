const Joi = require('joi');
const { ROOMS, TYPE } = require('../../const');
Joi.ObjectId = require('joi-objectid')(Joi);

const search = Joi.string().allow(['']).default(null),
    count = Joi.number().default(10),
    page = Joi.number().default(1),
    sort = Joi.object().keys({
        order: Joi.number().valid([-1, 1]).default(-1),
        by: Joi.string().default('rating'),
    });

const title = Joi.string(),
    description = Joi.string(),
    price = Joi.number(),
    type = Joi.string().valid(TYPE),
    rooms = Joi.number().valid(ROOMS)

module.exports = {
    create: Joi.object().keys({
        title,
        description,
        price,
        type,
        rooms,
    }),

    list: Joi.object().keys({
        filter: Joi.object().keys({
            fromDate: Joi.date(),
            toDate: Joi.date(),
            type: Joi.array().items(type),
            rooms: Joi.array().items(rooms),
        }),
        search,
        count,
        page,
        sort
    }),

};
