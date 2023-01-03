import { shared, env } from "@appblocks/node-sdk";

env.init();

const generateOTP = () => {
  const email_verification_code = String(
    Math.floor(100000 + Math.random() * 900000)
  );
  const email_verification_expiry = new Date();
  email_verification_expiry.setMinutes(
    email_verification_expiry.getMinutes() +
      process.env.email_verification_expiry || 10
  );
  return { email_verification_code, email_verification_expiry };
};

function sendEmailVerificationCode({ email, email_verification_code }) {
  return sendMail({
    emailTo: email,
    Subject: "verification code for your account",
    Text: email_verification_code,
    Html: email_verification_code,
  });
}
const sample_shield_otp_resend_fn = async (req, res) => {
  const { prisma, getBody, sendResponse } = await shared.getShared();

  // health check
  if (req.params["health"] === "health") {
    sendResponse(res, 200, { success: true, msg: "Health check success" });
    return;
  }

  const { email } = await getBody(req);
  try {
    const userData = await prisma.users.findFirst({ where: { email } });
    if (!userData) {
      sendResponse(res, 404, {
        err: true,
        msg: "email not found",
        data: {},
      });
      return;
    }

    // generate new OTP
    const { email_verification_code, email_verification_expiry } =
      generateOTP();

    const userDataPayload = await prisma.users.update({
      where: { email },
      data: {
        email_verified: false,
        email_verification_code,
        email_verification_expiry,
      },
    });
    console.log("userdatapaylodsd", userDataPayload);
    if (!(await sendEmailVerificationCode(email, email_verification_code))) {
      sendResponse(res, 500, {
        err: true,
        msg: "server error",
        data: {},
      });
      return;
    }

    sendResponse(res, 200, {
      err: true,
      msg: "successfully geenrated new otp",
      data: {},
    });
    return;
  } catch (error) {
    console.log(error);
    sendResponse(res, 500, {
      err: true,
      msg: "server error",
      data: {},
    });
    return;
  }
};

export default sample_shield_otp_resend_fn;
