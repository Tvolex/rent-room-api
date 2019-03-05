const CheckAuth = (req, res, next) => {
    if (req.session.uId) {
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
