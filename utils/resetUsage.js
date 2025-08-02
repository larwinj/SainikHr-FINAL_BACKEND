const cron = require('node-cron');
const { SubscribedPlan } = require('../models');

function nextMonthDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

cron.schedule('0 0 1 * *', async () => {
  try {
    await SubscribedPlan.update(
      {
        resumeViewCount: 0,
        profileVideoCount: 0,
        jobPostedCount: 0,
        resetAt: nextMonthDate(),
      },
      { where: {} }
    );
    console.log('Usage counters reset successfully');
  } catch (error) {
    console.error('Error resetting usage counters:', error);
  }
});