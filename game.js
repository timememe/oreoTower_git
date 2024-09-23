// Глобальные настройки игры
let language = 'ru'; // Язык игры

// Контрольные переменные
let baseBlockWidth = 150; // Длина статичного базового блока
let baseBlockHeight = 20; // Высота статичного базового блока
let baseBlockY = 700; // Вертикальная позиция статичного базового блока

let blockWidth = 60; // Длина всех падающих блоков
let blockHeight = 20; // Высота всех падающих блоков
let horizontalMovementY = 420; // Высота движения блоков по горизонтали и откуда они падают

let initialHorizontalSpeed = 3; // Начальная скорость движения по горизонтали
let horizontalSpeed; // Текущая скорость движения по горизонтали
let accelerationMultiplier = 1; // Множитель ускорения после каждого блока

let texUpscale = 1;
let texUpscale_drop = 0.1;
const maxBlocks = 10; // Количество блоков для победы
const blockTextureURL = 'assets/cookie.png'; // URL текстуры блока

// Предзагрузка изображения текстуры блока
let blockTextureImage = new Image();
blockTextureImage.src = blockTextureURL;

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

// Добавляем переменную для счетчика успешно размещенных блоков
let successfulBlocks = 0;

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
        okay: "OKAY"
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
        okay: "НУ ОК"
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

// Инициализация игры и событий
document.addEventListener('DOMContentLoaded', () => {
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
});

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

    // Создаем элемент для отображения счетчика
    let scoreElement = document.getElementById('score');
    if (!scoreElement) {
        scoreElement = document.createElement('div');
        scoreElement.id = 'score';
        scoreElement.style.position = 'absolute';
        scoreElement.style.top = '10px';
        scoreElement.style.left = '10px';
        scoreElement.style.color = '#fff';
        scoreElement.style.fontSize = '24px';
        scoreElement.style.textShadow = '1px 1px 2px #000';
        document.getElementById('game-container').appendChild(scoreElement);
    }
    scoreElement.innerText = lang.score + '0';

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
}

// Начать игру
function startGame() {
    document.getElementById('start-popup').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';
    initGame();
}

// Инициализация игры
function initGame() {
    isGameOver = false;
    blockCount = 0;
    successfulBlocks = 0;
    blocks = [];

    // Сброс горизонтальной скорости
    horizontalSpeed = initialHorizontalSpeed; // Сброс к начальному значению

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
            background: '#87ceeb', // Небесно-голубой
            hasBounds: true // Включаем границы
        }
    });

    // Создаем землю
    ground = Matter.Bodies.rectangle(canvas.width / 2, canvas.height + 50, canvas.width, 100, {
        isStatic: true
    });
    Matter.World.add(world, ground);

    // Добавляем первый блок-основание
    let baseBlock = Matter.Bodies.rectangle(
        canvas.width / 2,
        baseBlockY,
        baseBlockWidth,
        baseBlockHeight,
        {
            isStatic: true,
            render: {
                fillStyle: '#8B4513'
            }
        }
    );
    baseBlock.blockIndex = -1; // Базовый блок внизу
    Matter.World.add(world, baseBlock);
    blocks.push(baseBlock);

    lastBlock = baseBlock;
    secondLastBlock = null;

    // Создаем первый текущий блок
    createNewBlock();

    // Запускаем физический движок
    Matter.Engine.run(engine);

    // Запускаем рендерер
    Matter.Render.run(render);

    // Добавляем отрисовку радиального градиента перед каждым кадром
    Matter.Events.on(render, 'beforeRender', function() {
        var context = render.context;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;

        // Создаем радиальный градиент
        var gradient = context.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, canvasWidth / 1.2
        );
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, '#0058C9');

        // Заполняем фон градиентом
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
    });

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

        // Поскольку текстура больше хитбокса, корректируем позицию
        let textureX = currentBlock.x - (currentBlock.width * texUpscale - currentBlock.width) / 2;
        let textureY = currentBlock.y - (currentBlock.height * texUpscale - currentBlock.height) / 2;
        let textureWidth = currentBlock.width * texUpscale;
        let textureHeight = currentBlock.height * texUpscale;

        if (blockTextureImage.complete) {
            context.drawImage(blockTextureImage, textureX, textureY, textureWidth, textureHeight);
        } else {
            // Если изображение еще не загружено, заполняем прямоугольник
            context.fillStyle = '#8B4513'; // Коричневый цвет
            context.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);
        }
        context.restore();
    }
}

// Обработка падения блока
function dropBlock() {
    if (!currentBlock || currentBlock.isFalling) return;

    currentBlock.isFalling = true;

    // Создаем физическое тело для текущего блока
    let blockBody = Matter.Bodies.rectangle(
        currentBlock.x + currentBlock.width / 2,
        currentBlock.y + currentBlock.height / 2,
        currentBlock.width,
        currentBlock.height,
        {
            render: {
                sprite: {
                    texture: blockTextureURL,
                    xScale: texUpscale_drop,
                    yScale: texUpscale_drop
                }
            }
        }
    );

    // Устанавливаем пользовательские свойства
    blockBody.blockIndex = blockCount;
    blockBody.isFalling = true;
    blockBody.hasLanded = false;
    blockBody.touchedGround = false;

    // Добавляем тело в физический мир
    Matter.World.add(world, blockBody);
    blocks.push(blockBody);

    // Обновляем lastBlock и secondLastBlock
    secondLastBlock = lastBlock;
    lastBlock = blockBody;

    currentBlock = null;
    blockCount++;

    // Увеличиваем горизонтальную скорость с учетом множителя ускорения
    horizontalSpeed *= accelerationMultiplier;

    // Если не достигли максимального количества блоков, создаем новый
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

        // Новое условие: если любой блок касается земли
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
    if (accuracy > 80) {
        message = lang.perfect;
    } else if (accuracy > 60) {
        message = lang.great;
    } else {
        message = lang.okay;
    }

    showAccuracyMessage(message);

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
function showAccuracyMessage(message) {
    let accuracyMessage = document.getElementById('accuracy-message');
    accuracyMessage.innerText = message;
    accuracyMessage.style.display = 'block';

    // Скрываем сообщение через 1 секунду
    setTimeout(() => {
        accuracyMessage.style.display = 'none';
    }, 1000);
}

// Функция для обновления счетчика
function updateScore() {
    const lang = translations[language];
    let scoreElement = document.getElementById('score');
    scoreElement.innerText = lang.score + successfulBlocks;
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

    // Удаляем обработчики событий, чтобы предотвратить ускорение при перезапуске
    Matter.Events.off(engine);
}

// Перезапуск игры
function restartGame() {
    document.getElementById('end-popup').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';
    initGame();
}

// Изменение размера canvas
function resizeCanvas() {
    if (!canvas) return;

    const desiredAspectRatio = 9 / 16; // Соотношение сторон ширина/высота
    const windowAspectRatio = window.innerWidth / window.innerHeight;

    const container = document.getElementById('game-container');

    if (windowAspectRatio > desiredAspectRatio) {
        // Окно шире, чем необходимо – ограничиваем по высоте
        canvas.height = window.innerHeight;
        canvas.width = canvas.height * desiredAspectRatio;
    } else {
        // Окно уже, чем необходимо – ограничиваем по ширине
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / desiredAspectRatio;
    }

    container.style.width = `${canvas.width}px`;
    container.style.height = `${canvas.height}px`;

    // Обновляем параметры рендерера
    if (render) {
        render.options.width = canvas.width;
        render.options.height = canvas.height;
        render.canvas.width = canvas.width;
        render.canvas.height = canvas.height;

        // Обновляем границы камеры
        render.bounds.max.x = canvas.width;
        render.bounds.max.y = canvas.height;
    }
}
