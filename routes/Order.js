const express = require("express");
const {
  createOrder,
  fetchOrdersByUser,
  deleteOrder,
  updateOrder,
  fetchAllOrders,
  verifyOrder,
  totalSales,
  totalOrders,
  totalInventory,
  totalPurchase,
} = require("../controller/Order");

const router = express.Router();
//  /orders is already added in base path
router
  .post("/", createOrder)
  .get("/own/", fetchOrdersByUser)
  .delete("/:id", deleteOrder)
  .patch("/:id", updateOrder)
  .get("/", fetchAllOrders);

router.post("/verify", verifyOrder);

router.get("/total-orders", totalOrders);
router.get("/total-sales", totalSales);

router.get("/total-inventory", totalInventory);
router.get("/total-purchase", totalPurchase);

router.get("/api-key", async (req, res) => {
  try {
    res.status(200).json({ data: process.env.KEY_ID });
  } catch (err) {
    res.status(500).json(err);
  }
});

exports.router = router;
