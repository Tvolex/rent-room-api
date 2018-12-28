const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
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
};

const UserModel = {
    Model: mongoose.model('User', UserSchema),

    async findOne(match) {
        return this.Model.findOne(match);
    },

    async create(user) {
        return this.Model.insertOne(user);
    },

    remove(_id) {
        return this.Model.deleteOne({_id});
    },

    async getById(id) {
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

        return this.Model.aggregate(pipeline).next();
    },

    async updateUserSession({_id, session}){
        return this.Model.findOneAndUpdate({
            _id: ObjectId(_id)
        }, {
            $set: { session }
        }, {
            projection: UserProjection,
        });
    },
};

module.exports = { UserSchema, UserModel };
