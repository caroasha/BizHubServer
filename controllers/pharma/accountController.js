const Account = require('../../models/pharma/Account');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, category, startDate, endDate, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate + 'T00:00:00.000Z'),
      $lte: new Date(endDate + 'T23:59:59.999Z'),
    };
  }
  if (search) {
    filter.description = { $regex: search, $options: 'i' };
  }

  const [accounts, total] = await Promise.all([
    Account.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Account.countDocuments(filter),
  ]);

  sendPaginated(res, accounts, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const create = asyncHandler(async (req, res) => {
  const account = await Account.create({
    ...req.body,
    tenantId: req.tenant._id,
    createdBy: req.user._id,
  });
  sendSuccess(res, account, 'Created', 201);
});

const update = asyncHandler(async (req, res) => {
  const account = await Account.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    req.body,
    { new: true }
  );
  if (!account) throw new ApiError(404, 'Not found');
  sendSuccess(res, account, 'Updated');
});

const remove = asyncHandler(async (req, res) => {
  const account = await Account.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.tenant._id,
  });
  if (!account) throw new ApiError(404, 'Not found');
  sendSuccess(res, null, 'Deleted');
});

const getSummary = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const { startDate, endDate } = req.query;
  const filter = { tenantId };
  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate + 'T00:00:00.000Z'),
      $lte: new Date(endDate + 'T23:59:59.999Z'),
    };
  }

  const [income, expense] = await Promise.all([
    Account.aggregate([
      { $match: { ...filter, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Account.aggregate([
      { $match: { ...filter, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  sendSuccess(res, {
    income: income[0]?.total || 0,
    expense: expense[0]?.total || 0,
    profit: (income[0]?.total || 0) - (expense[0]?.total || 0),
  });
});

module.exports = { getAll, create, update, remove, getSummary };