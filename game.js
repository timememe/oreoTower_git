// Глобальные настройки игры
let language = document.documentElement.getAttribute('lang') || 'ru';

// Глобальные цвета градиента
let gradientColorStart = 'white';
let gradientColorEnd = '#0058C9';

// Относительные размеры и позиции
let baseBlockWidthPercent = 0.5; // 50% от ширины экрана
let baseBlockHeightPercent = 0.05; // 5% от высоты экрана
let baseBlockYPercent = 0.75; // 75% от высоты экрана

let blockWidthPercent = 0.18; // 18% от ширины экрана
let blockHeightPercent = 0.02; // 2% от высоты экрана
let horizontalMovementYPercent = 0.3; // 30% от высоты экрана

// Глобальные настройки грида
const GRID_SPACING = 20; // Отступ между объектами грида в пикселях
const GRID_OBJECT_WIDTH = 120; // Ширина объекта грида в пикселях
const GRID_OBJECT_HEIGHT = 60; // Высота объекта грида в пикселях

// Абсолютные размеры (будут вычисляться)
let baseBlockWidth, baseBlockHeight, baseBlockY;
let blockWidth, blockHeight, horizontalMovementY;

let initialHorizontalSpeed = 0.005; // Начальная скорость в процентах от ширины экрана
let horizontalSpeed; // Текущая скорость движения по горизонтали
let accelerationMultiplier = 1.1; // Множитель ускорения после каждого блока

// Глобальные переменные для масштабирования текстур
let baseBlockTextureScaleY = 2; // Вертикальный масштаб текстуры базового блока
let baseBlockTextureOffsetY = 0.2;
let blockTextureScaleY = 0.2; // Вертикальный масштаб текстуры падающих блоков
let blockTextureOffsetY = 0.0; // Вертикальный оффсет для текстур блоков

const maxBlocks = 10; // Количество блоков для победы
const blockTextureURL = 'assets/cookie.png';
const plateTextureURL = 'assets/plate.png';
const topBackgroundURL = 'assets/cookie_bg.png'; // Фоновое изображение для верха

// Предзагрузка изображений текстур
let blockTextureImage = new Image();
blockTextureImage.src = blockTextureURL;
let plateTextureImage = new Image();
plateTextureImage.src = plateTextureURL;
let topBackgroundImage = new Image();
topBackgroundImage.src = topBackgroundURL;

// Игровые переменные
let canvas, ctx;
let engine, world;
let render;
let blocks = [];
let isGameOver = false;
let currentBlock = null;
let ground;
let blockCount = 0;
let lastBlock = null;
let secondLastBlock = null;

// Добавляем переменные для таймера и счетчика
let successfulBlocks = 0;
let gameTimer;
let timeLeft = 120; // 2 минуты в секундах

// Переводы
const translations = {
    en: {
        gameTitle: "Tower Builder",
        tutorialText: "Stack the blocks carefully to build the tallest tower without it falling!",
        startGame: "Start Game",
        victory: "You Win!",
        defeat: "Game Over",
        restartGame: "Restart Game",
        score: "Blocks: ",
        perfect: "PERFECT!",
        great: "GREAT!",
        okay: "OKAY",
        backButtonText: "Back"
    },
    ru: {
        gameTitle: "Строитель Башни",
        tutorialText: "Аккуратно складывайте блоки, чтобы построить самую высокую башню, не уронив ее!",
        startGame: "Начать игру",
        victory: "Вы выиграли!",
        defeat: "Игра окончена",
        restartGame: "Начать заново",
        score: "Блоки: ",
        perfect: "ИДЕАЛЬНО!",
        great: "КЛАСС!",
        okay: "НУ ОК",
        backButtonText: "НАЗАД"
    },
    // Добавьте остальные переводы...
};

// Сохраняем исходную функцию рендеринга тел
const originalRenderBodies = Matter.Render.bodies;

// Переопределяем функцию рендеринга тел
Matter.Render.bodies = function(render, bodies, context) {
    var c = context,
        engine = render.engine,
        options = render.options,
        bodies = bodies.slice(0);

    // Сортируем тела по blockIndex
    bodies.sort(function(a, b) {
        return a.blockIndex - b.blockIndex;
    });

    // Вызываем исходную функцию рендеринга
    originalRenderBodies.call(this, render, bodies, context);
};

// Ждем загрузки изображений перед запуском игры
document.addEventListener('DOMContentLoaded', () => {
    let imagesLoaded = 0;
    const totalImages = 3; // Общее количество изображений

    blockTextureImage.onload = checkImagesLoaded;
    plateTextureImage.onload = checkImagesLoaded;
    topBackgroundImage.onload = checkImagesLoaded;

    function checkImagesLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            initGameAndEvents();
        }
    }
});

function initGameAndEvents() {
    // Инициализация canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Инициализация UI
    initUI();

    // Изменение размера canvas
    resizeCanvas();

    // Добавление обработчиков событий
    window.addEventListener('resize', resizeCanvas);
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);

    // Обработчик щелчка по canvas
    canvas.addEventListener('click', function () {
        dropBlock();
    });

    // Обработчик нажатия клавиш
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            dropBlock();
        }
    });
}

// Инициализация UI
function initUI() {
    const lang = translations[language];
    document.getElementById('game-title').innerText = lang.gameTitle;
    document.getElementById('tutorial-text').innerText = lang.tutorialText;
    document.getElementById('start-button').innerText = lang.startGame;
    document.getElementById('end-title').innerText = '';
    document.getElementById('restart-button').innerText = '';
    document.getElementById('end-popup').style.display = 'none';
    document.getElementById('start-popup').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'none';

    // Удаляем верхний счетчик, так как будем использовать score-display
    let scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.parentNode.removeChild(scoreElement);
    }

    // Элемент для отображения сообщений точности
    let accuracyMessage = document.getElementById('accuracy-message');
    if (!accuracyMessage) {
        accuracyMessage = document.createElement('div');
        accuracyMessage.id = 'accuracy-message';
        accuracyMessage.style.position = 'absolute';
        accuracyMessage.style.top = '50%';
        accuracyMessage.style.left = '50%';
        accuracyMessage.style.transform = 'translate(-50%, -50%)';
        accuracyMessage.style.color = '#ff0';
        accuracyMessage.style.fontSize = '48px';
        accuracyMessage.style.textShadow = '2px 2px 4px #000';
        accuracyMessage.style.display = 'none';
        document.getElementById('game-container').appendChild(accuracyMessage);
    }

    // Добавляем нижний бар с кнопками
    let bottomBar = document.getElementById('bottom-bar');
    if (!bottomBar) {
        bottomBar = document.createElement('div');
        bottomBar.id = 'bottom-bar';
        document.getElementById('game-container').appendChild(bottomBar);

        // Устанавливаем позиционирование нижнего бара
        bottomBar.style.position = 'absolute';
        bottomBar.style.bottom = '0';
        bottomBar.style.left = '0';
        bottomBar.style.width = '100%';
        bottomBar.style.height = `${GRID_OBJECT_HEIGHT + GRID_SPACING}px`; // Используем глобальную переменную
        bottomBar.style.display = 'flex';
        bottomBar.style.justifyContent = 'space-around';
        bottomBar.style.alignItems = 'center';
        bottomBar.style.padding = `${GRID_SPACING / 2}px 0`; // Вертикальные отступы

        // Кнопка назад
        let backButton = document.createElement('div');
        backButton.id = 'back-button';
        backButton.classList.add('bottom-button');
        backButton.innerText = lang.backButtonText;
        backButton.style.width = `${GRID_OBJECT_WIDTH}px`;
        backButton.style.height = `${GRID_OBJECT_HEIGHT}px`;
        backButton.style.margin = `${GRID_SPACING / 2}px`;
        backButton.style.cursor = 'pointer'; // Добавляем курсор для кнопки
        bottomBar.appendChild(backButton);

        // Таймер
        let timer = document.createElement('div');
        timer.id = 'timer';
        timer.classList.add('bottom-button');
        timer.style.width = `${GRID_OBJECT_WIDTH}px`;
        timer.style.height = `${GRID_OBJECT_HEIGHT}px`;
        timer.style.margin = `${GRID_SPACING / 2}px`;
        timer.style.display = 'flex';
        timer.style.justifyContent = 'center';
        timer.style.alignItems = 'center';
        let timerValue = document.createElement('span');
        timerValue.id = 'timer-value';
        timerValue.innerText = '2:00';
        timer.appendChild(timerValue);
        bottomBar.appendChild(timer);

        // Счет
        let scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'score-display';
        scoreDisplay.classList.add('bottom-button');
        scoreDisplay.style.width = `${GRID_OBJECT_WIDTH}px`;
        scoreDisplay.style.height = `${GRID_OBJECT_HEIGHT}px`;
        scoreDisplay.style.margin = `${GRID_SPACING / 2}px`;
        scoreDisplay.style.display = 'flex';
        scoreDisplay.style.justifyContent = 'center';
        scoreDisplay.style.alignItems = 'center';
        scoreDisplay.innerText = `${lang.score} \n 0/0`;
        bottomBar.appendChild(scoreDisplay);
    }

    // Добавляем фоновое изображение в верхней части
    let topBackground = document.getElementById('top-background');
    if (!topBackground) {
        topBackground = document.createElement('img');
        topBackground.id = 'top-background';
        topBackground.src = topBackgroundURL;
        topBackground.style.position = 'absolute';
        topBackground.style.top = '0';
        topBackground.style.left = '0';
        topBackground.style.width = '100%';
        topBackground.style.height = 'auto';
        topBackground.style.zIndex = '0'; // За канвасом
        document.getElementById('game-container').appendChild(topBackground);
    }
}

function startTimer() {
    timeLeft = 120;
    updateTimerDisplay();
    gameTimer = setInterval(function() {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            isGameOver = true;
            endGame(false);
            Matter.Render.stop(render);
            Matter.Engine.clear(engine);
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

// Начать игру
function startGame() {
    document.getElementById('start-popup').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';

    // Запуск таймера
    startTimer();

    initGame();
}

// Обновление отображения таймера
function updateTimerDisplay() {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    let timeString = minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
    document.getElementById('timer-value').innerText = timeString;
}

function initGame() {
    isGameOver = false;
    blockCount = 0;
    successfulBlocks = 0;
    blocks = [];

    // Пересчитываем размеры и позиции
    calculateSizes();

    // Сброс горизонтальной скорости
    horizontalSpeed = initialHorizontalSpeed * canvas.width;

    // Создаем физический движок Matter.js
    engine = Matter.Engine.create();
    world = engine.world;

    // Создаем рендерер
    render = Matter.Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: canvas.width,
            height: canvas.height,
            wireframes: false,
            hasBounds: true,
            background: 'transparent' // Чтобы фон не перекрывал наш градиент и фоновое изображение
        }
    });

    // Добавляем отрисовку радиального градиента и фонового изображения перед каждым кадром
    Matter.Events.on(render, 'beforeRender', function() {
        var context = render.context;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;

        // Очищаем канвас
        context.clearRect(0, 0, canvasWidth, canvasHeight);

        // Рисуем фоновое изображение в верхней части
        if (topBackgroundImage.complete) {
            let imgWidth = canvasWidth;
            let imgHeight = topBackgroundImage.height * (canvasWidth / topBackgroundImage.width);
            context.drawImage(topBackgroundImage, 0, 0, imgWidth, imgHeight);
        }

        // Создаем радиальный градиент
        var gradient = context.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, canvasWidth / 1.2
        );
        gradient.addColorStop(0, gradientColorStart);
        gradient.addColorStop(1, gradientColorEnd);

        // Заполняем фон градиентом
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
    });

    // Создаем землю
    ground = Matter.Bodies.rectangle(canvas.width / 2, canvas.height + 50, canvas.width, 100, {
        isStatic: true
    });
    Matter.World.add(world, ground);

    // Добавляем базовый блок с текстурой
    let baseBlock = Matter.Bodies.rectangle(
        canvas.width / 2,
        baseBlockY,
        baseBlockWidth,
        baseBlockHeight,
        {
            isStatic: true,
            render: {
                sprite: {
                    texture: plateTextureURL,
                    xScale: baseBlockWidth / plateTextureImage.width,
                    yScale: (baseBlockHeight / plateTextureImage.height) * baseBlockTextureScaleY,
                    yOffset: baseBlockTextureOffsetY // Можно регулировать при необходимости
                }
            }
        }
    );
    baseBlock.blockIndex = -1;
    Matter.World.add(world, baseBlock);
    blocks.push(baseBlock);

    lastBlock = baseBlock;
    secondLastBlock = null;

    // Создаем первый текущий блок
    createNewBlock();

    // Запускаем физический движок
    Matter.Runner.run(engine);

    // Запускаем рендерер
    Matter.Render.run(render);

    // Обновляем текущий блок перед обновлением физики
    Matter.Events.on(engine, 'beforeUpdate', updateCurrentBlock);

    // Отрисовываем текущий блок после рендеринга
    Matter.Events.on(render, 'afterRender', renderCurrentBlock);

    // Проверяем на завершение игры
    Matter.Events.on(engine, 'afterUpdate', checkGameOver);

    // Добавляем обработчики событий столкновений
    Matter.Events.on(engine, 'collisionStart', handleCollisionStart);
    Matter.Events.on(engine, 'collisionEnd', handleCollisionEnd);
}

function calculateSizes() {
    baseBlockWidth = canvas.width * baseBlockWidthPercent;
    baseBlockHeight = canvas.height * baseBlockHeightPercent;
    baseBlockY = canvas.height * baseBlockYPercent;

    blockWidth = canvas.width * blockWidthPercent;
    blockHeight = canvas.height * blockHeightPercent;
    horizontalMovementY = canvas.height * horizontalMovementYPercent;
}

// Создание нового блока
function createNewBlock() {
    currentBlock = {
        x: 0,
        y: horizontalMovementY,
        width: blockWidth,
        height: blockHeight,
        vx: horizontalSpeed,
        isFalling: false
    };
}

// Обновление текущего блока (движение по горизонтали)
function updateCurrentBlock() {
    if (currentBlock && !currentBlock.isFalling) {
        currentBlock.x += currentBlock.vx;

        // Отскакивание от стен
        if (currentBlock.x <= 0 || currentBlock.x + currentBlock.width >= canvas.width) {
            currentBlock.vx *= -1;
        }
    }
}

// Отрисовка текущего блока
function renderCurrentBlock() {
    if (currentBlock && !currentBlock.isFalling) {
        const context = render.context;
        context.save();

        let textureWidth = currentBlock.width;
        let textureHeight = blockTextureImage.height * blockTextureScaleY;
        let textureX = currentBlock.x;
        let textureY = currentBlock.y + currentBlock.height - textureHeight + blockTextureOffsetY * currentBlock.height;

        if (blockTextureImage.complete) {
            context.drawImage(blockTextureImage, textureX, textureY, textureWidth, textureHeight);
        } else {
            context.fillStyle = '#8B4513';
            context.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);
        }
        context.restore();
    }
}

// Обработка падения блока
function dropBlock() {
    if (!currentBlock || currentBlock.isFalling) return;

    currentBlock.isFalling = true;

    let textureScaleX = currentBlock.width / blockTextureImage.width;
    let textureScaleY = blockTextureScaleY;

    let blockBody = Matter.Bodies.rectangle(
        currentBlock.x + currentBlock.width / 2,
        currentBlock.y + currentBlock.height / 2,
        currentBlock.width,
        currentBlock.height,
        {
            render: {
                sprite: {
                    texture: blockTextureURL,
                    xScale: textureScaleX,
                    yScale: textureScaleY,
                    yOffset: blockTextureOffsetY
                }
            }
        }
    );

    blockBody.blockIndex = blockCount;
    blockBody.isFalling = true;
    blockBody.hasLanded = false;
    blockBody.touchedGround = false;

    Matter.World.add(world, blockBody);
    blocks.push(blockBody);

    secondLastBlock = lastBlock;
    lastBlock = blockBody;

    currentBlock = null;
    blockCount++;

    horizontalSpeed *= accelerationMultiplier;

    if (blockCount < maxBlocks) {
        createNewBlock();
    }
}

// Обработчик начала столкновений
function handleCollisionStart(event) {
    var pairs = event.pairs;

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];

        if ((pair.bodyA === lastBlock && pair.bodyB === secondLastBlock) ||
            (pair.bodyB === lastBlock && pair.bodyA === secondLastBlock)) {
            // Последний блок приземлился на предыдущий
            lastBlock.hasLanded = true;

            // Вычисляем точность попадания
            calculateAccuracy();
        }

        if ((pair.bodyA === lastBlock && pair.bodyB === ground) ||
            (pair.bodyB === lastBlock && pair.bodyA === ground)) {
            // Последний блок коснулся земли
            lastBlock.touchedGround = true;
        }

        // Если любой блок касается земли
        if ((blocks.includes(pair.bodyA) && pair.bodyB === ground) ||
            (blocks.includes(pair.bodyB) && pair.bodyA === ground)) {
            let body = blocks.includes(pair.bodyA) ? pair.bodyA : pair.bodyB;
            if (body.blockIndex >= 0) {
                // Блок, который не является базовым, коснулся земли
                body.touchedGround = true;
            }
        }
    }
}

// Обработчик окончания столкновений
function handleCollisionEnd(event) {
    var pairs = event.pairs;

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];

        if ((pair.bodyA === lastBlock && pair.bodyB === secondLastBlock) ||
            (pair.bodyB === lastBlock && pair.bodyA === secondLastBlock)) {
            // Последний блок больше не касается предыдущего
            lastBlock.hasLanded = false;
        }
    }
}

// Функция для вычисления точности попадания
function calculateAccuracy() {
    const lang = translations[language];
    let overlap = calculateOverlap(lastBlock, secondLastBlock);
    let accuracy = (overlap / blockWidth) * 100;

    let message = '';
    let color = '#ffffff'; // Белый цвет
    if (accuracy > 80) {
        message = lang.perfect;
    } else if (accuracy > 60) {
        message = lang.great;
    } else {
        message = lang.okay;
    }

    showAccuracyMessage(message, color);

    // Увеличиваем счетчик успешно размещенных блоков
    successfulBlocks++;
    updateScore();
}

// Функция для вычисления перекрытия между блоками
function calculateOverlap(blockA, blockB) {
    let leftA = blockA.position.x - blockWidth / 2;
    let rightA = blockA.position.x + blockWidth / 2;
    let leftB = blockB.position.x - blockWidth / 2;
    let rightB = blockB.position.x + blockWidth / 2;

    let overlap = Math.max(0, Math.min(rightA, rightB) - Math.max(leftA, leftB));
    return overlap;
}

// Функция для отображения сообщения точности
function showAccuracyMessage(message, color) {
    let accuracyMessage = document.getElementById('accuracy-message');
    accuracyMessage.innerText = message;
    accuracyMessage.style.color = color;
    accuracyMessage.style.display = 'block';

    // Скрываем сообщение через 1 секунду
    setTimeout(() => {
        accuracyMessage.style.display = 'none';
    }, 1000);
}

// Функция для обновления счетчика
function updateScore() {
    const lang = translations[language];
    let scoreDisplay = document.getElementById('score-display');
    scoreDisplay.innerText = `${lang.score}${successfulBlocks}`;
}

// Проверка завершения игры
function checkGameOver() {
    // Проверяем, есть ли тела, упавшие за пределы экрана
    for (let body of blocks) {
        if (body.position.y > canvas.height + 100) {
            isGameOver = true;
            endGame(false);
            Matter.Render.stop(render);
            Matter.Engine.clear(engine);
            return;
        }
    }

    // Проверяем, если любой блок коснулся земли
    for (let body of blocks) {
        if (body.touchedGround && body.blockIndex >= 0 && !body.hasLanded) {
            isGameOver = true;
            endGame(false);
            Matter.Render.stop(render);
            Matter.Engine.clear(engine);
            return;
        }
    }

    // Проверяем условие победы
    if (blockCount >= maxBlocks && !currentBlock) {
        isGameOver = true;
        endGame(true);
        Matter.Render.stop(render);
        Matter.Engine.clear(engine);
    }
}

// Завершение игры
function endGame(victory) {
    const lang = translations[language];
    document.getElementById('end-title').innerText = victory ? lang.victory : lang.defeat;
    document.getElementById('restart-button').innerText = lang.restartGame;
    document.getElementById('end-popup').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'none';

    // Останавливаем обработчики событий
    Matter.Events.off(engine);

    // Останавливаем таймер
    clearInterval(gameTimer);
}

// Перезапуск игры
function restartGame() {
    clearInterval(gameTimer); // Останавливаем предыдущий таймер
    document.getElementById('end-popup').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';

    // Запуск таймера
    startTimer();

    initGame();
}

// Изменение размера canvas
function resizeCanvas() {
    if (!canvas) return;

    const desiredAspectRatio = 9 / 16;
    const windowAspectRatio = window.innerWidth / window.innerHeight;

    const container = document.getElementById('game-container');
    const bottomBar = document.getElementById('bottom-bar');
    let bottomBarHeight = bottomBar ? bottomBar.offsetHeight : GRID_OBJECT_HEIGHT + GRID_SPACING;

    if (windowAspectRatio > desiredAspectRatio) {
        canvas.height = window.innerHeight - bottomBarHeight;
        canvas.width = canvas.height * desiredAspectRatio;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / desiredAspectRatio;
        canvas.height = canvas.height - bottomBarHeight;
    }

    canvas.style.top = '0';
    canvas.style.left = '0';

    container.style.width = `${canvas.width}px`;
    container.style.height = `${canvas.height + bottomBarHeight}px`;

    // Пересчитываем размеры и позиции
    calculateSizes();

    // Обновляем параметры рендерера
    if (render) {
        render.options.width = canvas.width;
        render.options.height = canvas.height;
        render.canvas.width = canvas.width;
        render.canvas.height = canvas.height;

        // Обновляем границы камеры
        render.bounds.max.x = canvas.width;
        render.bounds.max.y = canvas.height;

        // Обновляем положение и размеры всех блоков
        updateBlocksSize();
    }

    // Обновляем горизонтальную скорость
    horizontalSpeed = initialHorizontalSpeed * canvas.width;
}

function updateBlocksSize() {
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        let previousWidth = block.bounds.max.x - block.bounds.min.x;
        let previousHeight = block.bounds.max.y - block.bounds.min.y;

        if (block.blockIndex === -1) {
            // Базовый блок
            Matter.Body.setPosition(block, {
                x: canvas.width / 2,
                y: baseBlockY
            });
            let scaleX = baseBlockWidth / previousWidth;
            let scaleY = baseBlockHeight / previousHeight;
            Matter.Body.scale(block, scaleX, scaleY);

            // Обновляем масштаб текстуры базового блока
            block.render.sprite.xScale = baseBlockWidth / plateTextureImage.width;
            block.render.sprite.yScale = (baseBlockHeight / plateTextureImage.height) * baseBlockTextureScaleY;
            block.render.sprite.yOffset = 0.0; // При необходимости можно регулировать
        } else {
            // Остальные блоки
            let scaleX = blockWidth / previousWidth;
            let scaleY = blockHeight / previousHeight;
            Matter.Body.scale(block, scaleX, scaleY);

            // Обновляем масштаб и оффсет текстур падающих блоков
            block.render.sprite.xScale = blockWidth / blockTextureImage.width;
            block.render.sprite.yScale = blockTextureScaleY;
            block.render.sprite.yOffset = blockTextureOffsetY;
        }
    }
}
