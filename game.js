const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeDisplay = document.getElementById('time');

// 地板颜色和位置
const groundColor = 'brown';
let groundHeight = 50;

// 玩家图像
const playerImg = new Image();
playerImg.src = 'player.png';

// 敌人图像
const enemyImg = new Image();
enemyImg.src = 'enemy.png';

const player = {
    x: 400,
    y: 0,
    width: 50,
    height: 50,
    baseSpeed: 4, // 基础移动速度
    speed: 4, // 实际移动速度
    speedGrowthRate: 0.10, // 速度增长率
    isJumping: false,
    jumpSpeed: 0,
    gravity: 0.5,
    jumpHeight: -12, // 增加跳跃高度
    ground: 0,
    lastDirection: 'right'
};

const bullets = [];
const enemies = [];
let bulletSpeed = 14; // 子弹速度翻倍
let enemySpeed = 2; // 敌人基础速度翻倍
let enemySpawnInterval = 1000; // 初始刷新速度翻倍
let gameOver = false;
let startTime = Date.now();

let platform = null; // 平台对象
let platformFlashInterval = null; // 平台闪烁的定时器
let platformTimeout = null; // 平台存在时间的定时器

document.addEventListener('keydown', movePlayer);
document.addEventListener('keyup', stopPlayer);
document.addEventListener('keydown', shootBullet);

// 调整Canvas大小以填满屏幕
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundHeight = canvas.height * 0.1; // 地板高度为屏幕高度的10%
    player.ground = canvas.height - groundHeight - player.height;
    player.y = player.ground;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let keys = {};

function movePlayer(e) {
    keys[e.key] = true;
    if (e.key === 'ArrowUp' && !player.isJumping) {
        player.isJumping = true;
        player.jumpSpeed = player.jumpHeight;
    } else if (e.key === 'ArrowLeft') {
        player.lastDirection = 'left';
    } else if (e.key === 'ArrowRight') {
        player.lastDirection = 'right';
    }
}

function stopPlayer(e) {
    keys[e.key] = false;
}

function shootBullet(e) {
    if (e.key === ' ') {
        bullets.push({
            x: player.lastDirection === 'left' ? player.x : player.x + player.width,
            y: player.y + player.height / 2 - 2.5, // 调整子弹位置使其居中
            width: 10, // 增大子弹大小
            height: 5, // 增大子弹大小
            color: 'red',
            direction: player.lastDirection
        });
    }
}

function spawnEnemy() {
    const spawnFromTop = Math.random() < 0.5;
    let x, y, direction;

    if (spawnFromTop) {
        x = Math.random() * (canvas.width - 50); // 保持敌人的宽度
        y = 0;
        direction = 'down';
    } else {
        x = Math.random() < 0.5 ? 0 : canvas.width - 50; // 保持敌人的宽度
        y = player.ground;
        direction = x === 0 ? 'right' : 'left';
    }

    enemies.push({
        x: x,
        y: y,
        width: 50, // 保持宽度
        height: 50, // 保持高度
        speed: enemySpeed,
        direction: direction,
        lastDirection: 'right' // 初始朝向右边
    });
}

function update() {
    // 更新游玩时间
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    timeDisplay.textContent = `Time: ${elapsedTime}s`;

    // 增加玩家移动速度
    player.speed = player.baseSpeed + elapsedTime * player.speedGrowthRate;

    // 随着时间增加敌人的速度和生成速度翻倍
    enemySpeed = 2 * (1 + elapsedTime * 0.2); // 基础速度翻倍
    bulletSpeed = 14 ; // 基础速度翻倍
    enemySpawnInterval = Math.max(500, 1000 - elapsedTime * 100);

    // 玩家移动
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    // 玩家跳跃和重力
    if (player.isJumping) {
        player.y += player.jumpSpeed;
        player.jumpSpeed += player.gravity;
        if (player.y >= player.ground) {
            player.y = player.ground;
            player.isJumping = false;
        }
    }

    // 子弹移动
    bullets.forEach((bullet, index) => {
        if (bullet.direction === 'right') {
            bullet.x += bulletSpeed;
        } else {
            bullet.x -= bulletSpeed;
        }
        if (bullet.x < 0 || bullet.x > canvas.width) {
            bullets.splice(index, 1);
        }
    });

    // 敌人移动和碰撞检测
    enemies.forEach((enemy, index) => {
        if (enemy.direction === 'down') {
            // 敌人掉下来
            enemy.y += enemy.speed;

            // 到达地板时改变方向
            if (enemy.y >= player.ground) {
                enemy.y = player.ground;
                enemy.direction = enemy.x < canvas.width / 2 ? 'right' : 'left';
            }
        } else {
            // 敌人水平移动
            if (enemy.direction === 'right') {
                enemy.x += enemy.speed;
                enemy.lastDirection = 'right';
            } else {
                enemy.x -= enemy.speed;
                enemy.lastDirection = 'left';
            }
        }

        // 检测敌人是否碰到玩家
        const collisionBuffer = 10;  // 调整这个值来增加碰撞缓冲区
        if (enemy.x + collisionBuffer < player.x + player.width &&
            enemy.x + enemy.width - collisionBuffer > player.x &&
            enemy.y + collisionBuffer < player.y + player.height &&
            enemy.y + enemy.height - collisionBuffer > player.y) {
            gameOver = true;
        }

        // 检测子弹是否击中敌人
        bullets.forEach((bullet, bIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                bullets.splice(bIndex, 1);
                enemies.splice(index, 1);
            }
        });

        // 移除掉出屏幕外的敌人
        if (enemy.y > canvas.height || enemy.x < -50 || enemy.x > canvas.width + 50) {
            enemies.splice(index, 1);
        }
    });

    // 平台存在时的碰撞检测
    if (platform) {
        // 玩家碰撞检测
        if (player.y + player.height <= platform.y &&
            player.y + player.height + player.jumpSpeed >= platform.y &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width) {
            player.y = platform.y - player.height;
            player.isJumping = false;
        }

        // 敌人碰撞检测
        enemies.forEach(enemy => {
            if (enemy.y + enemy.height <= platform.y &&
                enemy.y + enemy.height + enemy.speed >= platform.y &&
                enemy.x + enemy.width > platform.x &&
                enemy.x < platform.x + platform.width) {
                enemy.y = platform.y - enemy.height;
                enemy.direction = enemy.x < player.x ? 'right' : 'left';
            }
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制地板
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

    // 绘制玩家
    if (player.lastDirection === 'right') {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(playerImg, -player.x - player.width, player.y, player.width, player.height);
        ctx.restore();
    }

    // 绘制子弹
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // 绘制敌人
    enemies.forEach(enemy => {
        if (enemy.lastDirection === 'right') {
            ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(enemyImg, -enemy.x - enemy.width, enemy.y, enemy.width, enemy.height);
            ctx.restore();
        }
    });

    // 绘制平台
    if (platform) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '48px sans-serif';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    }
}

function gameLoop() {
    if (!gameOver) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// 每隔一段时间生成一个敌人
function startSpawningEnemies() {
    setInterval(spawnEnemy, enemySpawnInterval);
}

// 每隔随机时间刷新一个平台
function startSpawningPlatforms() {
    function spawnPlatform() {
        if (platformFlashInterval) {
            clearInterval(platformFlashInterval);
        }
        if (platformTimeout) {
            clearTimeout(platformTimeout);
        }
        platform = {
            x: Math.random() * (canvas.width - 100),
            y: 550, // 固定平台高度
            width: 100,
            height: 10,
            color: 'yellow',
        };

        platformTimeout = setTimeout(() => {
            // 平台最后三秒闪烁
            let flashCount = 0;
            platformFlashInterval = setInterval(() => {
                platform.color = flashCount % 2 === 0 ? 'yellow' : 'transparent';
                flashCount++;
                if (flashCount >= 6) { // 最后三秒闪烁
                    clearInterval(platformFlashInterval);
                    // 平台消失后玩家掉到地面
                    if (player.y + player.height <= platform.y) {
                        player.isJumping = true;
                        player.jumpSpeed = player.gravity;
                    }
                    platform = null;
                    // 生成新平台
                    setTimeout(spawnPlatform, Math.random() * 25000 + 5000);
                }
            }, 500);
        }, 7000); // 7秒后开始闪烁，10秒后消失
    }

    // 开始生成第一个平台
    setTimeout(spawnPlatform, Math.random() * 25000 + 5000);
}

startSpawningEnemies();
startSpawningPlatforms();
gameLoop();