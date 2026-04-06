const { BrevoClient } = require('@getbrevo/brevo');
const env = require('../config/env');

// Initialize Brevo Client
const brevo = new BrevoClient({
    apiKey: env.brevo.apiKey || ''
});

/**
 * Sends an OTP email using Brevo.
 * @param {string} email - The recipient's email address.
 * @param {string} otp - The 6-digit OTP code to send.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function sendOTP(email, otp) {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
            subject: "رمز التحقق لاستعادة كلمة المرور",
            htmlContent: `
                <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #4f46e5; text-align: center;">رمز التحقق الخاص بك</h2>
                    <p>السلام عليكم،</p>
                    <p>لقد طلبتم رمز تحقق لإعادة تعيين كلمة المرور الخاصة بحسابكم.</p>
                    
                    <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${otp}</span>
                    </div>
                    
                    <p><strong>ملاحظة هامة:</strong> هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط.</p>
                    <p style="color: #e11d48; font-size: 0.9em;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة ولا تشارك الرمز مع أي شخص لضمان أمان حسابك.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="text-align: center; font-size: 0.8em; color: #94a3b8;">
                        مع تحيات فريق العمل
                    </p>
                </div>
            `,
            sender: { "name": "FittnaClass", "email": "m07am0mar@gmail.com" },
            to: [{ "email": email }]
        });

        console.log(`[EmailService] OTP sent successfully to ${email}. Message ID: ${result.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EmailService] Error sending OTP to ${email}:`, error?.response?.text || error.message);
        return false;
    }
}

module.exports = {
    sendOTP
};
