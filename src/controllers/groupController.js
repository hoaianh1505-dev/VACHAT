const groupService = require('../services/groupService');
const asyncHandler = require('../utils/asyncHandler');
const response = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
    const groups = await groupService.listGroups();
    return response.ok(res, { groups });
});

exports.members = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return response.err(res, 'Unauthorized', 401);
    const groupId = req.query && req.query.groupId;
    if (!groupId) return response.err(res, 'Missing groupId', 400);
    const members = await groupService.getMembers({ groupId, userId: String(sessionUser._id) });
    return response.ok(res, { members });
});

exports.create = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return response.err(res, 'Unauthorized', 401);

    const { name, members } = req.body;
    const group = await groupService.createGroup({
        name,
        members,
        creatorId: String(sessionUser._id),
        io: req.app.get('io')
    });

    return response.ok(res, { success: true, group });
});

exports.addMember = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.body;
    await groupService.addMember({ groupId, userId });
    return response.ok(res, { success: true });
});

exports.removeMember = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.body;
    await groupService.removeMember({ groupId, userId });
    return response.ok(res, { success: true });
});

// DELETE group (remove group entity, its messages and references)
exports.delete = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return response.err(res, 'Unauthorized', 401);

    const { groupId } = req.body || {};
    const io = req.app.get('io');
    const result = await groupService.deleteGroup({ userId: String(sessionUser._id), groupId: String(groupId), io });
    return response.ok(res, { success: true, deleted: result.deletedCount || 0 });
});
