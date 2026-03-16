const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Question = require('./models/question');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to:', process.env.MONGO_URI.split('@').pop()); // Hide credentials
    
    const count = await Question.countDocuments();
    console.log(`Total questions in 'questions' collection: ${count}`);

    if (count > 0) {
      const sample = await Question.findOne();
      console.log('Sample question ID:', sample._id);
      console.log('Sample question text:', sample.question);
      console.log('Sample question difficulty:', sample.difficulty);
      console.log('Sample question category:', sample.category);

      const difficulties = await Question.distinct('difficulty');
      console.log('Distinct difficulties in DB:', difficulties);
    } else {
      // Let's check if they are in a different collection name
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections in DB:', collections.map(c => c.name));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

check();
