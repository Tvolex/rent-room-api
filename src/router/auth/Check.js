const _ = require('lodash');
const CheckAuth = (req, res, next) => {
    const {
        session: {
            uId,
            id
        } = {},
    } = req;

    if (!_.isEmpty(req.session) && uId && id) {
        return next();
    } else {
        return res.status(401)
            .send({
                type: 'error',
                message: "Not authorized"
            })
    }
};

module.exports = CheckAuth;
