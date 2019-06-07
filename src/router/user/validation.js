const Joi = require('joi');
Joi.ObjectId = require('joi-objectid')(Joi);
const search = Joi.string().allow(['']).default(null);

const name = Joi.string().regex(/[a-zA-Zа-яёА-ЯЁ]/u).min(3).max(30);
const surname = Joi.string().regex(/[a-zA-Zа-яёА-ЯЁ]/u).min(3).max(30);
const email = Joi.string().email({ minDomainAtoms: 2 });
const contact = Joi.string();
const admin = Joi.boolean();
const avatar = Joi.string().allow(null).default(null);
const password = Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/);

module.exports = {
    create: Joi.object().keys({
        name: name.required(),
        surname: surname.required(),
        email: email.required(),
        contact: contact.required(),
        admin: admin.optional(),
        avatar: avatar.optional(),
        password: password.required(),
        confirmPassword: password.required(),
    }),

    get: Joi.object().keys({
        filter: Joi.object().keys({
            fromDate: Joi.date(),
            toDate: Joi.date(),
        }),
        search,
    }),

};
