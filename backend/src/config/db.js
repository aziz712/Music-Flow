const mongoose = require('mongoose');



const connectDB = async () => {
    try {
        // Check if MONGO_URI is defined
        if (!process.env.MONGO_URI) {
            
            return;
        }

        await mongoose.connect(process.env.MONGO_URI);
        
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        
        // Ensure we don't crash
    }
};

mongoose.connection.on('error', err => {
    // Only log if it's NOT the common connection error we already caught
    if (!err.message.includes('EREFUSED')) {
        console.error('❌ MongoDB Runtime Error:', err.message);
    }
});

module.exports = connectDB;
