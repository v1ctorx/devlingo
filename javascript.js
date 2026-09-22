const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const chatMessages = document.querySelector("#chatMessages");
const sendButton = document.querySelector("#sendButton");
const missionTitle = document.querySelector("#missionTitle");
const missionLevel = document.querySelector(".mission-level");
const xpElement = document.querySelector("#xp");
const streakElement = document.querySelector("#streak");

let currentXp = Number(localStorage.getItem("devlingoXp")) || 0;
let currentStreak = Number(localStorage.getItem("devlingoStreak")) || 0;
let conversationHistory = [];
let successfulMessages = 0;
let step = "mode";
let mode = "";
let topic = "";

xpElement.textContent = currentXp;
streakElement.textContent = currentStreak;

missionTitle.textContent = "Escolha sua prática";

missionLevel.innerHTML =
    '<i class="fa-solid fa-circle"></i> Inglês para devs';

userInput.placeholder = "Digite 1 ou 2...";

chatMessages.replaceChildren();

createBotMessage(
    "Como você quer praticar inglês hoje? " +
    "Digite 1 para simular uma entrevista de emprego em programação, " +
    "ou 2 para estudar e conversar sobre linguagens e tecnologias."
);

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const userText = userInput.value.trim();

    if (!userText || sendButton.disabled) {
        return;
    }

    createUserMessage(userText);
    chatForm.reset();

    if (step === "mode") {
        const choice = chooseMode(userText);

        if (!choice) {
            createBotMessage(
                "Qual caminho você prefere? Digite 1 para entrevista " +
                "ou 2 para estudar e praticar inglês sobre programação."
            );
            return;
        }

        mode = choice;
        step = "topic";

        missionTitle.textContent =
            mode === "interview"
                ? "Entrevista"
                : "Estudo e prática";

        userInput.placeholder =
            "Escreva uma vaga, linguagem ou tecnologia...";

        createBotMessage(
            mode === "interview"
                ? "Para qual vaga ou área você quer treinar a entrevista? " +
                  "Pode ser estágio front-end, back-end, Java, Python ou qualquer outra."
                : "Qual linguagem ou tecnologia você quer estudar e praticar em inglês? " +
                  "Pode escolher qualquer uma."
        );

        return;
    }

    if (
        step === "topic" &&
        /^(sim|yes|ok|okay|não|nao|no|1|2)$/i.test(userText)
    ) {
        createBotMessage(
            "Me diga o nome de uma vaga, área, linguagem ou tecnologia " +
            "para começarmos. Exemplo: Python ou estágio front-end."
        );
        return;
    }

    if (
        step === "conversation" &&
        /^(mudar (o )?modo|trocar (o )?modo)$/i.test(userText)
    ) {
        step = "mode";
        mode = "";
        topic = "";
        conversationHistory = [];

        missionTitle.textContent = "Escolha sua prática";
        userInput.placeholder = "Digite 1 ou 2...";

        createBotMessage(
            "Tudo bem! Digite 1 para entrevista ou 2 para estudar " +
            "e praticar inglês sobre programação."
        );
        return;
    }

    if (
        step === "conversation" &&
        /^(mudar (o )?tema|trocar (o )?tema)$/i.test(userText)
    ) {
        step = "topic";
        topic = "";
        conversationHistory = [];

        userInput.placeholder =
            "Escreva uma vaga, linguagem ou tecnologia...";

        createBotMessage(
            "Claro! Qual vaga, linguagem ou tecnologia você quer abordar agora?"
        );
        return;
    }

    const opening = step === "topic";

    if (opening) {
        topic = userText;
        step = "conversation";

        userInput.placeholder =
            "Responda em inglês ou peça ajuda em português...";
    }

    setFormState(false);
    showTypingIndicator();

    try {
        const response = await fetch(
            "/.netlify/functions/chat-v2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userText,
                    mode,
                    topic,
                    opening,
                    history: conversationHistory
                })
            }
        );

        const data = await response.json();

        if (
            !response.ok ||
            typeof data.reply !== "string" ||
            !data.reply.trim()
        ) {
            throw new Error(
                data.error || "Falha na conversa."
            );
        }

        removeTypingIndicator();

        createBotMessage(
            data.reply,
            data.correction,
            data.explanation
        );

        // Salva uma sugestão somente quando a IA corrigir a frase.
        if (
            typeof data.correction === "string" &&
            data.correction.trim() &&
            typeof saveCorrection === "function"
        ) {
            saveCorrection({
                answer: userText,
                correction: data.correction,
                explanation: data.explanation,
                mode,
                topic
            });
        }

        conversationHistory.push(
            { role: "user", content: userText },
            { role: "assistant", content: data.reply }
        );

        conversationHistory =
            conversationHistory.slice(-12);

        successfulMessages += 1;
        updateStreak();

        if (successfulMessages % 5 === 0) {
            currentXp += 10;

            localStorage.setItem(
                "devlingoXp",
                String(currentXp)
            );

            xpElement.textContent = currentXp;
        }
    } catch (error) {
        removeTypingIndicator();

        if (opening) {
            step = "topic";
            topic = "";
        }

        createBotMessage(
            "A conversa ficou indisponível por um instante. " +
            "Sua mensagem está no campo abaixo para você reenviar."
        );

        userInput.value = userText;

        console.error("Erro no chat:", error);
    } finally {
        setFormState(true);
    }
});

function chooseMode(text) {
    const value = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    if (
        value === "1" ||
        /entrevista|interview/.test(value)
    ) {
        return "interview";
    }

    if (
        value === "2" ||
        /estud|pratic|linguag|tecnolog|study|learn/.test(value)
    ) {
        return "study";
    }

    return "";
}

function setFormState(enabled) {
    userInput.disabled = !enabled;
    sendButton.disabled = !enabled;

    if (enabled) {
        userInput.focus();
    }
}

function createUserMessage(text) {
    const message =
        document.createElement("article");

    message.classList.add(
        "message",
        "user-message"
    );

    const content =
        document.createElement("div");

    content.classList.add("message-content");

    const name =
        document.createElement("strong");

    name.textContent = "You";

    const paragraph =
        document.createElement("p");

    paragraph.textContent = text;

    content.append(name, paragraph);
    message.appendChild(content);
    chatMessages.appendChild(message);

    scrollToLastMessage();
}

function createBotMessage(
    reply,
    correction = "",
    explanation = ""
) {
    const message =
        document.createElement("article");

    message.classList.add(
        "message",
        "bot-message"
    );

    const avatar =
        document.createElement("div");

    avatar.classList.add("bot-avatar");

    const icon =
        document.createElement("i");

    icon.classList.add(
        "fa-solid",
        "fa-robot"
    );

    avatar.appendChild(icon);

    const content =
        document.createElement("div");

    content.classList.add("message-content");

    const name =
        document.createElement("strong");

    name.textContent = "DevLingo";

    const onlineStatus =
        document.createElement("span");

    onlineStatus.classList.add(
        "online-status"
    );

    name.appendChild(onlineStatus);
    content.appendChild(name);

    const parts = [
        correction && `Sugestão: ${correction}`,
        explanation && `Por quê? ${explanation}`,
        reply
    ];

    for (const text of parts) {
        if (!text) {
            continue;
        }

        const paragraph =
            document.createElement("p");

        paragraph.textContent = text;
        content.appendChild(paragraph);
    }

    message.append(avatar, content);
    chatMessages.appendChild(message);

    scrollToLastMessage();
}

function showTypingIndicator() {
    removeTypingIndicator();

    const message =
        document.createElement("article");

    message.classList.add(
        "message",
        "bot-message",
        "typing-message"
    );

    const avatar =
        document.createElement("div");

    avatar.classList.add("bot-avatar");

    const icon =
        document.createElement("i");

    icon.classList.add(
        "fa-solid",
        "fa-robot"
    );

    avatar.appendChild(icon);

    const content =
        document.createElement("div");

    content.classList.add("message-content");

    const name =
        document.createElement("strong");

    name.textContent = "DevLingo";

    const status =
        document.createElement("span");

    status.classList.add(
        "online-status"
    );

    name.appendChild(status);

    const bubble =
        document.createElement("p");

    bubble.classList.add(
        "typing-bubble"
    );

    for (let i = 0; i < 3; i++) {
        bubble.appendChild(
            document.createElement("span")
        );
    }

    content.append(name, bubble);
    message.append(avatar, content);
    chatMessages.appendChild(message);

    scrollToLastMessage();
}

function removeTypingIndicator() {
    document.querySelector(
        ".typing-message"
    )?.remove();
}

function scrollToLastMessage() {
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth"
    });
}

function updateStreak() {
    const today =
        getDateKey(new Date());

    const lastStudyDate =
        localStorage.getItem(
            "devlingoLastStudyDate"
        );

    if (lastStudyDate === today) {
        return;
    }

    const yesterday =
        new Date();

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    currentStreak =
        lastStudyDate === getDateKey(yesterday)
            ? currentStreak + 1
            : 1;

    localStorage.setItem(
        "devlingoStreak",
        String(currentStreak)
    );

    localStorage.setItem(
        "devlingoLastStudyDate",
        today
    );

    streakElement.textContent =
        currentStreak;
}

function getDateKey(date) {
    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}