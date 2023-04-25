const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");

const sendMail = asyncHandler(async ({ email, html }) => {
  // nodemailer.createTransport(): là một phương thức được cung cấp bởi thư viện Nodemailer trong Node.js để tạo một đối tượng transport. Đối tượng này xác định cách Nodemailer sẽ gửi email

  // Phương thức này lấy một đối tượng cấu hình làm đối số, chứa các chi tiết cần thiết để tạo đối tượng transport. Đối tượng cấu hình thường bao gồm các thuộc tính sau:
  // - host: tên máy chủ của máy chủ SMTP được sử dụng để gửi email
  // - port: số cổng port của máy chủ SMTP
  // - secure: một giá trị boolean cho biết có sử dụng kết nối SSL/TLS an toàn hay không
  // - auth: một đối tượng chứa các chi tiết xác thực như tên người dùng và mật khẩu

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_NAME, // generated ethereal user
      pass: process.env.EMAIL_APP_PASSWORD, // generated ethereal password
    },
  });

  // Khi đối tượng transport được khởi tạo, có thể sử dụng phương thức transporter.sendMail() để gửi email.
  // Phương pháp sendMail() lấy một đối tượng email message làm đối số, bao gồm địa chỉ email của người gửi, địa chỉ email của người nhận, chủ đề email và nội dung email
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Tech-Shop" <no-reply@techshop.com>', // sender address
    to: email, // list of receivers
    subject: "Forgot password", // Subject line
    html: html, // html body
  });

  return info;
});

module.exports = sendMail;
