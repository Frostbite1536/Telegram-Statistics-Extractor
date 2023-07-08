# Telegram-Statistics-Extractor
Extract statistics from a JSON export of a Telegram chat and create a basic HTML page to visualize them.



# Telegram Statistics Extractor

This script extracts statistics from a JSON export of a Telegram chat and provides a basic HTML page to visualize them. It produces a new JSON file with the following statistics:

- Daily activity (number of messages per day)
- User activity (number of messages per user)
- Active hours (number of messages per hour of the day)
- Active days (number of messages per day of the week)
- Total users

## Usage

1. Export your Telegram chat history to a JSON file. You can do this via the '...' menu in the desktop app.
2. Update the `<YourFilePathHere>` placeholders in the `stats.js` file with the paths to your Telegram JSON export and where you want the stats file to be saved.
3. Run `node stats.js` in your terminal.

A new stats file will be created in the specified directory each time you run the script. The filename will include the current timestamp to prevent overwriting previous stats files.

4. Open `visualization.html` in your browser.
   
    To update the data displayed:
    - Look for the following line in the script section of `visualization.html`:
    ```javascript
    fetch('stats_2023-7-8_19-17-44.json')
    ```
    - Replace `'stats_2023-7-8_19-17-44.json'` with the filename of your latest stats file. For example, if your latest file is `stats_2023-8-1_10-30-15.json`, the line should look like this:
    ```javascript
    fetch('stats_2023-8-1_10-30-15.json')
    ```
    - Save `visualization.html` and refresh the page in your browser to see the updated charts.

## Requirements

- Node.js
- A JSON export of a Telegram chat
- A modern web browser to view the visualization page

## Files

- `stats.js`: The main script file.
- `visualization.html`: An HTML page that fetches the latest stats file and displays charts of the statistics.
