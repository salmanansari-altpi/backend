const express = require("express");
const {
  createUser,
  loginUser,
  checkAuth,
  resetPasswordRequest,
  resetPassword,
  logout,
  verifyOtp,
} = require("../controller/Auth");
const passport = require("passport");

const router = express.Router();
//  /auth is already added in base path
router.post("/signup", verifyOtp);
router
  .post("/verify-otp", createUser)
  .post("/login", passport.authenticate("local"), loginUser)
  .get("/check", passport.authenticate("jwt"), checkAuth)
  .get("/logout", logout)
  .post("/reset-password-request", resetPasswordRequest)
  .post("/reset-password", resetPassword);
exports.router = router;
