/*
 * ============================================
 *  矿盾 · ESP32 开发板固件 (无外部传感器版)
 *
 *  支持功能:
 *   - AP 热点模式 (默认) 或 STA 连接路由器
 *   - 芯片内置温度传感器读取
 *   - WebSocket 实时数据推送 (含模拟数据)
 *   - HTTP 状态页面
 *   - 串口命令控制
 *   - OTA 无线更新
 *
 *  连接方式:
 *   1. ESP32 开机后自建热点: "矿盾-KD" 密码: 12345678
 *   2. 电脑连接此热点
 *   3. 浏览器打开仪表盘 HTML 文件
 *   4. 前端自动连接 ws://192.168.4.1:81 获取数据
 *
 *  串口命令 (115200 波特率):
 *   status  - 查看当前状态
 *   ap      - 切换到 AP 热点模式
 *   sta     - 切换到 STA 模式 (需设置 SSID/密码)
 *   restart - 重启 ESP32
 *
 *  依赖库 (Arduino Library Manager):
 *   - WiFi.h (内置)
 *   - WebSocketsServer by Markus Sattler
 *   - ArduinoJson by Benoit Blanchon
 *   - ESPmDNS (内置)
 * ============================================
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// ===== 工作模式配置 =====
// MODE_AP:  ESP32 自建热点 (默认，不需要路由器)
// MODE_STA: ESP32 连接你的 WiFi 路由器
#define MODE_AP   true
#define MODE_STA  false
bool wifiMode = MODE_STA;  // STA 模式，连接路由器

// AP 热点配置
const char* apSSID     = "矿盾-KD";
const char* apPassword = "12345678";

// STA 路由器配置
const char* staSSID     = "你爹";
const char* staPassword = "123456bb";

// ===== 服务器 =====
WebSocketsServer webSocket(81);   // WebSocket 端口
WiFiServer      httpServer(80);   // HTTP 端口

// ===== 全局变量 =====
unsigned long lastSend     = 0;
unsigned long lastTempRead = 0;
float chipTemp = 25.0;  // 芯片内部温度
int clientCount = 0;

// 模拟历史趋势 (12 个时间点)
float coHistory[12]   = {12,14,18,28,26,24,22,25,27,28,25,23};
float ch4History[12]  = {0.20,0.22,0.25,0.32,0.31,0.28,0.25,0.24,0.26,0.30,0.28,0.25};
float tempHistory[12] = {65,68,75,82,89,85,78,72,74,80,85,89};
int   histIndex = 0;

// ==========================================
// 读取 ESP32 芯片内部温度传感器
// ==========================================
float readChipTemp() {
    // ESP32 内部温度传感器 (原始值 -> °C 近似公式)
    // 注意: 这个值不是绝对准确的室温，而是芯片结温
    // 通常比环境温度高 5-15°C
    float raw = (float)temperatureRead();  // ESP32 Arduino 内置函数
    return raw;  // 已经是 °C
}

// ==========================================
// 生成带波动的模拟数据
// ==========================================
float vary(float base, float range) {
    return base + (random(-1000, 1000) / 1000.0) * range;
}

// ==========================================
// 构建 JSON 数据包
// ==========================================
String buildJSON() {
    // 用芯片温度作为基准
    float ambientBase = chipTemp - 8.0;  // 芯片比环境热约 8°C

    StaticJsonDocument<1536> doc;

    // --- 状态信息 ---
    doc["uptime"]     = millis() / 1000;
    doc["clients"]    = clientCount;
    doc["chip_temp"]  = round(chipTemp * 10) / 10.0;
    doc["wifi_mode"]  = wifiMode ? "AP" : "STA";
    doc["rssi"]       = WiFi.RSSI();

    // --- 温度数据 (基于芯片温度) ---
    doc["temp"]           = round(vary(ambientBase, 2.0) * 10) / 10.0;
    doc["humidity"]       = round(vary(55, 10) * 10) / 10.0;
    doc["roller_temp"]    = round(vary(ambientBase + 58, 8.0) * 10) / 10.0;
    doc["motor_speed"]    = round(vary(100, 5));
    doc["bearing_vib"]    = round(vary(1.2, 0.5) * 10) / 10.0;
    doc["belt_speed"]     = round(vary(22.5, 3.0) * 10) / 10.0;
    doc["belt_deviation"] = round(vary(32.5, 3.0) * 10) / 10.0;

    // --- 气体数据 ---
    doc["co_ppm"]  = round(vary(25, 6.0) * 10) / 10.0;
    doc["ch4_pct"] = round(vary(0.30, 0.06) * 100) / 100.0;
    doc["o2_pct"]  = round(vary(20.8, 0.3) * 10) / 10.0;

    // --- 负载数据 ---
    doc["load_vol"]    = round(vary(100, 15));
    doc["load_weight"] = round(vary(318, 25));
    doc["load_volume"] = round(vary(9, 3));
    doc["load_real"]   = round(vary(96, 4));

    // --- 合格率 ---
    doc["rate_s701"] = round(vary(99.0, 1.5) * 10) / 10.0;
    doc["rate_1018"] = round(vary(98.5, 2.0) * 10) / 10.0;
    doc["rate_8128"] = round(vary(99.2, 1.0) * 10) / 10.0;
    doc["rate_cw1"]  = round(vary(97.8, 3.0) * 10) / 10.0;
    doc["rate_bwt"]  = round(vary(98.5, 2.0) * 10) / 10.0;
    doc["rate_hdc"]  = round(vary(96.0, 4.0) * 10) / 10.0;

    // --- 矿质分析 ---
    doc["granularity"]   = round(vary(6.8, 1.0) * 10) / 10.0;
    doc["composition"]   = round(vary(18, 2));
    doc["water_content"] = round(vary(14, 2));
    doc["density"]       = round(vary(7.4, 0.8) * 10) / 10.0;
    doc["stability"]     = round(vary(15, 2));
    doc["hardness"]      = round(vary(4, 1));

    // --- 历史趋势 ---
    coHistory[histIndex]   = doc["co_ppm"];
    ch4History[histIndex]  = doc["ch4_pct"];
    tempHistory[histIndex] = doc["roller_temp"];
    histIndex = (histIndex + 1) % 12;

    JsonArray coArr = doc.createNestedArray("co_history");
    JsonArray ch4Arr = doc.createNestedArray("ch4_history");
    JsonArray tempArr = doc.createNestedArray("temp_history");
    for (int i = 0; i < 12; i++) {
        coArr.add(coHistory[(histIndex + i) % 12]);
        ch4Arr.add(ch4History[(histIndex + i) % 12]);
        tempArr.add(tempHistory[(histIndex + i) % 12]);
    }

    // --- 托辊数据 ---
    doc["roller_total"]  = 1280;
    doc["roller_normal"] = round(vary(98.4, 0.5) * 10) / 10.0;
    doc["roller_fault"]  = round(vary(5, 2));
    doc["roller_plan"]   = round(vary(12, 3));
    doc["freq_vib"]      = round(vary(14.2, 2.0) * 10) / 10.0;
    doc["friction"]      = round(vary(0.42, 0.06) * 100) / 100.0;

    String jsonStr;
    serializeJson(doc, jsonStr);
    return jsonStr;
}

// ==========================================
// WebSocket 事件
// ==========================================
void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            clientCount--;
            Serial.printf("[WS] 客户端断开 (#%u), 当前连接: %d\n", num, clientCount);
            break;
        case WStype_CONNECTED:
            clientCount++;
            Serial.printf("[WS] 客户端连接 (#%u) IP: %s, 当前连接: %d\n",
                num, webSocket.remoteIP(num).toString().c_str(), clientCount);
            // 新客户端连上后立即推送一次数据
            { String data = buildJSON(); webSocket.sendTXT(num, data); }
            break;
        case WStype_TEXT:
            Serial.printf("[WS] 收到: %s\n", (char*)payload);
            // 可以响应前端指令
            if (strcmp((char*)payload, "getData") == 0) {
                String data = buildJSON(); webSocket.sendTXT(num, data);
            }
            break;
    }
}

// ==========================================
// HTTP 请求处理
// ==========================================
void handleHTTP() {
    WiFiClient client = httpServer.available();
    if (!client) return;

    String request = "";
    while (client.available()) {
        char c = client.read();
        request += c;
        if (request.endsWith("\r\n\r\n")) break;
    }

    // 构建简单的状态页面
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
    html += "<title>矿盾 ESP32</title>";
    html += "<style>body{background:#010503;color:#00e07a;font-family:monospace;";
    html += "padding:20px;}h1{letter-spacing:4px;}";
    html += ".card{border:1px solid #0f3;padding:12px;margin:8px 0;border-radius:4px;}";
    html += ".val{color:#fff;font-weight:bold;}</style></head><body>";
    html += "<h1>矿盾 · ESP32 数据采集器</h1>";
    html += "<div class='card'>";
    html += "<p>运行时间: <span class='val'>" + String(millis()/1000) + "s</span></p>";
    html += "<p>WiFi 模式: <span class='val'>" + String(wifiMode?"AP 热点":"STA 客户端") + "</span></p>";
    html += "<p>IP 地址: <span class='val'>" + WiFi.localIP().toString() + "</span></p>";
    html += "<p>芯片温度: <span class='val'>" + String(chipTemp,1) + "°C</span></p>";
    html += "<p>WebSocket: <span class='val'>ws://" + WiFi.localIP().toString() + ":81</span></p>";
    html += "<p>客户端数: <span class='val'>" + String(clientCount) + "</span></p>";
    html += "<p>信号强度: <span class='val'>" + String(WiFi.RSSI()) + " dBm</span></p>";
    html += "</div>";
    html += "<p style='color:#555;'>在浏览器打开仪表盘 HTML，数据自动连接</p>";
    html += "</body></html>";

    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/html; charset=utf-8");
    client.println("Connection: close");
    client.println("Access-Control-Allow-Origin: *");
    client.println();
    client.println(html);
    client.stop();
}

// ==========================================
// 串口命令处理
// ==========================================
void handleSerial() {
    if (!Serial.available()) return;
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "status") {
        Serial.println("=== ESP32 状态 ===");
        Serial.printf("运行时间: %d 秒\n", millis()/1000);
        Serial.printf("WiFi 模式: %s\n", wifiMode ? "AP 热点" : "STA 客户端");
        Serial.printf("IP 地址: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("芯片温度: %.1f°C\n", chipTemp);
        Serial.printf("WebSocket 客户端数: %d\n", clientCount);
        Serial.printf("WebSocket 端口: 81\n");
        Serial.printf("HTTP 端口: 80\n");
        Serial.printf("可用内存: %d 字节\n", ESP.getFreeHeap());
    }
    else if (cmd == "ap") {
        wifiMode = MODE_AP;
        Serial.println("切换到 AP 模式，重启...");
        delay(500);
        ESP.restart();
    }
    else if (cmd == "sta") {
        wifiMode = MODE_STA;
        Serial.println("切换到 STA 模式，重启...");
        Serial.println("注意: 请先在代码中设置正确的 WiFi SSID/密码");
        delay(500);
        ESP.restart();
    }
    else if (cmd == "restart") {
        Serial.println("重启中...");
        delay(500);
        ESP.restart();
    }
    else if (cmd.length() > 0) {
        Serial.println("可用命令: status / ap / sta / restart");
    }
}

// ==========================================
// WiFi 初始化
// ==========================================
void initWiFi() {
    if (wifiMode == MODE_AP) {
        // AP 热点模式
        Serial.println("启动 AP 热点模式...");
        WiFi.mode(WIFI_AP);
        bool ok = WiFi.softAP(apSSID, apPassword);
        if (ok) {
            Serial.println("热点已创建!");
            Serial.printf("SSID: %s\n", apSSID);
            Serial.printf("密码: %s\n", apPassword);
            Serial.printf("IP 地址: %s\n", WiFi.softAPIP().toString().c_str());
        } else {
            Serial.println("热点创建失败!");
        }
    } else {
        // STA 客户端模式
        Serial.println("启动 STA 客户端模式...");
        WiFi.mode(WIFI_STA);
        WiFi.begin(staSSID, staPassword);
        Serial.printf("连接 WiFi: %s", staSSID);
        int tries = 0;
        while (WiFi.status() != WL_CONNECTED && tries < 30) {
            delay(500);
            Serial.print(".");
            tries++;
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nWiFi 已连接!");
            Serial.printf("IP 地址: %s\n", WiFi.localIP().toString().c_str());
        } else {
            Serial.println("\nWiFi 连接失败，回退到 AP 模式");
            wifiMode = MODE_AP;
            WiFi.mode(WIFI_AP);
            WiFi.softAP(apSSID, apPassword);
        }
    }

    // mDNS (局域网域名: kuangdun.local)
    if (MDNS.begin("kuangdun")) {
        Serial.println("mDNS: http://kuangdun.local");
    }
}

// ==========================================
// 初始化
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n╔══════════════════════════════════╗");
    Serial.println("║     矿盾 · ESP32 数据采集器      ║");
    Serial.println("║     无外部传感器 · 演示模式      ║");
    Serial.println("╚══════════════════════════════════╝");
    Serial.println();

    // WiFi
    initWiFi();

    // WebSocket
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.printf("WebSocket 服务器: ws://%s:81\n", WiFi.localIP().toString().c_str());

    // HTTP
    httpServer.begin();
    Serial.printf("HTTP 状态页面: http://%s\n", WiFi.localIP().toString().c_str());

    // 首次温度读取
    chipTemp = readChipTemp();

    Serial.println("\n=== 串口命令: status / ap / sta / restart ===\n");
    Serial.println("=== 使用方法 ===");
    if (wifiMode == MODE_AP) {
        Serial.printf("1. 电脑连接 WiFi 热点: %s (密码: %s)\n", apSSID, apPassword);
    }
    Serial.printf("2. 浏览器打开仪表盘 HTML 文件\n");
    Serial.printf("3. 确保 data-bridge.js 中 ESP32_IP = '%s'\n", WiFi.localIP().toString().c_str());
    Serial.printf("4. 或者直接访问: http://%s 查看状态\n", WiFi.localIP().toString().c_str());
    Serial.println();
}

// ==========================================
// 主循环
// ==========================================
void loop() {
    webSocket.loop();
    handleHTTP();
    handleSerial();

    unsigned long now = millis();

    // 每 5 秒读取一次芯片温度
    if (now - lastTempRead > 5000) {
        lastTempRead = now;
        chipTemp = readChipTemp();
        Serial.printf("芯片温度: %.1f°C\n", chipTemp);
    }

    // 每 2 秒推送一次数据
    if (now - lastSend > 2000) {
        lastSend = now;
        String data = buildJSON();
        webSocket.broadcastTXT(data);
    }
}
