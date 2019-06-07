const Joi = require('joi');
const { ROOMS, TYPE, TERM, STATUS } = require('../../const');
Joi.ObjectId = require('joi-objectid')(Joi);
const { OBJECT_ID_REGEX } = require('../../const');

const search = Joi.string().allow(['']).default(null),
    count = Joi.number().min(1).default(10).error(new Error("Min value for count is 1")),
    page = Joi.number().min(1).default(1).error(new Error("Min value for page is 1")),
    sort = Joi.object().keys({
        order: Joi.number().valid([-1, 1]).default(-1),
        by: Joi.string().default('price'),
    }).default({ by: 'price', order: -1 });

const title = Joi.string(),
    description = Joi.string(),
    price = Joi.number().error(new Error("Allow only number")),
    location = Joi.object().keys({
        address: Joi.string(),
        point: Joi.object().keys({
            lng: Joi.number(),
            lat: Joi.number(),
        })
    }),
    status = Joi.string().valid(Object.values(STATUS)),
    minPrice = Joi.number().min(0).default(0).error(new Error("Min price is 0")),
    maxPrice = Joi.number().min(0).default(99999999).error(new Error("Min price is 0")),
    type = Joi.string().valid(TYPE).error(new Error(`Allow only ${TYPE} for type`)),
    term = Joi.string().valid(TERM).error(new Error(`Allow only ${TERM} for term`)),
    rooms = Joi.number().valid(ROOMS).error(new Error(`Allow only ${ROOMS} for rooms`)),
    photo = Joi.string().regex(OBJECT_ID_REGEX);

module.exports = {
    create: Joi.object().keys({
        title: title.required(),
        description: description.required(),
        price: price.required(),
        location: location,
        type: type.required(),
        term: term.required(),
        photos: Joi.array().items(photo),
        rooms: rooms.required(),
    }),

    list: Joi.object().keys({
        filter: Joi.object().keys({
            rooms: Joi.array().min(1).max(ROOMS.length).items(rooms).default(ROOMS),
            type: Joi.array().min(1).max(TYPE.length).items(type).default(TYPE),
            term: Joi.array().min(1).max(TERM.length).items(term).default(TERM),
            fromDate: Joi.date(),
            toDate: Joi.date(),
            status: Joi.array().items(status).optional(),
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
