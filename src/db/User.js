const Joi = require('joi');
const bcrypt = require('bcrypt');
const { getCollections } = require('../db/index');
const { SALT_ROUNDS } = require('../const');
const config = require('../config');
const _ = require('lodash');
const UserValidationSchema = require('../router/user/validation');
const ObjectId = require('mongodb').ObjectId;
const FileModel = require('./File');
const Collections = getCollections();

const UserProjection = {
    _id: 1,
    name: 1,
    surname: 1,
    email: 1,
    contact: 1,
    avatar: 1,
};

const UserModel = {

    async has (match) {
        return Collections.files.findOne(match);
    },

    async findOne(match) {
        return Collections.users.find(match).next();
    },

    async create(user) {
        return Collections.users.insertOne(user);
    },

    async register(userData) {
        return Joi.validate(
            userData,
            UserValidationSchema.create,
            async (err, { name, surname, email, password, confirmPassword, contact, avatar }) => {
                if (err) {
                    err.status = 400;
                    console.log(err.message);
                    throw err;
                }

                if (!_.isEqual(password, confirmPassword)) {
                    return customErr('Password didn\'t match with confirmation password', 400);
                }

                if (await this.has({ email })) {
                    return customErr('User with the same email already exist', 400);
                }

                if (await this.has({ contact })) {
                    return customErr('User with the same contact number already exist', 400);
                }

                const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

                const user = await Collections.users.create({name, surname, email, password: hashedPassword, contact, avatar});

                delete user.password;

                return user;
            });
    },

    remove(_id) {
        return Collections.users.deleteOne({_id});
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

        const user = await Collections.users.aggregate(pipeline).next();

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
        return Collections.users.findOneAndUpdate({
            _id,
        }, {
            $set: { session }
        }, {
            fields: UserProjection,
        });
    },
};

const customErr = (description, status) => {
    const error = new Error(description);
    error.status = status || 500;
    error.isCustom = true;
    throw error;
};

module.exports = UserModel;
