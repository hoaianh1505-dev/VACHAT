const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/avchat', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
