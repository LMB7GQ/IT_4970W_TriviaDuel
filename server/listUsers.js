const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/user');

async function list() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find().select('username rank wins losses streak').sort({ rank: -1 });
    console.log('Total users:', users.length);
    console.log('--------------------------------------------------');
    console.log('Username\tRank\tWins\tLosses\tStreak');
    console.log('--------------------------------------------------');
    users.forEach(u => {
      console.log(`${u.username}\t${u.rank}\t${u.wins}\t${u.losses}\t${u.streak}`);
    });
    console.log('--------------------------------------------------');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

list();
