const express = require('express');
const router = express.Router();
const { createPoll, votePoll, getPolls } = require('../controllers/pollsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/project/:projectId', createPoll);
router.get('/project/:projectId', getPolls);
router.post('/:pollId/vote', votePoll);

module.exports = router;
