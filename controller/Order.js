const Razorpay = require("razorpay");

const { Order } = require("../model/Order");
const { PaymentDetail } = require("../model/PaymentDetail");
const { Product } = require("../model/Product");
const { User } = require("../model/User");
const { sendMail, invoiceTemplate } = require("../services/common");
const { hmac_sha256 } = require("../utils/razorpay");
const { getStartDate } = require("../utils/helper");
const mongoose = require("mongoose");

const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

exports.fetchOrdersByUser = async (req, res) => {
  const { id } = req.user;
  try {
    const orders = await Order.find({ user: id });
    res.status(200).json(orders);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.createOrder = async (req, res) => {
  const order = new Order(req.body);
  // here we have to update stocks;

  for (let item of order.items) {
    let product = await Product.findOne({ _id: item.product.id });

    product.stock = (product.stock || 0) - Number(item.quantity);
    // product.$inc("stock", -1 * item.quantity);
    // for optimum performance we should make inventory outside of product.
    await product.save();
  }

  try {
    const doc = await order.save();
    const options = {
      amount: req.body.totalAmount * 100,
      currency: "INR",
      receipt: "receipt_1",
    };

    const responses = await razorpay.orders.create(options);

    const user = await User.findById(order.user);
    // we can use await for this also
    sendMail({
      to: user.email,
      html: invoiceTemplate(order),
      subject: "Order Received",
    });

    res.status(201).json({ doc, responses });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.verifyOrder = async (req, res) => {
  try {
    const { order_id, payment_id, razorpay_signature, userId } = req.body;
    console.log(req.body);
    await PaymentDetail.create({
      razorpay_payment_id: payment_id,
      razorpay_order_id: order_id,
      razorpay_signature,
      idUser: userId,
    });
    const generatedSignature = hmac_sha256(
      order_id + "|" + payment_id,
      process.env.KEY_SECRET
    );

    if (generatedSignature != razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment failed!" });
    }
    res.status(200).json({ success: true, message: "Payment successful!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findByIdAndDelete(id);
    res.status(200).json(order);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json(order);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.fetchAllOrders = async (req, res) => {
  // sort = {_sort:"price",_order="desc"}
  // pagination = {_page:1,_limit=10}
  let query = Order.find({ deleted: { $ne: true } });
  let totalOrdersQuery = Order.find({ deleted: { $ne: true } });

  if (req.query._sort && req.query._order) {
    query = query.sort({ [req.query._sort]: req.query._order });
  }

  const totalDocs = await totalOrdersQuery.count().exec();

  if (req.query._page && req.query._limit) {
    const pageSize = req.query._limit;
    const page = req.query._page;
    query = query.skip(pageSize * (page - 1)).limit(pageSize);
  }

  try {
    const docs = await query.exec();
    res.set("X-Total-Count", totalDocs);
    res.status(200).json(docs);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.totalOrders = async (req, res) => {
  try {
    const { id } = req.query;

    const period = req.query.period || "all";
    const startDate = getStartDate(period);

    let query = {
      createdAt: { $gte: startDate },
    };

    if (id) {
      const user = await User.findOne({ _id: id });

      if (user && user.role === "subadmin") {
        query = { ...query, owner: id };
      }
    }

    const totalOrders = await Order.countDocuments(query);

    res.status(200).json({ success: true, totalOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.totalSales = async (req, res) => {
  try {
    const { id } = req.query;
    const period = req.query.period || "all";
    const startDate = getStartDate(period);
    let query = {
      createdAt: { $gte: startDate },
    };

    if (id) {
      const user = await User.findOne({ _id: id });
      console.log(user);

      if (user && user.role == "subadmin") {
        query = { ...query, owner: new mongoose.Types.ObjectId(id) };
      }
    }

    console.log(query);

    const totalSales = await Order.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
        },
      },
    ]);

    console.log(totalSales);

    res
      .status(200)
      .json({ success: true, totalSales: totalSales[0]?.totalSales || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.totalPurchase = async (req, res) => {
  try {
    const { id } = req.query;

    const period = req.query.period || "all";
    const startDate = getStartDate(period);

    let query = {
      createdAt: { $gte: startDate },
      status: { $eq: "delivered" },
    };
    if (id) {
      const user = await User.findOne({ _id: id });

      if (user && user.role === "subadmin") {
        query = { ...query, owner: id };
      }
    }
    const totalPurchase = await Order.countDocuments(query);
    res.status(200).json({ success: true, data: totalPurchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.totalInventory = async (req, res) => {
  try {
    const { id } = req.query;
    let query = {};
    if (id) {
      query = {
        ownerId: new mongoose.Types.ObjectId(id),
      };
    }

    const totalInventory = await Product.aggregate([
      {
        $match: query,
      },
      { $group: { _id: null, totalInventory: { $sum: "$stock" } } },
    ]);
    res.status(200).json({ success: true, data: totalInventory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
