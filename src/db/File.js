const mongoose = require('mongoose');
const Joi = require('joi');
const _ = require('lodash');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Types;
const { OBJECT_ID_REGEX } = require('../const');

const FileSchema = new Schema(
    {
        name: { type : String },
        originalName: { type: String },
    },
    {
        collection: 'files',
    }
);

module.exports = {
    Model: mongoose.model('File', FileSchema),

    remove(_id) {
        return this.Model.findOneAndDelete({_id});
    },

    async getById(_id) {
        return isIdValid(_id) ? this.Model.findOne({ _id }) : null;
    },
};

const isIdValid = (id) => {
    const result = Joi.validate(id, Joi.string().regex(OBJECT_ID_REGEX));

    return !result.error;
}
