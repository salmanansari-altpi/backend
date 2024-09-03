const mongoose = require("mongoose");

const PaymentDetailSchema = new mongoose.Schema({
  razorpay_payment_id: {
    type: String,
    required: true,
  },
  razorpay_order_id: {
    type: String,
    required: true,
  },
  razorpay_signature: {
    type: String,
    required: true,
  },
  idUser: {
    type: mongoose.Schema.Types.ObjectId,
  },
});

// Create the model
const PaymentDetail = mongoose.model("PaymentDetail", PaymentDetailSchema);

// Export the model
module.exports = { PaymentDetail };
