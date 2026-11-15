(function () {
    // ═════════════════════════════════════════════════════════════════════════
    // WINGOBOT AI AUTO-MINING PRO (MULTI-TAB LIQUID iOS EDITION v3.8)
    // Supports: WinGo 1Min (Default), 30sec, 3Min, 5Min with Auto Tab-Detection
    // Features: Dynamic API Switching, Stop-Loss Guard, Luxury Fireworks, 0 Glitch
    // ═════════════════════════════════════════════════════════════════════════

    // Clean up any existing instances safely
    try {
        var existingRoot = document.getElementById('wb-root-container');
        if (existingRoot) existingRoot.remove();
        var existingStyle = document.getElementById('wb-liquid-style');
        if (existingStyle) existingStyle.remove();
        var existingBackdrop = document.getElementById('wb-backdrop');
        if (existingBackdrop) existingBackdrop.remove();
        if (window.__wb_fireworks) {
            try { window.__wb_fireworks.stop(true); } catch (_) {}
            window.__wb_fireworks = null;
        }
        var existingFwCont = document.getElementById('wb-fw-container');
        if (existingFwCont) existingFwCont.remove();
    } catch (_) {}

    var API_MAP = {
        '30S': 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json',
        '1M':  'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json',
        '3M':  'https://draw.ar-lottery01.com/WinGo/WinGo_3M/GetHistoryIssuePage.json',
        '5M':  'https://draw.ar-lottery01.com/WinGo/WinGo_5M/GetHistoryIssuePage.json'
    };

    var cfg = {
        appName: 'WingoBot AI',
        edition: 'Liquid iOS v3.8',
        faviconUrl: 'https://wingobot.com/apple-touch-icon.png',
        faviconFallback: 'https://wingobot.com/favicon-96x96.png'
    };

    var st = {
        currentMode: '1M',
        currentModeLabel: 'WinGo 1Min',
        lvl: 0,
        lp: '',
        pred: (Math.random() < 0.5 ? 'BIG' : 'SMALL'),
        active: false,
        startBal: 0,
        targetBal: 2000,
        stopLoss: 500,
        baseUnit: 10,
        amounts: [10, 20, 40, 80, 160, 320, 640],
        isRecovery: false,
        lastLossAmt: 0,
        activeBet: null, // { issue, prediction, amount, mode }
        maxLossStreak: 0,
        currentLossStreak: 0,
        predTrack: 'SIZE',
        totalWins: 0,
        totalLosses: 0,
        totalProfit: 0,
        historyEngine: [],
        wakeLock: null,
        isOpen: false,
        statusText: 'Engine Idle • Ready'
    };

    // ─── Screen Wake Lock (Prevent Mobile Sleep) ─────────────────────────────
    var requestWakeLock = async function () {
        try {
            if ('wakeLock' in navigator) {
                st.wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (_) {}
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') requestWakeLock();
    });

    // ─── Dynamic Active Game Tab Detector ────────────────────────────────────
    var detectActiveGameMode = function () {
        try {
            var activeCard = document.querySelector('.timer-card.active') ||
                             document.querySelector('.timer-cards .active') ||
                             document.querySelector('[class*="timer-card"][class*="active"]') ||
                             document.querySelector('.tab-item.active') ||
                             document.querySelector('[class*="tab"][class*="active"]');
            if (activeCard) {
                var raw = (activeCard.innerText || activeCard.textContent || '').replace(/\s+/g, ' ').toUpperCase();
                if (raw.includes('30S') || raw.includes('30 SEC') || raw.includes('30SEC')) {
                    return { mode: '30S', label: 'WinGo 30sec' };
                }
                if (raw.includes('1M') || raw.includes('1 MIN') || raw.includes('1MIN')) {
                    return { mode: '1M', label: 'WinGo 1Min' };
                }
                if (raw.includes('3M') || raw.includes('3 MIN') || raw.includes('3MIN')) {
                    return { mode: '3M', label: 'WinGo 3Min' };
                }
                if (raw.includes('5M') || raw.includes('5 MIN') || raw.includes('5MIN')) {
                    return { mode: '5M', label: 'WinGo 5Min' };
                }
            }
        } catch (_) {}
        return { mode: '1M', label: 'WinGo 1Min' }; // Default to 1M
    };

    // Initialize detected mode
    var initialMode = detectActiveGameMode();
    st.currentMode = initialMode.mode;
    st.currentModeLabel = initialMode.label;

    // ─── Inject iOS Liquid Glassmorphism CSS ─────────────────────────────────
    var style = document.createElement('style');
    style.id = 'wb-liquid-style';
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

        /* Pulsing Aura for Ball */
        @keyframes wbLiquidAuraPulse {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(6, 182, 212, 0.45), 0 0 0 2.5px rgba(255, 255, 255, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.7);
            }
            50% {
                box-shadow: 0 12px 32px rgba(16, 185, 129, 0.6), 0 0 0 3.5px rgba(52, 211, 153, 0.8), inset 0 2px 8px rgba(255, 255, 255, 0.9);
            }
        }

        @keyframes wbPulseGreenDot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.6; }
        }

        @keyframes wbPopInSpring {
            0% {
                opacity: 0;
                transform: scale(0.7) translateY(16px);
            }
            65% {
                transform: scale(1.02) translateY(-2px);
            }
            100% {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        @keyframes wbBtnTension {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { transform: scale(1.03); box-shadow: 0 0 16px 3px rgba(16, 185, 129, 0.6); }
        }

        .wb-btn-power {
            animation: wbBtnTension 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite !important;
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.6) !important;
        }

        /* Root Container */
        #wb-root-container {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
            position: fixed;
            z-index: 2147483646;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        }

        /* Backdrop Blur Overlay when modal open */
        #wb-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 2147483645;
            display: none;
            opacity: 0;
            transition: opacity 0.25s ease;
        }
        #wb-backdrop.show {
            display: block;
            opacity: 1;
        }

        /* Floating Circle Ball */
        .wb-floating-ball {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #34d399, #06b6d4 50%, #4f46e5 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            position: relative;
            animation: wbLiquidAuraPulse 3s infinite ease-in-out;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            touch-action: none;
        }
        .wb-floating-ball:active {
            cursor: grabbing;
            transform: scale(0.95);
        }

        .wb-ball-img {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
            pointer-events: none;
            background: #0f172a;
        }

        .wb-ball-status-dot {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #ef4444;
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 8px #ef4444;
            pointer-events: none;
        }
        .wb-ball-status-dot.active {
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
            animation: wbPulseGreenDot 1.6s infinite ease-in-out;
        }

        /* Expanded Popup Card (iOS Liquid Glass) */
        .wb-popup-card {
            width: 340px;
            max-width: 92vw;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(28px) saturate(200%);
            -webkit-backdrop-filter: blur(28px) saturate(200%);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 26px;
            padding: 16px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 40px rgba(6, 182, 212, 0.25);
            color: #f8fafc;
            display: none;
            flex-direction: column;
            gap: 11px;
            transform-origin: top center;
        }
        .wb-popup-card.show {
            display: flex;
            animation: wbPopInSpring 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Header (Draggable Handle) */
        .wb-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 9px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            cursor: grab;
        }
        .wb-header:active {
            cursor: grabbing;
        }
        .wb-title-group {
            display: flex;
            align-items: center;
            gap: 9px;
        }
        .wb-brand-avatar {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            object-fit: cover;
            border: 1.5px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
            background: #0f172a;
        }
        .wb-title {
            font-size: 13.5px;
            font-weight: 800;
            letter-spacing: 0.3px;
            background: linear-gradient(135deg, #ffffff 40%, #a5f3fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .wb-badge-pill {
            font-size: 9.5px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 20px;
            background: rgba(6, 182, 212, 0.15);
            border: 1px solid rgba(6, 182, 212, 0.35);
            color: #38bdf8;
            letter-spacing: 0.3px;
        }
        .wb-header-actions {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .wb-btn-icon {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .wb-btn-icon:hover {
            background: rgba(255, 255, 255, 0.18);
            transform: scale(1.08);
            color: #ffffff;
        }
        .wb-btn-icon.close:hover {
            background: rgba(239, 68, 68, 0.25);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.5);
        }

        /* Signal Display Card */
        .wb-signal-card {
            background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            padding: 12px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
        }
        .wb-signal-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .wb-mode-chip {
            font-size: 10px;
            color: #38bdf8;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 5px;
            letter-spacing: 0.5px;
        }
        .wb-period-num {
            color: #f1f5f9;
            font-weight: 800;
            font-family: monospace;
            font-size: 12.5px;
        }
        .wb-level-tag {
            font-size: 10px;
            font-weight: 700;
            color: #a78bfa;
            background: rgba(167, 139, 250, 0.15);
            padding: 2px 7px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 3px;
            width: fit-content;
        }
        .wb-prediction-badge {
            font-size: 21px;
            font-weight: 900;
            padding: 8px 18px;
            border-radius: 14px;
            letter-spacing: 1px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        }
        .wb-pred-big {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #ffffff;
            box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45);
        }
        .wb-pred-small {
            background: linear-gradient(135deg, #0ea5e9, #2563eb);
            color: #ffffff;
            box-shadow: 0 4px 18px rgba(14, 165, 233, 0.45);
        }

        /* Stats Grid */
        .wb-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
        }
        .wb-stat-box {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 13px;
            padding: 8px 6px;
            text-align: center;
        }
        .wb-stat-val {
            font-size: 13.5px;
            font-weight: 800;
            color: #ffffff;
        }
        .wb-stat-lbl {
            font-size: 9px;
            font-weight: 700;
            color: #94a3b8;
            margin-top: 2px;
            text-transform: uppercase;
        }

        /* Controls Section */
        .wb-controls-section {
            display: flex;
            flex-direction: column;
            gap: 7px;
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 10px 12px;
        }
        .wb-input-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: #cbd5e1;
            font-weight: 600;
        }
        .wb-field-input {
            width: 86px;
            padding: 4px 8px;
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #38bdf8;
            font-weight: 700;
            font-size: 11.5px;
            text-align: right;
            outline: none;
            transition: border 0.2s;
        }
        .wb-field-input:focus {
            border-color: #06b6d4;
            box-shadow: 0 0 8px rgba(6, 182, 212, 0.35);
        }
        .wb-field-input.stoploss {
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.25);
        }
        .wb-field-input.stoploss:focus {
            border-color: #ef4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.35);
        }

        .wb-chip-group {
            display: flex;
            gap: 5px;
            margin-top: 2px;
        }
        .wb-amt-chip {
            flex: 1;
            padding: 4px 0;
            border-radius: 7px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .wb-amt-chip:hover {
            background: rgba(6, 182, 212, 0.2);
            color: #38bdf8;
        }
        .wb-amt-chip.active {
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            color: #ffffff;
            border-color: transparent;
            box-shadow: 0 2px 8px rgba(6, 182, 212, 0.4);
        }

        /* Status Bar */
        .wb-status-bar {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 7px 10px;
            font-size: 11px;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 7px;
            font-weight: 600;
        }
        .wb-live-pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 6px #10b981;
            animation: wbPulseGreenDot 1.4s infinite ease-in-out;
            flex-shrink: 0;
        }

        /* Primary Action Liquid Button */
        .wb-action-btn {
            width: 100%;
            padding: 12px;
            border-radius: 15px;
            border: none;
            cursor: pointer;
            font-weight: 800;
            font-size: 13.5px;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            color: #ffffff;
            background: linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%);
            box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }
        .wb-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 28px rgba(6, 182, 212, 0.6);
        }
        .wb-action-btn:active {
            transform: translateY(1px);
        }
        .wb-action-btn.running {
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
        }

        /* Footer */
        .wb-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);

    // ─── Build DOM Elements ──────────────────────────────────────────────────
    var backdrop = document.createElement('div');
    backdrop.id = 'wb-backdrop';

    var root = document.createElement('div');
    root.id = 'wb-root-container';

    var defaultX = Math.max(10, window.innerWidth - 80);
    var defaultY = 70;
    root.style.left = defaultX + 'px';
    root.style.top = defaultY + 'px';

    // 1. Floating Round Circle Ball with WingoBot Favicon
    var ball = document.createElement('div');
    ball.id = 'wb-floating-ball';
    ball.className = 'wb-floating-ball';
    ball.title = 'WingoBot AI • Tap to Open';
    ball.innerHTML = `
        <img class="wb-ball-img" src="${cfg.faviconUrl}" onerror="this.onerror=null;this.src='${cfg.faviconFallback}';" alt="WingoBot" />
        <div id="wb-ball-dot" class="wb-ball-status-dot"></div>
    `;

    // 2. Expanded iOS Liquid Popup Card
    var popup = document.createElement('div');
    popup.id = 'wb-modal-card';
    popup.className = 'wb-popup-card';
    popup.innerHTML = `
        <!-- Header (Draggable Handle) -->
        <div id="wb-drag-header" class="wb-header">
            <div class="wb-title-group">
                <img class="wb-brand-avatar" src="${cfg.faviconUrl}" onerror="this.onerror=null;this.src='${cfg.faviconFallback}';" alt="WB" />
                <div>
                    <div class="wb-title">${cfg.appName}</div>
                    <div style="font-size:9.5px;color:#94a3b8;font-weight:600;">${cfg.edition}</div>
                </div>
            </div>
            <div class="wb-header-actions">
                <span id="wb-header-status-badge" class="wb-badge-pill">${st.currentModeLabel}</span>
                <div id="wb-minimize-btn" class="wb-btn-icon" title="Minimize to Ball">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </div>
                <div id="wb-close-btn" class="wb-btn-icon close" title="Close to Ball">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            </div>
        </div>

        <!-- Live Signal Prediction Card -->
        <div class="wb-signal-card">
            <div class="wb-signal-info">
                <div id="wb-mode-chip-display" class="wb-mode-chip">🎯 ${st.currentModeLabel.toUpperCase()}</div>
                <div id="wb-period-display" class="wb-period-num">Connecting...</div>
                <div id="wb-level-indicator" class="wb-level-tag">LEVEL 1 • ₹10</div>
            </div>
            <div id="wb-prediction-tag" class="wb-prediction-badge wb-pred-big">BIG</div>
        </div>

        <!-- Live Analytics Stats Grid -->
        <div class="wb-stats-grid">
            <div class="wb-stat-box">
                <div id="wb-stat-winrate" class="wb-stat-val" style="color:#38bdf8;">0%</div>
                <div class="wb-stat-lbl">WIN RATE</div>
            </div>
            <div class="wb-stat-box">
                <div id="wb-stat-score" class="wb-stat-val">0 / 0</div>
                <div class="wb-stat-lbl">W / L</div>
            </div>
            <div class="wb-stat-box">
                <div id="wb-stat-profit" class="wb-stat-val" style="color:#34d399;">+₹0.0</div>
                <div class="wb-stat-lbl">NET PROFIT</div>
            </div>
        </div>

        <!-- Controls Section with Stop-Loss -->
        <div class="wb-controls-section">
            <div class="wb-input-row">
                <span>Target Balance</span>
                <input id="wb-input-target" class="wb-field-input" type="number" value="2000" placeholder="e.g. 2000" />
            </div>
            <div class="wb-input-row">
                <span style="color:#f87171;">Stop Loss (Min Bal)</span>
                <input id="wb-input-stoploss" class="wb-field-input stoploss" type="number" value="200" placeholder="e.g. 200" />
            </div>
            <div class="wb-input-row">
                <span>Base Bet (L1)</span>
                <input id="wb-input-base" class="wb-field-input" type="number" value="10" />
            </div>
            <div class="wb-chip-group">
                <div class="wb-amt-chip active" data-amt="10">₹10</div>
                <div class="wb-amt-chip" data-amt="20">₹20</div>
                <div class="wb-amt-chip" data-amt="50">₹50</div>
                <div class="wb-amt-chip" data-amt="100">₹100</div>
            </div>
        </div>

        <!-- Status Bar -->
        <div class="wb-status-bar">
            <div class="wb-live-pulse-dot"></div>
            <div id="wb-status-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Status: Engine Ready • Idle</div>
        </div>

        <!-- Action Button -->
        <button id="wb-toggle-run-btn" class="wb-action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>START AUTO MINING</span>
        </button>

        <!-- Footer -->
        <div class="wb-footer">
            <span>WingoSignals Official Tool</span>
            <span>Stop-Loss & WakeLock Active</span>
        </div>
    `;

    root.appendChild(ball);
    root.appendChild(popup);
    document.body.appendChild(backdrop);
    document.body.appendChild(root);

    // ─── Modal Open & Collapse Logic ─────────────────────────────────────────
    var toggleModal = function (open) {
        st.isOpen = (open !== undefined) ? open : !st.isOpen;
        if (st.isOpen) {
            var rect = root.getBoundingClientRect();
            var targetX = rect.left;
            var targetY = rect.top;

            if (targetX + 350 > window.innerWidth) {
                targetX = Math.max(10, window.innerWidth - 360);
            }
            if (targetX < 10) targetX = 10;
            if (targetY + 470 > window.innerHeight) {
                targetY = Math.max(10, window.innerHeight - 490);
            }

            root.style.left = targetX + 'px';
            root.style.top = targetY + 'px';

            ball.style.display = 'none';
            popup.classList.add('show');
            backdrop.classList.add('show');
        } else {
            popup.classList.remove('show');
            backdrop.classList.remove('show');
            ball.style.display = 'flex';
        }
    };

    backdrop.onclick = function () { toggleModal(false); };
    document.getElementById('wb-minimize-btn').onclick = function (e) {
        e.stopPropagation();
        toggleModal(false);
    };
    document.getElementById('wb-close-btn').onclick = function (e) {
        e.stopPropagation();
        toggleModal(false);
    };

    // ─── Rock-Solid Smooth Dragging Engine ───────────────────────────────────
    var setupDraggable = function (handleEl, onPureClick) {
        var isDragging = false;
        var startPointerX = 0, startPointerY = 0;
        var startElemX = 0, startElemY = 0;
        var hasMoved = false;

        var onPointerDown = function (e) {
            if (e.button !== undefined && e.button !== 0) return;

            isDragging = true;
            hasMoved = false;
            var point = e.touches ? e.touches[0] : e;
            startPointerX = point.clientX;
            startPointerY = point.clientY;

            var rect = root.getBoundingClientRect();
            startElemX = rect.left;
            startElemY = rect.top;
        };

        var onPointerMove = function (e) {
            if (!isDragging) return;
            var point = e.touches ? e.touches[0] : e;
            var dx = point.clientX - startPointerX;
            var dy = point.clientY - startPointerY;

            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                hasMoved = true;
                if (e.cancelable) e.preventDefault();

                var currentW = root.offsetWidth || 60;
                var currentH = root.offsetHeight || 60;
                var newX = Math.max(10, Math.min(window.innerWidth - currentW - 10, startElemX + dx));
                var newY = Math.max(10, Math.min(window.innerHeight - currentH - 10, startElemY + dy));

                root.style.left = newX + 'px';
                root.style.top = newY + 'px';
            }
        };

        var onPointerUp = function () {
            if (!isDragging) return;
            isDragging = false;
            if (!hasMoved && onPureClick) {
                onPureClick();
            }
        };

        handleEl.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove, { passive: false });
        window.addEventListener('mouseup', onPointerUp);

        handleEl.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
    };

    setupDraggable(ball, function () { toggleModal(true); });
    setupDraggable(document.getElementById('wb-drag-header'), null);

    // Listen to user clicking on any timer card to sync mode immediately
    document.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.timer-card, [class*="timer-card"]') : null;
        if (card) {
            setTimeout(syncTabMode, 150);
        }
    }, true);

    var syncTabMode = function () {
        var detected = detectActiveGameMode();
        if (detected.mode !== st.currentMode) {
            st.currentMode = detected.mode;
            st.currentModeLabel = detected.label;
            st.lp = '';
            st.activeBet = null;
            log('Switched to ' + detected.label);

            var chip = document.getElementById('wb-mode-chip-display');
            if (chip) chip.innerText = '🎯 ' + detected.label.toUpperCase();

            var badge = document.getElementById('wb-header-status-badge');
            if (badge) badge.innerText = detected.label;

            updateDashboard();
        }
    };

    // ─── Amount Selection Chips ──────────────────────────────────────────────
    var chips = document.querySelectorAll('.wb-amt-chip');
    chips.forEach(function (chip) {
        chip.onclick = function () {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            var val = chip.getAttribute('data-amt');
            var inp = document.getElementById('wb-input-base');
            if (inp) inp.value = val;
            st.baseUnit = parseFloat(val);
            recalculateAmounts(st.baseUnit);
        };
    });

    var recalculateAmounts = function (baseAmt) {
        var arr = [];
        for (var i = 0; i < 7; i++) {
            arr.push(baseAmt * Math.pow(2, i));
        }
        st.amounts = arr;
    };

    // ─── Dashboard State Updates ─────────────────────────────────────────────
    var log = function (m) {
        st.statusText = m;
        var el = document.getElementById('wb-status-text');
        if (el) el.innerText = m;
    };

    var updateDashboard = function () {
        var total = st.totalWins + st.totalLosses;
        var winRate = total > 0 ? ((st.totalWins / total) * 100).toFixed(0) : 0;
        var rateEl = document.getElementById('wb-stat-winrate');
        if (rateEl) rateEl.innerText = winRate + '%';

        var scoreEl = document.getElementById('wb-stat-score');
        if (scoreEl) scoreEl.innerText = st.totalWins + ' / ' + st.totalLosses;

        var profitEl = document.getElementById('wb-stat-profit');
        if (profitEl) {
            if (st.totalProfit >= 0) {
                profitEl.innerText = '+₹' + st.totalProfit.toFixed(1);
                profitEl.style.color = '#34d399';
            } else {
                profitEl.innerText = '-₹' + Math.abs(st.totalProfit).toFixed(1);
                profitEl.style.color = '#f87171';
            }
        }

        var predBadge = document.getElementById('wb-prediction-tag');
        if (predBadge) {
            predBadge.innerText = st.pred;
            predBadge.className = st.pred === 'BIG'
                ? 'wb-prediction-badge wb-pred-big'
                : 'wb-prediction-badge wb-pred-small';
        }

        var lvlTag = document.getElementById('wb-level-indicator');
        var curAmt = st.isRecovery ? st.lastLossAmt : (st.amounts[st.lvl] || st.amounts[0]);
        if (lvlTag) {
            lvlTag.innerText = 'LEVEL ' + (st.lvl + 1) + ' • ₹' + curAmt;
        }

        var dot = document.getElementById('wb-ball-dot');
        var badge = document.getElementById('wb-header-status-badge');
        if (st.active) {
            if (dot) dot.classList.add('active');
            if (badge) {
                badge.innerText = st.currentModeLabel + ' • AUTO';
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = '#34d399';
                badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }
        } else {
            if (dot) dot.classList.remove('active');
            if (badge) {
                badge.innerText = st.currentModeLabel;
                badge.style.background = 'rgba(6, 182, 212, 0.15)';
                badge.style.color = '#38bdf8';
                badge.style.borderColor = 'rgba(6, 182, 212, 0.35)';
            }
        }
    };

    // ─── Ultra Luxury Fireworks.js Celebration on WIN ────────────────────────
    var fwInstance = null;
    var getFireworksEngine = function () {
        if (window.__wb_fireworks) return Promise.resolve(window.__wb_fireworks);
        if (fwInstance) return Promise.resolve(fwInstance);

        return new Promise(function (resolve) {
            var setup = function (FireworksClass) {
                try {
                    var container = document.querySelector('.container') || document.getElementById('wb-fw-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'wb-fw-container';
                        container.className = 'container';
                        container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;overflow:hidden;';
                        document.body.appendChild(container);
                    }

                    var options = {
                        gravity: 1.4,
                        opacity: 0.4,
                        autoresize: true,
                        acceleration: 1.00,
                    };

                    fwInstance = new FireworksClass(container, options);
                    window.__wb_fireworks = fwInstance;
                    resolve(fwInstance);
                } catch (err) {
                    resolve(null);
                }
            };

            if (window.Fireworks) {
                setup(window.Fireworks);
                return;
            }

            // Method 1: Try dynamic ESM import from esm.run
            try {
                import('https://esm.run/fireworks-js').then(function (mod) {
                    var Cls = (mod && (mod.Fireworks || mod.default)) || window.Fireworks;
                    if (Cls) setup(Cls);
                    else throw new Error('No class');
                }).catch(function () {
                    loadScriptFallback(setup, resolve);
                });
            } catch (_) {
                loadScriptFallback(setup, resolve);
            }
        });
    };

    var loadScriptFallback = function (setup, resolve) {
        try {
            var existingScript = document.getElementById('wb-fw-script');
            if (existingScript) {
                if (window.Fireworks) setup(window.Fireworks);
                else resolve(null);
                return;
            }
            var s = document.createElement('script');
            s.id = 'wb-fw-script';
            s.src = 'https://cdn.jsdelivr.net/npm/fireworks-js@2.10.8/dist/index.umd.js';
            s.onload = function () {
                if (window.Fireworks) setup(window.Fireworks);
                else resolve(null);
            };
            s.onerror = function () { resolve(null); };
            document.head.appendChild(s);
        } catch (_) {
            resolve(null);
        }
    };

    // Pre-initialize fireworks engine in background for instant trigger
    try { getFireworksEngine(); } catch (_) {}

    var triggerLuxuryFireworks = function () {
        try {
            getFireworksEngine().then(function (fw) {
                if (fw) {
                    fw.start();
                    setTimeout(function () {
                        try {
                            if (typeof fw.waitStop === 'function') {
                                fw.waitStop();
                            } else if (typeof fw.stop === 'function') {
                                fw.stop();
                            }
                        } catch (_) {}
                    }, 3000); // Celebrates for 3s on WIN
                }
            });
        } catch (_) {}
    };

    // ─── Game Balance Scraper ────────────────────────────────────────────────
    var getBalance = function () {
        try {
            var el = document.querySelector('.balance') ||
                     document.querySelector('[class*="balance"]') ||
                     document.querySelector('[class*="wallet"]') ||
                     document.querySelector('[class*="amount"]');
            if (el) {
                var num = parseFloat(el.innerText.replace(/[^0-9.]/g, ''));
                if (!isNaN(num) && num > 0) return num;
            }
        } catch (_) {}
        return 0;
    };

    // ─── Smart Game Button Finder ────────────────────────────────────────────
    var findButton = function (text) {
        try {
            var all = document.querySelectorAll('div,span,button,p,a,b');
            var best = null;
            var target = text.toUpperCase();
            for (var i = 0; i < all.length; i++) {
                var s = (all[i].innerText || all[i].textContent || '').trim().toUpperCase();
                if (s === target && all[i].offsetWidth > 0) return all[i];
                if (s.includes(target) && all[i].offsetWidth > 0) best = all[i];
            }
            return best;
        } catch (_) {
            return null;
        }
    };

    var applyGameButtonPulses = function () {
        try {
            var bigBtn = findButton('BIG');
            var smallBtn = findButton('SMALL');
            if (bigBtn && !bigBtn.classList.contains('wb-btn-power')) {
                bigBtn.classList.add('wb-btn-power');
            }
            if (smallBtn && !smallBtn.classList.contains('wb-btn-power')) {
                smallBtn.classList.add('wb-btn-power');
            }
        } catch (_) {}
    };

    // ─── Dynamic Randomized Engine (Har Period Pe Ek New Random Pick) ────────
    var scanEngineMatrix = function (engineData) {
        // Randomly pick BIG or SMALL on every round (50/50 randomized probability)
        var randomPick = Math.random() < 0.5 ? 'BIG' : 'SMALL';
        return { pred: randomPick, track: 'SIZE' };
    };

    // ─── Automated Bet Dispatcher ────────────────────────────────────────────
    var executeDelayedBet = async function (type, amt) {
        try {
            log('Placing Bet: ' + type + ' (₹' + amt + ') on ' + st.currentModeLabel);
            var btn = findButton(type);
            if (!btn) {
                log('Bet button (' + type + ') missing on screen!');
                return;
            }
            btn.click();

            await new Promise(r => setTimeout(r, 260));
            var inp = document.querySelector('input[type="number"]') ||
                      document.querySelector('input[placeholder*="amount"]') ||
                      document.querySelector('input');
            if (inp) {
                inp.focus();
                inp.value = '';
                document.execCommand('insertText', false, amt.toString());
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, 200));
                inp.blur();
            }

            await new Promise(r => setTimeout(r, 260));
            var conf = findButton('TOTAL') || findButton('CONFIRM') || findButton('BET');
            if (conf) {
                conf.click();
                log('Confirmed: ' + type + ' ₹' + amt);
            }
        } catch (_) {
            log('Auto-bet skipped cleanly.');
        }
    };

    // ─── Toggle Run Button Handler (With Stop Loss) ──────────────────────────
    var runBtn = document.getElementById('wb-toggle-run-btn');
    runBtn.onclick = function () {
        if (!st.active) {
            syncTabMode();
            var liveBal = getBalance();
            var targetInput = document.getElementById('wb-input-target');
            var stopLossInput = document.getElementById('wb-input-stoploss');
            var baseInput = document.getElementById('wb-input-base');

            var targetVal = targetInput ? parseFloat(targetInput.value) : 2000;
            var stopLossVal = stopLossInput ? parseFloat(stopLossInput.value) : 200;
            var baseVal = baseInput ? parseFloat(baseInput.value) : 10;

            if (isNaN(targetVal) || targetVal <= 0) targetVal = liveBal > 0 ? liveBal * 2 : 2000;
            if (isNaN(stopLossVal) || stopLossVal < 0) stopLossVal = liveBal > 0 ? Math.floor(liveBal * 0.5) : 200;
            if (isNaN(baseVal) || baseVal <= 0) baseVal = 10;

            st.baseUnit = baseVal;
            recalculateAmounts(baseVal);
            st.targetBal = targetVal;
            st.stopLoss = stopLossVal;
            st.startBal = liveBal;
            st.active = true;
            st.isRecovery = false;
            st.lastLossAmt = 0;
            st.lp = '';
            st.activeBet = null;
            st.currentLossStreak = 0;
            st.maxLossStreak = 0;
            st.totalWins = 0;
            st.totalLosses = 0;
            st.totalProfit = 0;

            runBtn.classList.add('running');
            runBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                </svg>
                <span>STOP AUTO ENGINE</span>
            `;

            requestWakeLock();
            log('24/7 Engine Active on ' + st.currentModeLabel + '...');
            updateDashboard();
        } else {
            st.active = false;
            runBtn.classList.remove('running');
            runBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>START AUTO MINING</span>
            `;
            log('Engine Stopped by User');
            updateDashboard();
        }
    };

    // ─── Core Loop (500ms Interval) ──────────────────────────────────────────
    setInterval(async function () {
        applyGameButtonPulses();
        syncTabMode();

        try {
            var liveBal = getBalance();

            // 1. Target Balance Check
            if (st.active && st.targetBal > 0 && liveBal >= st.targetBal) {
                st.active = false;
                runBtn.classList.remove('running');
                runBtn.innerHTML = '<span>START AUTO MINING</span>';
                triggerLuxuryFireworks();
                log('🎉 Target Reached: ₹' + liveBal);
                updateDashboard();
                return;
            }

            // 2. Stop Loss Guard Check
            if (st.active && st.stopLoss > 0 && liveBal > 0 && liveBal <= st.stopLoss) {
                st.active = false;
                runBtn.classList.remove('running');
                runBtn.innerHTML = '<span>START AUTO MINING</span>';
                log('🛑 Stop Loss Hit (₹' + liveBal + ') • Guard Protected');
                updateDashboard();
                return;
            }

            // 3. Dynamic API URL based on active mode
            var currentApiUrl = API_MAP[st.currentMode] || API_MAP['1M'];

            var controller = new AbortController();
            var timeoutId = setTimeout(() => controller.abort(), 3000);
            var res = await fetch(currentApiUrl + '?t=' + Date.now(), { signal: controller.signal });
            clearTimeout(timeoutId);

            var data = await res.json();
            if (!data || !data.data || !data.data.list) return;

            st.historyEngine = data.data.list;
            var latest = st.historyEngine[0];

            var periodEl = document.getElementById('wb-period-display');
            if (periodEl && latest) {
                periodEl.innerText = latest.issueNumber;
            }

            // New round settled in the active tab!
            if (latest.issueNumber !== st.lp) {
                var matrix = scanEngineMatrix(st.historyEngine);
                var isFirstRun = (st.lp === '');
                st.lp = latest.issueNumber;

                // Check ONLY if we had an active bet placed on this exact mode and issue!
                if (!isFirstRun && st.activeBet && st.activeBet.mode === st.currentMode) {
                    var lastNum = parseInt(latest.number);
                    var actualSize = lastNum >= 5 ? 'BIG' : 'SMALL';
                    var win = (st.activeBet.prediction === actualSize);
                    var playedAmt = st.activeBet.amount;

                    if (win) {
                        st.totalWins += 1;
                        st.totalProfit += (playedAmt * 0.96);
                        st.lvl = 0;
                        st.isRecovery = false;
                        st.lastLossAmt = 0;
                        st.currentLossStreak = 0;
                        log('WIN (Level ' + (st.lvl + 1) + ')! +₹' + (playedAmt * 0.96).toFixed(1));

                        // Ultra Luxury Fireworks Only on verified win!
                        triggerLuxuryFireworks();
                    } else {
                        // On Loss: Absolutely NO animation, perfectly silent!
                        st.totalLosses += 1;
                        st.totalProfit -= playedAmt;
                        st.lastLossAmt = playedAmt * 2;
                        st.currentLossStreak += 1;
                        if (st.currentLossStreak > st.maxLossStreak) {
                            st.maxLossStreak = st.currentLossStreak;
                        }

                        if (st.lvl >= 3) {
                            st.lvl = 0;
                            st.isRecovery = false;
                            log('Reset to Level 1 Safety');
                        } else {
                            st.lvl += 1;
                            log('Loss. Next Level ' + (st.lvl + 1));
                        }
                    }
                    st.activeBet = null;
                    updateDashboard();
                }

                st.pred = matrix.pred;
                st.predTrack = 'SIZE';
                updateDashboard();

                // Dispatch delayed bet for the new round if active
                if (st.active && (!st.activeBet || st.activeBet.issue !== st.lp)) {
                    var betAmt = st.isRecovery ? st.lastLossAmt : (st.amounts[st.lvl] || st.amounts[0]);
                    st.activeBet = {
                        issue: st.lp,
                        prediction: st.pred,
                        amount: betAmt,
                        mode: st.currentMode
                    };

                    log('Waiting 5s for match (' + st.currentModeLabel + ')...');
                    setTimeout(async function () {
                        if (st.active && st.activeBet && st.activeBet.mode === st.currentMode) {
                            await executeDelayedBet(st.pred, betAmt);
                        }
                    }, 5000);
                }
            }
        } catch (_) {}
    }, 500);

    updateDashboard();
    console.log("%c⚡ WingoBot AI (Multi-Tab iOS v3.8) Injected! Active on " + st.currentModeLabel, "color:#06b6d4;font-size:14px;font-weight:bold;background:#0f172a;padding:8px 14px;border-radius:10px;border:1px solid #06b6d4;");
})();
