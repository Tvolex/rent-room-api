const _ = require('lodash');
const ObjectId = require('mongodb').ObjectId;
const { getCollections } = require('.');
const Collections = getCollections();

module.exports = {
    async justMiddleware (req, res, next) {
        const session = await Collections.sessions.find({ sessionId: req.sessionID }).next();

        if (!session) {
            await Collections.sessions.insertOne({
                user: null,
                sessionId: req.sessionID,
                views: [],
                expireAt: new Date(Date.now() + 3000)
            });
        }

        console.log('SessionID: ' + req.sessionID);

        next();
    },

    async isRoomViewedBySession (roomId, sessionId) {
        return Collections.sessions.find({
            sessionId,
            views: ObjectId(roomId),
        }).hasNext()
    },

    async trackSessionForView (roomId, sessionId) {
        return Collections.sessions.findOneAndUpdate({
            sessionId,
        }, {
            $push: {
                views: ObjectId(roomId),
            }
        });
    },

    async updateUserSession(user, update){
        const { expires, sessionId } = update;

        const $set = {};

        if (expires)
            $set.expires = expires;

        if (sessionId)
            $set.sessionId = sessionId;

        return Collections.sessions.findOneAndUpdate({ user: ObjectId(user) }, { $set });
    },
};
