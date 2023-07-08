const fs = require('fs');

// Path to your Telegram export
// Replace with your actual path
const filePath = '<YourFilePathHere>';

let rawdata = fs.readFileSync(filePath);
let telegramData = JSON.parse(rawdata);

let stats = {
    dailyActivity: {},
    userActivity: {},
    activeHours: {},
    activeDays: {},
    totalUsers: 0,
};

telegramData.messages.forEach(message => {
	let date = new Date(message.date);
	let day = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
	let hour = date.getUTCHours();
	let weekDay = date.getUTCDay();

    // Update daily activity
    if (day in stats.dailyActivity) {
        stats.dailyActivity[day]++;
    } else {
        stats.dailyActivity[day] = 1;
    }

    // Update user activity
    if (message.from in stats.userActivity) {
        stats.userActivity[message.from]++;
    } else {
        stats.userActivity[message.from] = 1;
        stats.totalUsers++;
    }

    // Update active hours
    if (hour in stats.activeHours) {
        stats.activeHours[hour]++;
    } else {
        stats.activeHours[hour] = 1;
    }

    // Update active days
    if (weekDay in stats.activeDays) {
        stats.activeDays[weekDay]++;
    } else {
        stats.activeDays[weekDay] = 1;
    }
});

// Sort users by message count and get the top 20
let sortedUsers = Object.entries(stats.userActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
stats.userActivity = Object.fromEntries(sortedUsers);

// Get the current date and time to create a timestamp
let timestamp = new Date();
let filename = `stats_${timestamp.getUTCFullYear()}-${timestamp.getUTCMonth() + 1}-${timestamp.getUTCDate()}_${timestamp.getUTCHours()}-${timestamp.getUTCMinutes()}-${timestamp.getUTCSeconds()}.json`;

// Write the stats to a new JSON file with the timestamp in the filename
// Replace with your actual path
fs.writeFileSync(`<YourFilePathHere>/${filename}`, JSON.stringify(stats));
