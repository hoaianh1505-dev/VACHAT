const Group = require('../models/Group');

// ...implement group business logic...

exports.getGroupsOfUser = async (userId) => {
    return await Group.find({ members: userId }).lean();
};

exports.createGroup = async ({ name, members }) => {
    const group = new Group({ name, members });
    return await group.save();
};
