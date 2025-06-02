// --- Constants for Data Files (Future Use) ---
// const AGGREGATED_SCORES_CSV_URL = 'data/DashboardFeed_AggregatedScores.csv'; 
// const QUESTION_DETAILS_CSV_URL = 'data/DashboardFeed_QuestionDetails.csv'; 

// --- Date Formatting Helper ---
function formatDate(dateString) { 
    if (!dateString || dateString === "N/A" || dateString === "Not Attempted") return dateString;
    try {
        const date = new Date(dateString + 'T00:00:00'); 
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    } catch (e) {
        console.warn("Could not format date:", dateString);
        return dateString; 
    }
}

// --- Enhanced Dummy Data ---
let currentStudentData = { 
    name: "Alex Johnson",
    targetScore: 1400,
    latestScores: { total: 1250, rw: 620, math: 630, avgEocKhan: 78 },
    classAveragesGlobal: { total: 1180, rw: 590, math: 590, avgEocKhan: 75 },
    scoreTrend: { labels: ['Diag', 'Test 1', 'Test 2', 'Test 3', 'Test 4'], studentScores: [1130, 1220, 1250, 1280, 1310], classAvgScores: [1050, 1150, 1180, 1200, 1220] },
    overallSkillPerformance: { labels: ['Reading', 'Writing & Language', 'Math'], studentAccuracy: [78, 82, 75], classAvgAccuracy: [75, 79, 72] },
    strengths: ["Algebra (95%)", "Words in Context (90%)"], 
    improvements: ["Advanced Math (45%)", "Command of Evidence (50%)"], 
    timeSpent: { studentAvg: 120, studentUnit: "min / day", classAvg: 130, classUnit: "min / day"},
    cbPracticeTests: [
        { name: "Diagnostic Test", date: "2024-03-01", rw: "550", math: "580", total: "1130", classAvgRW: "520", classAvgMath: "530", classAvgTotal: "1050"},
        { name: "Official Practice Test 1", date: "2024-04-10", rw: "600", math: "620", total: "1220", classAvgRW: "580", classAvgMath: "600", classAvgTotal: "1180"},
        { name: "Official Practice Test 2", date: "2024-05-15", rw: "620", math: "630", total: "1250", classAvgRW: "590", classAvgMath: "590", classAvgTotal: "1180"},
        { name: "Official Practice Test 3", date: "Not Attempted", rw: "-", math: "-", total: "-", classAvgRW: "(N/A)", classAvgMath: "(N/A)", classAvgTotal: "(N/A)"},
        { name: "Official Practice Test 4", date: "Not Attempted", rw: "-", math: "-", total: "-", classAvgRW: "(N/A)", classAvgMath: "(N/A)", classAvgTotal: "(N/A)"},
        { name: "Official Practice Test 5", date: "Not Attempted", rw: "-", math: "-", total: "-", classAvgRW: "(N/A)", classAvgMath: "(N/A)", classAvgTotal: "(N/A)"},
        { name: "Official Practice Test 6", date: "Not Attempted", rw: "-", math: "-", total: "-", classAvgRW: "(N/A)", classAvgMath: "(N/A)", classAvgTotal: "(N/A)"},
        { name: "Official Practice Test 7", date: "Not Attempted", rw: "-", math: "-", total: "-", classAvgRW: "(N/A)", classAvgMath: "(N/A)", classAvgTotal: "(N/A)"},
    ],
    eocQuizzes: { 
        reading: [ { name: "Vocabulary in Context", latestScore: "85% (17/20)", classAvg: "78%", date: "2024-05-01" } ],
        writing: [ { name: "Transitions", latestScore: "90% (9/10)", classAvg: "80%", date: "2024-05-03" } ],
        math: [ { name: "Exponents & Radicals", latestScore: "75% (15/20)", classAvg: "70%", date: "2024-05-05" } ]
    },
    khanAcademy: { 
        reading: [{ name: "Khan Academy: Main Idea Practice 1", date: "2024-05-10", score: "8/10 (80%)", pointsPossible: "10", classAvg: "75%" }],
        writing: [{ name: "Khan Academy: Verb Tense Advanced", date: "2024-05-11", score: "12/15 (80%)", pointsPossible: "15", classAvg: "78%" }],
        math: [] 
    },
    cbSkills: {
        reading: [
            { category: "Information and Ideas", skills: [
                { name: "Central Ideas & Details", score: 85, classAvg: 78, attempted: true },
                { name: "Command of Evidence (Textual)", score: 60, classAvg: 65, attempted: true },
                { name: "Command of Evidence (Quantitative)", score: 0, classAvg: 70, attempted: false },
                { name: "Inferences", score: 70, classAvg: 72, attempted: true },
            ]},
            { category: "Craft and Structure", skills: [
                { name: "Words in Context", score: 92, classAvg: 80, attempted: true },
                { name: "Text Structure & Purpose", score: 75, classAvg: 70, attempted: true },
                { name: "Cross-Text Connections", score: 0, classAvg: 68, attempted: false },
            ]}
        ],
        writing: [
            { category: "Expression of Ideas", skills: [
                { name: "Rhetorical Synthesis", score: 75, classAvg: 70, attempted: true },
                { name: "Transitions", score: 88, classAvg: 82, attempted: true },
            ]},
            { category: "Standard English Conventions", skills: [
                { name: "Boundaries (Sentence Structure)", score: 65, classAvg: 70, attempted: true },
                { name: "Form, Structure, and Sense (e.g., Verbs, Pronouns)", score: 80, classAvg: 75, attempted: true },
                { name: "Punctuation (Advanced)", score: 0, classAvg: 60, attempted: false}
            ]}
        ],
        math: [
            { category: "Algebra", skills: [
                { name: "Linear Equations & Inequalities", score: 90, classAvg: 85, attempted: true },
                { name: "Linear Functions", score: 85, classAvg: 80, attempted: true },
                { name: "Systems of Equations", score: 0, classAvg: 70, attempted: false },
            ]},
            { category: "Advanced Math", skills: [
                { name: "Nonlinear Expressions", score: 70, classAvg: 75, attempted: true },
                { name: "Quadratic Equations", score: 65, classAvg: 72, attempted: true },
                { name: "Polynomials", score: 0, classAvg: 60, attempted: false },
            ]},
            { category: "Problem-Solving and Data Analysis", skills: [
                { name: "Ratios, Rates, Proportions", score: 82, classAvg: 78, attempted: true },
                { name: "Percentages", score: 90, classAvg: 80, attempted: true },
                { name: "Probability & Statistics", score: 70, classAvg: 65, attempted: true },
            ]},
            { category: "Geometry and Trigonometry", skills: [
                { name: "Lines, Angles, Triangles", score: 60, classAvg: 68, attempted: true },
                { name: "Circles", score: 0, classAvg: 65, attempted: false },
                { name: "Trigonometry", score: 55, classAvg: 60, attempted: true },
            ]}
        ]
    }
};
const eocChapters = { 
    reading: ["Vocabulary in Context", "Making the Leap", "The Big Picture", "Literal Comprehension", "Reading for Function", "Supporting & Undermining", "Graphs & Charts", "Paired Passages"],
    writing: ["Transitions", "Specific Focus", "Sentences & Fragments", "Joining & Separating Sentences", "Non-Essential & Essential Clauses", "Verbs Agreements and Tense", "Pronouns", "Modification", "Parallel Structure"],
    math: ["Exponents & Radicals", "Percent", "Rates", "Ratio & Proportion", "Expressions", "Constructing Models", "Manipulating & Solving Equations", "Systems of Equations", "Inequalities", "Lines", "Functions", "Quadratics", "Angles", "Triangles", "Circles", "Trigonometry", "Probability", "Statistics 1"]
};

let modalDonutChartInstance = null; 
let modalLineChartInstance = null; 
let scoreTrendChartInstance = null; 
let overallSkillChartInstance = null;

document.addEventListener('DOMContentLoaded', function () {
    console.log("Student Dashboard DOMContentLoaded. Initializing script...");
    loadAndDisplayData(); 
    setupEventListeners();
});

function setupEventListeners() {
    const mainTabs = document.querySelectorAll('.main-tab-button');
    const mainTabContents = document.querySelectorAll('.main-tab-content');
    const hamburgerButton = document.getElementById('hamburgerButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    document.getElementById('currentYear').textContent = new Date().getFullYear();

    if (hamburgerButton && mobileMenu) {
        hamburgerButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    function switchTab(tabElement) {
        const targetTabName = tabElement.getAttribute('data-main-tab');
        console.log("Switching to tab:", targetTabName);

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
        } else {
            console.error("Target content element not found:", targetContentId);
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
            if (parentMainTabContent) {
                parentMainTabContent.querySelectorAll('.sub-tab-button').forEach(st => st.classList.remove('active'));
                parentMainTabContent.querySelectorAll('.sub-tab-content-panel').forEach(panel => panel.classList.add('hidden'));
            }
            subTab.classList.add('active');
            const targetSubContentId = subTab.getAttribute('data-sub-tab') + '-content';
            const targetSubElement = document.getElementById(targetSubContentId);
            if (targetSubElement) {
                targetSubElement.classList.remove('hidden');
            } else {
                console.error("Target sub-content element not found:", targetSubContentId);
            }
        });
    });
    
    if (mainTabs.length > 0) {
        const firstDesktopTab = document.querySelector('.main-tab-button[data-main-tab="overview"]');
        if (firstDesktopTab) {
            switchTab(firstDesktopTab);
        }
    }
}

async function loadAndDisplayData() {
    console.log("Loading and displaying data...");
    document.getElementById('studentNameDisplay').textContent = `Welcome, ${currentStudentData.name}!`;
    populateOverviewSnapshot(currentStudentData); 
    populatePracticeTestsTable(currentStudentData.cbPracticeTests);
    
    ['reading', 'writing', 'math'].forEach(subject => {
        const studentEOCs = currentStudentData.eocQuizzes[subject] || [];
        const allSubjectEOCs = (eocChapters[subject] || []).map(chapterName => {
            const existing = studentEOCs.find(e => e.name === chapterName);
            const populatedEOC = existing || { name: chapterName, latestScore: "N/A", classAvg: "N/A", date: "N/A" };
            populatedEOC.date = formatDate(populatedEOC.date); 
            return populatedEOC;
        });

        populateEOCTable(subject, allSubjectEOCs);
        
        const studentKhan = (currentStudentData.khanAcademy[subject] || []).map(item => ({...item, date: formatDate(item.date) }));
        populateKhanSection(subject, studentKhan);
        
        const studentCBSkills = currentStudentData.cbSkills[subject] || []; 
        populateCBSkills(subject, studentCBSkills);
    });
    console.log("Data display populated.");
}

function populateOverviewSnapshot(studentData) {
    const overviewStrengthsList = document.getElementById('overviewStrengthsList'); 
    const overviewImprovementsList = document.getElementById('overviewImprovementsList');
    const timeSpentOverviewDiv = document.getElementById('timeSpentOverview');
    
    if(overviewStrengthsList && studentData.strengths) {
        overviewStrengthsList.innerHTML = ''; 
        studentData.strengths.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            overviewStrengthsList.appendChild(li);
        });
    }
    if(overviewImprovementsList && studentData.improvements) {
        overviewImprovementsList.innerHTML = ''; 
        studentData.improvements.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            overviewImprovementsList.appendChild(li);
        });
    }
    if(timeSpentOverviewDiv && studentData.timeSpent) {
        timeSpentOverviewDiv.innerHTML = `
            <p class="text-gray-600">Your Avg: <span class="font-semibold">${studentData.timeSpent.studentAvg} ${studentData.timeSpent.studentUnit}</span></p>
            <p class="text-gray-600">Class Avg: <span class="font-semibold">${studentData.timeSpent.classAvg} ${studentData.timeSpent.classUnit}</span></p>
        `;
    }
}

function initializeOverviewCharts(studentData) {
    console.log("Initializing overview charts...");
    const primaryChartColor = '#2a5266'; 
    const secondaryChartColor = '#757575'; 
    const barChartPrimaryBg = 'rgba(42, 82, 102, 0.8)'; 
    const barChartSecondaryBg = 'rgba(117, 117, 117, 0.7)';
    const chartOptions = { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: true, position: 'bottom' }}};
    
    const scoreTrendCtx = document.getElementById('scoreTrendChart')?.getContext('2d');
    if (scoreTrendCtx) {
        if (scoreTrendChartInstance) scoreTrendChartInstance.destroy();
        scoreTrendChartInstance = new Chart(scoreTrendCtx, { 
            type: 'line', 
            data: { labels: studentData.scoreTrend.labels, datasets: [
                    { label: 'Your Total Score', data: studentData.scoreTrend.studentScores, borderColor: primaryChartColor, tension: 0.1, fill: false },
                    { label: 'Class Average Total Score', data: studentData.scoreTrend.classAvgScores, borderColor: secondaryChartColor, tension: 0.1, borderDash: [5, 5], fill: false }
                ] }, options: chartOptions });
        console.log("Score Trend chart initialized.");
    } else { console.error("scoreTrendChart canvas context not found");}
    
    const overallSkillCtx = document.getElementById('overallSkillChart')?.getContext('2d');
    if (overallSkillCtx) {
        if (overallSkillChartInstance) overallSkillChartInstance.destroy();
        overallSkillChartInstance = new Chart(overallSkillCtx, { 
            type: 'bar', 
            data: { labels: studentData.overallSkillPerformance.labels, datasets: [
                    { label: 'Your Accuracy', data: studentData.overallSkillPerformance.studentAccuracy, backgroundColor: barChartPrimaryBg },
                    { label: 'Class Average Accuracy', data: studentData.overallSkillPerformance.classAvgAccuracy, backgroundColor: barChartSecondaryBg }
                ] }, options: { ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } } 
        });
        console.log("Overall Skill chart initialized.");
    } else { console.error("overallSkillChart canvas context not found");}
}

function populatePracticeTestsTable(testsData) {
    const cbTableBody = document.getElementById('cb-practice-tests-table-body');
    if (!cbTableBody) return;
    cbTableBody.innerHTML = ''; 
    testsData.forEach(test => {
        const row = cbTableBody.insertRow();
        row.className = 'clickable-row';
        row.innerHTML = `<td>${test.name}</td><td>${formatDate(test.date)}</td><td>${test.rw}</td><td>${test.math}</td><td>${test.total}</td><td>${test.classAvgRW}</td><td>${test.classAvgMath}</td><td>${test.classAvgTotal}</td>`;
        row.onclick = () => openModal(`${test.name} Details`, { type: 'cb_test', data: test });
    });
}

function populateEOCTable(sectionKey, eocQuizData) {
    const tbody = document.getElementById(`${sectionKey}-eoc-tbody`);
    const thead = document.getElementById(`${sectionKey}-eoc-thead`);
    if (!tbody || !thead) return;
    thead.innerHTML = `<tr><th>Chapter/Practice Name</th><th>Latest Score</th><th>Date Attempted</th><th>Class Avg Score</th></tr>`;
    tbody.innerHTML = ''; 
    (eocQuizData || []).forEach(item => {
        const row = tbody.insertRow();
        row.className = 'clickable-row';
        row.innerHTML = `<td>${item.name}</td><td>${item.latestScore}</td><td>${item.date}</td><td>${item.classAvg}</td>`;
        row.onclick = () => openModal(`EOC Practice: ${item.name}`, { type: 'eoc_quiz', data: item });
    });
     if ((eocQuizData || []).length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-3">No EOC Practice data available for ${sectionKey}.</td></tr>`;}
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
            row.innerHTML = `<td>${item.name}</td><td>${item.date}</td><td>${item.score}</td><td>${item.pointsPossible}</td><td>${item.classAvg}</td>`;
            row.onclick = () => openModal(`Khan Academy Practice: ${item.name}`, { type: 'khan', data: item });
        });
        container.appendChild(table);
    } else { container.innerHTML = `<p class="text-gray-600 p-3">No Khan Academy Practice data available for ${currentStudentData.name} in ${sectionKey}.</p>`; }
}

function getPerformanceClass(score, attempted = true) {
    if (!attempted) return 'performance-na'; 
    if (score >= 85) return 'performance-good';
    if (score >= 70) return 'performance-average';
    return 'performance-poor';
}

function populateCBSkills(sectionKey, skillsCategoriesData) { 
    const container = document.getElementById(`${sectionKey}-cb-skills-data`);
    if (!container) { console.error(`Skills container for ${sectionKey} not found.`); return; }
    container.innerHTML = ''; 

    if (!skillsCategoriesData || skillsCategoriesData.length === 0) {
        container.innerHTML = `<p class="text-gray-500 p-3">No Skill data available for ${sectionKey}.</p>`;
        return;
    }

    skillsCategoriesData.forEach(category => {
        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'mb-4';
        
        const categoryTitle = document.createElement('h4');
        categoryTitle.className = 'text-md font-semibold text-gray-700 mb-2 pt-2 border-t border-gray-200'; // Added top border for separation
        categoryTitle.textContent = category.category;
        categoryWrapper.appendChild(categoryTitle);

        if (category.skills && category.skills.length > 0) {
            category.skills.forEach(skill => {
                const skillDiv = document.createElement('div');
                skillDiv.className = 'p-3 bg-gray-50 rounded-md border border-gray-200 mb-2';
                const score = skill.attempted ? skill.score : 0;
                const performanceClass = getPerformanceClass(score, skill.attempted);
                let displayScore = skill.attempted ? `${skill.score}%` : "N/A";
                let barClass = performanceClass;
                let barWidth = skill.attempted ? score : 0; // Show 0 width for not attempted

                if (!skill.attempted) {
                    barClass = 'bg-gray-300'; // Neutral gray for not attempted bar
                }

                skillDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-gray-800">${skill.name}</span>
                        <span class="text-xs ${performanceClass === 'performance-na' ? 'text-gray-500' : performanceClass.replace('performance-', 'text-')} font-semibold">${displayScore}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${barClass}" style="width: ${barWidth}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Class Avg: ${skill.classAvg}%</p>
                `;
                categoryWrapper.appendChild(skillDiv);
            });
        } else {
            const noSkillsMsg = document.createElement('p');
            noSkillsMsg.className = 'text-sm text-gray-500';
            noSkillsMsg.textContent = 'No sub-skills listed for this category.';
            categoryWrapper.appendChild(noSkillsMsg);
        }
        container.appendChild(categoryWrapper);
    });
}

const modal = document.getElementById('detailModal');
const modalQuestionDetailsContainer = document.getElementById('modalQuestionDetails');

function openModal(title, contentDetails) { 
    console.log("[openModal] Called. Title:", title);
    const modalHeaderH2 = modal.querySelector('.modal-header h2'); 
    if(modalHeaderH2) modalHeaderH2.textContent = title;
    
    if (!modalQuestionDetailsContainer) { console.error("[openModal] modalQuestionDetailsContainer not found!"); if(modal) modal.style.display="block"; return; }
    modalQuestionDetailsContainer.innerHTML = ''; 
    
    const dQ=[{text:"Solve for x: 2x + 5 = 15",yourAnswer:"x = 5",correct:true,classCorrectPercent:92,status:'answered'},{text:"Identify the main theme of paragraph 2.",yourAnswer:"Supporting detail A",correct:false,classCorrectPercent:75,status:'answered'},{text:"Which transition best connects these sentences?",yourAnswer:"Therefore",correct:true,classCorrectPercent:88,status:'answered'},{text:"What is the value of sin(30°)?",yourAnswer:"N/A",correct:false,classCorrectPercent:95,status:'unanswered'},{text:"A car travels 120 miles in 2 hours. What is its average speed?",yourAnswer:"50 mph",correct:false,classCorrectPercent:80,status:'answered'},{text:"What is the capital of Canada?",yourAnswer:"Ottawa",correct:true,classCorrectPercent:90,status:'answered'},]; 
    dQ.forEach((q,i)=>{const d=document.createElement('div');let sT,sC;if(q.s==='unanswered'){sT='Unanswered';sC='bg-yellow-50 border-yellow-200 text-yellow-700';}else if(q.c){sT='Correct';sC='bg-green-50 border-green-200';}else{sT='Incorrect';sC='bg-red-50 border-red-200';}d.className=`p-2 border rounded-md ${sC}`;d.innerHTML=`<p class="font-medium text-gray-700">Q${i+1}: ${q.text}</p><p>Your Answer: <span class="font-semibold ${q.status==='unanswered'?'':(q.c?'text-good':'text-poor')}">${q.yA}</span> (${sT})</p><p class="text-xs text-gray-500">Class Avg Correctness: ${q.classCorrectPercent}% ${q.classCorrectPercent>80?'<span class="arrow-up">↑</span>':'<span class="arrow-down">↓</span>'}</p>`;modalQuestionDetailsContainer.appendChild(d);});
    
    if(modalDonutChartInstance){ console.log("[openModal] Destroying previous modalDonutChartInstance."); modalDonutChartInstance.destroy(); modalDonutChartInstance = null; }
    if(modalLineChartInstance){ console.log("[openModal] Destroying previous modalLineChartInstance."); modalLineChartInstance.destroy(); modalLineChartInstance = null; }
    
    const cor=dQ.filter(q=>q.s==='answered'&&q.c).length;
    const inc=dQ.filter(q=>q.s==='answered'&&!q.c).length;
    const un=dQ.filter(q=>q.s==='unanswered').length;
    
    const donutCanvas = document.getElementById('modalDonutChart');
    if (donutCanvas) {
        const donutCtx = donutCanvas.getContext('2d');
        if (donutCtx) { 
            console.log("[openModal] Initializing Donut Chart. Data (C,I,U):", cor, inc, un);
            try {
                modalDonutChartInstance = new Chart(donutCtx,{
                    type:'doughnut',
                    data:{ labels:['Correct','Incorrect','Unanswered'], datasets:[{ data:[cor,inc,un], backgroundColor:['#4caf50','#f44336','#9e9e9e'], hoverOffset: 4 }] },
                    options:{ responsive:true, maintainAspectRatio:true, plugins:{ legend:{ position:'bottom' }}, cutout:'50%' } // maintainAspectRatio: true might be better with fixed container height
                });
                console.log("[openModal] New Donut Chart instance CREATED.", modalDonutChartInstance);
            } catch (e) { console.error("[openModal] ERROR creating Donut Chart:", e); }
        } else { console.error("[openModal] modalDonutChart canvas context NOT FOUND!"); }
    } else { console.error("[openModal] modalDonutChart canvas element NOT FOUND!"); }

    const lineCanvas = document.getElementById('modalLineChart');
    if (lineCanvas) {
        const lineCtx = lineCanvas.getContext('2d');
        if (lineCtx) { 
            console.log("[openModal] Initializing Line Chart.");
            try {
                modalLineChartInstance=new Chart(lineCtx,{type:'line',data:{labels:['A1','A2','A3','A4','A5'],datasets:[{label:'You',data:Array.from({length:5},()=>50+Math.random()*40),borderColor:'#2a5266',tension:0.1,fill:false},{label:'Class',data:Array.from({length:5},()=>45+Math.random()*35),borderColor:'#757575',borderDash:[5,5],tension:0.1,fill:false}]},options:{responsive:true,maintainAspectRatio:true,scales:{y:{beginAtZero:true,max:100}},plugins: { legend: {display: true, position: 'bottom'}}}}); // maintainAspectRatio: true
                console.log("[openModal] New Line Chart instance CREATED.");
            } catch (e) { console.error("[openModal] ERROR creating Line Chart:", e); }
        } else { console.error("[openModal] modalLineChart canvas context NOT FOUND!"); }
    } else { console.error("[openModal] modalLineChart canvas element NOT FOUND!"); }

    if(modal) modal.style.display="block";
}

function closeModal() { 
    console.log("[closeModal] Closing modal.");
    if(modal) modal.style.display = "none"; 
    if (modalDonutChartInstance) { modalDonutChartInstance.destroy(); modalDonutChartInstance = null; console.log("[closeModal] Donut chart instance destroyed.");}
    if (modalLineChartInstance) { modalLineChartInstance.destroy(); modalLineChartInstance = null; console.log("[closeModal] Line chart instance destroyed.");}
}

window.onclick = function(event) { 
    if (event.target == modal) closeModal(); 
}
