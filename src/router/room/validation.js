const Joi = require('joi');
const { ROOMS, TYPE, TERM } = require('../../const');
Joi.ObjectId = require('joi-objectid')(Joi);

const search = Joi.string().allow(['']).default(null),
    count = Joi.number().min(1).default(10),
    page = Joi.number().min(1).default(1),
    sort = Joi.object().keys({
        order: Joi.number().valid([-1, 1]).default(-1),
        by: Joi.string().default('price'),
    }).default({ by: 'price', order: -1 });

const title = Joi.string(),
    description = Joi.string(),
    price = Joi.number(),
    minPrice = Joi.number().min(0).default(0),
    maxPrice = Joi.number().min(1).default(99999999),
    type = Joi.string().valid(TYPE),
    term = Joi.string().valid(TERM),
    rooms = Joi.number().valid(ROOMS);

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
            rooms: Joi.array().min(1).max(ROOMS.length).items(rooms).default(ROOMS),
            type: Joi.array().min(1).max(TYPE.length).items(type).default(TYPE),
            term: Joi.array().min(1).max(TERM.length).items(term).default(TERM),
            fromDate: Joi.date(),
            toDate: Joi.date(),
            price: Joi.object().keys({
                min: minPrice,
                max: maxPrice,
            }),
        }),
        search,
        count,
        page,
        sort
    }),

};
