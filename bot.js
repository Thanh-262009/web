const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

class MinecraftBotManager {
    constructor() {
        this.bots = new Map();
        this.serverConfig = {
            host: 'shinsmp.asaka.asia', // Địa chỉ server
            port: 25565,       // Port server
            version: '1.21'  // Phiên bản Minecraft
        };
        this.botCount = 0;
    }

    // Cấu hình server
    setServerConfig(host, port = 25565, version = '1.21') {
        this.serverConfig = { host, port, version };
        console.log(`Server config updated: ${host}:${port} (${version})`);
    }

    // Tạo một bot mới
    createBot(username, password = null) {
        const botConfig = {
            host: this.serverConfig.host,
            port: this.serverConfig.port,
            username: username,
            version: this.serverConfig.version
        };

        // Thêm mật khẩu nếu có (cho premium account)
        if (password) {
            botConfig.password = password;
        }

        const bot = mineflayer.createBot(botConfig);
        
        // Load pathfinder plugin
        bot.loadPlugin(pathfinder);

        // Setup bot events
        this.setupBotEvents(bot, username);
        
        this.bots.set(username, bot);
        this.botCount++;
        
        return bot;
    }

    // Thiết lập events cho bot
    setupBotEvents(bot, username) {
        bot.on('login', () => {
            console.log(`✅ Bot ${username} đã kết nối thành công!`);
            
            // Thiết lập pathfinder
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            bot.pathfinder.setMovements(defaultMove);
        });

        bot.on('spawn', () => {
            console.log(`🎮 Bot ${username} đã spawn vào game`);
        });

        bot.on('chat', (username_chat, message) => {
            if (username_chat !== bot.username) {
                console.log(`💬 [${username}] ${username_chat}: ${message}`);
                
                // Bot response to commands
                this.handleChatCommands(bot, username_chat, message);
            }
        });

        bot.on('error', (err) => {
            console.error(`❌ Bot ${username} lỗi:`, err.message);
        });

        bot.on('kicked', (reason) => {
            console.log(`⚠️ Bot ${username} bị kick: ${reason}`);
        });

        bot.on('end', () => {
            console.log(`🔌 Bot ${username} đã ngắt kết nối`);
        });
    }

    // Xử lý lệnh chat
    handleChatCommands(bot, sender, message) {
        const args = message.toLowerCase().split(' ');
        const command = args[0];

        switch (command) {
            case '!follow':
                if (args[1] === bot.username) {
                    this.followPlayer(bot, sender);
                }
                break;
            
            case '!stop':
                if (args[1] === bot.username) {
                    bot.pathfinder.setGoal(null);
                    bot.chat(`${sender}, tôi đã dừng lại!`);
                }
                break;

            case '!come':
                if (args[1] === bot.username) {
                    this.comeToPlayer(bot, sender);
                }
                break;

            case '!say':
                if (args[1] === bot.username && args.length > 2) {
                    const text = args.slice(2).join(' ');
                    bot.chat(text);
                }
                break;
        }
    }

    // Bot follow player
    followPlayer(bot, playerName) {
        const player = bot.players[playerName];
        if (player && player.entity) {
            bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, 2));
            bot.chat(`Đang theo dõi ${playerName}!`);
        }
    }

    // Bot đến chỗ player
    comeToPlayer(bot, playerName) {
        const player = bot.players[playerName];
        if (player && player.entity) {
            const goal = new goals.GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 1);
            bot.pathfinder.setGoal(goal);
            bot.chat(`Đang đến chỗ ${playerName}!`);
        }
    }

    // Tạo nhiều bot cùng lúc
    createMultipleBots(count, prefix = 'Bot') {
        console.log(`🚀 Đang tạo ${count} bot...`);
        
        for (let i = 1; i <= count; i++) {
            const username = `${prefix}${i}`;
            
            // Delay để tránh spam server
            setTimeout(() => {
                this.createBot(username);
            }, i * 5000); // Delay 5 giây giữa mỗi bot
        }
    }

    // Gửi lệnh cho tất cả bot
    sendCommandToAllBots(command) {
        this.bots.forEach((bot, username) => {
            if (bot.entity) {
                bot.chat(command);
                console.log(`📤 Sent to ${username}: ${command}`);
            }
        });
    }

    // Gửi lệnh cho bot cụ thể
    sendCommandToBot(username, command) {
        const bot = this.bots.get(username);
        if (bot && bot.entity) {
            bot.chat(command);
            console.log(`📤 Sent to ${username}: ${command}`);
        } else {
            console.log(`❌ Bot ${username} không tồn tại hoặc chưa kết nối`);
        }
    }

    // Disconnect một bot
    disconnectBot(username) {
        const bot = this.bots.get(username);
        if (bot) {
            bot.quit();
            this.bots.delete(username);
            this.botCount--;
            console.log(`🔌 Bot ${username} đã ngắt kết nối`);
        }
    }

    // Disconnect tất cả bot
    disconnectAllBots() {
        console.log('🔌 Đang ngắt kết nối tất cả bot...');
        this.bots.forEach((bot, username) => {
            bot.quit();
            console.log(`🔌 Bot ${username} đã ngắt kết nối`);
        });
        this.bots.clear();
        this.botCount = 0;
    }

    // Lấy danh sách bot
    listBots() {
        console.log(`📋 Danh sách bot (${this.botCount}):`);
        this.bots.forEach((bot, username) => {
            const status = bot.entity ? '🟢 Online' : '🔴 Offline';
            console.log(`  - ${username}: ${status}`);
        });
    }

    // Bot tự động farm/mine
    startAutoFarm(username) {
        const bot = this.bots.get(username);
        if (!bot || !bot.entity) return;

        // Tìm và farm wheat
        const wheat = bot.findBlock({
            matching: (block) => block.name === 'wheat' && block.metadata === 7
        });

        if (wheat) {
            bot.pathfinder.setGoal(new goals.GoalBlock(wheat.position.x, wheat.position.y, wheat.position.z));
        }
    }
}

// Sử dụng
const botManager = new MinecraftBotManager();

// Cấu hình server
botManager.setServerConfig('shinsmp.asaka.asia', 25565, '1.21');

// Tạo 50 bot cùng lúc
botManager.createMultipleBots(50, 'Worker');

// Hoặc tạo bot riêng lẻ
// botManager.createBot('CustomBot1');
// botManager.createBot('PremiumBot', 'password123'); // Bot premium

// Commands từ console
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
        const input = chunk.trim().split(' ');
        const command = input[0];

        switch (command) {
            case 'list':
                botManager.listBots();
                break;
            
            case 'create':
                if (input[1]) {
                    botManager.createBot(input[1]);
                }
                break;
            
            case 'disconnect':
                if (input[1] === 'all') {
                    botManager.disconnectAllBots();
                } else if (input[1]) {
                    botManager.disconnectBot(input[1]);
                }
                break;
            
            case 'say':
                if (input.length > 1) {
                    const message = input.slice(1).join(' ');
                    botManager.sendCommandToAllBots(message);
                }
                break;
            
            case 'multiple':
                if (input[1] && input[2]) {
                    botManager.createMultipleBots(parseInt(input[1]), input[2]);
                }
                break;
            
            case 'help':
                console.log(`
📋 Các lệnh có sẵn:
- list: Xem danh sách bot
- create <tên>: Tạo bot mới
- disconnect <tên|all>: Ngắt kết nối bot
- say <tin nhắn>: Gửi tin nhắn cho tất cả bot
- multiple <số lượng> <prefix>: Tạo nhiều bot cùng lúc
- help: Hiển thị trợ giúp
                `);
                break;
        }
    }
});

console.log(`
🤖 Minecraft Multi-Bot Manager
Nhập 'help' để xem các lệnh có sẵn
Server: ${botManager.serverConfig.host}:${botManager.serverConfig.port}
`);

module.exports = MinecraftBotManager;
