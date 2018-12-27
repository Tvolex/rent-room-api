const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const Schema = mongoose.Schema;

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

const Model = mongoose.model('Room', RoomSchema);

module.exports = {
    Origin: Model,

    async findByMatch(match) {
        return Model.find(match);
    },

    async findOne(match) {
        return Model.findOne(match);
    },

    async create(user) {
        return Model.insertOne(user);
    },

    remove(_id) {
        return Model.deleteOne({_id});
    },

    async getById(_id) {
        return Model.findOne({ _id });
    },
};
