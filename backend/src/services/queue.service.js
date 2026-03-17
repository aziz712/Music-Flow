// Using p-queue v6 (CommonJS compatible)
const { default: PQueue } = require('p-queue');

// Render free tier has strict CPU/Memory limits
// Setting concurrency to 2 ensures we don't spam yt-dlp instances and crash
const streamQueue = new PQueue({ concurrency: 2 });

const addJob = async (jobFn) => {
    return await streamQueue.add(jobFn);
};

const getProcessingCount = () => {
    return streamQueue.pending;
};

const getWaitingCount = () => {
    return streamQueue.size;
};

module.exports = {
    addJob,
    getProcessingCount,
    getWaitingCount
};
