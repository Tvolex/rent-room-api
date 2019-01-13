const mongoose = require('mongoose');
const Joi = require('joi');
const Schema = mongoose.Schema;
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

    async ListRooms({count, page}) {
        const pipeline = [
            {
                $skip: page * count
            },
            {
                $limit: count
            }
        ];
        return this.Model.aggregate(pipeline).toArray();
    },

    async findOne(match) {
        return this.Model.findOne(match);
    },

    async create(user) {
        return this.Model.insertOne(user);
    },

    remove(_id) {
        return this.Model.deleteOne({_id});
    },

    async getById(_id) {
        return isIdValid(_id) ? this.Model.findOne({ _id }) : null;
    },
};

const isIdValid = (id) => {
    const result = Joi.validate(id, Joi.string().regex(OBJECT_ID_REGEX));

    return !result.error;
}
