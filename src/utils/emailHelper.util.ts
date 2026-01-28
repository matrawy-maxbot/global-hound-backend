import { createTransport, Transporter } from 'nodemailer';
import { EMAIL_USER, EMAIL_PASSWORD } from '../config/notifications.config.js';

/**
 * واجهة خيارات البريد الإلكتروني
 */
interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
}

const transporter: Transporter = createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
    },
});

/**
 * إرسال بريد إلكتروني
 * @param to - عنوان المستلم
 * @param subject - موضوع البريد
 * @param text - نص الرسالة
 * @returns Promise<boolean>
 */
const sendEmail = async (to: string, subject: string, text: string): Promise<boolean> => {
    const mailOptions: MailOptions = {
        from: EMAIL_USER,
        to,
        subject,
        text
    };
    await transporter.sendMail(mailOptions);
    return true;
};

export default { sendEmail };
