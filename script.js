// --- Constants for Data Files (Future Use) ---
const AGGREGATED_SCORES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSySYBO9YL3N4aUG3JEYZMQQIv9d1oSm3ba4Ty9Gt4SsGs2zmTS_k81rH3Qv41mZvClnayNcDpl_QbI/pub?gid=1890969747&single=true&output=csv'; 
const QUESTION_DETAILS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSySYBO9YL3N4aUG3JEYZMQQIv9d1oSm3ba4Ty9Gt4SsGs2zmTS_k81rH3Qv41mZvClnayNcDpl_QbI/pub?gid=822014112&single=true&output=csv'; 
const STUDENT_IDENTIFIER_KEY = 'satHubStudentEmail'; // Key for local storage

// --- Global Data Storage ---
let currentStudentData = {}; // Data for the currently logged-in student
let allAggregatedData = []; // Stores ALL fetched aggregated data once
let allQuestionDetailsData = []; // Stores ALL fetched question details data once

// --- Date Formatting Helper ---
function formatDate(dateString) { // Assumes input like "YYYY-MM-DD"
    if (!dateString || dateString === "N/A" || dateString === "Not Attempted") return dateString;
    try {
        // Parse date explicitly as UTC to avoid timezone issues during display, then format to local string
        const date = new Date(dateString + 'T00:00:00Z'); 
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options); // Example: "1 Jan, 2024"
    } catch (e) {
        console.warn("Could not format date:", dateString, e);
        return dateString; // Return original if formatting fails
    }
}

// --- Chart Instances (Global Scope) ---
let scoreTrendChartInstance = null; 
let overallSkillChartInstance = null;
let modalDonutChartInstance = null; 
let modalLineChartInstance = null; 

document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    checkStudentLogin(); // New login check on page load
});

function setupEventListeners() {
    const mainTabs = document.querySelectorAll('.main-tab-button');
    const mainTabContents = document.querySelectorAll('.main-tab-content');
    const hamburgerButton = document.getElementById('hamburgerButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const logoutButton = document.getElementById('logoutButton'); 
    const mobileLogoutLink = document.getElementById('mobileLogoutLink'); 
    const loginButton = document.getElementById('loginButton'); 
    const studentEmailInput = document.getElementById('studentEmailInput'); 
    
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    if (hamburgerButton && mobileMenu) {
        hamburgerButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    function switchTab(tabElement) {
        const targetTabName = tabElement.getAttribute('data-main-tab');

        mainTabs.forEach(t => t.classList.remove('active'));
        mainTabContents.forEach(content => content.classList.add('hidden'));
        mobileNavLinks.forEach(link => link.classList.remove('active'));

        const desktopTabToActivate = document.querySelector(`.main-tab-button[data-main-tab="${targetTabName}"]`);
        if (desktopTabToActivate) desktopTabToActivate.classList.add('active');
        
        const mobileLinkToActivate = document.querySelector(`.mobile-nav-link[data-main-tab="${targetTabName}"]`);
        if (mobileLinkToActivate) mobileLinkToActivate.classList.add('active');

        const targetContentId = targetTabName + '-content';
        const targetElement = document.getElementById(targetContentId);
        if (targetElement) {
            targetElement.classList.remove('hidden');
        }
        // Only initialize charts if the overview tab is selected
        if (targetTabName === 'overview') {
            initializeOverviewCharts(currentStudentData); 
        }
        // Auto-click first sub-tab when main tab switches
        const firstSubTab = document.querySelector(`#${targetContentId} .sub-tab-button`);
        if (firstSubTab) {
            firstSubTab.click(); 
        }
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
    }

    mainTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            switchTab(link);
        });
    });

    document.querySelectorAll('.sub-tab-button').forEach(subTab => {
        subTab.addEventListener('click', () => {
            const parentMainTabContent = subTab.closest('.main-tab-content');
            parentMainTabContent.querySelectorAll('.sub-tab-button').forEach(st => st.classList.remove('active'));
            parentMainTabContent.querySelectorAll('.sub-tab-content-panel').forEach(panel => panel.classList.add('hidden'));
            subTab.classList.add('active');
            const targetSubContentId = subTab.getAttribute('data-sub-tab') + '-content';
            document.getElementById(targetSubContentId)?.classList.remove('hidden');
        });
    });
    
    // Auto-select initial tab (Overview) after data loads
    // This will be called explicitly after login in checkStudentLogin()
    // if (mainTabs.length > 0) {
    //     const firstDesktopTab = document.querySelector('.main-tab-button[data-main-tab="overview"]');
    //     if (firstDesktopTab) {
    //         switchTab(firstDesktopTab);
    //     }
    // }

    // Login/Logout Event Listeners
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
        studentEmailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (mobileLogoutLink) {
        mobileLogoutLink.addEventListener('click', handleLogout);
    }
}

// New login/logout functions
function checkStudentLogin() {
    const studentEmail = localStorage.getItem(STUDENT_IDENTIFIER_KEY);
    const loginModal = document.getElementById('loginModal');
    const mainDashboardContent = document.getElementById('main-dashboard-content');
    const studentEmailInput = document.getElementById('studentEmailInput'); // Get reference for clearing

    if (studentEmail) {
        studentEmailInput.value = studentEmail; // Pre-fill email if exists
        loginModal.style.display = 'none'; // Hide login modal
        mainDashboardContent.classList.remove('hidden'); // Show dashboard content
        toggleHeaderButtons(true); // Show logout, hide welcome message on small screens
        loadAndDisplayData(studentEmail); // Load data for this student
    } else {
        loginModal.style.display = 'block'; // Show login modal
        mainDashboardContent.classList.add('hidden'); // Hide dashboard content
        toggleHeaderButtons(false); // Hide logout, show welcome message on small screens
        studentEmailInput.value = ''; // Clear input on fresh load
        document.getElementById('loginError').classList.add('hidden'); // Hide any previous error
    }
}

async function handleLogin() {
    const studentEmailInput = document.getElementById('studentEmailInput');
    const loginError = document.getElementById('loginError');
    const studentEmail = studentEmailInput.value.trim().toLowerCase(); // Normalize email for lookup

    if (!studentEmail || !studentEmail.includes('@') || !studentEmail.includes('.')) {
        loginError.textContent = "Please enter a valid email address.";
        loginError.classList.remove('hidden');
        return;
    }

    // Fetch all data for validation and filtering
    try {
        allAggregatedData = await fetchCsvData(AGGREGATED_SCORES_CSV_URL);
        allQuestionDetailsData = await fetchCsvData(QUESTION_DETAILS_CSV_URL);

        // Check if student exists in either dataset
        const studentExists = allAggregatedData.some(row => row.StudentGmailID === studentEmail) ||
                             allQuestionDetailsData.some(row => row.StudentGmailID === studentEmail);

        if (studentExists) {
            localStorage.setItem(STUDENT_IDENTIFIER_KEY, studentEmail);
            loginError.classList.add('hidden');
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('main-dashboard-content').classList.remove('hidden'); // Show dashboard
            toggleHeaderButtons(true); // Show logout
            loadAndDisplayData(studentEmail); // Load data for this identified student

            // Activate Overview tab after data loads
            const firstDesktopTab = document.querySelector('.main-tab-button[data-main-tab="overview"]');
            if (firstDesktopTab) {
                firstDesktopTab.click(); // Programmatically click to activate and initialize charts
            }
        } else {
            loginError.textContent = "Email not found in our records. Please check and try again.";
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error during login data fetch:", error);
        loginError.textContent = "Could not fetch data. Please try again later. (Check published CSV URLs)";
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    localStorage.removeItem(STUDENT_IDENTIFIER_KEY);
    window.location.reload(); // Reloads the page, triggering checkStudentLogin() and showing login modal
}

function toggleHeaderButtons(loggedIn) {
    const studentNameDisplay = document.getElementById('studentNameDisplay');
    const logoutButton = document.getElementById('logoutButton');
    const mobileLogoutLink = document.getElementById('mobileLogoutLink');

    if (loggedIn) {
        studentNameDisplay.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        mobileLogoutLink.classList.remove('hidden');
    } else {
        studentNameDisplay.classList.add('hidden');
        logoutButton.classList.add('hidden');
        mobileLogoutLink.classList.add('hidden');
    }
}


async function loadAndDisplayData(studentEmail) {
    if (!studentEmail) {
        console.error("No student email provided to load data.");
        return;
    }

    // Fetch all data once per session if not already
    if (allAggregatedData.length === 0 || allQuestionDetailsData.length === 0) {
        try {
            allAggregatedData = await fetchCsvData(AGGREGATED_SCORES_CSV_URL);
            allQuestionDetailsData = await fetchCsvData(QUESTION_DETAILS_CSV_URL);
        } catch (error) {
            console.error("Failed to load all CSV data:", error);
            document.getElementById('main-dashboard-content').innerHTML = '<p class="text-red-600 text-center p-8">Failed to load dashboard data. Please check published CSV URLs and network connection.</p>';
            document.getElementById('main-dashboard-content').classList.remove('hidden'); // Show error to user
            toggleHeaderButtons(false); // Hide logout if data failed
            return;
        }
    }

    // Filter data for the current student
    const studentAggregatedData = allAggregatedData.filter(row => row.StudentGmailID === studentEmail);
    const studentQuestionDetails = allQuestionDetailsData.filter(row => row.StudentGmailID === studentEmail);
    
    if (studentAggregatedData.length === 0 && studentQuestionDetails.length === 0) {
        document.getElementById('main-dashboard-content').innerHTML = `<p class="text-red-600 text-center p-8">No performance data found for "${studentEmail}".</p>`;
        document.getElementById('main-dashboard-content').classList.remove('hidden');
        toggleHeaderButtons(true); // Show logout even if no data
        return;
    }

    // Transform filtered data into dashboard's structured format
    // This is the core data mapping from flat CSV to your UI's expected object
    currentStudentData = transformDataForDashboard(studentAggregatedData, allAggregatedData, studentQuestionDetails, studentEmail);

    // Update Dashboard UI elements
    const studentNamePart = studentEmail.split('@')[0].split('.')[0]; 
    document.getElementById('studentNameDisplay').textContent = `Welcome, ${studentNamePart.charAt(0).toUpperCase() + studentNamePart.slice(1)}!`;
    
    // Populate Score Cards
    document.getElementById('latestTotalScore').innerHTML = `${currentStudentData.latestScores.total || '-'} <span class="text-lg text-gray-500">/ 1600</span>`;
    document.getElementById('latestRWScore').innerHTML = `${currentStudentData.latestScores.rw || '-'} <span class="text-lg text-gray-500">/ 800</span>`;
    document.getElementById('latestMathScore').innerHTML = `${currentStudentData.latestScores.math || '-'} <span class="text-lg text-gray-500">/ 800</span>`;
    document.getElementById('avgEocKhanScore').textContent = `${currentStudentData.latestScores.avgEocKhan || '-'}%`;
    document.getElementById('targetScore').textContent = currentStudentData.targetScore || '-';
    document.getElementById('targetScoreDifference').textContent = `Goal: ${currentStudentData.targetScore && currentStudentData.latestScores.total ? (currentStudentData.targetScore - parseFloat(currentStudentData.latestScores.total)) : '-'} points`;

    // Populate Class Averages for Score Cards
    document.getElementById('classAvgTotalScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.total || '-'}`;
    document.getElementById('classAvgRWScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.rw || '-'}`;
    document.getElementById('classAvgMathScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.math || '-'}`;
    document.getElementById('classAvgEocKhanScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.avgEocKhan || '-'}%`;

    // Populate other sections
    populateOverviewSnapshot(currentStudentData); 
    populatePracticeTestsTable(currentStudentData.cbPracticeTests);
    
    ['reading', 'writing', 'math'].forEach(subject => {
        populateEOCTable(subject, currentStudentData.eocQuizzes[subject]);
        populateKhanSection(subject, currentStudentData.khanAcademy[subject]);
        populateCBSkills(subject, currentStudentData.cbSkills[subject]);
    });

    // Initial tab activation needs to happen after data is loaded
    const firstDesktopTab = document.querySelector('.main-tab-button[data-main-tab="overview"]');
    if (firstDesktopTab) {
        firstDesktopTab.click(); // Programmatically click to activate and initialize charts
    }
}

async function fetchCsvData(url) {
    console.log("Attempting to fetch data from:", url);
    return new Promise((resolve, reject) => {
        PapaParse.parse(url, {
            download: true,
            header: true, // Parse first row as headers
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error(`PapaParse errors for ${url}:`, results.errors);
                    reject(results.errors);
                }
                console.log(`Fetched data from ${url}. Rows: ${results.data.length}`);
                resolve(results.data);
            },
            error: function(err) {
                console.error(`Error fetching CSV from ${url}:`, err);
                reject(err);
            }
        });
    });
}

// Function to transform flat CSV data into dashboard's structured format
function transformDataForDashboard(studentAggregatedAssessments, allAggregatedData, studentQuestionDetails, studentEmail) {
    const student = { 
        name: studentEmail, 
        targetScore: 1400, // This could eventually come from a student profile API
        latestScores: { total: "-", rw: "-", math: "-", avgEocKhan: "-" },
        classAveragesGlobal: { total: "-", rw: "-", math: "-", avgEocKhan: "-" }, 
        scoreTrend: { labels: [], studentScores: [], classAvgScores: [] },
        overallSkillPerformance: { labels: ['Reading', 'Writing & Language', 'Math'], studentAccuracy: [0,0,0], classAvgAccuracy: [0,0,0] },
        strengths: [], improvements: [],
        timeSpent: { studentAvg: "N/A", studentUnit: "", classAvg: "N/A", classUnit: ""},
        cbPracticeTests: [], eocQuizzes: { reading: [], writing: [], math: [] }, 
        khanAcademy: { reading: [], writing: [], math: [] }, cbSkills: { reading: [], writing: [], math: [] }
    };

    // --- Student Name (Try to get actual name from a source if available) ---
    // Assuming 'StudentName_Full' might be present in aggregated data rows (if joined from Students_CanvasData)
    // Or, you'd need a separate mapping from studentEmail to full name.
    const studentNameEntry = allAggregatedData.find(row => row.StudentGmailID === studentEmail && row.StudentName_Full);
    if(studentNameEntry && studentNameEntry.StudentName_Full) {
        student.name = studentNameEntry.StudentName_Full;
    } else {
        // Fallback: simple name from email
        const emailParts = studentEmail.split('@')[0].split('.');
        student.name = emailParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }


    // --- Global Class Averages (Calculated from ALL data) ---
    // This is simplified. In a real scenario, you'd calculate this once for the entire dataset
    // independent of the current student's data. For this client-side dashboard,
    // we aggregate across all data loaded via PapaParse.
    
    // For CB Tests (Total, RW, Math)
    const allCBTests = allAggregatedData.filter(a => a.AssessmentSource === 'Canvas CB Test' && a.Score_Scaled_Total);
    if(allCBTests.length > 0) {
        const totalSum = allCBTests.reduce((sum, a) => sum + parseFloat(a.Score_Scaled_Total), 0);
        student.classAveragesGlobal.total = Math.round(totalSum / allCBTests.length);
        const rwSum = allCBTests.reduce((sum, a) => sum + parseFloat(a.ScaledScore_RW || 0), 0);
        student.classAveragesGlobal.rw = Math.round(rwSum / allCBTests.length);
        const mathSum = allCBTests.reduce((sum, a) => sum + parseFloat(a.ScaledScore_Math || 0), 0);
        student.classAveragesGlobal.math = Math.round(mathSum / allCBTests.length);
    }
    
    // For EOC/Khan Avg Pct
    const allEocKhanScores = allAggregatedData.filter(a => (a.AssessmentSource.includes('EOC') || a.AssessmentSource.includes('Khan')) && a.Score_Percentage);
    if (allEocKhanScores.length > 0) {
        const totalEocKhanPct = allEocKhanScores.reduce((sum, a) => sum + parseFloat(a.Score_Percentage.replace('%','')), 0);
        student.classAveragesGlobal.avgEocKhan = Math.round(totalEocKhanPct / allEocKhanScores.length);
    }

    // --- Student Specific Data (Filtered Data) ---

    // Latest Scores (Overall Dashboard Snapshot)
    const studentLatestCBTests = studentAggregatedAssessments.filter(a => a.AssessmentSource === 'Canvas CB Test' && a.Score_Scaled_Total);
    if (studentLatestCBTests.length > 0) {
        studentLatestCBTests.sort((a,b) => new Date(b.AttemptDate) - new Date(a.AttemptDate)); // Latest first
        const latestTest = studentLatestCBTests[0];
        student.latestScores.total = parseFloat(latestTest.Score_Scaled_Total);
        student.latestScores.rw = parseFloat(latestTest.ScaledScore_RW);
        student.latestScores.math = parseFloat(latestTest.ScaledScore_Math);
    }

    const studentEocKhanAvgScores = studentAggregatedAssessments.filter(a => (a.AssessmentSource.includes('EOC') || a.AssessmentSource.includes('Khan')) && a.Score_Percentage);
    if (studentEocKhanAvgScores.length > 0) {
        const totalStudentEocKhanPct = studentEocKhanAvgScores.reduce((sum, a) => sum + parseFloat(a.Score_Percentage.replace('%','')), 0);
        student.latestScores.avgEocKhan = Math.round(totalStudentEocKhanPct / studentEocKhanAvgScores.length);
    }


    // CB Practice Tests Table & Score Trend Chart Data
    // Include both "Canvas CB Test" (aggregate) and "Canvas CB Module" rows
    student.cbPracticeTests = studentAggregatedAssessments.filter(a => a.AssessmentSource.includes('CB Test') || a.AssessmentSource.includes('CB Module'))
        .map(a => ({
            name: a.AssessmentName,
            date: a.AttemptDate,
            // Prioritize scaled scores for tests, raw scores for modules, else '-'
            rw: a.ScaledScore_RW || (a.AssessmentSource.includes('CB Module') ? a.Score_Raw_Combined : '-'), 
            math: a.ScaledScore_Math || (a.AssessmentSource.includes('CB Module') ? a.Score_Raw_Combined : '-'),
            total: a.Score_Scaled_Total || (a.AssessmentSource.includes('CB Module') ? a.Score_Raw_Combined : '-'),
            classAvgRW: student.classAveragesGlobal.rw, // Use global class average for now
            classAvgMath: student.classAveragesGlobal.math,
            classAvgTotal: student.classAveragesGlobal.total
        }))
        .sort((a,b) => new Date(a.date) - new Date(b.date)); // Sort ascending by date for trend chart

    // Filter score trend to only include aggregate CB Tests for cleaner chart
    const trendTests = student.cbPracticeTests.filter(t => t.total !== '-' && t.name.includes('CB-T'));
    student.scoreTrend.labels = trendTests.map(t => t.name.replace('CB-T','Test ')); // Simplify names for labels
    student.scoreTrend.studentScores = trendTests.map(t => parseFloat(t.total) || 0);
    student.scoreTrend.classAvgScores = student.scoreTrend.labels.map(() => student.classAveragesGlobal.total); // Repeat global average for all points


    // EOC Quizzes
    const eocSubjects = { reading: 'R-EOC', writing: 'W-EOC', math: 'M-EOC' };
    Object.keys(eocSubjects).forEach(subjectKey => {
        student.eocQuizzes[subjectKey] = studentAggregatedAssessments.filter(a => 
            a.AssessmentSource === 'Canvas EOC Practice' && a.AssessmentName.startsWith(eocSubjects[subjectKey]))
            .map(a => ({ 
                name: a.AssessmentName, 
                latestScore: a.Score_Percentage || `${a.Score_Raw_Combined}/${a.PointsPossible_Combined}`, 
                date: a.AttemptDate, 
                classAvg: student.classAveragesGlobal.avgEocKhan // Placeholder, needs per-quiz class avg
            }));
    });

    // Khan Academy
    const khanSubjects = { reading: 'Reading', writing: 'Writing', math: 'Math' };
    Object.keys(khanSubjects).forEach(subjectKey => {
        student.khanAcademy[subjectKey] = studentAggregatedAssessments.filter(a => 
            a.AssessmentSource === 'Khan Academy Practice' && a.AssessmentName.includes(khanSubjects[subjectKey]))
            .map(a => ({ 
                name: a.AssessmentName, 
                date: a.AttemptDate, 
                score: a.Score_Percentage || `${a.Score_Raw_Combined}/${a.PointsPossible_Combined}`, 
                pointsPossible: a.PointsPossible_Combined, 
                classAvg: student.classAveragesGlobal.avgEocKhan // Placeholder, needs per-assignment class avg
            }));
    });
    
    // CB Skills (Overall Skill Performance & Strengths/Improvements)
    const skillCategories = [
        { key: 'reading', tagPrefix: 'Reading', label: 'Reading' },
        { key: 'writing', tagPrefix: 'Writing', label: 'Writing & Language' },
        { key: 'math', tagPrefix: 'Math', label: 'Math' }
    ];

    skillCategories.forEach((category, index) => {
        const categoryQuestions = studentQuestionDetails.filter(q => 
            q.SAT_Skill_Tag && q.SAT_Skill_Tag.includes(category.tagPrefix)
        );
        const studentAccuracy = calculateAverageCorrectness(categoryQuestions);
        student.overallSkillPerformance.studentAccuracy[index] = studentAccuracy;
        student.overallSkillPerformance.labels[index] = category.label; // Ensure labels are consistent
        
        // Detailed skills in cbSkills tabs
        // Aggregate by distinct SAT_Skill_Tag for these tabs
        const uniqueSkillsMap = {}; // { 'Skill Name': { totalCorrect: X, totalAttempted: Y } }
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
            classAvg: student.classAveragesGlobal.avgEocKhan // Placeholder, needs per-skill class avg
        })).sort((a,b) => b.score - a.score); // Sort by score descending
    });

    // Strengths/Improvements based on detailed skill scores
    const allStudentDetailedSkills = Object.values(student.cbSkills).flatMap(arr => arr);
    student.strengths = allStudentDetailedSkills.filter(s => s.score >= 80).map(s => `${s.name} (${s.score}%)`).slice(0,3);
    student.improvements = allStudentDetailedSkills.filter(s => s.score < 60).map(s => `${s.name} (${s.score}%)`).slice(0,3);


    // Time Spent (placeholder until activity data is detailed)
    // You'd calculate this from Engagement_CanvasAggregated data.
    student.timeSpent = { studentAvg: "N/A", studentUnit: "", classAvg: "N/A", classUnit: ""}; 

    return student;
}

// Helper to calculate average correctness from filtered question details
function calculateAverageCorrectness(questionItems) {
    if (questionItems.length === 0) return 0;
    const correctCount = questionItems.filter(q => String(q.IsCorrect).toUpperCase() === 'TRUE').length;
    // For average accuracy, ensure only questions that were actually attempted are considered
    const attemptedCount = questionItems.filter(q => q.StudentAnswer && q.StudentAnswer.trim() !== '').length; // Assuming an answer means attempted
    if (attemptedCount === 0) return 0; // Avoid division by zero if no questions were attempted
    return Math.round((correctCount / attemptedCount) * 100);
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
                    { label: 'Class Average Accuracy', data: 'rgba(117, 117, 117, 0.7)' } // Consistent secondary BG
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
    document.getElementById('targetScoreDifference').textContent = `Goal: ${studentData.targetScore && studentData.latestScores.total ? (studentData.targetScore - parseFloat(studentData.latestScores.total)) : '-'} points`;

    const overviewStrengthsList = document.getElementById('overviewStrengthsList'); 
    const overviewImprovementsList = document.getElementById('overviewImprovementsList');
    const timeSpentOverviewDiv = document.getElementById('timeSpentOverview');
    
    if(overviewStrengthsList) {
        overviewStrengthsList.innerHTML = ''; 
        (studentData.strengths || []).forEach(item => { const li = document.createElement('li'); li.textContent = item; overviewStrengthsList.appendChild(li); });
        if(studentData.strengths.length === 0) overviewStrengthsList.innerHTML = '<li class="text-gray-500">No strengths identified yet.</li>';
    }
    if(overviewImprovementsList) {
        overviewImprovementsList.innerHTML = ''; 
        (studentData.improvements || []).forEach(item => { const li = document.createElement('li'); li.textContent = item; overviewImprovementsList.appendChild(li); });
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
    const cbTableBody = document.getElementById('cb-practice-tests-table-body');
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
        container.innerHTML = `<p class="text-gray-600 p-3">No Khan Academy Practice data available for ${currentStudentData.name} in ${sectionKey}.</p>`;
    }
}

function getPerformanceClass(score) {
    if (score === null || isNaN(score)) return ''; // No specific class if score is not valid
    if (score >= 85) return 'performance-good';
    if (score >= 70) return 'performance-average';
    return 'performance-poor';
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

const modal = document.getElementById('detailModal');
const modalQuestionDetailsContainer = document.getElementById('modalQuestionDetails');

function openModal(title, contentDetails) { 
    console.log("Opening modal with title:", title);
    const modalHeaderH2 = modal.querySelector('.modal-header h2'); 
    if(modalHeaderH2) modalHeaderH2.textContent = title;
    
    modalQuestionDetailsContainer.innerHTML = ''; 
    
    // Filter question details for the specific assessment clicked
    const assessmentQuestions = allQuestionDetailsData.filter(q => 
        q.StudentGmailID === localStorage.getItem(STUDENT_IDENTIFIER_KEY) && 
        q.AssessmentName === contentDetails.data.name // Assuming contentDetails.data.name holds the AssessmentName
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
                <p class="font-medium text-gray-700">Q${q.QuestionSequenceInQuiz || (index + 1)}: ${q.QuestionText_fromMetadata || q.QuestionText_Full}</p>
                <p>Your Answer: <span class="font-semibold ${isCorrect ? 'text-good' : 'text-poor'}">${q.StudentAnswer || 'Not Provided'}</span> (${statusText})</p>
                <p class="text-xs text-gray-500 mt-1">
                    Points: ${pointsEarned}/${pointsPossible} | Skill: ${q.SAT_Skill_Tag || 'TBD'} | Class Avg Correctness: (N/A)% 
                </p>
            `;
            modalQuestionDetailsContainer.appendChild(d);
        });
    } else {
        modalQuestionDetailsContainer.innerHTML = `<p class="text-gray-500 py-3 text-center">No detailed question data found for this assessment.</p>`;
    }
    
    // Re-initialize charts if data is available for them
    if(modalDonutChartInstance) modalDonutChartInstance.destroy();
    if(modalLineChartInstance) modalLineChartInstance.destroy();
    
    const correctCount = assessmentQuestions.filter(q => String(q.IsCorrect).toUpperCase() === 'TRUE').length;
    const incorrectCount = assessmentQuestions.filter(q => String(q.IsCorrect).toUpperCase() === 'FALSE').length;
    const unansweredCount = assessmentQuestions.filter(q => !q.StudentAnswer || q.StudentAnswer.trim() === '').length; // Assuming no answer means unanswered
    const totalAnswered = correctCount + incorrectCount; // Total actually answered

    // Use totalAnswered for donut chart if there are answered questions, else total questions
    const donutData = [correctCount, incorrectCount, unansweredCount];
    const donutLabels = ['Correct', 'Incorrect', 'Unanswered'];
    const donutColors = ['#4caf50', '#f44336', '#9e9e9e']; // Green, Red, Grey

    if(totalAnswered > 0 || unansweredCount > 0) { // Only show chart if there's any data
        const donutCtx = document.getElementById('modalDonutChart')?.getContext('2d');
        if (donutCtx) { 
            modalDonutChartInstance = new Chart(donutCtx, {
                type: 'doughnut',
                data: {
                    labels: donutLabels,
                    datasets: [{ data: donutData, backgroundColor: donutColors, hoverOffset: 4 }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } }, cutout: '50%' }
            });
        }
    } else {
        document.getElementById('modalDonutChart').style.display = 'none'; // Hide canvas if no data
        document.getElementById('modalDonutChart').parentNode.innerHTML += '<p class="text-gray-500 text-center text-sm mt-4">No data for donut chart.</p>';
    }

    const lineCtx = document.getElementById('modalLineChart')?.getContext('2d');
    // Line chart data is still dummy, replace with actual question-wise score trends if available
    // For now, it will remain dummy data from the script itself for visual representation
    if (lineCtx) { 
        modalLineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Q1','Q2','Q3','Q4','Q5'], // Dummy labels
                datasets: [
                    { label: 'Your Score', data: Array.from({length:5},()=>50+Math.random()*40), borderColor: '#2a5266', tension: 0.1, fill: false },
                    { label: 'Class Avg', data: Array.from({length:5},()=>45+Math.random()*35), borderColor: '#757575', borderDash:[5,5], tension: 0.1, fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    } else {
        document.getElementById('modalLineChart').style.display = 'none';
        document.getElementById('modalLineChart').parentNode.innerHTML += '<p class="text-gray-500 text-center text-sm mt-4">No data for line chart.</p>';
    }

    if(modal) modal.style.display="block";
}

function closeModal() { 
    if(modal) modal.style.display = "none"; 
    if (modalDonutChartInstance) modalDonutChartInstance.destroy(); 
    if (modalLineChartInstance) modalLineChartInstance.destroy(); 
}

window.onclick = function(event) { 
    if (event.target == modal) closeModal(); 
}
