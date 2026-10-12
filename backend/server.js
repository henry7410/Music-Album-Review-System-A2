
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();


const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/albumRoutes'));
app.use('/api', require('./routes/reviewRoutes'));
app.use('/api', require('./routes/flaggedReviewRoutes'));

// Serves the built frontend in production, behind nginx (see README's
// deployment checklist) — nginx only reverse-proxies port 80 to this app on
// 5001, it does not serve static files itself. Guarded on the build
// directory existing so local dev (no `frontend/build`, running the CRA dev
// server separately on :3000) is unaffected. Must be mounted after every
// /api route above, or the catch-all below would swallow API requests.
const frontendBuildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
}

// Export the app object for testing
if (require.main === module) {
    connectDB();
    // If the file is run directly, start the server
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }


module.exports = app
