let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

function startQuiz(topicId) {
    const topic = mathTopics.find(t => t.id === topicId);
    if (!topic) return;
    currentQuestions = topic.questions;
    currentQuestionIndex = 0;
    score = 0;

    document.getElementById('topics-section').classList.add('d-none');
    document.getElementById('quiz-section').classList.remove('d-none');
    document.getElementById('quiz-title').innerText = topic.title;

    showQuestion();
}

function showQuestion() {
    if (!currentQuestions || currentQuestions.length === 0) return;
    const qData = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('question-container');
    
    document.getElementById('feedback-container').classList.add('d-none');
    document.getElementById('next-btn').classList.add('d-none');
    document.getElementById('question-counter').innerText = `السؤال ${currentQuestionIndex + 1} من ${currentQuestions.length}`;

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
    document.getElementById('quiz-section').classList.add('d-none');
    document.getElementById('result-section').classList.remove('d-none');
    document.getElementById('final-score').innerText = `لقد أجبت بشكل صحيح على ${score} من أصل ${currentQuestions.length} أسئلة.`;
}

function returnToTopics() {
    document.getElementById('quiz-section').classList.add('d-none');
    document.getElementById('result-section').classList.add('d-none');
    document.getElementById('topics-section').classList.remove('d-none');
}

window.onload = function() {
    if (typeof mathTopics !== 'undefined') {
        initTopics();
    }
};
