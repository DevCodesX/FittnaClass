const { sendOTP } = require('./src/services/emailService');

(async () => {
    const success = await sendOTP("m07amdmar@gmail.com", "123456");
    console.log("Success:", success);
})();
