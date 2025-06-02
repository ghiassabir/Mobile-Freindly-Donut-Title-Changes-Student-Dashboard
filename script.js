// --- CONFIGURATION ---
// !!! REPLACE THESE URLs WITH YOUR ACTUAL PUBLISHED GOOGLE SHEET CSV URLs !!!
const MASTER_QUIZ_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR22OeWtUj1ODFBbVBaiSfsp4anSLyfGk2r5JWKu-9TPwklSoiCk4Qste_zDMAsoTCpOPG7qGLj7wOc/pub?gid=671815293&single=true&output=csv
';
const QUESTION_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR22OeWtUj1ODFBbVBaiSfsp4anSLyfGk2r5JWKu-9TPwklSoiCk4Qste_zDMAsoTCpOPG7qGLj7wOc/pub?gid=171497066&single=true&output=csv';

// --- GLOBAL DATA VARIABLES ---
let allMasterQuizData = [];
let allQuestionData = [];
let currentStudentMasterData = [];
let currentStudentQuestionData = [];
let currentStudentGmailId = '';

// Chart instances
let scoreTrendChartInstance = null;
let skillPerformanceChartInstance = null;

// --- DOM ELEMENTS ---
// Will be assigned in DOMContentLoaded
let studentIdInputEl, loadDataButtonEl, dataStatusMessageEl, dashboardContentAreaEl,
    studentInfoHeaderEl, overviewCardsContainerEl, scoreTrendChartEl,
    skillPerformanceChartEl, practiceTestsTableBodyEl, allQuizzesTableBodyEl,
    questionDetailsTableBodyEl, currentYearEl, tabButtons, tabPanes,
    idInputErrorEl;


// --- HELPER FUNCTIONS ---
const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
        // Check if dateString is already a Date object or a valid date string
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          // Try to parse common non-standard formats if necessary, e.g. "YYYY-MM-DDTHH:MM:SSZ"
          // For now, just return original if initial parsing fails
          return dateString;
        }
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        console.warn("Could not format date:", dateString, e);
        return dateString;
    }
};

// --- DATA FETCHING & PARSING ---
async function loadInitialData() {
    dataStatusMessageEl.textContent = 'Fetching all student data... Please wait.';
    dataStatusMessageEl.classList.remove('text-red-500', 'text-green-500');
    dataStatusMessageEl.classList.add('text-blue-600');
    studentIdInputEl.disabled = true;
    loadDataButtonEl.disabled = true;

    if (MASTER_QUIZ_DATA_URL === 'YOUR_MASTER_QUIZ_DATA_CSV_URL_HERE' || QUESTION_DATA_URL === 'YOUR_QUESTION_DATA_CSV_URL_HERE') {
        dataStatusMessageEl.textContent = 'ERROR: Dashboard CSV URLs are not configured in script.js. Please contact support.';
        dataStatusMessageEl.classList.replace('text-blue-600', 'text-red-500');
        console.error("CSV URLs not configured.");
        return;
    }

    try {
        const [masterResponse, questionResponse] = await Promise.all([
            fetch(MASTER_QUIZ_DATA_URL),
            fetch(QUESTION_DATA_URL)
        ]);

        if (!masterResponse.ok) throw new Error(`Failed to fetch Master Quiz Data: ${masterResponse.statusText} (URL: ${MASTER_QUIZ_DATA_URL})`);
        if (!questionResponse.ok) throw new Error(`Failed to fetch Question Data: ${questionResponse.statusText} (URL: ${QUESTION_DATA_URL})`);

        const masterCsvText = await masterResponse.text();
        const questionCsvText = await questionResponse.text();

        let masterDataParsed = false;
        let questionDataParsed = false;

        Papa.parse(masterCsvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                allMasterQuizData = results.data.filter(row => row.StudentGmailID); // Ensure rows have StudentGmailID
                console.log("Master Quiz Data Loaded:", allMasterQuizData);
                masterDataParsed = true;
                if (questionDataParsed) checkDataAndEnableInput();
            },
            error: (error) => {
                console.error("Error parsing Master Quiz Data:", error);
                dataStatusMessageEl.textContent = `Error parsing Master Quiz Data. ${error.message}`;
                dataStatusMessageEl.classList.replace('text-blue-600', 'text-red-500');
            }
        });

        Papa.parse(questionCsvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                allQuestionData = results.data.filter(row => row.StudentGmailID); // Ensure rows have StudentGmailID
                console.log("Question Data Loaded:", allQuestionData);
                questionDataParsed = true;
                if (masterDataParsed) checkDataAndEnableInput();
            },
            error: (error) => {
                console.error("Error parsing Question Data:", error);
                dataStatusMessageEl.textContent = `Error parsing Question Data. ${error.message}`;
                dataStatusMessageEl.classList.replace('text-blue-600', 'text-red-500');
            }
        });
    } catch (error) {
        console.error('Error fetching initial data:', error);
        dataStatusMessageEl.textContent = `Error fetching data: ${error.message}. Please check URLs are public and CSVs are correctly published.`;
        dataStatusMessageEl.classList.replace('text-blue-600', 'text-red-500');
    }
}

function checkDataAndEnableInput() {
    if (allMasterQuizData.length > 0) { // Question data might be empty for some students initially
        dataStatusMessageEl.textContent = 'Data loaded. Please enter your Student Gmail ID.';
        dataStatusMessageEl.classList.replace('text-blue-600', 'text-green-500');
        studentIdInputEl.disabled = false;
        loadDataButtonEl.disabled = false;
    } else {
        dataStatusMessageEl.textContent = 'No data found in the source files or error loading. Please contact support.';
        dataStatusMessageEl.classList.replace('text-blue-600', 'text-red-500');
    }
}

function filterDataForStudent(gmailId) {
    currentStudentGmailId = gmailId.toLowerCase(); // Normalize to lowercase for matching
    currentStudentMasterData = allMasterQuizData.filter(row => row.StudentGmailID && row.StudentGmailID.toLowerCase() === currentStudentGmailId);
    currentStudentQuestionData = allQuestionData.filter(row => row.StudentGmailID && row.StudentGmailID.toLowerCase() === currentStudentGmailId);

    console.log("Filtered Master Data for " + currentStudentGmailId + ":", currentStudentMasterData);
    console.log("Filtered Question Data for " + currentStudentGmailId + ":", currentStudentQuestionData);


    if (currentStudentMasterData.length === 0) {
        dataStatusMessageEl.textContent = `No data found for Gmail ID: ${gmailId}. Please check the ID or ensure data is available.`;
        dataStatusMessageEl.classList.replace('text-green-500', 'text-red-500');
        dashboardContentAreaEl.classList.add('hidden');
        if(idInputErrorEl) idInputErrorEl.textContent = `No data found for Gmail ID: ${gmailId}.`;
        if(idInputErrorEl) idInputErrorEl.classList.remove('hidden');
        return false;
    }
    dataStatusMessageEl.textContent = `Displaying data for ${gmailId}.`;
    dataStatusMessageEl.classList.replace('text-red-500', 'text-green-500');
    dashboardContentAreaEl.classList.remove('hidden');
    if(idInputErrorEl) idInputErrorEl.classList.add('hidden');
    return true;
}

// --- RENDERING FUNCTIONS ---
function renderDashboard() {
    renderStudentHeader();
    renderOverview();
    renderPracticeTestsTable();
    renderAllQuizzesTable();
    renderQuestionDetailsTable();
    setupTabs();
    // Default to overview tab
    const overviewButton = document.querySelector('.tab-button[data-tab="overview"]');
    if (overviewButton) overviewButton.click();
}

function renderStudentHeader() {
    // For dummy data, we don't have a separate student name field in MasterQuizData
    // If your `StudentMapping` sheet data was also published, you could fetch it
    // For now, just use the Gmail ID.
    studentInfoHeaderEl.textContent = `Student: ${currentStudentGmailId}`;
}

function renderOverview() {
    const cbTests = currentStudentMasterData.filter(d => d.Source === 'Canvas CB Test');
    const latestCbTest = cbTests.sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn))[0];
    
    let overallScore = 'N/A', verbalScore = 'N/A', mathScore = 'N/A';
    if (latestCbTest) {
        overallScore = latestCbTest.Score !== null && latestCbTest.Score !== undefined ? latestCbTest.Score : 'N/A';
        verbalScore = latestCbTest.VerbalScore !== null && latestCbTest.VerbalScore !== undefined ? latestCbTest.VerbalScore : 'N/A';
        mathScore = latestCbTest.MathScore !== null && latestCbTest.MathScore !== undefined ? latestCbTest.MathScore : 'N/A';
    }

    const allQuizzes = currentStudentMasterData.filter(d => d.Source === 'Canvas' || d.Source === 'Khan Academy');
    let avgQuizScore = 'N/A';
    if (allQuizzes.length > 0) {
        let totalEarnedPercentage = 0;
        let validQuizzesCount = 0;
        allQuizzes.forEach(q => {
            let score = parseFloat(q.Score);
            let possible = parseFloat(q.PointsPossible);
            if (q.Source === 'Khan Academy' && String(q.Score).includes('%')) {
                totalEarnedPercentage += parseFloat(q.Score);
                validQuizzesCount++;
            } else if (!isNaN(score) && !isNaN(possible) && possible > 0) {
                totalEarnedPercentage += (score / possible) * 100;
                validQuizzesCount++;
            }
        });
        if (validQuizzesCount > 0) {
            avgQuizScore = (totalEarnedPercentage / validQuizzesCount).toFixed(0) + '%';
        }
    }
    
    const cards = [
        { title: "Latest SAT Practice Test", value: overallScore, sub: "/ 1600", icon: "🎯" },
        { title: "Latest Verbal Score (R&W)", value: verbalScore, sub: "/ 800", icon: "📚" },
        { title: "Latest Math Score", value: mathScore, sub: "/ 800", icon: "🧮" },
        { title: "Average Quiz Score", value: avgQuizScore, sub: "(Canvas & Khan)", icon: "📊" }
    ];
    overviewCardsContainerEl.innerHTML = cards.map(card => `
        <div class="kpi-card">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-md font-semibold text-gray-600">${card.title}</h3>
                <span class="text-2xl">${card.icon}</span>
            </div>
            <p class="text-3xl font-bold kpi-value">${card.value} <span class="text-lg text-gray-500">${card.sub}</span></p>
        </div>
    `).join('');

    renderScoreTrendChart(cbTests);
    renderSkillPerformanceChart();
}

function renderScoreTrendChart(practiceTestData) {
    const chartCtx = scoreTrendChartEl.getContext('2d');
    if (!practiceTestData || practiceTestData.length === 0) {
        scoreTrendChartEl.parentElement.innerHTML = "<p class='text-center text-gray-500 py-4'>No Practice Test score trend data available.</p>";
        return;
    }
    const sortedTests = practiceTestData.sort((a,b) => new Date(a.AttemptedOn) - new Date(b.AttemptedOn));
    const labels = sortedTests.map(t => `${t.QuizName.replace("College Board ", "")} (${formatDate(t.AttemptedOn)})`);
    const totalScores = sortedTests.map(t => t.Score);
    const verbalScores = sortedTests.map(t => t.VerbalScore);
    const mathScores = sortedTests.map(t => t.MathScore);

    if (scoreTrendChartInstance) scoreTrendChartInstance.destroy();
    scoreTrendChartInstance = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Total Score', data: totalScores, borderColor: '#2563eb', tension: 0.1, fill: false, borderWidth: 2 },
                { label: 'Verbal (R&W) Score', data: verbalScores, borderColor: '#10b981', tension: 0.1, fill: false, borderWidth: 2 },
                { label: 'Math Score', data: mathScores, borderColor: '#f59e0b', tension: 0.1, fill: false, borderWidth: 2 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, min: 200, max: 800 } } }
    });
}

function renderSkillPerformanceChart() {
    const chartCtx = skillPerformanceChartEl.getContext('2d');
    const skillData = {};
    currentStudentQuestionData.forEach(q => {
        const skill = q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD' ? q.SAT_Skill_Tag : 'Uncategorized';
        if (!skillData[skill]) skillData[skill] = { correct: 0, total: 0 };
        skillData[skill].total++;
        if (q.IsCorrect === 'TRUE' || q.IsCorrect === true) {
            skillData[skill].correct++;
        }
    });

    const labels = Object.keys(skillData).filter(skill => skillData[skill].total > 0); // Only show skills with questions attempted
    if (labels.length === 0) {
        skillPerformanceChartEl.parentElement.innerHTML = "<p class='text-center text-gray-500 py-4'>No specific skill performance data available from quizzes.</p>";
        return;
    }
    const accuracies = labels.map(skill => (skillData[skill].correct / skillData[skill].total * 100));

    if (skillPerformanceChartInstance) skillPerformanceChartInstance.destroy();
    skillPerformanceChartInstance = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy (%)',
                data: accuracies,
                backgroundColor: labels.map((_, i) => `hsl(${i * (360 / Math.max(labels.length,1))}, 65%, 60%)`),
                borderColor: labels.map((_, i) => `hsl(${i * (360 / Math.max(labels.length,1))}, 65%, 45%)`),
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: function(value) { return value + "%" } } } }, indexAxis: 'y', plugins: { legend: { display: false }} }
    });
}

function renderPracticeTestsTable() {
    const cbTests = currentStudentMasterData.filter(d => d.Source === 'Canvas CB Test');
    if (!practiceTestsTableBodyEl || cbTests.length === 0) {
        practiceTestsTableBodyEl.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No College Board Practice Test data available.</td></tr>';
        return;
    }
    practiceTestsTableBodyEl.innerHTML = cbTests
        .sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn))
        .map(test => `
            <tr class="border-b border-gray-100 hover:bg-slate-50">
                <td class="p-3 text-gray-700 font-medium">${test.QuizName}</td>
                <td class="p-3 text-gray-600">${formatDate(test.AttemptedOn)}</td>
                <td class="p-3 text-gray-600">${test.VerbalScore || 'N/A'}</td>
                <td class="p-3 text-gray-600">${test.MathScore || 'N/A'}</td>
                <td class="p-3 text-blue-600 font-bold">${test.Score}</td>
                <td class="p-3"><button class="text-blue-500 hover:text-blue-700 text-sm">Review</button></td>
            </tr>
        `).join('');
}

function renderAllQuizzesTable() {
    const allQuizzes = currentStudentMasterData.filter(d => d.Source === 'Canvas' || d.Source === 'Khan Academy');
     if (!allQuizzesTableBodyEl || allQuizzes.length === 0) {
        allQuizzesTableBodyEl.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No quiz data available.</td></tr>';
        return;
    }
    allQuizzesTableBodyEl.innerHTML = allQuizzes
        .sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn))
        .map(q => {
            let scoreDisplay = String(q.Score);
            let pointsPossibleDisplay = q.PointsPossible !== null && q.PointsPossible !== undefined ? String(q.PointsPossible) : 'N/A';
            
            if (q.Source === 'Khan Academy' && scoreDisplay.includes('%')) {
                // Already a percentage
                pointsPossibleDisplay = '100%';
            } else if (q.PointsPossible && parseFloat(q.PointsPossible) > 0) {
                 const percentage = ((parseFloat(q.Score) / parseFloat(q.PointsPossible)) * 100 || 0).toFixed(0);
                 scoreDisplay = `${q.Score} (${percentage}%)`;
            } else if (q.Source === 'Khan Academy') { // If PointsPossible is blank for Khan but score is not %
                 scoreDisplay = `${q.Score}`; // Show raw score if not a percentage
                 // pointsPossibleDisplay remains N/A or its original value from CSV
            }

            return `
                <tr class="border-b border-gray-100 hover:bg-slate-50">
                    <td class="p-3 text-gray-700 font-medium">${q.QuizName}</td>
                    <td class="p-3 text-gray-600">${q.Source}</td>
                    <td class="p-3 text-gray-600">${formatDate(q.AttemptedOn)}</td>
                    <td class="p-3 text-blue-600 font-bold">${scoreDisplay}</td>
                    <td class="p-3 text-gray-600">${pointsPossibleDisplay}</td>
                    <td class="p-3 text-gray-600">${q.SAT_Skill_Tag || 'N/A'}</td>
                </tr>
            `;
    }).join('');
}

function renderQuestionDetailsTable() {
    const latestCanvasQuizWithData = currentStudentMasterData
        .filter(q => q.Source === 'Canvas') // Only Canvas quizzes for question details from our CSV
        .sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn))[0];

    if (!questionDetailsTableBodyEl || !latestCanvasQuizWithData) {
        questionDetailsTableBodyEl.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No detailed question data available for recent Canvas quizzes.</td></tr>';
        return;
    }
    
    const questionsForThisQuiz = currentStudentQuestionData.filter(q => String(q.QuizID_Canvas) === String(latestCanvasQuizWithData.QuizID));

    if (questionsForThisQuiz.length === 0) {
        questionDetailsTableBodyEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No question breakdown available for "${latestCanvasQuizWithData.QuizName}".</td></tr>`;
        return;
    }

    questionDetailsTableBodyEl.innerHTML = questionsForThisQuiz
        .map((q, index) => `
            <tr class="border-b border-gray-100 hover:bg-slate-50">
                <td class="p-3 text-gray-700">${q.QuestionID_Normalized || index + 1}</td>
                <td class="p-3 text-gray-600">${q.StudentAnswer_fromCSV}</td>
                <td class="p-3 ${q.IsCorrect === 'TRUE' || q.IsCorrect === true ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}">
                    ${q.IsCorrect === 'TRUE' || q.IsCorrect === true ? 'Correct' : 'Incorrect'}
                </td>
                <td class="p-3 text-gray-600">${q.SAT_Skill_Tag || 'N/A'}</td>
            </tr>
        `).join('');
}


// --- TAB SWITCHING LOGIC ---
function setupTabs() {
    tabButtons = document.querySelectorAll('.tab-button'); // Ensure tabButtons is assigned
    tabPanes = document.querySelectorAll('.tab-pane');   // Ensure tabPanes is assigned

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });
            button.classList.add('active', 'bg-blue-600', 'text-white');
            button.classList.remove('bg-gray-200', 'text-gray-700');

            tabPanes.forEach(pane => {
                pane.classList.toggle('hidden', pane.id !== `${targetTab}-content`);
            });
            
            // Refresh/resize charts if their tab is now visible
            if (targetTab === 'overview') {
                setTimeout(() => { // Timeout ensures canvas is visible and has dimensions
                    if (scoreTrendChartInstance) scoreTrendChartInstance.resize();
                    if (skillPerformanceChartInstance) skillPerformanceChartInstance.resize();
                }, 50);
            }
        });
    });
}

// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements
    studentIdInputEl = document.getElementById('studentIdInput');
    loadDataButtonEl = document.getElementById('loadDataButton');
    dataStatusMessageEl = document.getElementById('data-status-message');
    dashboardContentAreaEl = document.getElementById('dashboard-content-area');
    studentInfoHeaderEl = document.getElementById('student-info-header');
    overviewCardsContainerEl = document.getElementById('overview-cards-container');
    scoreTrendChartEl = document.getElementById('scoreTrendChart');
    skillPerformanceChartEl = document.getElementById('skillPerformanceChart');
    practiceTestsTableBodyEl = document.getElementById('practiceTests-table-body');
    allQuizzesTableBodyEl = document.getElementById('all-quizzes-table-body');
    questionDetailsTableBodyEl = document.getElementById('question-details-table-body');
    currentYearEl = document.getElementById('current-year');
    idInputErrorEl = document.getElementById('id-input-error'); // Assuming you might add this if needed


    if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();
    
    studentIdInputEl.disabled = true;
    loadDataButtonEl.disabled = true;
    
    loadInitialData(); // Fetch all data first

    loadDataButtonEl.addEventListener('click', () => {
        const enteredId = studentIdInputEl.value.trim();
        if(idInputErrorEl) idInputErrorEl.classList.add('hidden');
        
        if (enteredId) {
            if (filterDataForStudent(enteredId)) {
                renderDashboard();
            }
        } else {
            dataStatusMessageEl.textContent = 'Please enter your Student Gmail ID.';
            dataStatusMessageEl.classList.replace('text-green-500', 'text-red-500');
            dashboardContentAreaEl.classList.add('hidden');
            if(idInputErrorEl) idInputErrorEl.textContent = 'Student Gmail ID cannot be empty.';
            if(idInputErrorEl) idInputErrorEl.classList.remove('hidden');
        }
    });
});
