module.exports = {
    OBJECT_ID_REGEX: /^[0-9a-fA-F]{24}$/,
    SALT_ROUNDS: 10,
    STATUS: {
        VERIFYING: "Verifying",
        REJECTED: "Rejected",
        VERIFIED: "Verified"
    },
    ROOMS: [
        1,
        2,
        3,
        4,
    ],
    TYPE: [
        "Apartment",
        "Room",
        "Hotel",
        "Hostel",
    ],
    TERM : [
        "Short Term",
        "Long Term",
    ]
};
