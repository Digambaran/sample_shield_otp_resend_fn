import { shared, env } from "@appblocks/node-sdk";
import { createTransport } from "nodemailer";

env.init();

const BLOCK_NAME = "SAMPLE_SHIELD_OTP_RESEND_FN";
const getFromBlockEnv = (name) => process.env[BLOCK_NAME.toLocaleUpperCase() + "_" + name];

const generateOTP = () => {
  const email_verification_code = String(Math.floor(100000 + Math.random() * 900000));
  const email_verification_expiry = new Date();
  email_verification_expiry.setMinutes(
    email_verification_expiry.getMinutes() + getFromBlockEnv("EMAIL_VERIFICATION_EXPIRY") || 10
  );
  return { email_verification_code, email_verification_expiry };
};

async function sendMail({ to, subject, text, html }) {
  const from = getFromBlockEnv("SHIELD_MAILER_EMAIL");
  const password = getFromBlockEnv("SHIELD_MAILER_PASSWORD");
  const host = getFromBlockEnv("SHIELD_MAILER_HOST");
  const port = getFromBlockEnv("SHIELD_MAILER_PORT");

  const transporter = createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user: from, pass: password },
  });

  console.log(`to:${to}`);
  console.log(`from:${from}`);
  console.log(`html:${html}`);
  console.log(`text:${text}`);
  console.log(`subject:${subject}`);

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  console.log("info");
  console.log(info);
  if (!info) throw new Error("Email not sent");
  return info;
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
    if (!userData || userData.email_verified) {
      // for security
      sendResponse(res, 200, {
        err: true,
        msg: "successfully geenrated new otp",
        data: {},
      });
      return;
    }

    // generate new OTP
    const { email_verification_code, email_verification_expiry } = generateOTP();

    await prisma.users.update({
      where: { email },
      data: {
        email_verified: false,
        email_verification_code,
        email_verification_expiry,
      },
    });

    try {
      await sendMail({
        to: email,
        subject: "verification code for your account",
        text: email_verification_code,
        html: email_verification_code,
      });
    } catch (error) {
      console.log(error);
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
