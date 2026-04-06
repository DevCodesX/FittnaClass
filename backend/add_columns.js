const sequelize = require('./src/config/database');

async function addColumns() {
    try {
        await sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN reset_otp VARCHAR(255) NULL COMMENT 'Hashed OTP for password reset',
            ADD COLUMN reset_otp_expires_at DATETIME NULL,
            ADD COLUMN last_otp_sent_at DATETIME NULL
        `);
        console.log("Columns added successfully.");
    } catch (err) {
        if (err.parent && err.parent.code === 'ER_DUP_FIELDNAME') {
             console.log("Columns already exist.");
        } else {
             console.error("Error adding columns:", err);
        }
    } finally {
        await sequelize.close();
    }
}

addColumns();
