const reviewButton = document.querySelector("#reviewButton");
const reviewModal = document.querySelector("#reviewModal");
const closeReviewButton = document.querySelector("#closeReviewButton");
const clearReviewButton = document.querySelector("#clearReviewButton");
const resetProgressButton = document.querySelector("#resetProgressButton");
const reviewList = document.querySelector("#reviewList");
const mistakeCount = document.querySelector("#mistakeCount");

document.querySelector("#reviewTitle").textContent =
    "Revisar correções";

clearReviewButton.innerHTML =
    '<i class="fa-solid fa-trash"></i> Limpar correções';

let corrections = loadCorrections();

updateCorrectionCount();

reviewButton.addEventListener("click", () => {
    renderCorrections();

    reviewModal.hidden = false;
    document.body.classList.add("modal-open");
    closeReviewButton.focus();
});

closeReviewButton.addEventListener("click", closeReview);

reviewModal.addEventListener("click", event => {
    if (event.target === reviewModal) {
        closeReview();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !reviewModal.hidden) {
        closeReview();
    }
});

clearReviewButton.addEventListener("click", () => {
    if (corrections.length === 0) {
        return;
    }

    if (
        !window.confirm(
            "Deseja apagar todas as correções salvas?"
        )
    ) {
        return;
    }

    corrections = [];

    saveCorrections();
    renderCorrections();
    updateCorrectionCount();
});

resetProgressButton.addEventListener("click", () => {
    if (
        !window.confirm(
            "Deseja reiniciar todo o progresso? " +
            "O XP, a sequência e as correções serão apagados."
        )
    ) {
        return;
    }

    for (const key of [
        "devlingoXp",
        "devlingoStreak",
        "devlingoLastStudyDate",
        "devlingoMissionIndex",
        "devlingoMissionDate",
        "devlingoMistakes"
    ]) {
        localStorage.removeItem(key);
    }

    window.location.reload();
});

function saveCorrection({
    answer,
    correction,
    explanation = "",
    mode = "",
    topic = ""
}) {
    if (
        typeof answer !== "string" ||
        typeof correction !== "string" ||
        !answer.trim() ||
        !correction.trim() ||
        answer.trim() === correction.trim()
    ) {
        return;
    }

    const entry = {
        answer: answer.trim().slice(0, 1000),

        correction: correction.trim().slice(0, 500),

        explanation:
            typeof explanation === "string"
                ? explanation.trim().slice(0, 500)
                : "",

        mode:
            mode === "interview"
                ? "Entrevista"
                : "Estudo e prática",

        topic:
            typeof topic === "string"
                ? topic.trim().slice(0, 120)
                : "",

        createdAt: new Date().toISOString()
    };

    corrections = corrections.filter(saved =>
        saved.answer.toLowerCase() !==
            entry.answer.toLowerCase() ||
        saved.correction.toLowerCase() !==
            entry.correction.toLowerCase()
    );

    corrections.unshift(entry);
    corrections = corrections.slice(0, 50);

    saveCorrections();
    updateCorrectionCount();
}

function loadCorrections() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("devlingoMistakes") ||
            "[]"
        );

        if (!Array.isArray(saved)) {
            return [];
        }

        return saved
            .filter(item =>
                item &&
                typeof item.answer === "string" &&
                (
                    typeof item.correction === "string" ||
                    typeof item.example === "string"
                )
            )
            .map(item => ({
                answer: item.answer,

                correction:
                    typeof item.correction === "string"
                        ? item.correction
                        : item.example,

                explanation:
                    typeof item.explanation === "string"
                        ? item.explanation
                        : "Sugestão salva em uma atividade anterior.",

                mode:
                    typeof item.mode === "string"
                        ? item.mode
                        : "",

                topic:
                    typeof item.topic === "string"
                        ? item.topic
                        : (item.missionTitle || ""),

                createdAt:
                    item.createdAt ||
                    new Date().toISOString()
            }));
    } catch {
        return [];
    }
}

function saveCorrections() {
    localStorage.setItem(
        "devlingoMistakes",
        JSON.stringify(corrections)
    );
}

function updateCorrectionCount() {
    mistakeCount.textContent =
        String(corrections.length);
}

function renderCorrections() {
    reviewList.replaceChildren();

    if (corrections.length === 0) {
        const empty =
            document.createElement("div");

        empty.classList.add("review-empty");

        const icon =
            document.createElement("i");

        icon.classList.add(
            "fa-solid",
            "fa-circle-check"
        );

        const title =
            document.createElement("h3");

        title.textContent =
            "Nenhuma correção salva";

        const description =
            document.createElement("p");

        description.textContent =
            "Quando o DevLingo sugerir uma frase melhor, ela aparecerá aqui.";

        empty.append(
            icon,
            title,
            description
        );

        reviewList.appendChild(empty);
        return;
    }

    for (const entry of corrections) {
        reviewList.appendChild(
            createCorrectionCard(entry)
        );
    }
}

function createCorrectionCard(entry) {
    const card =
        document.createElement("article");

    card.classList.add("review-card");

    const header =
        document.createElement("div");

    header.classList.add(
        "review-card-header"
    );

    const title =
        document.createElement("h3");

    title.textContent =
        entry.topic ||
        entry.mode ||
        "Prática de inglês";

    const date =
        document.createElement("time");

    date.dateTime = entry.createdAt;

    date.textContent = new Date(
        entry.createdAt
    ).toLocaleDateString("pt-BR");

    header.append(title, date);
    card.appendChild(header);

    addCardField(
        card,
        "SUA FRASE",
        entry.answer,
        "wrong-answer"
    );

    addCardField(
        card,
        "SUGESTÃO",
        entry.correction,
        "correct-example"
    );

    if (entry.explanation) {
        addCardField(
            card,
            "POR QUÊ?",
            entry.explanation,
            "missing-information"
        );
    }

    return card;
}

function addCardField(
    card,
    labelText,
    value,
    className
) {
    const label =
        document.createElement("span");

    label.classList.add("review-label");
    label.textContent = labelText;

    const paragraph =
        document.createElement("p");

    paragraph.classList.add(className);
    paragraph.textContent = value;

    card.append(label, paragraph);
}

function closeReview() {
    reviewModal.hidden = true;

    document.body.classList.remove(
        "modal-open"
    );

    reviewButton.focus();
}