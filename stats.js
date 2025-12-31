const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Path to your Telegram export JSON file
const INPUT_FILE_PATH = '<YourFilePathHere>';

// Path to output directory for stats files
const OUTPUT_DIR_PATH = '<YourFilePathHere>';

// Number of top users to include in rankings
const TOP_USERS_LIMIT = 20;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Increments a counter in an object, initializing to 1 if key doesn't exist
 */
function incrementCounter(obj, key) {
    obj[key] = (obj[key] || 0) + 1;
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
function formatDate(date) {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

/**
 * Formats a Date object to YYYY-MM string for monthly grouping
 */
function formatMonth(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Generates a timestamp string for file naming
 */
function generateTimestamp() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}_${now.getUTCHours()}-${now.getUTCMinutes()}-${now.getUTCSeconds()}`;
}

/**
 * Sorts an object by values in descending order and returns top N entries
 */
function getTopEntries(obj, limit) {
    return Object.fromEntries(
        Object.entries(obj)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
    );
}

/**
 * Finds the key with the maximum value in an object
 */
function findPeak(obj) {
    const entries = Object.entries(obj);
    if (entries.length === 0) return { key: null, value: 0 };
    const [key, value] = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
    return { key, value };
}

/**
 * Extracts text content from a Telegram message
 * Handles both string and array text formats
 */
function extractTextContent(message) {
    if (!message.text) return '';
    if (typeof message.text === 'string') return message.text;
    if (Array.isArray(message.text)) {
        return message.text
            .map(part => typeof part === 'string' ? part : (part.text || ''))
            .join('');
    }
    return '';
}

/**
 * Extracts emojis from text using Unicode emoji pattern
 */
function extractEmojis(text) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    return text.match(emojiRegex) || [];
}

// ============================================================================
// STAT CALCULATOR MODULES
// Each module is a self-contained function that calculates specific statistics
// ============================================================================

/**
 * MODULE: Basic Statistics
 * Calculates: totalMessages, totalUsers, averageMessagesPerDay
 */
function calculateBasicStats(messages, dailyActivity) {
    const totalMessages = messages.length;
    const uniqueUsers = new Set(messages.map(m => m.from).filter(Boolean));
    const totalUsers = uniqueUsers.size;
    const totalDays = Object.keys(dailyActivity).length;
    const averageMessagesPerDay = totalDays > 0 ? Math.round(totalMessages / totalDays * 100) / 100 : 0;
    const averageMessagesPerUser = totalUsers > 0 ? Math.round(totalMessages / totalUsers * 100) / 100 : 0;

    return {
        totalMessages,
        totalUsers,
        totalDays,
        averageMessagesPerDay,
        averageMessagesPerUser
    };
}

/**
 * Validates if a date string produces a valid Date object
 */
function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * MODULE: Daily Activity
 * Calculates: message count per calendar day
 */
function calculateDailyActivity(messages) {
    const dailyActivity = {};

    messages.forEach(message => {
        if (!message.date || !isValidDate(message.date)) return;
        const date = new Date(message.date);
        const day = formatDate(date);
        incrementCounter(dailyActivity, day);
    });

    return dailyActivity;
}

/**
 * MODULE: Monthly Activity
 * Calculates: message count per month
 */
function calculateMonthlyActivity(messages) {
    const monthlyActivity = {};

    messages.forEach(message => {
        if (!message.date || !isValidDate(message.date)) return;
        const date = new Date(message.date);
        const month = formatMonth(date);
        incrementCounter(monthlyActivity, month);
    });

    return monthlyActivity;
}

/**
 * MODULE: User Activity
 * Calculates: message count per user, top users with percentages
 */
function calculateUserActivity(messages, topLimit = TOP_USERS_LIMIT) {
    const userActivity = {};
    const totalMessages = messages.length;

    messages.forEach(message => {
        if (message.from) {
            incrementCounter(userActivity, message.from);
        }
    });

    // Get top users
    const topUsers = getTopEntries(userActivity, topLimit);

    // Calculate percentages for top users
    const topUsersWithPercentage = {};
    Object.entries(topUsers).forEach(([user, count]) => {
        topUsersWithPercentage[user] = {
            count,
            percentage: Math.round(count / totalMessages * 10000) / 100
        };
    });

    return {
        userActivity: topUsers,
        userActivityWithPercentage: topUsersWithPercentage,
        allUsersCount: Object.keys(userActivity).length
    };
}

/**
 * MODULE: Active Hours
 * Calculates: message distribution by hour of day (0-23 UTC)
 */
function calculateActiveHours(messages) {
    const activeHours = {};

    messages.forEach(message => {
        if (!message.date || !isValidDate(message.date)) return;
        const date = new Date(message.date);
        const hour = date.getUTCHours();
        incrementCounter(activeHours, hour);
    });

    return activeHours;
}

/**
 * MODULE: Active Days
 * Calculates: message distribution by day of week (0=Sunday to 6=Saturday)
 */
function calculateActiveDays(messages) {
    const activeDays = {};

    messages.forEach(message => {
        if (!message.date || !isValidDate(message.date)) return;
        const date = new Date(message.date);
        const weekDay = date.getUTCDay();
        incrementCounter(activeDays, weekDay);
    });

    return activeDays;
}

/**
 * MODULE: Peak Analysis
 * Finds: peak day, peak hour, peak month
 */
function calculatePeaks(dailyActivity, activeHours, monthlyActivity) {
    const peakDay = findPeak(dailyActivity);
    const peakHour = findPeak(activeHours);
    const peakMonth = findPeak(monthlyActivity);

    return {
        peakDay: { date: peakDay.key || 'N/A', messages: peakDay.value },
        peakHour: { hour: peakHour.key !== null ? parseInt(peakHour.key) : null, messages: peakHour.value },
        peakMonth: { month: peakMonth.key || 'N/A', messages: peakMonth.value }
    };
}

/**
 * MODULE: Activity Streaks
 * Calculates: longest consecutive days with activity
 */
function calculateActivityStreaks(dailyActivity) {
    const dates = Object.keys(dailyActivity)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b);

    if (dates.length === 0) {
        return { longestStreak: 0, streakStart: 'N/A', streakEnd: 'N/A' };
    }

    let longestStreak = 1;
    let currentStreak = 1;
    let streakStart = dates[0];
    let streakEnd = dates[0];
    let currentStart = dates[0];

    for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);

        // Use Math.round to handle DST variations (23 or 25 hour days)
        if (Math.round(diffDays) === 1) {
            currentStreak++;
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
                streakStart = currentStart;
                streakEnd = dates[i];
            }
        } else {
            currentStreak = 1;
            currentStart = dates[i];
        }
    }

    return {
        longestStreak,
        streakStart: formatDate(streakStart),
        streakEnd: formatDate(streakEnd)
    };
}

/**
 * MODULE: User Timeline
 * Calculates: first and last message date for each user
 */
function calculateUserTimeline(messages, topLimit = TOP_USERS_LIMIT) {
    const userTimeline = {};

    messages.forEach(message => {
        if (!message.from) return;
        if (!message.date || !isValidDate(message.date)) return;

        const date = new Date(message.date);
        const user = message.from;

        if (!userTimeline[user]) {
            userTimeline[user] = { firstSeen: date, lastSeen: date, messageCount: 0 };
        } else {
            if (date < userTimeline[user].firstSeen) userTimeline[user].firstSeen = date;
            if (date > userTimeline[user].lastSeen) userTimeline[user].lastSeen = date;
        }
        userTimeline[user].messageCount++;
    });

    // Get top users by message count and format dates
    const sortedUsers = Object.entries(userTimeline)
        .sort((a, b) => b[1].messageCount - a[1].messageCount)
        .slice(0, topLimit);

    const topUserTimeline = {};
    sortedUsers.forEach(([user, data]) => {
        const daySpan = (data.lastSeen - data.firstSeen) / (1000 * 60 * 60 * 24);
        topUserTimeline[user] = {
            firstSeen: formatDate(data.firstSeen),
            lastSeen: formatDate(data.lastSeen),
            messageCount: data.messageCount,
            activeDays: Math.max(1, Math.ceil(daySpan) + 1)
        };
    });

    return topUserTimeline;
}

/**
 * MODULE: Media Type Distribution
 * Calculates: count of different media types (photo, video, sticker, etc.)
 */
function calculateMediaTypes(messages) {
    const mediaTypes = {
        text: 0,
        photo: 0,
        video: 0,
        voice_message: 0,
        video_message: 0,
        sticker: 0,
        animation: 0,
        document: 0,
        audio: 0,
        poll: 0,
        location: 0,
        contact: 0,
        other: 0
    };

    messages.forEach(message => {
        if (message.photo) {
            mediaTypes.photo++;
        } else if (message.media_type === 'video_file' || message.media_type === 'video') {
            mediaTypes.video++;
        } else if (message.media_type === 'voice_message') {
            mediaTypes.voice_message++;
        } else if (message.media_type === 'video_message') {
            mediaTypes.video_message++;
        } else if (message.media_type === 'sticker') {
            mediaTypes.sticker++;
        } else if (message.media_type === 'animation') {
            mediaTypes.animation++;
        } else if (message.file || message.media_type === 'document') {
            mediaTypes.document++;
        } else if (message.media_type === 'audio_file') {
            mediaTypes.audio++;
        } else if (message.poll) {
            mediaTypes.poll++;
        } else if (message.location_information) {
            mediaTypes.location++;
        } else if (message.contact_information) {
            mediaTypes.contact++;
        } else if (message.text) {
            mediaTypes.text++;
        } else {
            mediaTypes.other++;
        }
    });

    // Remove zero-count entries for cleaner output
    return Object.fromEntries(
        Object.entries(mediaTypes).filter(([_, count]) => count > 0)
    );
}

/**
 * MODULE: Message Length Statistics
 * Calculates: average, min, max, and distribution of message lengths
 */
function calculateMessageLengthStats(messages) {
    const lengths = [];
    const lengthDistribution = {
        'empty (0)': 0,
        'short (1-50)': 0,
        'medium (51-200)': 0,
        'long (201-500)': 0,
        'very_long (500+)': 0
    };

    messages.forEach(message => {
        const text = extractTextContent(message);
        const length = text.length;
        lengths.push(length);

        if (length === 0) lengthDistribution['empty (0)']++;
        else if (length <= 50) lengthDistribution['short (1-50)']++;
        else if (length <= 200) lengthDistribution['medium (51-200)']++;
        else if (length <= 500) lengthDistribution['long (201-500)']++;
        else lengthDistribution['very_long (500+)']++;
    });

    const sortedLengths = [...lengths].sort((a, b) => a - b);
    const sum = lengths.reduce((a, b) => a + b, 0);
    const avg = lengths.length > 0 ? Math.round(sum / lengths.length * 100) / 100 : 0;
    const median = lengths.length > 0 ? sortedLengths[Math.floor(lengths.length / 2)] : 0;

    return {
        averageLength: avg,
        medianLength: median,
        minLength: sortedLengths[0] || 0,
        maxLength: sortedLengths[sortedLengths.length - 1] || 0,
        lengthDistribution
    };
}

/**
 * MODULE: Emoji Statistics
 * Calculates: most used emojis and total emoji count
 */
function calculateEmojiStats(messages, topLimit = 20) {
    const emojiCounts = {};
    let totalEmojis = 0;

    messages.forEach(message => {
        const text = extractTextContent(message);
        const emojis = extractEmojis(text);

        emojis.forEach(emoji => {
            incrementCounter(emojiCounts, emoji);
            totalEmojis++;
        });
    });

    const topEmojis = getTopEntries(emojiCounts, topLimit);
    const messagesWithEmojis = messages.filter(m => extractEmojis(extractTextContent(m)).length > 0).length;

    return {
        totalEmojis,
        uniqueEmojis: Object.keys(emojiCounts).length,
        messagesWithEmojis,
        topEmojis
    };
}

/**
 * MODULE: Reply Chain Analysis
 * Calculates: reply patterns and conversation threading
 */
function calculateReplyChains(messages) {
    let repliesCount = 0;
    let forwardsCount = 0;
    const replyToUsers = {};

    messages.forEach(message => {
        if (message.reply_to_message_id) {
            repliesCount++;
            if (message.from) {
                incrementCounter(replyToUsers, message.from);
            }
        }
        if (message.forwarded_from) {
            forwardsCount++;
        }
    });

    const totalMessages = messages.length;
    const replyPercentage = totalMessages > 0 ? Math.round(repliesCount / totalMessages * 10000) / 100 : 0;
    const topRepliers = getTopEntries(replyToUsers, 10);

    return {
        totalReplies: repliesCount,
        totalForwards: forwardsCount,
        replyPercentage,
        topRepliers
    };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main function that orchestrates all stat calculations
 */
function main() {
    console.log('Reading Telegram export file...');
    const rawdata = fs.readFileSync(INPUT_FILE_PATH);
    const telegramData = JSON.parse(rawdata);
    const messages = telegramData.messages || [];

    console.log(`Processing ${messages.length} messages...`);

    // Calculate all statistics using modular functions
    console.log('Calculating daily activity...');
    const dailyActivity = calculateDailyActivity(messages);

    console.log('Calculating monthly activity...');
    const monthlyActivity = calculateMonthlyActivity(messages);

    console.log('Calculating user activity...');
    const { userActivity, userActivityWithPercentage, allUsersCount } = calculateUserActivity(messages);

    console.log('Calculating active hours...');
    const activeHours = calculateActiveHours(messages);

    console.log('Calculating active days...');
    const activeDays = calculateActiveDays(messages);

    console.log('Calculating basic stats...');
    const basicStats = calculateBasicStats(messages, dailyActivity);

    console.log('Calculating peaks...');
    const peaks = calculatePeaks(dailyActivity, activeHours, monthlyActivity);

    console.log('Calculating activity streaks...');
    const streaks = calculateActivityStreaks(dailyActivity);

    console.log('Calculating user timeline...');
    const userTimeline = calculateUserTimeline(messages);

    console.log('Calculating media types...');
    const mediaTypes = calculateMediaTypes(messages);

    console.log('Calculating message length stats...');
    const messageLengthStats = calculateMessageLengthStats(messages);

    console.log('Calculating emoji stats...');
    const emojiStats = calculateEmojiStats(messages);

    console.log('Calculating reply chains...');
    const replyChains = calculateReplyChains(messages);

    // Assemble final stats object
    const stats = {
        // Basic Statistics
        summary: {
            ...basicStats,
            generatedAt: new Date().toISOString()
        },

        // Temporal Statistics
        dailyActivity,
        monthlyActivity,
        activeHours,
        activeDays,
        peaks,
        streaks,

        // User Statistics
        userActivity,
        userActivityWithPercentage,
        userTimeline,

        // Content Statistics
        mediaTypes,
        messageLengthStats,
        emojiStats,

        // Advanced Statistics
        replyChains
    };

    // Write output file
    const filename = `stats_${generateTimestamp()}.json`;
    const outputPath = `${OUTPUT_DIR_PATH}/${filename}`;

    console.log(`Writing stats to ${filename}...`);
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));

    console.log('Done! Statistics generated successfully.');
    console.log(`\nSummary:`);
    console.log(`  Total Messages: ${basicStats.totalMessages}`);
    console.log(`  Total Users: ${basicStats.totalUsers}`);
    console.log(`  Total Days: ${basicStats.totalDays}`);
    console.log(`  Avg Messages/Day: ${basicStats.averageMessagesPerDay}`);
    console.log(`  Peak Day: ${peaks.peakDay.date} (${peaks.peakDay.messages} messages)`);
    console.log(`  Longest Streak: ${streaks.longestStreak} days`);
}

// Run the main function
main();
