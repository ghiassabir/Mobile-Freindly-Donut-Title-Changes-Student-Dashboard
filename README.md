# Mobile-Freindly-Donut-Title-Changes-Student-Dashboard
# SAT Performance Hub - Student Dashboard (Final Themed & Mobile Responsive plus Donut plus title changes)

This is a static HTML, CSS, and JavaScript prototype for a student-facing SAT performance dashboard. It is designed to be hosted on GitHub Pages, features "The SAT Hub" branding, and includes mobile-responsive navigation.

## Features

* **Responsive Design:** Adapts to different screen sizes with a hamburger menu for main navigation on mobile devices.
* **Themed Interface:** Styled with "The SAT Hub" branding (dark teal and gold header, specific card styling with teal title strips, yellow left border, and green overall card border).
* **Overview Tab:** Displays key performance indicators (KPIs), score trends, overall skill performance (Math, Reading, Writing & Language), strengths, weaknesses, and time spent.
* **Detailed Tabs:** Separate tabs for CB Practice Tests, Reading, Writing & Language, and Math, each with sub-sections for EOC Quizzes, Khan Academy, and CB Skills.
* **Interactive Charts:** Uses Chart.js for data visualization, themed to match.
* **Modal Views:** Provides detailed question analysis (including a donut chart for correct/incorrect/unanswered) when clicking on specific test or quiz items.

## Files

* `index.html`: The main HTML structure for the dashboard.
* `style.css`: Contains all custom CSS rules and theming.
* `script.js`: Handles dynamic content population (currently with dummy data), chart rendering, tab interactivity, and mobile menu toggle.
* `data/` (Directory): Intended for future CSV data files.
* `assets/` (Directory): Suggested for storing images like the site logo.

## Setup and Viewing

1.  Clone or download this repository.
2.  Open `index.html` in a web browser to view the dashboard.
3.  Resize your browser window or use browser developer tools to test the mobile view and hamburger navigation.

## Customization

### Logo
To add your logo:
1.  Place your logo image file (e.g., `The SAT Hub Logo.png`) into an `assets` directory (create it if it doesn't exist).
2.  In `index.html`, find the `<img>` tag with `alt="The SAT Hub Logo"`.
3.  Change the `src` attribute from `YOUR_HOSTED_LOGO_URL_HERE` to the path of your logo (e.g., `assets/The SAT Hub Logo.png`). If you host your logo elsewhere, use the full URL.

### Data Source
Currently, the dashboard uses dummy data defined within `script.js`. To use dynamic data from CSV files:
1.  Ensure your data processing pipeline (e.g., Google Apps Script) generates two CSV files:
    * `DashboardFeed_AggregatedScores.csv`
    * `DashboardFeed_QuestionDetails.csv`
2.  Place these CSV files in the `data/` directory (or any other accessible web location).
3.  In `script.js`:
    * Update the `AGGREGATED_SCORES_CSV_URL` and `QUESTION_DETAILS_CSV_URL` constants (currently commented out) with the correct paths to your CSV files.
    * Uncomment and implement the PapaParse fetching logic within the `loadAndDisplayData()` function.
    * Modify data processing functions to use the fetched CSV data.

## Libraries Used
* Tailwind CSS (via CDN)
* Chart.js (via CDN)
* PapaParse (via CDN - for future CSV parsing, link included in `index.html`)
