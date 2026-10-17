let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 600;
let isSpeedMode = false;

function initTopics() {
    const topicsSection = document.getElementById('topics-section');
    topicsSection.innerHTML = '';

    mathTopics.forEach((topic, index) => {
        const stats = JSON.parse(localStorage.getItem(`stats_topic_${topic.id}`)) || { totalTests: 0, correctAnswers: 0 };
        let percentage = stats.totalTests > 0 ? Math.round((stats.correctAnswers / stats.totalTests) * 100) + '%' : 'لم يُختبر';

        topicsSection.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card topic-card shadow-sm h-100 p-3" onclick="startQuiz(${topic.id})">
                    <div class="card-body">
                        <span class="badge bg-primary mb-2">البحث ${index + 1}</span>
                        <h5 class="card-title fw-bold">${topic.title}</h5>
                        <p class="card-text text-muted small">أسئلة مؤتمتة (مباشر، متوسط، تميز).</p>
                        <span class="badge bg-secondary">نسبة النجاح: ${percentage}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

function startQuiz(topicId) {
    isSpeedMode = false;
    const topic = mathTopics.find(t => t.id === topicId);
    currentQuestions = topic.questions;
    document.getElementById('quiz-title').innerText = topic.title;
    beginQuizCommon(600);
}

function startComprehensiveExam() {
    isSpeedMode = false;
    let allQs = [];
    mathTopics.forEach(t => allQs.push(...t.questions));
    currentQuestions = allQs.sort(() => 0.5 - Math.random()).slice(0, 10);
    document.getElementById('quiz-title').innerText = "الامتحان الشامل (10 أسئلة عشوائية)";
    beginQuizCommon(900);
}

function startSpeedChallenge() {
    isSpeedMode = true;
    let allQs = [];
    mathTopics.forEach(t => allQs.push(...t.questions));
    currentQuestions = allQs.sort(() => 0.5 - Math.random()).slice(0, 5);
    document.getElementById('quiz-title').innerText = "تحدي السرعة (دقيقة لكل سؤال)";
    beginQuizCommon(60); // 60 ثانية للمجموع أو لكل سؤال
}

function beginQuizCommon(timeLimit) {
    currentQuestionIndex = 0;
    score = 0;
    timeLeft = timeLimit;

    document.getElementById('topics-section').classList.add('d-none');
    document.getElementById('special-modes-section').classList.add('d-none');
    document.getElementById('quiz-section').classList.remove('d-none');
    document.getElementById('result-section').classList.add('d-none');

    showQuestion();
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        document.getElementById('timer-display').innerHTML = `<i class="fa-solid fa-clock"></i> ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            showResult();
        }
    }, 1000);
}

function showQuestion() {
    const qData = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('question-container');
    
    document.getElementById('feedback-container').classList.add('d-none');
    document.getElementById('next-btn').classList.add('d-none');
    document.getElementById('question-counter').innerText = `السؤال ${currentQuestionIndex + 1} من ${currentQuestions.length}`;
    
    const diffBadge = document.getElementById('difficulty-badge');
    diffBadge.innerText = `المستوى: ${qData.level || 'عام'}`;

    let optionsHtml = '';
    qData.options.forEach((opt, idx) => {
        optionsHtml += `<button class="option-btn" onclick="checkAnswer(${idx})">${opt}</button>`;
    });

    container.innerHTML = `
        <h5 class="fw-bold mb-3">${qData.q}</h5>
        <div class="options-list">${optionsHtml}</div>
    `;

    if (window.MathJax) {
        MathJax.typeset();
    }
}

function checkAnswer(selectedIdx) {
    const qData = currentQuestions[currentQuestionIndex];
    const optionButtons = document.querySelectorAll('.option-btn');
    
    optionButtons.forEach(btn => btn.disabled = true);
    const feedbackContainer = document.getElementById('feedback-container');
    feedbackContainer.classList.remove('d-none');

    if (selectedIdx === qData.correct) {
        optionButtons[selectedIdx].classList.add('correct');
        feedbackContainer.innerHTML = `<div class="alert alert-success"><strong>إجابة صحيحة!</strong><br>${qData.explanation}</div>`;
        score++;
    } else {
        optionButtons[selectedIdx].classList.add('wrong');
        optionButtons[qData.correct].classList.add('correct');
        feedbackContainer.innerHTML = `<div class="alert alert-danger"><strong>إجابة خاطئة!</strong><br><strong>الإجابة الصحيحة:</strong> ${qData.options[qData.correct]}<br><strong>الشرح:</strong> ${qData.explanation}</div>`;
    }

    if (window.MathJax) {
        MathJax.typeset();
    }

    const nextBtn = document.getElementById('next-btn');
    nextBtn.classList.remove('d-none');
    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.innerText = "عرض النتيجة النهائية";
    } else {
        nextBtn.innerText = "السؤال التالي";
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    clearInterval(timer);
    document.getElementById('quiz-section').classList.add('d-none');
    document.getElementById('result-section').classList.remove('d-none');
    
    const total = currentQuestions.length;
    document.getElementById('final-score').innerText = `لقد أجبت بشكل صحيح على ${score} من أصل ${total} أسئلة.`;
    
    // حفظ التقارير محلياً
    let totalGlobal = parseInt(localStorage.getItem('global_total') || '0') + total;
    let correctGlobal = parseInt(localStorage.getItem('global_correct') || '0') + score;
    localStorage.setItem('global_total', totalGlobal);
    localStorage.setItem('global_correct', correctGlobal);
}

function returnToTopics() {
    clearInterval(timer);
    document.getElementById('quiz-section').classList.add('d-none');
    document.getElementById('result-section').classList.add('d-none');
    document.getElementById('topics-section').classList.remove('d-none');
    document.getElementById('special-modes-section').classList.remove('d-none');
    initTopics();
}

function showStatsModal() {
    const total = parseInt(localStorage.getItem('global_total') || '0');
    const correct = parseInt(localStorage.getItem('global_correct') || '0');
    const wrong = total - correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    const statsBody = document.getElementById('stats-body');
    statsBody.innerHTML = `
        <p><strong>إجمالي الأسئلة المحلولة:</strong> ${total}</p>
        <p><strong>الإجابات الصحيحة:</strong> <span class="text-success">${correct}</span></p>
        <p><strong>الإجابات الخاطئة:</strong> <span class="text-danger">${wrong}</span></p>
        <p><strong>نسبة الأداء العامة:</strong> ${percentage}%</p>
        <div class="progress mt-3">
            <div class="progress-bar bg-success" role="progressbar" style="width: ${percentage}%">${percentage}%</div>
        </div>
    `;

    const myModal = new bootstrap.Modal(document.getElementById('statsModal'));
    myModal.show();
}

function resetStats() {
    localStorage.clear();
    alert("تم تصفير جميع السجلات والإحصائيات بنجاح.");
    location.reload();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    const btn = document.getElementById('dark-mode-toggle');
    btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i> الوضع الفاتح' : '<i class="fa-solid fa-moon"></i> الوضع الليلي';
}

window.onload = function() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fa-solid fa-sun"></i> الوضع الفاتح';
    }
    initTopics();
};
