const mongoose = require('mongoose');
const { SALT_ROUNDS } = require('../const');
const config = require('../config');
const _ = require('lodash');
const ObjectId = mongoose.Types.ObjectId;
const FileModel = require('./File');
const Schema = mongoose.Schema;

const UserSchema = new Schema(
    {
        name: String,
        surname: String,
        email: String,
        password: String,
        session: Object,
    }, {
        collection: 'users'
    }
);

const UserProjection = {
    _id: 1,
    name: 1,
    surname: 1,
    email: 1,
    avatar: 1,
};

const UserModel = {
    Model: mongoose.model('User', UserSchema),

    async findOne(match) {
        return this.Model.findOne(match).lean().exec();
    },

    async create(user) {
        return this.Model.insertOne(user);
    },

    remove(_id) {
        return this.Model.deleteOne({_id});
    },

    async getUserById(id) {
        const pipeline = [
            {
                $match: {
                    _id: ObjectId(id),
                }
            },
            {
                $project: UserProjection,
            }
        ];

        const user = await this.Model.aggregate(pipeline).cursor({}).exec().next();

        if (!user) {
            throw new Error("Such user doesn't exist!").status = 400;
        }

        const avatar = await FileModel.getById(user.avatar);

        if (_.isEqual(avatar.type, 'error')) {
            throw new Error(avatar.message).status = avatar.message;
        }

        user.avatar = avatar;

        return user;
    },

    async updateUserSession({_id, session}){
        return this.Model.findOneAndUpdate({
            _id,
        }, {
            $set: { session }
        }, {
            fields: UserProjection,
        });
    },
};

module.exports = { UserSchema, UserModel };
