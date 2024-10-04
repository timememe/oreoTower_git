(function() {
    // Глобальные настройки игры
    let language = document.documentElement.getAttribute('lang');
    
    // Глобальные цвета градиента
    let gradientColorStart = 'white';
    let gradientColorEnd = '#0058C9';
    
    // Относительные размеры и позиции
    let baseBlockWidthPercent = 0.5;
    let baseBlockHeightPercent = 0.05;
    let baseBlockYPercent = 0.75;
    let blockWidthPercent = 0.18;
    let blockHeightPercent = 0.02;
    let horizontalMovementYPercent = 0.3;
    
    // Глобальные настройки грида
    const GRID_SPACING = 20;
    const GRID_OBJECT_WIDTH = 120;
    const GRID_OBJECT_HEIGHT = 60;
    
    // Абсолютные размеры (будут вычисляться)
    let baseBlockWidth, baseBlockHeight, baseBlockY;
    let blockWidth, blockHeight, horizontalMovementY;
    
    let initialHorizontalSpeed = 0.005;
    let horizontalSpeed;
    let accelerationMultiplier = 1.1;
    
    // Глобальные переменные для масштабирования текстур
    let baseBlockTextureScaleY = 2;
    let baseBlockTextureOffsetY = 0.2;
    let blockTextureScaleY = 0.2;
    let blockTextureOffsetY = 0.0;
    
    const maxBlocks = 7;
    const baseURL = 'https://cdn.jsdelivr.net/gh/timememe/oreotower_git@main/assets/';
    
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
    let successfulBlocks = 0;
    let gameTimer;
    let timeLeft = 120;

    function sendGameResult(game, result, language) {
        console.log('Sending result:', game, result, language);  // Обновлено для отладки

        const data = {
            game: game,
            result: result,
            language: language // Добавлен параметр языка
        };

        fetch('https://wo-server-v1.onrender.com/game-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => console.log('Game result sent:', data))
        .catch(error => console.error('Error sending game result:', error));
    }

    function getCookie(name) {
        let namePattern = name + "=";
        let cookiesArray = document.cookie.split(';');
        for(let i = 0; i < cookiesArray.length; i++) {
            let cookie = cookiesArray[i].trim();
            if (cookie.indexOf(namePattern) == 0) {
                return cookie.substring(namePattern.length, cookie.length);
            }
        }
        return null;
    }

    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function awardPoints(points) {
        const data = {
            points: points,
            won: true,
            game: 'tower'
        };
        const token = getCookie('jwt_token');
        if (token) {
            fetch('https://api.oreo-promo.com/game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-jwt-auth': token,
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                console.log('Points awarded successfully:', result);
                window.location="/profile";
            })
            .catch(error => {
                console.error('Error awarding points:', error);
                window.location="/profile";
            });
        } else {
            setCookie('guest_game', JSON.stringify(data), 90);
            window.location="#ModalLogin";
        }
    }
    
    // Переводы
    const translations = {
        en: {
            gameTitle: "Oreo Builder",
            tutorialText: "Stack the tower of 7 Oreos and don't let it fall!",
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
            gameTitle: "Oreo Cтроитель",
            tutorialText: "Соберите башню из 7 Oreo и не уроните ее!",
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
        kk: {
            gameTitle: "Oreo Құрылысшы",
            tutorialText: "Oreo-ның 7 блогынан мұнара құрастырыңыз және оны құлатпаңыз!",
            startGame: "Ойынды бастау",
            victory: "Сіз жеңдіңіз!",
            defeat: "Ойын аяқталды",
            restartGame: "Қайта бастау",
            score: "Блоктар: ",
            perfect: "КЕРЕМЕТ!",
            great: "ТАҢҒАЖАЙЫП!",
            okay: "ЖАРАЙДЫ",
            backButtonText: "АРТҚА"
        },
        ka: {
            gameTitle: "Oreo მშენებელი",
            tutorialText: "შექმენით 7 Oreo-სგან კოშკი და არ ჩამოაგდოთ ის!",
            startGame: "თამაშის დაწყება",
            victory: "თქვენ გაიმარჯვეთ!",
            defeat: "თამაში დასრულდა",
            restartGame: "გადატვირთვა",
            score: "ბლოკები: ",
            perfect: "იდეალური!",
            great: "შესანიშნავი!",
            okay: "კარგი",
            backButtonText: "უკან"
        },
        uz: {
            gameTitle: "Oreo Quruvchi",
            tutorialText: "Oreo-dan 7 blokli minorani yig'ing va uni yiqitmaslikka harakat qiling!",
            startGame: "O'yinni boshlash",
            victory: "Siz g'alaba qozondingiz!",
            defeat: "O'yin tugadi",
            restartGame: "Qayta boshlash",
            score: "Bloklar: ",
            perfect: "MUKAMMAL!",
            great: "ZO'R!",
            okay: "YAXSHI",
            backButtonText: "ORQAGA"
        }
    };    
    
    // Изображения
    let images = {};
    
    // Сохраняем исходную функцию рендеринга тел
    const originalRenderBodies = Matter.Render.bodies;
    
    // Переопределяем функцию рендеринга тел
    Matter.Render.bodies = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            bodies = bodies.slice(0);
    
        bodies.sort(function(a, b) {
            return a.blockIndex - b.blockIndex;
        });
    
        originalRenderBodies.call(this, render, bodies, context);
    };
    
    // Предзагрузка изображений
    function preloadImages(callback) {
        const imageUrls = {
            backButton: `${baseURL}back.png`,
            blockTexture: `${baseURL}cookie.png`,
            plateTexture: `${baseURL}plate.png`,
            topBackground: `${baseURL}cookie_bg.png`
        };
    
        const totalImages = Object.keys(imageUrls).length;
        let imagesLoaded = 0;
    
        function onImageLoad() {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log('Все изображения загружены.');
                callback();
            }
        }
    
        function onImageError(imageName) {
            console.error(`Ошибка загрузки изображения: ${imageName}`);
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log('Все изображения обработаны, но с ошибками.');
                callback();
            }
        }
    
        Object.entries(imageUrls).forEach(([imageName, imageUrl]) => {
            images[imageName] = new Image();
            images[imageName].onload = onImageLoad;
            images[imageName].onerror = () => onImageError(imageName);
            images[imageName].src = imageUrl;
        });
    }
    
    // Инициализация игры и событий
    function initGameAndEvents() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
    
        initUI();
        resizeCanvas();
    
        window.addEventListener('resize', resizeCanvas);
        document.getElementById('start-button').addEventListener('click', startGame);
        document.getElementById('restart-button').addEventListener('click', restartGame);
    
        canvas.addEventListener('click', function () {
            dropBlock();
        });
    
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
        document.getElementById('back-button').innerText = lang.backButtonText;
        document.getElementById('end-title').innerText = '';
        document.getElementById('restart-button').innerText = '';
        document.getElementById('end-popup').style.display = 'none';
        document.getElementById('start-popup').style.display = 'flex';
        document.getElementById('game-canvas').style.display = 'none';
    
        // Создание и настройка элементов UI
        createUIElements(lang);
    }
    
    // Создание элементов UI
    function createUIElements(lang) {
        createAccuracyMessage();
        createBottomBar(lang);
        createTopBackground();
    }
    
    // Создание сообщения о точности
    function createAccuracyMessage() {
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
    
    // Создание нижнего бара
    function createBottomBar(lang) {
        let bottomBar = document.getElementById('bottom-bar');
        if (!bottomBar) {
            bottomBar = document.createElement('div');
            bottomBar.id = 'bottom-bar';
            document.getElementById('game-container').appendChild(bottomBar);
    
            bottomBar.style.position = 'absolute';
            bottomBar.style.bottom = '0';
            bottomBar.style.left = '0';
            bottomBar.style.width = '100%';
            bottomBar.style.height = `${GRID_OBJECT_HEIGHT + GRID_SPACING}px`;
            bottomBar.style.display = 'flex';
            bottomBar.style.justifyContent = 'space-around';
            bottomBar.style.alignItems = 'center';
            bottomBar.style.padding = `${GRID_SPACING / 2}px 0`;
    
            createBottomBarButtons(bottomBar, lang);
        }
    }
    
    // Создание кнопок нижнего бара
    function createBottomBarButtons(bottomBar, lang) {
        const buttonStyles = {
            width: `${GRID_OBJECT_WIDTH}px`,
            height: `${GRID_OBJECT_HEIGHT}px`,
            margin: `${GRID_SPACING / 2}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        };
    
        const backButton = createButton('back-button', lang.backButtonText, buttonStyles);
        backButton.style.cursor = 'pointer';
        backButton.addEventListener('click', function() {
            window.location = "/profile";
        });
        bottomBar.appendChild(backButton);
    
        const timer = createButton('timer', '', buttonStyles);
        const timerValue = document.createElement('span');
        timerValue.id = 'timer-value';
        timerValue.innerText = '2:00';
        timer.appendChild(timerValue);
        bottomBar.appendChild(timer);
    
        const scoreDisplay = createButton('score-display', `${lang.score}0`, buttonStyles);
        bottomBar.appendChild(scoreDisplay);
    }
    
    // Создание кнопки
    function createButton(id, text, styles) {
        const button = document.createElement('div');
        button.id = id;
        button.classList.add('bottom-button');
        button.innerText = text;
        Object.assign(button.style, styles);
        return button;
    }
    
    // Создание фонового изображения
    function createTopBackground() {
        let topBackground = document.getElementById('top-background');
        if (!topBackground) {
            topBackground = document.createElement('img');
            topBackground.id = 'top-background';
            topBackground.src = images.topBackground.src;
            topBackground.style.position = 'absolute';
            topBackground.style.top = '0';
            topBackground.style.left = '0';
            topBackground.style.width = '100%';
            topBackground.style.height = 'auto';
            topBackground.style.zIndex = '0';
            document.getElementById('game-container').appendChild(topBackground);
        }
    }
    
    // Запуск таймера
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
    
    // Начало игры
    function startGame() {
        document.getElementById('start-popup').style.display = 'none';
        document.getElementById('game-canvas').style.display = 'block';
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
    
    // Инициализация игры
    function initGame() {
        isGameOver = false;
        blockCount = 0;
        successfulBlocks = 0;
        blocks = [];
    
        calculateSizes();
        horizontalSpeed = initialHorizontalSpeed * canvas.width;
    
        setupPhysics();
        createBaseBlock();
        createNewBlock();
    
        Matter.Runner.run(engine);
        Matter.Render.run(render);
    
        setupEventListeners();
    }
    
    // Настройка физики
    function setupPhysics() {
        engine = Matter.Engine.create();
        world = engine.world;
    
        render = Matter.Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: canvas.width,
                height: canvas.height,
                wireframes: false,
                background: 'transparent'
            }
        });
    
        Matter.Events.on(render, 'beforeRender', renderBackground);
    
        ground = Matter.Bodies.rectangle(canvas.width / 2, canvas.height + 50, canvas.width, 100, { isStatic: true });
        Matter.World.add(world, ground);
    }
    
    // Отрисовка фона
    function renderBackground() {
        var context = render.context;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;
    
        context.clearRect(0, 0, canvasWidth, canvasHeight);
    
        if (images.topBackground.complete) {
            let imgWidth = canvasWidth;
            let imgHeight = images.topBackground.height * (canvasWidth / images.topBackground.width);
            context.drawImage(images.topBackground, 0, 0, imgWidth, imgHeight);
        }
    
        var gradient = context.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, canvasWidth / 1.2
        );
        gradient.addColorStop(0, gradientColorStart);
        gradient.addColorStop(1, gradientColorEnd);
    
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // Создание базового блока
    function createBaseBlock() {
        let baseBlock = Matter.Bodies.rectangle(
            canvas.width / 2,
            baseBlockY,
            baseBlockWidth,
            baseBlockHeight,
            {
                isStatic: true,
                render: {
                    sprite: {
                        texture: images.plateTexture.src,
                        xScale: baseBlockWidth / images.plateTexture.width,
                        yScale: (baseBlockHeight / images.plateTexture.height) * baseBlockTextureScaleY,
                        yOffset: baseBlockTextureOffsetY
                    }
                }
            }
        );
        baseBlock.blockIndex = -1;
        Matter.World.add(world, baseBlock);
        blocks.push(baseBlock);
        lastBlock = baseBlock;
        secondLastBlock = null;
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        Matter.Events.on(engine, 'beforeUpdate', updateCurrentBlock);
        Matter.Events.on(render, 'afterRender', renderCurrentBlock);
        Matter.Events.on(engine, 'afterUpdate', checkGameOver);
        Matter.Events.on(engine, 'collisionStart', handleCollisionStart);
        Matter.Events.on(engine, 'collisionEnd', handleCollisionEnd);
    }

    // Вычисление размеров
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

    // Обновление текущего блока
    function updateCurrentBlock() {
        if (currentBlock && !currentBlock.isFalling) {
            currentBlock.x += currentBlock.vx;
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
            let textureHeight = images.blockTexture.height * blockTextureScaleY;
            let textureX = currentBlock.x;
            let textureY = currentBlock.y + currentBlock.height - textureHeight + blockTextureOffsetY * currentBlock.height;

            if (images.blockTexture.complete) {
                context.drawImage(images.blockTexture, textureX, textureY, textureWidth, textureHeight);
            } else {
                context.fillStyle = '#8B4513';
                context.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);
            }
            context.restore();
        }
    }

    // Падение блока
    function dropBlock() {
        if (!currentBlock || currentBlock.isFalling) return;

        currentBlock.isFalling = true;

        let textureScaleX = currentBlock.width / images.blockTexture.width;
        let textureScaleY = blockTextureScaleY;

        let blockBody = Matter.Bodies.rectangle(
            currentBlock.x + currentBlock.width / 2,
            currentBlock.y + currentBlock.height / 2,
            currentBlock.width,
            currentBlock.height,
            {
                render: {
                    sprite: {
                        texture: images.blockTexture.src,
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

    // Обработка начала столкновений
    function handleCollisionStart(event) {
        var pairs = event.pairs;

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];

            if ((pair.bodyA === lastBlock && pair.bodyB === secondLastBlock) ||
                (pair.bodyB === lastBlock && pair.bodyA === secondLastBlock)) {
                lastBlock.hasLanded = true;
                calculateAccuracy();
            }

            if ((pair.bodyA === lastBlock && pair.bodyB === ground) ||
                (pair.bodyB === lastBlock && pair.bodyA === ground)) {
                lastBlock.touchedGround = true;
            }

            if ((blocks.includes(pair.bodyA) && pair.bodyB === ground) ||
                (blocks.includes(pair.bodyB) && pair.bodyA === ground)) {
                let body = blocks.includes(pair.bodyA) ? pair.bodyA : pair.bodyB;
                if (body.blockIndex >= 0) {
                    body.touchedGround = true;
                }
            }
        }
    }

    // Обработка окончания столкновений
    function handleCollisionEnd(event) {
        var pairs = event.pairs;

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];

            if ((pair.bodyA === lastBlock && pair.bodyB === secondLastBlock) ||
                (pair.bodyB === lastBlock && pair.bodyA === secondLastBlock)) {
                lastBlock.hasLanded = false;
            }
        }
    }

    // Вычисление точности
    function calculateAccuracy() {
        const lang = translations[language];
        let overlap = calculateOverlap(lastBlock, secondLastBlock);
        let accuracy = (overlap / blockWidth) * 100;

        let message = '';
        let color = '#ffffff';
        if (accuracy > 80) {
            message = lang.perfect;
        } else if (accuracy > 60) {
            message = lang.great;
        } else {
            message = lang.okay;
        }

        showAccuracyMessage(message, color);

        successfulBlocks++;
        updateScore();
    }

    // Вычисление перекрытия между блоками
    function calculateOverlap(blockA, blockB) {
        let leftA = blockA.position.x - blockWidth / 2;
        let rightA = blockA.position.x + blockWidth / 2;
        let leftB = blockB.position.x - blockWidth / 2;
        let rightB = blockB.position.x + blockWidth / 2;

        let overlap = Math.max(0, Math.min(rightA, rightB) - Math.max(leftA, leftB));
        return overlap;
    }

    // Отображение сообщения о точности
    function showAccuracyMessage(message, color) {
        let accuracyMessage = document.getElementById('accuracy-message');
        accuracyMessage.innerText = message;
        accuracyMessage.style.color = color;
        accuracyMessage.style.display = 'block';

        setTimeout(() => {
            accuracyMessage.style.display = 'none';
        }, 1000);
    }

    // Обновление счета
    function updateScore() {
        const lang = translations[language];
        let scoreDisplay = document.getElementById('score-display');
        scoreDisplay.innerText = `${lang.score}${successfulBlocks}`;
    }

    // Проверка завершения игры
    function checkGameOver() {
        for (let body of blocks) {
            if (body.position.y > canvas.height + 100) {
                endGame(false);
                sendGameResult('game1', 'loss', language);
                return;
            }
        }

        for (let body of blocks) {
            if (body.touchedGround && body.blockIndex >= 0 && !body.hasLanded) {
                endGame(false);
                sendGameResult('game1', 'loss', language);
                return;
            }
        }

        if (blockCount >= maxBlocks && !currentBlock) {
            endGame(true);
            awardPoints(1);
            sendGameResult('game1', 'win', language);
        }
    }

    // Завершение игры
    function endGame(victory) {
        isGameOver = true;
        const lang = translations[language];
        document.getElementById('end-title').innerText = victory ? lang.victory : lang.defeat;
        document.getElementById('restart-button').innerText = lang.restartGame;
        document.getElementById('end-popup').style.display = 'flex';
        document.getElementById('game-canvas').style.display = 'none';

        Matter.Events.off(engine);
        clearInterval(gameTimer);
        Matter.Render.stop(render);
        Matter.Engine.clear(engine);
    }

    // Перезапуск игры
    function restartGame() {
        clearInterval(gameTimer);
        document.getElementById('end-popup').style.display = 'none';
        document.getElementById('game-canvas').style.display = 'block';
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

        calculateSizes();

        if (render) {
            render.options.width = canvas.width;
            render.options.height = canvas.height;
            render.canvas.width = canvas.width;
            render.canvas.height = canvas.height;
            render.bounds.max.x = canvas.width;
            render.bounds.max.y = canvas.height;

            updateBlocksSize();
        }

        horizontalSpeed = initialHorizontalSpeed * canvas.width;
    }

    // Обновление размеров блоков
    function updateBlocksSize() {
        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i];
            let previousWidth = block.bounds.max.x - block.bounds.min.x;
            let previousHeight = block.bounds.max.y - block.bounds.min.y;

            if (block.blockIndex === -1) {
                Matter.Body.setPosition(block, {
                    x: canvas.width / 2,
                    y: baseBlockY
                });
                let scaleX = baseBlockWidth / previousWidth;
                let scaleY = baseBlockHeight / previousHeight;
                Matter.Body.scale(block, scaleX, scaleY);

                block.render.sprite.xScale = baseBlockWidth / images.plateTexture.width;
                block.render.sprite.yScale = (baseBlockHeight / images.plateTexture.height) * baseBlockTextureScaleY;
                block.render.sprite.yOffset = 0.0;
            } else {
                let scaleX = blockWidth / previousWidth;
                let scaleY = blockHeight / previousHeight;
                Matter.Body.scale(block, scaleX, scaleY);

                block.render.sprite.xScale = blockWidth / images.blockTexture.width;
                block.render.sprite.yScale = blockTextureScaleY;
                block.render.sprite.yOffset = blockTextureOffsetY;
            }
        }
    }

    // Запуск игры
    document.addEventListener('DOMContentLoaded', () => {
        preloadImages(() => {
            initGameAndEvents();
        });
    });

})();