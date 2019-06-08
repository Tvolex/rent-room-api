const UserModel = require('../../db/User');
const _ = require('lodash');

const AdminAccess = async (req, res, next) => {
    const {
        session: {
            uId,
            id
        } = {},
    } = req;

    let user;
    try {
        user = uId && id ? await UserModel.checkUserSession(uId, id) : null;
    } catch (err) {
        return res.status(err.status || 500).send({type: 'error', message: err.message});
    }

    if (!user || _.isEmpty(req.session) || !id || !uId) {
        return res.status(401)
            .send({
                type: 'error',
                message: "Not authorized"
            })
    }

    if (!user.admin) {
        return res.status(403)
            .send({
                type: 'error',
                message: "Forbidden"
            })
    }

    return next();
};

module.exports = AdminAccess;
