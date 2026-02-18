const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, pinMessage, unpinMessage, getPinnedMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/project/:projectId', getMessages);
router.post('/project/:projectId', sendMessage);
router.get('/project/:projectId/pinned', getPinnedMessages);
router.put('/:id/pin', pinMessage);
router.delete('/:id/pin', unpinMessage);

module.exports = router;
