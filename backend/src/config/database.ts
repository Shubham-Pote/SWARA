import mongoose from 'mongoose';

export default async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/language-learning', {
      serverSelectionTimeoutMS: 5000
    });
  }
}
