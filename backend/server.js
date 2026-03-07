require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
require('./src/jobs/cleanup.job');
require('./src/jobs/recommendation.job');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.listen(PORT, () => {
    
});
