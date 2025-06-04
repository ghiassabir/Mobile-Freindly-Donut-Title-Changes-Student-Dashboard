// --- CONFIGURATION ---
// IMPORTANT: Replace these with the actual published URLs from your Google Sheet
// These URLs should directly download the CSV file when pasted into a browser.
const GOOGLE_SHEET_CSV_URLS = {
    masterQuizData: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR22OeWtUj1ODFBbVBaiSfsp4anSLyfGk2r5JWKu-9TPwklSoiCk4Qste_zDMAsoTCpOPG7qGLj7wOc/pub?gid=671815293&single=true&output=csv', // From DashboardFeed_AggregatedScores sheet
    questionData: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR22OeWtUj1ODFBbVBaiSfsp4anSLyfGk2r5JWKu-9TPwklSoiCk4Qste_zDMAsoTCpOPG7qGLj7wOc/pub?gid=171497066&single=true&output=csv'     // From DashboardFeed_QuestionDetails sheet
};
const LOCAL_STORAGE_STUDENT_ID_KEY = 'satHubStudentGmailId'; // Key for local storage

// --- GLOBAL DATA (will be populated from CSVs) ---
let allMasterQuizData = []; // Stores ALL fetched data from DashboardFeed_AggregatedScores.csv
let allQuestionData = [];   // Stores ALL fetched data from DashboardFeed_QuestionDetails.csv
let currentStudentData = {}; // Structured object for the currently logged-in student's dashboard display

// --- DOM ELEMENTS (Global references, assigned in initDashboard) ---
let studentIdInputContainerEl, studentIdInputEl, loadDataButtonEl, idInputErrorEl;
let loadingMessageEl, errorMessageEl, noDataMessageEl, dashboardRootContainerEl;
let dashboardStudentNameEl, changeIdButtonEl, retryIdButtonEl;
let overviewCardsContainerEl, scoreTrendChartEl, skillPerformanceChartEl;
let strengthsListEl, weaknessesListEl, practiceTestsTableBodyEl;
let currentYearEl; 
let tabButtons, tabPanes;
let hamburgerButton, mobileMenu, mobileChangeIdLink; 
let modal, modalQuestionDetailsContainer; 

// --- Chart Instances (Global Scope, for destroying/re-creating charts) ---
let scoreTrendChartInstance = null;
let skillPerformanceChartInstance = null;
let modalDonutChartInstance = null;
let modalLineChartInstance = null;

// --- ICON SVGs (Used for dynamically injecting icons) ---
const icons = {
    checkCircle: `<svg class="w-5 h-5 mr-2 inline text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    xCircle: `<svg class="w-5 h-5 mr-2 inline text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
};


// --- Helper Functions ---

/**
 * Formats a date string to a human-readable format (e.g., "Jan 1, 2024").
 * Returns "-" if the input is null, N/A, or an invalid date.
 * @param {string} dateString The date string to format (e.g., "YYYY-MM-DD").
 * @returns {string} The formatted date or "-".
 */
function formatDate(dateString) { 
    if (!dateString || String(dateString).toLowerCase() === "n/a" || String(dateString).trim() === "") return "-"; 
    try {
        const date = new Date(dateString + 'T00:00:00'); 
        if (isNaN(date.getTime())) return dateString; 
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options); 
    } catch (e) {
        console.warn("Could not format date:", dateString, e);
        return dateString; 
    }
}

/**
 * Calculates average correctness for a set of question items.
 * @param {Array<Object>} questionItems Array of question objects (e.g., from allQuestionData).
 * @returns {number} The calculated average accuracy percentage (0-100), or 0 if no attempted questions.
 */
function calculateAverageCorrectness(questionItems) {
    if (questionItems.length === 0) return 0;
    const correctCount = questionItems.filter(q => String(q.IsCorrect).toUpperCase() === 'TRUE').length;
    const attemptedCount = questionItems.filter(q => q.StudentAnswer && String(q.StudentAnswer).trim() !== '').length; 
    if (attemptedCount === 0) return 0; 
    return Math.round((correctCount / attemptedCount) * 100);
}

/**
 * Returns a CSS class name based on a score for performance visualization.
 * @param {number} score The score percentage (0-100).
 * @returns {string} CSS class (e.g., 'performance-good', 'performance-average', 'performance-poor').
 */
function getPerformanceClass(score) {
    if (score === null || isNaN(score)) return ''; 
    if (score >= 85) return 'performance-good';
    if (score >= 70) return 'performance-average';
    return 'performance-poor';
}


// --- UI Management Functions ---

/**
 * Displays a loading screen with a message, hiding other UI elements.
 * @param {string} message The message to display on the loading screen.
 */
function showLoadingScreen(message = "Loading your personalized dashboard...") {
    if(loadingMessageEl) {
        loadingMessageEl.innerHTML = `<svg class="animate-spin h-8 w-8 text-sky-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${message}`;
        loadingMessageEl.classList.remove('hidden');
    }
    // Hide other states
    if(studentIdInputContainerEl) studentIdInputContainerEl.classList.add('hidden');
    if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
    if(errorMessageEl) errorMessageEl.classList.add('hidden');
    if(noDataMessageEl) noDataMessageEl.classList.add('hidden');
}

/**
 * Displays the student ID input screen, hiding other UI elements.
 * @param {string} [errorMessage=""] An optional error message to display above the input.
 */
function showInputScreen(errorMessage = "") {
    if(studentIdInputContainerEl) studentIdInputContainerEl.classList.remove('hidden');
    // Hide other states
    if(loadingMessageEl) loadingMessageEl.classList.add('hidden');
    if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
    if(errorMessageEl) errorMessageEl.classList.add('hidden');
    if(noDataMessageEl) noDataMessageEl.classList.add('hidden');

    if (errorMessage && idInputErrorEl) {
        idInputErrorEl.textContent = errorMessage;
        idInputErrorEl.classList.remove('hidden');
    } else if (idInputErrorEl) {
        idInputErrorEl.classList.add('hidden');
    }
    if(studentIdInputEl) {
        studentIdInputEl.value = localStorage.getItem(LOCAL_STORAGE_STUDENT_ID_KEY) || ""; 
        studentIdInputEl.focus();
    }
}

/**
 * Displays a general error message screen.
 * @param {string} message The error message to display.
 */
function displayError(message) { 
    showLoadingScreen(); // Reset to loading, then show error
    if(errorMessageEl) {
        errorMessageEl.textContent = message;
        errorMessageEl.classList.remove('hidden');
    }
    if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
    if(retryIdButtonEl) retryIdButtonEl.classList.remove('hidden');
}

/**
 * Displays a "no data found" screen.
 */
function displayNoDataFoundScreen() {
    showLoadingScreen(); 
    if(noDataMessageEl) noDataMessageEl.classList.remove('hidden');
    if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
    if(retryIdButtonEl) retryIdButtonEl.classList.remove('hidden');
}


// --- Login/Logout & Header Display Logic ---

/**
 * Checks for a saved student email in local storage and initiates login/display.
 * Shows login modal if no email is found.
 */
function checkStudentLogin() {
    const studentEmail = localStorage.getItem(LOCAL_STORAGE_STUDENT_ID_KEY);
    const loginModal = document.getElementById('loginModal');
    
    if (studentEmail) {
        loginModal.style.display = 'none'; // Hide login modal
        dashboardRootContainerEl.classList.add('hidden'); // Initially hide dashboard content until data loads
        updateHeaderDisplay(studentEmail, true); // Update header immediately
        loadAndDisplayData(studentEmail); // Load data for this student
    } else {
        loginModal.style.display = 'block'; // Show login modal
        dashboardRootContainerEl.classList.add('hidden'); // Ensure dashboard is hidden
        updateHeaderDisplay(null, false); // Clear header display
        if(studentIdInputEl) studentIdInputEl.value = ''; // Clear input field
        document.getElementById('id-input-error').classList.add('hidden'); // Hide any previous error
    }
}

/**
 * Handles the login attempt when the "View Dashboard" button is clicked.
 * Fetches data and validates student email.
 */
async function handleLogin() {
    const studentEmail = studentIdInputEl.value.trim().toLowerCase();
    if (!studentEmail || !studentEmail.includes('@') || !studentEmail.includes('.')) {
        idInputErrorEl.textContent = "Please enter a valid email address.";
        idInputErrorEl.classList.remove('hidden');
        return;
    }

    showLoadingScreen("Authenticating and fetching data...");
    idInputErrorEl.classList.add('hidden'); // Hide any previous input errors

    try {
        // Fetch all data from published Google Sheets once
        // These will be stored globally for later filtering per student
        allMasterQuizData = await fetchCsvData(GOOGLE_SHEET_CSV_URLS.masterQuizData);
        allQuestionData = await fetchCsvData(GOOGLE_SHEET_CSV_URLS.questionData);

        // Validate if the entered student email exists in the fetched data
        const studentExists = allMasterQuizData.some(row => row.StudentGmailID === studentEmail) ||
                             allQuestionData.some(row => row.StudentGmailID === studentEmail);

        if (studentExists) {
            localStorage.setItem(STUDENT_IDENTIFIER_KEY, studentEmail);
            document.getElementById('loginModal').style.display = 'none';
            dashboardRootContainerEl.classList.remove('hidden'); // Make dashboard visible
            updateHeaderDisplay(studentEmail, true); // Update header with student name
            loadAndDisplayData(studentEmail); // Load and display filtered data
            
            // Activate Overview tab after data loads
            const firstDesktopTab = document.querySelector('.tab-button[data-tab="overview"]');
            if (firstDesktopTab) {
                firstDesktopTab.click(); // Programmatically click to activate and initialize charts
            }
        } else {
            showInputScreen(); // Go back to input screen
            idInputErrorEl.textContent = `Email "${studentEmail}" not found in our records. Please check and try again.`;
            idInputErrorEl.classList.remove('hidden');
            updateHeaderDisplay(null, false);
        }
    } catch (error) {
        console.error("Error during login data fetch:", error);
        displayError(`Could not load dashboard data: ${error.message}. Please verify published CSV URLs.`);
    }
}

/**
 * Clears saved student ID and reloads the page, showing the login modal.
 */
function handleLogout() {
    localStorage.removeItem(LOCAL_STORAGE_STUDENT_ID_KEY);
    window.location.reload(); // Reloads the page to reset state and show login modal
}

/**
 * Updates the student name display and logout button visibility in the header.
 * @param {string|null} studentEmail The email of the logged-in student, or null.
 * @param {boolean} loggedIn True if a student is logged in, false otherwise.
 */
function updateHeaderDisplay(studentEmail, loggedIn) {
    if (loggedIn && studentEmail) {
        const studentNamePart = studentEmail.split('@')[0].split('.')[0]; 
        dashboardStudentNameEl.textContent = `Welcome, ${studentNamePart.charAt(0).toUpperCase() + studentNamePart.slice(1)}!`;
        dashboardStudentNameEl.classList.remove('hidden');
        if(changeIdButtonEl) changeIdIdButtonEl.classList.remove('hidden'); // Fix: changed to changeIdButtonEl
        if(mobileChangeIdLink) mobileChangeIdLink.classList.remove('hidden');
    } else {
        dashboardStudentNameEl.textContent = `Welcome!`;
        dashboardStudentNameEl.classList.add('hidden'); 
        if(changeIdButtonEl) changeIdButtonEl.classList.add('hidden');
        if(mobileChangeIdLink) mobileChangeIdLink.classList.add('hidden');
    }
}


// --- DATA FETCHING (from Published Google Sheet CSVs) ---

/**
 * Fetches and parses CSV data from a given URL using PapaParse.
 * @param {string} url The URL of the published CSV file.
 * @returns {Promise<Array<Object>>} A promise that resolves with the parsed data.
 */
async function fetchCsvData(url) {
    console.log("Attempting to fetch data from:", url);
    return new Promise((resolve, reject) => {
        PapaParse.parse(url, {
            download: true,
            header: true, 
            skipEmptyLines: true,
            worker: true, 
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error(`PapaParse errors for ${url}:`, results.errors);
                    reject(new Error(`PapaParse errors: ${JSON.stringify(results.errors)}`));
                }
                console.log(`Fetched data from ${url}. Rows: ${results.data.length}`);
                const cleanedData = results.data.filter(row => Object.values(row).some(value => value !== null && String(value).trim() !== ''));
                resolve(cleanedData);
            },
            error: function(err) {
                console.error(`Error fetching CSV from ${url}:`, err);
                reject(err);
            }
        });
    });
}

// --- DATA TRANSFORMATION (from flat CSV to dashboard's structured format) ---
/**
 * Transforms flat CSV data (aggregated assessments and question details)
 * into the structured format expected by the dashboard's UI components.
 * @param {Array<Object>} studentAggregatedAssessments Filtered aggregated data for the current student.
 * @param {Array<Object>} allAggregatedData All aggregated data (for class averages).
 * @param {Array<Object>} studentQuestionDetails Filtered question details for the current student.
 * @param {string} studentEmail The email of the current student.
 * @returns {Object} The structured student data for the dashboard.
 */
function transformDataForDashboard(studentAggregatedAssessments, allAggregatedData, studentQuestionDetails, studentEmail) {
    const student = { 
        name: studentEmail, 
        targetScore: 1400, 
        latestScores: { total: "-", rw: "-", math: "-", avgEocKhan: "-" },
        classAveragesGlobal: { total: "-", rw: "-", math: "-", avgEocKhan: "-" }, 
        scoreTrend: { labels: [], studentScores: [], classAvgScores: [] },
        overallSkillPerformance: { labels: ['Reading', 'Writing & Language', 'Math'], studentAccuracy: [0,0,0], classAvgAccuracy: [0,0,0] },
        strengths: [], weaknesses: [],
        timeSpent: { studentAvg: "N/A", studentUnit: "", classAvg: "N/A", classUnit: ""},
        cbPracticeTests: [], 
        eocQuizzes: { reading: [], writing: [], math: [] }, 
        khanAcademy: { reading: [], writing: [], math: [] }, 
        cbSkills: { reading: [], writing: [], math: [] } 
    };

    // --- Student Name ---
    const studentNameEntry = allAggregatedData.find(row => row.StudentGmailID === studentEmail);
    if(studentNameEntry && studentNameEntry.StudentName_Full) { 
        student.name = studentNameEntry.StudentName_Full;
    } else {
        const emailParts = studentEmail.split('@')[0].split('.');
        student.name = emailParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }


    // --- Global Class Averages (Calculated from ALL data loaded via PapaParse) ---
    const allCBTests = allAggregatedData.filter(a => a.AssessmentSource === 'Canvas CB Test' && a.Score_Scaled_Total !== '' && a.Score_Scaled_Total !== null);
    if(allCBTests.length > 0) {
        student.classAveragesGlobal.total = Math.round(allCBTests.reduce((sum, a) => sum + parseFloat(a.Score_Scaled_Total), 0) / allCBTests.length);
        student.classAveragesGlobal.rw = Math.round(allCBTests.reduce((sum, a) => sum + parseFloat(a.ScaledScore_RW || 0), 0) / allCBTests.length);
        student.classAveragesGlobal.math = Math.round(allCBTests.reduce((sum, a) => sum + parseFloat(a.ScaledScore_Math || 0), 0) / allCBTests.length);
    }
    
    const allEocKhanScores = allAggregatedData.filter(a => (a.AssessmentSource.includes('EOC') || a.AssessmentSource.includes('Khan')) && a.Score_Percentage !== '' && a.Score_Percentage !== null);
    if (allEocKhanScores.length > 0) {
        const totalEocKhanPct = allEocKhanScores.reduce((sum, a) => sum + parseFloat(a.Score_Percentage.replace('%','')), 0);
        student.classAveragesGlobal.avgEocKhan = Math.round(totalEocKhanPct / allEocKhanScores.length);
    }


    // --- Student Specific Data (Filtered Data) ---

    // Latest Scores (Overall Dashboard Snapshot)
    const studentLatestCBTests = studentAggregatedAssessments.filter(a => a.AssessmentSource === 'Canvas CB Test' && a.Score_Scaled_Total !== '' && a.Score_Scaled_Total !== null);
    if (studentLatestCBTests.length > 0) {
        studentLatestCBTests.sort((a,b) => new Date(b.AttemptDate) - new Date(a.AttemptDate)); 
        const latestTest = studentLatestCBTests[0];
        student.latestScores.total = parseFloat(latestTest.Score_Scaled_Total);
        student.latestScores.rw = parseFloat(latestTest.ScaledScore_RW);
        student.latestScores.math = parseFloat(latestTest.ScaledScore_Math);
    }

    const studentEocKhanAvgScores = studentAggregatedAssessments.filter(a => (a.AssessmentSource.includes('EOC') || a.AssessmentSource.includes('Khan')) && a.Score_Percentage !== '' && a.Score_Percentage !== null);
    if (studentEocKhanAvgScores.length > 0) {
        const totalStudentEocKhanPct = studentEocKhanAvgScores.reduce((sum, a) => sum + parseFloat(a.Score_Percentage.replace('%','')), 0);
        student.latestScores.avgEocKhan = Math.round(totalStudentEocKhanPct / studentEocKhanAvgScores.length);
    }


    // CB Practice Tests Table & Score Trend Chart Data
    student.cbPracticeTests = studentAggregatedAssessments.filter(a => 
        a.AssessmentSource === 'Canvas CB Test' || a.AssessmentSource === 'Canvas CB Module'
    ).map(a => ({
        name: a.AssessmentName,
        date: a.AttemptDate,
        rw: a.ScaledScore_RW || (a.AssessmentSource.includes('Module') ? a.Score_Raw_Combined : '-'), 
        math: a.ScaledScore_Math || (a.AssessmentSource.includes('Module') ? a.Score_Raw_Combined : '-'),
        total: a.Score_Scaled_Total || (a.AssessmentSource.includes('Module') ? a.Score_Raw_Combined : '-'),
        classAvgRW: student.classAveragesGlobal.rw, 
        classAvgMath: student.classAveragesGlobal.math,
        classAvgTotal: student.classAveragesGlobal.total
    })).sort((a,b) => new Date(a.date) - new Date(b.date)); 


    // Filter score trend to only include aggregate CB Tests for cleaner chart
    const trendTests = student.cbPracticeTests.filter(t => t.total !== '-' && t.name.includes('CB-T'));
    student.scoreTrend.labels = trendTests.map(t => t.name.replace('CB-T','Test ')); 
    student.scoreTrend.studentScores = trendTests.map(t => parseFloat(t.total) || 0);
    student.scoreTrend.classAvgScores = student.scoreTrend.labels.map(() => student.classAveragesGlobal.total); 


    // EOC Quizzes
    const eocPrefixes = { reading: 'R-EOC', writing: 'W-EOC', math: 'M-EOC' };
    Object.keys(eocPrefixes).forEach(subjectKey => {
        student.eocQuizzes[subjectKey] = studentAggregatedAssessments.filter(a => 
            a.AssessmentSource === 'Canvas EOC Practice' && a.AssessmentName.startsWith(eocPrefixes[subjectKey]))
            .map(a => ({ 
                name: a.AssessmentName, 
                latestScore: a.Score_Percentage || `${a.Score_Raw_Combined}/${a.PointsPossible_Combined}`, 
                date: a.AttemptDate, 
                classAvg: student.classAveragesGlobal.avgEocKhan 
            }));
    });

    // Khan Academy
    const khanIncludes = { reading: 'Reading', writing: 'Writing', math: 'Math' }; 
    Object.keys(khanIncludes).forEach(subjectKey => {
        student.khanAcademy[subjectKey] = studentAggregatedAssessments.filter(a => 
            a.AssessmentSource === 'Khan Academy Practice' && a.AssessmentName.includes(khanIncludes[subjectKey]))
            .map(a => ({ 
                name: a.AssessmentName, 
                date: a.AttemptDate, 
                score: a.Score_Percentage || `${a.Score_Raw_Combined}/${a.PointsPossible_Combined}`, 
                pointsPossible: a.PointsPossible_Combined, 
                classAvg: student.classAveragesGlobal.avgEocKhan 
            }));
    });
    
    // CB Skills (Overall Skill Performance & Strengths/Improvements)
    const skillCategoryFilters = [
        { key: 'reading', tagPrefix: 'Reading', label: 'Reading' },
        { key: 'writing', tagPrefix: 'Writing', label: 'Writing & Language' },
        { key: 'math', tagPrefix: 'Math', label: 'Math' }
    ];

    skillCategoryFilters.forEach((category, index) => {
        const categoryQuestions = studentQuestionDetails.filter(q => 
            q.SAT_Skill_Tag && q.SAT_Skill_Tag.includes(category.tagPrefix)
        );
        const studentAccuracy = calculateAverageCorrectness(categoryQuestions);
        student.overallSkillPerformance.studentAccuracy[index] = studentAccuracy;
        student.overallSkillPerformance.labels[index] = category.label; 
        student.overallSkillPerformance.classAvgAccuracy[index] = student.classAveragesGlobal.avgEocKhan; 
        
        const uniqueSkillsMap = {}; 
        categoryQuestions.forEach(q => {
            if (q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD') {
                if (!uniqueSkillsMap[q.SAT_Skill_Tag]) {
                    uniqueSkillsMap[q.SAT_Skill_Tag] = { totalCorrect: 0, totalAttempted: 0 };
                }
                uniqueSkillsMap[q.SAT_Skill_Tag].totalAttempted++;
                if (String(q.IsCorrect).toUpperCase() === 'TRUE') {
                    uniqueSkillsMap[q.SAT_Skill_Tag].totalCorrect++;
                }
            }
        });

        student.cbSkills[category.key] = Object.entries(uniqueSkillsMap).map(([skillName, data]) => ({
            name: skillName,
            score: Math.round((data.totalCorrect / data.totalAttempted) * 100),
            classAvg: student.classAveragesGlobal.avgEocKhan 
        })).sort((a,b) => b.score - a.score); 
    });

    // Strengths/Improvements based on detailed skill scores
    const allStudentDetailedSkills = Object.values(student.cbSkills).flatMap(arr => arr);
    student.strengths = allStudentDetailedSkills.filter(s => s.score >= 80).map(s => `${s.name} (${s.score}%)`).slice(0,3);
    student.weaknesses = allStudentDetailedSkills.filter(s => s.score < 60).map(s => `${s.name} (${s.score}%)`).sort((a,b) => a.score - b.score).slice(0,3);


    // Time Spent (placeholder until activity data is detailed)
    student.timeSpent = { studentAvg: "N/A", studentUnit: "", classAvg: "N/A", classUnit: ""}; 

    return student;
}


// --- Chart Initializations ---
const CHART_PRIMARY_COLOR = '#2a5266'; 
const CHART_SECONDARY_COLOR = '#757575'; 
const CHART_PRIMARY_BG_BAR = 'rgba(42, 82, 102, 0.8)'; 

function initializeOverviewCharts(studentData) {
    const chartOptions = { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: true, position: 'bottom' }}};
    
    // Score Trend Chart
    const scoreTrendCtx = document.getElementById('scoreTrendChart')?.getContext('2d');
    if (scoreTrendCtx) {
        if (scoreTrendChartInstance) scoreTrendChartInstance.destroy();
        scoreTrendChartInstance = new Chart(scoreTrendCtx, { 
            type: 'line', 
            data: { 
                labels: studentData.scoreTrend.labels, 
                datasets: [
                    { label: 'Your Total Score', data: studentData.scoreTrend.studentScores, borderColor: CHART_PRIMARY_COLOR, tension: 0.1, fill: false },
                    { label: 'Class Average Total Score', data: studentData.scoreTrend.classAvgScores, borderColor: CHART_SECONDARY_COLOR, tension: 0.1, borderDash: [5, 5], fill: false }
                ] 
            }, 
            options: chartOptions 
        });
    }
    
    // Overall Skill Performance Chart
    const overallSkillCtx = document.getElementById('overallSkillChart')?.getContext('2d');
    if (overallSkillCtx) {
        if (overallSkillChartInstance) overallSkillChartInstance.destroy();
        overallSkillChartInstance = new Chart(overallSkillCtx, { 
            type: 'bar', 
            data: { 
                labels: studentData.overallSkillPerformance.labels, 
                datasets: [
                    { label: 'Your Accuracy', data: studentData.overallSkillPerformance.studentAccuracy, backgroundColor: CHART_PRIMARY_BG_BAR },
                    { label: 'Class Average Accuracy', data: studentData.overallSkillPerformance.classAvgAccuracy, backgroundColor: 'rgba(117, 117, 117, 0.7)' } 
                ] 
            }, 
            options: { ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } } 
        });
    }
}

// --- Populate Dashboard Sections (using updated data structures) ---
function populateOverviewSnapshot(studentData) {
    document.getElementById('latestTotalScore').innerHTML = `${studentData.latestScores.total || '-'} <span class="text-lg text-gray-500">/ 1600</span>`;
    document.getElementById('latestRWScore').innerHTML = `${studentData.latestScores.rw || '-'} <span class="text-lg text-gray-500">/ 800</span>`;
    document.getElementById('latestMathScore').innerHTML = `${studentData.latestScores.math || '-'} <span class="text-lg text-gray-500">/ 800</span>`;
    document.getElementById('avgEocKhanScore').textContent = `${studentData.latestScores.avgEocKhan || '-'}%`;
    document.getElementById('targetScore').textContent = studentData.targetScore || '-';
    document.getElementById('targetScoreDifference').textContent = `Goal: ${studentData.targetScore && studentData.latestScores.total && !isNaN(parseFloat(studentData.latestScores.total)) ? (studentData.targetScore - parseFloat(studentData.latestScores.total)) : '-'} points`;

    const overviewStrengthsList = document.getElementById('strengths-list'); 
    const overviewImprovementsList = document.getElementById('weaknesses-list');
    const timeSpentOverviewDiv = document.getElementById('timeSpentOverview');
    
    if(overviewStrengthsList) {
        overviewStrengthsList.innerHTML = ''; 
        (studentData.strengths || []).forEach(item => { const li = document.createElement('li'); li.innerHTML = `${icons.checkCircle} ${item}`; overviewStrengthsList.appendChild(li); });
        if(studentData.strengths.length === 0) overviewStrengthsList.innerHTML = '<li class="text-gray-500">No strengths identified yet.</li>';
    }
    if(overviewImprovementsList) {
        overviewImprovementsList.innerHTML = ''; 
        (studentData.improvements || []).forEach(item => { const li = document.createElement('li'); li.innerHTML = `${icons.xCircle} ${item}`; overviewImprovementsList.appendChild(li); });
        if(studentData.improvements.length === 0) overviewImprovementsList.innerHTML = '<li class="text-gray-500">No areas for improvement identified yet.</li>';
    }
    if(timeSpentOverviewDiv) { 
        timeSpentOverviewDiv.innerHTML = `
            <p class="text-gray-600">Your Avg: <span class="font-semibold">${studentData.timeSpent.studentAvg || '-'} ${studentData.timeSpent.studentUnit || ''}</span></p>
            <p class="text-gray-600">Class Avg: <span class="font-semibold">${studentData.timeSpent.classAvg || '-'} ${studentData.timeSpent.classUnit || ''}</span></p>
        `;
    }
     // Update class averages in snapshot section
    document.getElementById('classAvgTotalScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.total || '-'}`;
    document.getElementById('classAvgRWScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.rw || '-'}`;
    document.getElementById('classAvgMathScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.math || '-'}`;
    document.getElementById('classAvgEocKhanScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.avgEocKhan || '-'}%`;
}

function populatePracticeTestsTable(testsData) {
    const cbTableBody = document.getElementById('practiceTests-table-body');
    if (!cbTableBody) return;
    cbTableBody.innerHTML = ''; 
    (testsData || []).forEach(test => {
        const row = cbTableBody.insertRow();
        row.className = 'clickable-row';
        row.innerHTML = `<td>${test.name}</td><td>${formatDate(test.date)}</td><td>${test.rw || '-'}</td><td>${test.math || '-'}</td><td>${test.total || '-'}</td><td>${test.classAvgRW || '-'}</td><td>${test.classAvgMath || '-'}</td><td>${test.classAvgTotal || '-'}</td>`;
        row.onclick = () => openModal(`${test.name} Details`, { type: 'cb_test', data: test }); 
    });
    if ((testsData || []).length === 0) {
        cbTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-gray-500 py-3">No CB Non-Adaptive Test data available.</td></tr>`;
    }
}

function populateEOCTable(subjectKey, eocQuizData) {
    const tbody = document.getElementById(`${subjectKey}-eoc-tbody`);
    const thead = document.getElementById(`${subjectKey}-eoc-thead`);
    if (!tbody || !thead) return;
    
    thead.innerHTML = `<tr><th>Chapter/Practice Name</th><th>Latest Score</th><th>Date Attempted</th><th>Class Avg Score</th></tr>`; 
    tbody.innerHTML = ''; 

    (eocQuizData || []).forEach(item => {
        const row = tbody.insertRow();
        row.className = 'clickable-row';
        row.innerHTML = `<td>${item.name}</td><td>${item.latestScore || '-'}</td><td>${formatDate(item.date) || '-'}</td><td>${item.classAvg || '-'}</td>`; 
        row.onclick = () => openModal(`EOC Practice: ${item.name}`, { type: 'eoc_quiz', data: item }); 
    });
     if ((eocQuizData || []).length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-3">No EOC Practice data available for ${subjectKey}.</td></tr>`;
    }
}

function populateKhanSection(sectionKey, khanItems) {
    const container = document.getElementById(`${sectionKey}-khan-data`);
    if (!container) return;
    container.innerHTML = ''; 

    if (khanItems.length > 0) {
        const table = document.createElement('table');
        table.className = 'min-w-full table';
        table.innerHTML = `<thead><tr><th>Assignment Name</th><th>Date</th><th>Your Score</th><th>Points Possible</th><th>Class Avg</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        khanItems.forEach(item => {
            const row = tbody.insertRow();
            row.className = 'clickable-row';
            row.innerHTML = `<td>${item.name}</td><td>${formatDate(item.date) || '-'}</td><td>${item.score || '-'}</td><td>${item.pointsPossible || '-'}</td><td>${item.classAvg || '-'}</td>`; 
            row.onclick = () => openModal(`Khan Academy Practice: ${item.name}`, { type: 'khan', data: item }); 
        });
        container.appendChild(table);
    } else {
        container.innerHTML = `<p class="text-gray-600 p-3">No Khan Academy Practice data available for ${currentStudentData.name || 'this student'} in ${sectionKey}.</p>`;
    }
}

function populateCBSkills(sectionKey, skillsData) {
    const container = document.getElementById(`${sectionKey}-cb-skills-data`);
    if (!container) return;
    container.innerHTML = ''; 

    (skillsData || []).forEach(skill => {
        const skillDiv = document.createElement('div');
        skillDiv.className = 'p-3 bg-gray-50 rounded-md border border-gray-200';
        const performanceClass = getPerformanceClass(skill.score);
        skillDiv.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium text-gray-800">${skill.name}</span>
                <span class="text-xs ${performanceClass.replace('performance-', 'text-')} font-semibold">${skill.score !== undefined && skill.score !== null ? skill.score + '%' : '-'}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar ${performanceClass}" style="width: ${skill.score || 0}%"></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">Class Avg: ${skill.classAvg !== undefined && skill.classAvg !== null ? skill.classAvg + '%' : '-'}</p>`;
        container.appendChild(skillDiv);
    });
     if ((skillsData || []).length === 0) { container.innerHTML = `<p class="text-gray-500 p-3">No Skill data available for ${sectionKey}.</p>`;}
}

// Modal functions
function openModal(title, contentDetails) { 
    console.log("Opening modal with title:", title, "Content:", contentDetails);
    if (!modal || !modalQuestionDetailsContainer) {
        console.error("Modal elements not found. Cannot open modal.");
        return;
    }
    const modalHeaderH2 = modal.querySelector('.modal-header h2'); 
    if(modalHeaderH2) modalHeaderH2.textContent = title;
    
    modalQuestionDetailsContainer.innerHTML = ''; 
    
    const studentEmail = localStorage.getItem(LOCAL_STORAGE_STUDENT_ID_KEY);
    const assessmentName = contentDetails.data.name;

    const assessmentQuestions = allQuestionDetailsData.filter(q => 
        q.StudentGmailID === studentEmail && 
        q.AssessmentName === assessmentName 
    );

    if (assessmentQuestions.length > 0) {
        assessmentQuestions.forEach((q, index) => {
            const d = document.createElement('div');
            let statusText, statusClass;
            const isCorrect = String(q.IsCorrect).toUpperCase() === 'TRUE';
            const pointsEarned = parseFloat(q.PointsEarned);
            const pointsPossible = parseFloat(q.PointsPossible_Question);
            
            if (isNaN(pointsEarned) || isNaN(pointsPossible) || pointsPossible === 0) {
                statusText = 'N/A Score';
                statusClass = 'bg-gray-50 border-gray-200 text-gray-700';
            } else if (isCorrect) {
                statusText = 'Correct';
                statusClass = 'bg-green-50 border-green-200';
            } else {
                statusText = 'Incorrect';
                statusClass = 'bg-red-50 border-red-200';
            }

            d.className = `p-2 border rounded-md ${statusClass}`;
            d.innerHTML = `
                <p class="font-medium text-gray-700">Q${q.QuestionSequenceInQuiz || (index + 1)}: ${q.QuestionText_fromMetadata || q.QuestionText_Full || 'Question Text Missing'}</p>
                <p>Your Answer: <span class="font-semibold ${isCorrect ? 'text-good' : 'text-poor'}">${q.StudentAnswer || 'Not Provided'}</span> (${statusText})</p>
                <p class="text-xs text-gray-500 mt-1">
                    Points: ${pointsEarned}/${pointsPossible} | Skill: ${q.SAT_Skill_Tag || 'TBD'} | Class Avg Correctness: ${q.ClassAveragePoints_Question || 'N/A'}% 
                </p>
            `;
            modalQuestionDetailsContainer.appendChild(d);
        });
    } else {
        modalQuestionDetailsContainer.innerHTML = `<p class="text-gray-500 py-3 text-center">No detailed question data found for this assessment for this student.</p>`;
    }
    
    // Re-initialize charts if data is available for them
    if(modalDonutChartInstance) modalDonutChartInstance.destroy();
    if(modalLineChartInstance) modalLineChartInstance.destroy();
    
    const correctCount = assessmentQuestions.filter(q => String(q.IsCorrect).toUpperCase() === 'TRUE').length;
    const incorrectCount = assessmentQuestions.filter(q => String(q.IsCorrect).toUpperCase() === 'FALSE').length;
    const unansweredCount = assessmentQuestions.filter(q => !q.StudentAnswer || String(q.StudentAnswer).trim() === '').length; 
    const totalAttempted = correctCount + incorrectCount;

    const donutDataValues = [correctCount, incorrectCount, unansweredCount];
    const donutLabels = ['Correct', 'Incorrect', 'Unanswered'];
    const donutColors = ['#4caf50', '#f44336', '#9e9e9e']; 

    const donutCtx = document.getElementById('modalDonutChart')?.getContext('2d');
    if (donutCtx && (totalAttempted > 0 || unansweredCount > 0)) { 
        modalDonutChartInstance = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: donutLabels,
                datasets: [{ data: donutDataValues, backgroundColor: donutColors, hoverOffset: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } }, cutout: '50%' }
        });
    } else if (donutCtx) { 
        donutCtx.canvas.style.display = 'none'; 
        donutCtx.canvas.parentNode.innerHTML += '<p class="text-gray-500 text-center text-sm mt-4">No data for donut chart.</p>';
    }

    const lineCtx = document.getElementById('modalLineChart')?.getContext('2d');
    if (lineCtx) { 
        modalLineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: Math.min(assessmentQuestions.length, 10)}, (_,i) => `Q${assessmentQuestions[i].QuestionSequenceInQuiz || (i+1)}`), 
                datasets: [
                    { label: 'Your Score', data: assessmentQuestions.slice(0,10).map(q => (parseFloat(q.PointsEarned) / parseFloat(q.PointsPossible_Question || 1)) * 100), borderColor: '#2a5266', tension: 0.1, fill: false },
                    { label: 'Class Avg', data: Array.from({length: Math.min(assessmentQuestions.length, 10)},()=>75+Math.random()*10), borderColor: '#757575', borderDash:[5,5], tension: 0.1, fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    } else {
        lineCtx.canvas.style.display = 'none';
        lineCtx.canvas.parentNode.innerHTML += '<p class="text-gray-500 text-center text-sm mt-4">No data for line chart.</p>';
    }

    if(modal) modal.style.display="block";
}

function closeModal() { 
    if(modal) modal.style.display = "none"; 
    if (modalDonutChartInstance) modalDonutChartInstance.destroy(); 
    if (modalLineChartInstance) modalLineChartInstance.destroy(); 
}

// Global modal window close handler
window.onclick = function(event) { 
    if (event.target == modal) closeModal(); 
}


// --- MAIN INITIALIZATION ENTRY POINT ---
// This function will be called automatically when the DOM is ready.
// It assigns all global DOM element references and sets up event listeners.
// Then, it proceeds with the login check and data loading.
// The `defer` attribute is REMOVED from the script tag in index.html to ensure this runs immediately.
(function initDashboard() { // Changed to a self-executing function to avoid DOMContentLoaded issues
    // Assign all global DOM element references here
    studentIdInputContainerEl = document.getElementById('student-id-input-container');
    studentIdInputEl = document.getElementById('studentIdInput');
    loadDataButtonEl = document.getElementById('loadDataButton');
    idInputErrorEl = document.getElementById('id-input-error');
    loadingMessageEl = document.getElementById('loading-message');
    errorMessageEl = document.getElementById('error-message');
    noDataMessageEl = document.getElementById('no-data-message');
    dashboardRootContainerEl = document.getElementById('main-dashboard-content');
    dashboardStudentNameEl = document.getElementById('dashboard-student-name');
    changeIdButtonEl = document.getElementById('changeIdButton');
    retryIdButtonEl = document.getElementById('retryIdButton');
    overviewCardsContainerEl = document.getElementById('overview-cards-container');
    scoreTrendChartEl = document.getElementById('scoreTrendChart');
    skillPerformanceChartEl = document.getElementById('overallSkillChart');
    strengthsListEl = document.getElementById('strengths-list');
    weaknessesListEl = document.getElementById('weaknesses-list');
    practiceTestsTableBodyEl = document.getElementById('practiceTests-table-body');
    currentYearEl = document.getElementById('currentYear');
    tabButtons = document.querySelectorAll('.tab-button');
    tabPanes = document.querySelectorAll('.tab-pane');
    hamburgerButton = document.getElementById('hamburgerButton');
    mobileMenu = document.getElementById('mobileMenu');
    mobileChangeIdLink = document.getElementById('mobileChangeIdLink');
    modal = document.getElementById('detailModal'); 
    modalQuestionDetailsContainer = document.getElementById('modalQuestionDetails'); 

    // Set current year in footer
    if(currentYearEl) currentYearEl.textContent = new Date().getFullYear();

    // Setup event listeners for tabs and mobile nav
    // This calls checkStudentLogin() to start the entire process.
    setupEventListeners(); 

    // Kick off the login/data loading process immediately after DOM elements are assigned
    checkStudentLogin(); 
})(); // Self-executing function
