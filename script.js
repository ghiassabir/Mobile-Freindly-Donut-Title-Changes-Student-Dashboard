// --- Constants for Data Files (Future Use) ---
const AGGREGATED_SCORES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSySYBO9YL3N4aUG3JEYZMQQIv9d1oSm3ba4Ty9Gt4SsGs2zmTS_k81rH3Qv41mZvClnayNcDpl_QbI/pub?gid=1890969747&single=true&output=csv'; 
const QUESTION_DETAILS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSySYBO9YL3N4aUG3JEYZMQQIv9d1oSm3ba4Ty9Gt4SsGs2zmTS_k81rH3Qv41mZvClnayNcDpl_QbI/pub?gid=822014112&single=true&output=csv'; 
const STUDENT_IDENTIFIER_KEY = 'satHubStudentEmail'; // Key for local storage

// --- Dummy Data (removed as data will be fetched) ---
let currentStudentData = {}; // Will be populated from fetched data
let allAggregatedData = []; // Store all fetched aggregated data
let allQuestionDetailsData = []; // Store all fetched question details

// --- Date Formatting Helper ---
function formatDate(dateString) { // Assumes input like "YYYY-MM-DD"
    if (!dateString || dateString === "N/A" || dateString === "Not Attempted") return dateString;
    try {
        const date = new Date(dateString + 'T00:00:00'); // Ensure parsing as local date
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    } catch (e) {
        console.warn("Could not format date:", dateString);
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
    checkStudentLogin(); // New login check
});

function setupEventListeners() {
    const mainTabs = document.querySelectorAll('.main-tab-button');
    const mainTabContents = document.querySelectorAll('.main-tab-content');
    const hamburgerButton = document.getElementById('hamburgerButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const logoutButton = document.getElementById('logoutButton'); // New logout button
    const mobileLogoutLink = document.getElementById('mobileLogoutLink'); // New mobile logout link
    const loginButton = document.getElementById('loginButton'); // New login button
    const studentEmailInput = document.getElementById('studentEmailInput'); // New email input
    
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
        if (targetContentId === 'overview-content') {
            initializeOverviewCharts(currentStudentData); 
        }
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
    
    // Initial tab selection
    if (mainTabs.length > 0) {
        const firstDesktopTab = document.querySelector('.main-tab-button[data-main-tab="overview"]');
        if (firstDesktopTab) {
            switchTab(firstDesktopTab);
        }
    }

    // New Login/Logout Event Listeners
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
    const studentEmailInput = document.getElementById('studentEmailInput');
    const studentNameDisplay = document.getElementById('studentNameDisplay');
    const logoutButton = document.getElementById('logoutButton');
    const mobileLogoutLink = document.getElementById('mobileLogoutLink');

    if (studentEmail) {
        studentEmailInput.value = studentEmail; // Pre-fill email if exists
        studentNameDisplay.textContent = `Welcome, ${studentEmail.split('@')[0].split('.')[0]}!`; // Basic name from email
        logoutButton.classList.remove('hidden');
        mobileLogoutLink.classList.remove('hidden');
        loginModal.style.display = 'none'; // Hide login modal
        loadAndDisplayData(studentEmail); // Load data for this student
    } else {
        loginModal.style.display = 'block'; // Show login modal
        logoutButton.classList.add('hidden');
        mobileLogoutLink.classList.add('hidden');
        studentNameDisplay.textContent = `Welcome!`; // Reset display
    }
}

async function handleLogin() {
    const studentEmailInput = document.getElementById('studentEmailInput');
    const loginError = document.getElementById('loginError');
    const studentEmail = studentEmailInput.value.trim().toLowerCase(); // Normalize email

    if (!studentEmail || !studentEmail.includes('@') || !studentEmail.includes('.')) {
        loginError.textContent = "Please enter a valid email address.";
        loginError.classList.remove('hidden');
        return;
    }

    // --- IMPORTANT: Validate studentEmail against your known student IDs ---
    // This is a crucial step. For now, we'll fetch ALL data and check if this email exists.
    // In a real system, you might have an API endpoint to validate credentials.

    try {
        allAggregatedData = await fetchCsvData(AGGREGATED_SCORES_CSV_URL);
        allQuestionDetailsData = await fetchCsvData(QUESTION_DETAILS_CSV_URL);

        const studentExistsInAggregated = allAggregatedData.some(row => row.StudentGmailID === studentEmail);
        const studentExistsInQDetails = allQuestionDetailsData.some(row => row.StudentGmailID === studentEmail);

        if (studentExistsInAggregated || studentExistsInQDetails) {
            localStorage.setItem(STUDENT_IDENTIFIER_KEY, studentEmail);
            loginError.classList.add('hidden');
            document.getElementById('loginModal').style.display = 'none';
            checkStudentLogin(); // Reload dashboard for this student
        } else {
            loginError.textContent = "Email not found in our records. Please check and try again.";
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error during login data fetch:", error);
        loginError.textContent = "Could not fetch data. Please try again later.";
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    localStorage.removeItem(STUDENT_IDENTIFIER_KEY);
    window.location.reload(); // Reloads the page, triggering login modal
}


// Modified loadAndDisplayData to accept studentEmail
async function loadAndDisplayData(studentEmail) {
    if (!studentEmail) {
        console.error("No student email provided to load data.");
        return;
    }

    // Ensure all data is fetched once per session if not already
    if (allAggregatedData.length === 0 || allQuestionDetailsData.length === 0) {
        try {
            allAggregatedData = await fetchCsvData(AGGREGATED_SCORES_CSV_URL);
            allQuestionDetailsData = await fetchCsvData(QUESTION_DETAILS_CSV_URL);
        } catch (error) {
            console.error("Failed to load all CSV data:", error);
            // Display an error message to the user on the dashboard
            document.getElementById('main').innerHTML = '<p class="text-red-600 text-center p-8">Failed to load dashboard data. Please try refreshing or contact support.</p>';
            return;
        }
    }

    // Filter data for the current student
    const studentAggregatedData = allAggregatedData.filter(row => row.StudentGmailID === studentEmail);
    const studentQuestionDetails = allQuestionDetailsData.filter(row => row.StudentGmailID === studentEmail);
    
    if (studentAggregatedData.length === 0 && studentQuestionDetails.length === 0) {
        document.getElementById('main').innerHTML = `<p class="text-red-600 text-center p-8">No data found for ${studentEmail}.</p>`;
        return;
    }

    // Transform filtered data into dashboard's structured format
    currentStudentData = transformDataForDashboard(studentAggregatedData, allAggregatedData, studentQuestionDetails, studentEmail);

    // Update Dashboard UI elements
    const studentNamePart = studentEmail.split('@')[0].split('.')[0]; // Simple extraction
    document.getElementById('studentNameDisplay').textContent = `Welcome, ${studentNamePart.charAt(0).toUpperCase() + studentNamePart.slice(1)}!`;
    
    // Populate Score Cards
    document.getElementById('latestTotalScore').innerHTML = `${currentStudentData.latestScores.total} <span class="text-lg text-gray-500">/ 1600</span>`;
    document.getElementById('latestRWScore').innerHTML = `${currentStudentData.latestScores.rw} <span class="text-lg text-gray-500">/ 800</span>`;
    document.getElementById('latestMathScore').innerHTML = `${currentStudentData.latestScores.math} <span class="text-lg text-gray-500">/ 800</span>`;
    document.getElementById('avgEocKhanScore').textContent = `${currentStudentData.latestScores.avgEocKhan}%`;
    document.getElementById('targetScore').textContent = currentStudentData.targetScore;
    document.getElementById('targetScoreDifference').textContent = `Goal: ${currentStudentData.targetScore - parseFloat(currentStudentData.latestScores.total)} points`;

    // Populate Class Averages for Score Cards
    document.getElementById('classAvgTotalScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.total}`;
    document.getElementById('classAvgRWScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.rw}`;
    document.getElementById('classAvgMathScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.math}`;
    document.getElementById('classAvgEocKhanScore').textContent = `Class Avg: ${currentStudentData.classAveragesGlobal.avgEocKhan}%`;

    // Populate other sections
    populateOverviewSnapshot(currentStudentData); 
    populatePracticeTestsTable(currentStudentData.cbPracticeTests);
    
    ['reading', 'writing', 'math'].forEach(subject => {
        // Pass original eocChapters structure for full list, and filtered data
        populateEOCTable(subject, currentStudentData.eocQuizzes[subject]);
        populateKhanSection(subject, currentStudentData.khanAcademy[subject]);
        populateCBSkills(subject, currentStudentData.cbSkills[subject]);
    });

    // Initialize charts AFTER all data is loaded and displayed
    initializeOverviewCharts(currentStudentData); 
}

async function fetchCsvData(url) {
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
        name: studentEmail, // Default name, try to update below
        targetScore: 1400, // Hardcoded for now
        latestScores: { total: "-", rw: "-", math: "-", avgEocKhan: "-" },
        classAveragesGlobal: { total: "-", rw: "-", math: "-", avgEocKhan: "-" }, 
        scoreTrend: { labels: [], studentScores: [], classAvgScores: [] },
        overallSkillPerformance: { labels: ['Reading', 'Writing & Language', 'Math'], studentAccuracy: [0,0,0], classAvgAccuracy: [0,0,0] },
        strengths: [], improvements: [],
        timeSpent: { studentAvg: "N/A", studentUnit: "min / day", classAvg: "N/A", classUnit: "min / day"},
        cbPracticeTests: [], eocQuizzes: { reading: [], writing: [], math: [] }, 
        khanAcademy: { reading: [], writing: [], math: [] }, cbSkills: { reading: [], writing: [], math: [] }
    };

    // Attempt to get student's full name from aggregated data or mapping
    const studentNameFromAgg = studentAggregatedAssessments.find(row => row.StudentGmailID === studentEmail)?.StudentName_Full; // Assuming Students_CanvasData might have full name if joined
    if(studentNameFromAgg) student.name = studentNameFromAgg;
    // Fallback: simple name from email
    else {
        const emailParts = studentEmail.split('@')[0].split('.');
        student.name = emailParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }


    // --- Global Class Averages (requires processing allAggregatedData) ---
    const classAvgTotalScores = allAggregatedData.filter(a => a.AssessmentSource === 'Canvas CB Test' && a.Score_Scaled_Total);
    if(classAvgTotalScores.length > 0) {
        const totalSum = classAvgTotalScores.reduce((sum, a) => sum + parseFloat(a.Score_Scaled_Total), 0);
        student.classAveragesGlobal.total = Math.round(totalSum / classAvgTotalScores.length);
        const rwSum = classAvgTotalScores.reduce((sum, a) => sum + parseFloat(a.ScaledScore_RW || 0), 0);
        student.classAveragesGlobal.rw = Math.round(rwSum / classAvgTotalScores.length);
        const mathSum = classAvgTotalScores.reduce((sum, a) => sum + parseFloat(a.ScaledScore_Math || 0), 0);
        student.classAveragesGlobal.math = Math.round(mathSum / classAvgTotalScores.length);
    }
    
    // Class average EOC/Khan needs aggregation across all students, similar logic
    const allEocKhanScores = allAggregatedData.filter(a => (a.AssessmentSource.includes('EOC') || a.AssessmentSource.includes('Khan')) && a.Score_Percentage);
    if (allEocKhanScores.length > 0) {
        const totalEocKhanPct = allEocKhanScores.reduce((sum, a) => sum + parseFloat(a.Score_Percentage.replace('%','')), 0);
        student.classAveragesGlobal.avgEocKhan = Math.round(totalEocKhanPct / allEocKhanScores.length);
    }

    // --- Student Specific Data ---

    // Filter to only 'Canvas CB Test' rows for overall latest scores
    const latestCBTests = studentAggregatedAssessments.filter(a => a.AssessmentSource === 'Canvas CB Test' && a.Score_Scaled_Total);
    if (latestCBTests.length > 0) {
        latestCBTests.sort((a,b) => new Date(b.AttemptDate) - new Date(a.AttemptDate)); // Latest first
        const latestTest = latestCBTests[0];
        student.latestScores.total = parseFloat(latestTest.Score_Scaled_Total);
        student.latestScores.rw = parseFloat(latestTest.ScaledScore_RW);
        student.latestScores.math = parseFloat(latestTest.ScaledScore_Math);
        student.targetScoreDifference.textContent = `Goal: ${student.targetScore - student.latestScores.total} points`; // Calculate diff
    }

    // Aggregate EOC/Khan percentages for student's avgEocKhanScore
    const studentEocKhanScores = studentAggregatedAssessments.filter(a => (a.AssessmentSource.includes('EOC') || a.AssessmentSource.includes('Khan')) && a.Score_Percentage);
    if (studentEocKhanScores.length > 0) {
        const totalStudentEocKhanPct = studentEocKhanScores.reduce((sum, a) => sum + parseFloat(a.Score_Percentage.replace('%','')), 0);
        student.latestScores.avgEocKhan = Math.round(totalStudentEocKhanPct / studentEocKhanScores.length);
    }


    // Populate cbPracticeTests and scoreTrend
    student.cbPracticeTests = studentAggregatedAssessments.filter(a => a.AssessmentSource.includes('CB Test') || a.AssessmentSource.includes('CB Module'))
        .map(a => ({
            name: a.AssessmentName,
            date: a.AttemptDate,
            rw: a.ScaledScore_RW || (a.AssessmentSource.includes('CB Module') ? a.Score_Raw_Combined : '-'), 
            math: a.ScaledScore_Math || (a.AssessmentSource.includes('CB Module') ? a.Score_Raw_Combined : '-'),
            total: a.Score_Scaled_Total || (a.AssessmentSource.includes('CB Module') ? a.Score_Raw_Combined : '-'),
            classAvgRW: "(N/A)", 
            classAvgMath: "(N/A)",
            classAvgTotal: "(N/A)"
        }))
        .sort((a,b) => new Date(a.date) - new Date(b.date)); // Sort ascending by date for trend

    student.scoreTrend.labels = student.cbPracticeTests.map(t => t.name);
    student.scoreTrend.studentScores = student.cbPracticeTests.map(t => parseFloat(t.total) || 0);
    // Placeholder for classAvgScores in trend chart, would need full class data
    student.scoreTrend.classAvgScores = student.scoreTrend.labels.map(() => student.classAveragesGlobal.total); // Use global average for all points


    // Populate eocQuizzes
    const eocSubjects = { reading: 'R-EOC', writing: 'W-EOC', math: 'M-EOC' };
    Object.keys(eocSubjects).forEach(subjectKey => {
        student.eocQuizzes[subjectKey] = studentAggregatedAssessments.filter(a => 
            a.AssessmentSource === 'Canvas EOC Practice' && a.AssessmentName.startsWith(eocSubjects[subjectKey]))
            .map(a => ({ 
                name: a.AssessmentName, 
                latestScore: a.Score_Percentage || `${a.Score_Raw_Combined}/${a.PointsPossible_Combined}`, 
                date: a.AttemptDate, 
                classAvg: "(N/A)" // Requires class avg per EOC quiz
            }));
    });

    // Populate khanAcademy
    const khanSubjects = { reading: 'Reading', writing: 'Writing', math: 'Math' };
    Object.keys(khanSubjects).forEach(subjectKey => {
        student.khanAcademy[subjectKey] = studentAggregatedAssessments.filter(a => 
            a.AssessmentSource === 'Khan Academy Practice' && a.AssessmentName.includes(khanSubjects[subjectKey]))
            .map(a => ({ 
                name: a.AssessmentName, 
                date: a.AttemptDate, 
                score: a.Score_Percentage || `${a.Score_Raw_Combined}/${a.PointsPossible_Combined}`, 
                pointsPossible: a.PointsPossible_Combined, 
                classAvg: "(N/A)" // Requires class avg per Khan assignment
            }));
    });
    
    // Populate cbSkills (Overall Skill Performance)
    // This needs to aggregate from studentQuestionDetails
    const skillCategories = [
        { key: 'Reading', filter: q => q.SAT_Skill_Tag.includes('Reading'), index: 0 },
        { key: 'Writing & Language', filter: q => q.SAT_Skill_Tag.includes('Writing'), index: 1 },
        { key: 'Math', filter: q => q.SAT_Skill_Tag.includes('Math'), index: 2 }
    ];

    skillCategories.forEach(category => {
        const categoryQuestions = studentQuestionDetails.filter(category.filter);
        const studentAccuracy = calculateAverageCorrectness(categoryQuestions);
        student.overallSkillPerformance.studentAccuracy[category.index] = studentAccuracy;
        // Class Avg Accuracy for skills needs full class data
        student.overallSkillPerformance.classAvgAccuracy[category.index] = student.classAveragesGlobal.avgEocKhan; // Placeholder with overall avg
        
        // Detailed skills in cbSkills tabs (using top-level skill name from SAT_Skill_Tag for simplicity)
        const uniqueSkillsInCat = [...new Set(categoryQuestions.map(q => q.SAT_Skill_Tag))].filter(s => s !== 'TBD');
        student.cbSkills[category.key.toLowerCase().replace(/ & /g, '_')] = uniqueSkillsInCat.map(skillName => {
            const skillQuestions = categoryQuestions.filter(q => q.SAT_Skill_Tag === skillName);
            const skillAccuracy = calculateAverageCorrectness(skillQuestions);
            return { name: skillName, score: skillAccuracy, classAvg: "(N/A)" }; // Class avg per skill needs full data
        }).sort((a,b) => b.score - a.score); // Sort by score descending
    });

    // Populate strengths/improvements based on detailed skill scores (example)
    const allStudentDetailedSkills = Object.values(student.cbSkills).flatMap(arr => arr);
    student.strengths = allStudentDetailedSkills.filter(s => s.score >= 80).map(s => `${s.name} (${s.score}%)`).slice(0,3);
    student.improvements = allStudentDetailedSkills.filter(s => s.score < 60).map(s => `${s.name} (${s.score}%)`).slice(0,3);


    // Time Spent (placeholder until activity data is detailed)
    student.timeSpent = { studentAvg: "N/A", studentUnit: "", classAvg: "N/A", classUnit: ""}; // Reset, actual calculation is complex

    return student;
}

// Helper to calculate average correctness from filtered question details
function calculateAverageCorrectness(questionItems) {
    if (questionItems.length === 0) return 0;
    const correctCount = questionItems.filter(q => String(q.IsCorrect).toUpperCase() === 'TRUE').length;
    return Math.round((correctCount / questionItems.length) * 100);
}


// --- Chart Initializations ---
const CHART_PRIMARY_COLOR = '#2a5266'; 
const CHART_SECONDARY_COLOR = '#757575'; 
const CHART_PRIMARY_BG_BAR = 'rgba(42, 82, 102, 0.8)'; 
const CHART_PRIMARY_BG_RADAR = 'rgba(42, 82, 102, 0.3)';

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
                    { label: 'Class Average Accuracy', data: studentData.overallSkillPerformance.classAvgAccuracy, backgroundColor: 'rgba(117, 117, 117, 0.7)' } // Consistent secondary BG
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
    if(timeSpentOverviewDiv) { // Ensure timeSpent has data
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
