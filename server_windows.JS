// server_windows.js - 专门优化Windows显示
const http = require('http');
const os = require('os');
const { execSync, exec } = require('child_process');

const PORT = 29275;

console.log('🚀 启动Windows优化硬件服务器...');

// 获取Windows系统版本信息
function getWindowsVersion() {
    try {
        // 方法1: 通过os模块获取更多信息
        const release = os.release(); // 例如: 10.0.19045
        const version = release.split('.')[0];
        
        const versions = {
            '10': 'Windows 10',
            '11': 'Windows 11',
            '8': 'Windows 8',
            '7': 'Windows 7',
            '6.3': 'Windows 8.1',
            '6.2': 'Windows 8',
            '6.1': 'Windows 7',
            '6.0': 'Windows Vista',
            '5': 'Windows XP'
        };
        
        // 方法2: 使用系统命令获取更准确的信息
        try {
            const win32_os = execSync('wmic os get Caption, Version /value', { encoding: 'utf8' });
            const lines = win32_os.split('\n');
            let caption = 'Windows';
            
            for (const line of lines) {
                if (line.startsWith('Caption=')) {
                    caption = line.replace('Caption=', '').trim();
                    break;
                }
            }
            
            return caption;
        } catch (e) {
            // 方法3: 使用Node.js os模块推断
            const platform = os.platform();
            if (platform === 'win32') {
                if (release.startsWith('10.')) {
                    return 'Windows 10';
                } else if (parseFloat(release) >= 6.3) {
                    return 'Windows 8.1 or later';
                }
            }
            return versions[version] || `Windows ${release}`;
        }
    } catch (error) {
        console.log('获取Windows版本失败:', error.message);
        return 'Windows';
    }
}

// 获取显卡信息（Windows专用）
function getWindowsGraphics() {
    try {
        const gpus = [];
        
        // 方法1: 使用wmic获取显卡
        try {
            const result = execSync('wmic path win32_VideoController get name, AdapterRAM, DriverVersion /value', { 
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'] // 忽略错误
            });
            
            const blocks = result.split(/\n\s*\n/);
            
            blocks.forEach(block => {
                if (block.includes('Name=')) {
                    const lines = block.split('\n');
                    let name = '';
                    let vram = '';
                    let driver = '';
                    
                    lines.forEach(line => {
                        if (line.startsWith('Name=')) {
                            name = line.replace('Name=', '').trim();
                        } else if (line.startsWith('AdapterRAM=')) {
                            const ramBytes = parseInt(line.replace('AdapterRAM=', '').trim());
                            if (ramBytes && !isNaN(ramBytes)) {
                                vram = Math.round(ramBytes / 1024 / 1024 / 1024) + ' GB';
                            }
                        } else if (line.startsWith('DriverVersion=')) {
                            driver = line.replace('DriverVersion=', '').trim();
                        }
                    });
                    
                    if (name) {
                        gpus.push({
                            model: name,
                            vram: vram || 'Shared Memory',
                            vendor: name.includes('NVIDIA') ? 'NVIDIA' : 
                                   name.includes('AMD') ? 'AMD' : 
                                   name.includes('Intel') ? 'Intel' : 
                                   name.includes('Microsoft') ? 'Microsoft' : 'Unknown',
                            index: gpus.length,
                            isMain: gpus.length === 0,
                            driverVersion: driver || 'Unknown'
                        });
                    }
                }
            });
        } catch (e) {
            console.log('WMI查询失败，使用备选方案:', e.message);
        }
        
        // 方法2: 如果WMI失败，使用备选方案
        if (gpus.length === 0) {
            // 尝试通过注册表或环境变量
            const envVars = process.env;
            if (envVars.PROCESSOR_ARCHITECTURE === 'AMD64') {
                gpus.push({
                    model: 'Windows Display Adapter',
                    vram: 'System Shared',
                    vendor: 'Microsoft',
                    index: 0,
                    isMain: true,
                    driverVersion: 'WDDM'
                });
            } else {
                gpus.push({
                    model: 'Graphics Controller',
                    vram: 'Unknown',
                    vendor: 'Unknown',
                    index: 0,
                    isMain: true
                });
            }
        }
        
        console.log(`检测到 ${gpus.length} 块显卡`);
        return gpus;
        
    } catch (error) {
        console.log('获取显卡信息失败:', error.message);
        return [
            {
                model: 'Windows Graphics',
                vram: 'System Managed',
                vendor: 'Microsoft',
                index: 0,
                isMain: true
            }
        ];
    }
}

// 获取完整的硬件信息
function getHardwareInfo() {
    try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const graphics = getWindowsGraphics();
        const windowsVersion = getWindowsVersion();
        
        // CPU品牌处理
        let cpuBrand = cpus[0] ? cpus[0].model : 'Unknown CPU';
        // 清理CPU型号字符串
        cpuBrand = cpuBrand
            .replace('(R)', '®')
            .replace('(TM)', '™')
            .replace('CPU', '')
            .replace('  ', ' ')
            .trim();
        
        return {
            success: true,
            timestamp: new Date().toISOString(),
            windows: true,
            data: {
                // CPU信息
                cpu: {
                    brand: cpuBrand,
                    cores: cpus.length,
                    speed: cpus[0] ? (cpus[0].speed / 1000).toFixed(2) + ' GHz' : 'Unknown',
                    manufacturer: cpuBrand.includes('Intel') ? 'Intel' : 
                                  cpuBrand.includes('AMD') ? 'AMD' : 'Unknown',
                    model: cpuBrand
                },
                
                // 显卡信息
                graphics: graphics,
                
                // 系统信息 - 修复这里！
                system: {
                    platform: windowsVersion, // 显示"Windows 10"而不是"win32"
                    arch: os.arch() === 'x64' ? '64-bit' : '32-bit',
                    memory: Math.round(totalMem / (1024 ** 3)) + ' GB',
                    hostname: os.hostname(),
                    version: os.release(),
                    build: os.release().split('.')[2] || 'N/A'
                },
                
                // Windows特定信息
                windows: {
                    edition: windowsVersion,
                    build: os.release(),
                    architecture: os.arch(),
                    uptime: Math.floor(os.uptime() / 3600) + ' hours'
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
        return {
            success: true,
            fallback: true,
            timestamp: new Date().toISOString(),
            data: {
                cpu: {
                    brand: 'Intel/AMD Processor',
                    cores: require('os').cpus().length,
                    speed: '2.5+ GHz',
                    manufacturer: 'Intel/AMD',
                    model: 'CPU'
                },
                graphics: [
                    {
                        model: 'Windows Display Adapter',
                        vram: 'System Shared',
                        vendor: 'Microsoft',
                        index: 0,
                        isMain: true
                    }
                ],
                system: {
                    platform: 'Windows 10/11',
                    arch: '64-bit',
                    memory: Math.round(require('os').totalmem() / (1024 ** 3)) + ' GB',
                    hostname: require('os').hostname()
                },
                windows: {
                    edition: 'Windows 10 or later',
                    build: 'N/A',
                    architecture: 'x64'
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
    
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${url}`);
    
    if (url === '/api/hardware' && req.method === 'GET') {
        const info = getHardwareInfo();
        res.writeHead(200);
        res.end(JSON.stringify(info, null, 2));
        
    } else if (url === '/api/windows' && req.method === 'GET') {
        // Windows专用接口
        const info = getHardwareInfo();
        res.writeHead(200);
        res.end(JSON.stringify({
            windows: true,
            version: getWindowsVersion(),
            details: info.data.windows,
            graphics: info.data.graphics,
            cpu: info.data.cpu
        }, null, 2));
        
    } else if (url === '/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'running',
            server: 'Windows Optimized Hardware Server',
            platform: 'Windows (' + getWindowsVersion() + ')',
            timestamp: new Date().toISOString()
        }));
        
    } else if (url === '/system' && req.method === 'GET') {
        // 系统信息专用接口
        res.writeHead(200);
        res.end(JSON.stringify({
            platform: os.platform(),
            platformNice: getWindowsVersion(),
            release: os.release(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: Math.round(os.totalmem() / (1024 ** 3)) + ' GB',
            hostname: os.hostname(),
            node: process.version
        }, null, 2));
        
    } else {
        res.writeHead(200);
        res.end(JSON.stringify({
            server: 'Windows Hardware Server',
            endpoints: [
                '/api/hardware - 完整硬件信息',
                '/api/windows - Windows专用信息',
                '/system - 系统信息',
                '/health - 健康检查'
            ],
            note: '系统显示已优化: win32 → Windows 10/11',
            timestamp: new Date().toISOString()
        }));
    }
});

// 启动服务器
server.listen(PORT, '127.0.0.1', () => {
    console.log('='.repeat(70));
    console.log('✔ Windows优化硬件服务器启动成功！');
    console.log('='.repeat(70));
    console.log(' 系统检测: ' + getWindowsVersion());
    console.log('💻 架构: ' + (os.arch() === 'x64' ? '64位' : '32位'));
    console.log('='.repeat(70));
    console.log(`📡 主接口: http://127.0.0.1:${PORT}/api/hardware`);
    console.log(`💎Windows接口: http://127.0.0.1:${PORT}/api/windows`);
    console.log(`🔧 系统信息: http://127.0.0.1:${PORT}/system`);
    console.log('='.repeat(70));
    console.log('🎯 优化特性:');
    console.log('  • win32 → Windows 10/11 (友好显示)');
    console.log('  • 真实显卡型号检测');
    console.log('  • Windows专用信息');
    console.log('='.repeat(70));
    
    // 显示示例
    console.log('\n📊 数据示例:');
    const sample = getHardwareInfo();
    console.log('系统: ' + sample.data.system.platform);
    console.log('CPU: ' + sample.data.cpu.brand);
    console.log('显卡: ' + (sample.data.graphics[0]?.model || 'Unknown'));
    console.log('内存: ' + sample.data.system.memory);
    console.log('='.repeat(70));
});

server.on('error', (error) => {
    console.error('服务器错误:', error.message);
});