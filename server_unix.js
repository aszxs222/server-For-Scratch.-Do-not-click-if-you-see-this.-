// server_unix.js - macOS 和 Linux 专用服务器
const http = require('http');
const os = require('os');
const { execSync, spawn } = require('child_process');

const PORT = 29275;

console.log('🚀 启动 macOS/Linux 硬件检测服务器...');

// 获取 macOS/Linux 系统版本
function getUnixSystemInfo() {
    const platform = os.platform();
    const release = os.release();
    
    try {
        if (platform === 'darwin') {
            // macOS
            try {
                const swVers = execSync('sw_vers', { encoding: 'utf8' });
                const lines = swVers.split('\n');
                let productName = 'macOS';
                let version = '';
                
                lines.forEach(line => {
                    if (line.includes('ProductName:')) {
                        productName = line.split(':')[1].trim();
                    } else if (line.includes('ProductVersion:')) {
                        version = line.split(':')[1].trim();
                    }
                });
                
                return {
                    platform: productName + (version ? ' ' + version : ''),
                    distro: productName,
                    version: version,
                    kernel: release
                };
            } catch (e) {
                // 备选方案
                const major = parseInt(release.split('.')[0]) || 0;
                let versionName = 'macOS';
                if (major >= 20) versionName = 'macOS Big Sur or later';
                else if (major >= 19) versionName = 'macOS Catalina';
                else if (major >= 18) versionName = 'macOS Mojave';
                
                return {
                    platform: versionName,
                    distro: 'macOS',
                    version: release,
                    kernel: 'Darwin'
                };
            }
            
        } else if (platform === 'linux') {
            // Linux
            try {
                // 尝试读取 /etc/os-release
                const osRelease = execSync('cat /etc/os-release 2>/dev/null || echo ""', { encoding: 'utf8' });
                let prettyName = 'Linux';
                let version = '';
                
                const lines = osRelease.split('\n');
                lines.forEach(line => {
                    if (line.startsWith('PRETTY_NAME=')) {
                        prettyName = line.split('=')[1].replace(/"/g, '').trim();
                    } else if (line.startsWith('VERSION=')) {
                        version = line.split('=')[1].replace(/"/g, '').trim();
                    }
                });
                
                // 获取 Linux 发行版名称
                let distro = 'Linux';
                if (prettyName.includes('Ubuntu')) distro = 'Ubuntu';
                else if (prettyName.includes('Debian')) distro = 'Debian';
                else if (prettyName.includes('Fedora')) distro = 'Fedora';
                else if (prettyName.includes('CentOS')) distro = 'CentOS';
                else if (prettyName.includes('Arch')) distro = 'Arch Linux';
                else if (prettyName.includes('Manjaro')) distro = 'Manjaro';
                
                return {
                    platform: prettyName || 'Linux',
                    distro: distro,
                    version: version || release,
                    kernel: release
                };
                
            } catch (e) {
                // 备选方案
                return {
                    platform: 'Linux',
                    distro: 'Linux',
                    version: release,
                    kernel: release
                };
            }
        }
        
    } catch (error) {
        console.log('获取系统信息失败:', error.message);
    }
    
    // 默认返回
    return {
        platform: platform === 'darwin' ? 'macOS' : 'Linux',
        distro: platform === 'darwin' ? 'macOS' : 'Linux',
        version: release,
        kernel: release
    };
}

// 获取 Unix 系统显卡信息
function getUnixGraphics() {
    const platform = os.platform();
    const gpus = [];
    
    try {
        if (platform === 'darwin') {
            // macOS 显卡检测
            try {
                // 方法1: 使用 system_profiler
                const graphicsInfo = execSync('system_profiler SPDisplaysDataType 2>/dev/null | grep -A 5 "Chipset Model"', { 
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                });
                
                const lines = graphicsInfo.split('\n');
                let currentGPU = null;
                
                lines.forEach(line => {
                    if (line.includes('Chipset Model:')) {
                        if (currentGPU) {
                            gpus.push(currentGPU);
                        }
                        const model = line.split(':')[1].trim();
                        currentGPU = {
                            model: model,
                            vram: 'Shared Memory',
                            vendor: model.includes('Intel') ? 'Intel' : 
                                   model.includes('AMD') ? 'AMD' : 
                                   model.includes('NVIDIA') ? 'NVIDIA' : 'Apple',
                            index: gpus.length,
                            isMain: gpus.length === 0
                        };
                    } else if (currentGPU && line.includes('VRAM')) {
                        const vramMatch = line.match(/VRAM.*?(\d+)/);
                        if (vramMatch) {
                            currentGPU.vram = vramMatch[1] + ' MB';
                        }
                    }
                });
                
                if (currentGPU) {
                    gpus.push(currentGPU);
                }
                
            } catch (e) {
                console.log('macOS 显卡检测失败:', e.message);
            }
            
        } else if (platform === 'linux') {
            // Linux 显卡检测
            try {
                // 方法1: 使用 lspci
                const lspciOutput = execSync('lspci 2>/dev/null | grep -i vga', { 
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                });
                
                const gpuLines = lspciOutput.split('\n').filter(line => line.trim());
                
                gpuLines.forEach((line, index) => {
                    const model = line.split(':')[2]?.trim() || 'Graphics Controller';
                    let vendor = 'Unknown';
                    if (model.includes('NVIDIA')) vendor = 'NVIDIA';
                    else if (model.includes('AMD')) vendor = 'AMD';
                    else if (model.includes('Intel')) vendor = 'Intel';
                    
                    gpus.push({
                        model: model,
                        vram: 'Unknown',
                        vendor: vendor,
                        index: index,
                        isMain: index === 0
                    });
                });
                
            } catch (e) {
                console.log('Linux 显卡检测失败:', e.message);
            }
        }
        
    } catch (error) {
        console.log('获取显卡信息失败:', error.message);
    }
    
    // 如果没检测到显卡，添加默认值
    if (gpus.length === 0) {
        gpus.push({
            model: platform === 'darwin' ? 'Apple Integrated Graphics' : 'Linux Graphics',
            vram: 'System Shared',
            vendor: platform === 'darwin' ? 'Apple' : 'Unknown',
            index: 0,
            isMain: true
        });
    }
    
    console.log(`检测到 ${gpus.length} 块显卡`);
    return gpus;
}

// 获取完整的硬件信息
function getHardwareInfo() {
    try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const graphics = getUnixGraphics();
        const systemInfo = getUnixSystemInfo();
        const platform = os.platform();
        
        // 处理 CPU 品牌
        let cpuBrand = cpus[0] ? cpus[0].model : 'Unknown CPU';
        cpuBrand = cpuBrand
            .replace('(R)', '®')
            .replace('(TM)', '™')
            .replace('CPU', '')
            .replace('  ', ' ')
            .trim();
        
        // 根据平台设置友好名称
        let platformName = systemInfo.platform;
        let archName = os.arch();
        if (archName === 'x64') archName = '64-bit';
        else if (archName === 'arm64') archName = 'ARM64';
        
        return {
            success: true,
            timestamp: new Date().toISOString(),
            platform: platform,
            data: {
                // CPU 信息
                cpu: {
                    brand: cpuBrand,
                    cores: cpus.length,
                    speed: cpus[0] ? (cpus[0].speed / 1000).toFixed(2) + ' GHz' : 'Unknown',
                    manufacturer: cpuBrand.includes('Intel') ? 'Intel' : 
                                  cpuBrand.includes('AMD') ? 'AMD' : 
                                  cpuBrand.includes('Apple') ? 'Apple' : 'Unknown',
                    model: cpuBrand
                },
                
                // 显卡信息
                graphics: graphics,
                
                // 系统信息 - Unix 优化
                system: {
                    platform: platformName,
                    arch: archName,
                    memory: Math.round(totalMem / (1024 ** 3)) + ' GB',
                    hostname: os.hostname(),
                    version: systemInfo.version,
                    distro: systemInfo.distro,
                    kernel: systemInfo.kernel
                },
                
                // Unix 特定信息
                unix: {
                    platform: platform === 'darwin' ? 'macOS' : 'Linux',
                    distro: systemInfo.distro,
                    version: systemInfo.version,
                    kernel: systemInfo.kernel,
                    uptime: Math.floor(os.uptime() / 3600) + ' hours',
                    load: os.loadavg()
                },
                
                // 内存信息
                memory: {
                    total: Math.round(totalMem / (1024 ** 3)) + ' GB',
                    free: Math.round(os.freemem() / (1024 ** 3)) + ' GB',
                    used: Math.round((totalMem - os.freemem()) / (1024 ** 3)) + ' GB',
                    usage: Math.round((1 - os.freemem() / totalMem) * 100) + '%'
                }
            }
        };
        
    } catch (error) {
        console.error('生成硬件信息失败:', error);
        
        // 安全回退
        const platform = os.platform();
        return {
            success: true,
            fallback: true,
            timestamp: new Date().toISOString(),
            data: {
                cpu: {
                    brand: platform === 'darwin' ? 'Apple Silicon / Intel' : 'CPU',
                    cores: os.cpus().length,
                    speed: 'Unknown GHz',
                    manufacturer: 'Unknown',
                    model: 'Processor'
                },
                graphics: [
                    {
                        model: platform === 'darwin' ? 'Apple Graphics' : 'Linux Graphics',
                        vram: 'System Shared',
                        vendor: platform === 'darwin' ? 'Apple' : 'Unknown',
                        index: 0,
                        isMain: true
                    }
                ],
                system: {
                    platform: platform === 'darwin' ? 'macOS' : 'Linux',
                    arch: os.arch(),
                    memory: Math.round(os.totalmem() / (1024 ** 3)) + ' GB',
                    hostname: os.hostname()
                }
            }
        };
    }
}

// 创建服务器
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    const url = req.url;
    const platform = os.platform();
    
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${url}`);
    
    if (url === '/api/hardware' && req.method === 'GET') {
        const info = getHardwareInfo();
        res.writeHead(200);
        res.end(JSON.stringify(info, null, 2));
        
    } else if (url === '/api/unix' && req.method === 'GET') {
        // Unix 专用接口
        const info = getHardwareInfo();
        res.writeHead(200);
        res.end(JSON.stringify({
            unix: true,
            platform: platform,
            details: info.data.unix,
            graphics: info.data.graphics,
            cpu: info.data.cpu,
            system: info.data.system
        }, null, 2));
        
    } else if (url === '/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'running',
            server: 'Unix Hardware Server',
            platform: platform === 'darwin' ? 'macOS' : 'Linux',
            timestamp: new Date().toISOString(),
            node: process.version
        }));
        
    } else if (url === '/platform' && req.method === 'GET') {
        // 平台信息
        const systemInfo = getUnixSystemInfo();
        res.writeHead(200);
        res.end(JSON.stringify({
            platform: os.platform(),
            platformNice: systemInfo.platform,
            release: os.release(),
            arch: os.arch(),
            distro: systemInfo.distro,
            version: systemInfo.version,
            kernel: systemInfo.kernel
        }, null, 2));
        
    } else {
        res.writeHead(200);
        res.end(JSON.stringify({
            server: 'Unix Hardware Server',
            platform: os.platform() === 'darwin' ? 'macOS' : 'Linux',
            endpoints: [
                '/api/hardware - Complete hardware info',
                '/api/unix - Unix specific info',
                '/platform - Platform info',
                '/health - Health check'
            ],
            note: 'Optimized for macOS and Linux',
            timestamp: new Date().toISOString()
        }));
    }
});

// 启动服务器
server.listen(PORT, '127.0.0.1', () => {
    const platform = os.platform();
    const systemInfo = getUnixSystemInfo();
    
    console.log('='.repeat(70));
    console.log('✅ Unix 硬件服务器启动成功！');
    console.log('='.repeat(70));
    console.log('💻 平台:', platform === 'darwin' ? '🍎 macOS' : '🐧 Linux');
    console.log('📱 系统:', systemInfo.platform);
    console.log('🏗️  架构:', os.arch());
    console.log('='.repeat(70));
    console.log(`📡 主接口: http://127.0.0.1:${PORT}/api/hardware`);
    console.log(`🍎 Unix接口: http://127.0.0.1:${PORT}/api/unix`);
    console.log(`🔧 平台信息: http://127.0.0.1:${PORT}/platform`);
    console.log('='.repeat(70));
    console.log('🎯 优化特性:');
    console.log('  • macOS/Linux 专用检测');
    console.log('  • 真实的系统版本显示');
    console.log('  • 显卡型号检测');
    console.log('='.repeat(70));
    
    // 显示示例
    console.log('\n📊 数据示例:');
    const sample = getHardwareInfo();
    console.log('系统:', sample.data.system.platform);
    console.log('CPU:', sample.data.cpu.brand);
    console.log('显卡:', sample.data.graphics[0]?.model || 'Unknown');
    console.log('内存:', sample.data.system.memory);
    console.log('='.repeat(70));
});

server.on('error', (error) => {
    console.error('服务器错误:', error.message);
    if (error.code === 'EADDRINUSE') {
        console.log(`端口 ${PORT} 被占用，尝试端口 ${PORT + 1}`);
        server.listen(PORT + 1, '127.0.0.1');
    }
});