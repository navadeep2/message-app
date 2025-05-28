const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');

const router = express.Router();

// Search users by username substring (exclude self)
router.get('/users', async (req, res) => {
  try {
    const search = req.query.search || '';
    const regex = new RegExp(search, 'i');
    const users = await User.find({ username: regex, _id: { $ne: req.user.id } }).select('username _id');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get message history between logged-in user and another user (recipientId)
router.get('/history/:recipientId', async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId }
      ]
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'username')
      .populate('recipient', 'username');

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const sender = req.user.id;
    const { recipientId, text } = req.body;

    if (!recipientId || !text) {
      return res.status(400).json({ message: 'Recipient and text are required' });
    }

    const recipientExists = await User.findById(recipientId);
    if (!recipientExists) return res.status(400).json({ message: 'Recipient does not exist' });

    const message = new Message({
      sender,
      recipient: recipientId,
      text,
      timestamp: new Date(),
    });

    await message.save();

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
