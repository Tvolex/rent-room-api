const Joi = require('joi');
Joi.ObjectId = require('joi-objectid')(Joi);
const search = Joi.string().allow(['']).default(null);

const email = Joi.string().email({ minDomainAtoms: 2 });
const password = Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/);
const name = Joi.string().regex(/[a-zA-Zа-яёА-ЯЁ]/u).min(3).max(30);
const surname = Joi.string().regex(/[a-zA-Zа-яёА-ЯЁ]/u).min(3).max(30);

module.exports = {
    create: Joi.object().keys({
        email: email.required(),
        name: name.required(),
        surname: surname.required(),
        password: password.required(),
    }),

    get: Joi.object().keys({
        filter: Joi.object().keys({
            fromDate: Joi.date(),
            toDate: Joi.date(),
        }),
        search,
    }),

};
