// ============================================================
//  ICF-SL  AI DATA AGENT  –  ai_agent.js
//  Drop-in AI chat for the School-Based ITN Distribution PWA
//  Hooks into the existing `state` object and answers questions
//  about collected data via the Anthropic claude-sonnet model.
// ============================================================

(function () {
    'use strict';

    // ── inject styles ────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
    /* ─── FLOATING BUTTON ─── */
    #icfAiBtn {
        position: fixed;
        bottom: 24px;
        right: 20px;
        z-index: 9000;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: linear-gradient(135deg,#004080 0%,#0066cc 100%);
        border: 3px solid #fff;
        box-shadow: 0 4px 20px rgba(0,64,128,.45);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s, box-shadow .2s;
        animation: icf-pulse 2.8s ease-in-out infinite;
    }
    #icfAiBtn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,64,128,.55); }
    #icfAiBtn svg   { width: 26px; height: 26px; stroke: #fff; }
    @keyframes icf-pulse {
        0%,100% { box-shadow: 0 4px 20px rgba(0,64,128,.45); }
        50%      { box-shadow: 0 4px 30px rgba(0,64,128,.75); }
    }
    #icfAiBadge {
        position: absolute;
        top: -4px; right: -4px;
        background: #f0a500;
        color: #fff;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 700;
        font-family: 'Oswald',sans-serif;
        padding: 2px 6px;
        letter-spacing: .4px;
        white-space: nowrap;
        border: 2px solid #fff;
    }

    /* ─── CHAT MODAL ─── */
    #icfAiOverlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        z-index: 9100;
        display: none;
        justify-content: center;
        align-items: flex-end;
        padding: 12px;
    }
    #icfAiOverlay.show { display: flex; }
    #icfAiModal {
        background: #fff;
        border-radius: 16px 16px 12px 12px;
        border: 3px solid #004080;
        width: 100%;
        max-width: 680px;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 12px 48px rgba(0,0,0,.35);
        overflow: hidden;
    }

    /* header */
    .icf-ai-head {
        background: linear-gradient(135deg,#002d5a 0%,#004080 100%);
        color: #fff;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
    }
    .icf-ai-head-icon {
        width: 36px; height: 36px;
        background: rgba(255,255,255,.15);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .icf-ai-head-icon svg { width: 20px; height: 20px; stroke: #fff; }
    .icf-ai-head-info { flex: 1; }
    .icf-ai-head-title {
        font-family: 'Oswald',sans-serif;
        font-size: 16px; font-weight: 600;
        letter-spacing: .8px; text-transform: uppercase;
        line-height: 1.2;
    }
    .icf-ai-head-sub { font-size: 10px; color: rgba(255,255,255,.7); letter-spacing: .3px; }
    .icf-ai-head-close {
        background: rgba(255,255,255,.12);
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        color: #fff;
        font-family: 'Oswald',sans-serif;
        font-size: 11px;
        letter-spacing: .5px;
        display: flex; align-items: center; gap: 5px;
    }
    .icf-ai-head-close:hover { background: rgba(255,255,255,.22); }
    .icf-ai-head-close svg { width: 13px; height: 13px; stroke: #fff; }

    /* stat strip */
    .icf-ai-stats {
        background: #e8f1fa;
        border-bottom: 2px solid #c5d9f0;
        padding: 8px 16px;
        display: flex;
        gap: 18px;
        flex-shrink: 0;
        overflow-x: auto;
    }
    .icf-ai-stat { text-align: center; white-space: nowrap; }
    .icf-ai-stat-val {
        font-family: 'Oswald',sans-serif;
        font-size: 18px; font-weight: 700;
        color: #004080; line-height: 1;
    }
    .icf-ai-stat-lbl {
        font-size: 9px; color: #555;
        text-transform: uppercase; letter-spacing: .5px;
        margin-top: 2px;
    }
    .icf-ai-stat-div {
        width: 1px; background: #bcd3eb;
        align-self: stretch; margin: 2px 0;
    }

    /* messages area */
    #icfAiMessages {
        flex: 1;
        overflow-y: auto;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f8fafd;
    }

    /* bubbles */
    .icf-msg { display: flex; gap: 8px; align-items: flex-start; max-width: 100%; }
    .icf-msg.user  { flex-direction: row-reverse; }
    .icf-msg-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; margin-top: 2px;
    }
    .icf-msg.ai   .icf-msg-avatar { background: #004080; }
    .icf-msg.user .icf-msg-avatar { background: #f0a500; }
    .icf-msg-avatar svg { width: 14px; height: 14px; stroke: #fff; }
    .icf-msg-bubble {
        max-width: calc(100% - 44px);
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.55;
        word-break: break-word;
    }
    .icf-msg.ai   .icf-msg-bubble {
        background: #fff;
        border: 1.5px solid #c5d9f0;
        border-top-left-radius: 4px;
        color: #222;
    }
    .icf-msg.user .icf-msg-bubble {
        background: #004080;
        color: #fff;
        border-top-right-radius: 4px;
    }
    /* markdown-like formatting inside bubble */
    .icf-msg-bubble strong { font-weight: 700; }
    .icf-msg-bubble em     { font-style: italic; }
    .icf-msg-bubble code {
        background: rgba(0,64,128,.08);
        border-radius: 4px;
        padding: 1px 5px;
        font-family: monospace;
        font-size: 12px;
    }
    .icf-msg.user .icf-msg-bubble code { background: rgba(255,255,255,.15); }

    /* typing indicator */
    .icf-typing { display: flex; align-items: center; gap: 4px; padding: 6px 0; }
    .icf-typing span {
        width: 7px; height: 7px; background: #004080;
        border-radius: 50%; animation: icf-bounce .9s ease-in-out infinite;
    }
    .icf-typing span:nth-child(2) { animation-delay: .15s; }
    .icf-typing span:nth-child(3) { animation-delay: .30s; }
    @keyframes icf-bounce {
        0%,100% { transform: translateY(0); opacity:.4; }
        50%      { transform: translateY(-5px); opacity:1; }
    }

    /* sample questions */
    .icf-samples {
        padding: 10px 16px 6px;
        flex-shrink: 0;
        border-top: 1px solid #e0eaf5;
    }
    .icf-samples-label {
        font-size: 9px; font-family: 'Oswald',sans-serif;
        color: #888; letter-spacing: 1px;
        text-transform: uppercase; margin-bottom: 6px;
    }
    .icf-samples-row {
        display: flex; gap: 6px; flex-wrap: wrap;
    }
    .icf-sq {
        background: #e8f1fa;
        border: 1.5px solid #b3cde8;
        border-radius: 20px;
        padding: 5px 12px;
        font-size: 11px;
        color: #004080;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background .15s, border-color .15s;
        font-family: 'Oswald',sans-serif;
        letter-spacing: .3px;
    }
    .icf-sq:hover { background: #004080; color: #fff; border-color: #004080; }

    /* input bar */
    .icf-ai-input-row {
        display: flex; gap: 8px;
        padding: 10px 14px 12px;
        border-top: 2px solid #dce8f5;
        background: #fff;
        flex-shrink: 0;
    }
    #icfAiInput {
        flex: 1;
        border: 2px solid #c5d9f0;
        border-radius: 24px;
        padding: 9px 16px;
        font-size: 13px;
        font-family: 'Oswald','Segoe UI',Arial,sans-serif;
        outline: none;
        resize: none;
        transition: border-color .2s;
        line-height: 1.4;
    }
    #icfAiInput:focus { border-color: #004080; }
    #icfAiSend {
        background: #004080;
        border: none;
        border-radius: 50%;
        width: 42px; height: 42px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: background .2s, transform .15s;
        align-self: flex-end;
    }
    #icfAiSend:hover   { background: #00306a; transform: scale(1.08); }
    #icfAiSend:disabled { background: #aaa; cursor: not-allowed; transform: none; }
    #icfAiSend svg { width: 18px; height: 18px; stroke: #fff; }

    /* clear chat */
    .icf-ai-clear {
        background: none; border: none;
        font-size: 10px; color: #aaa;
        cursor: pointer; letter-spacing: .4px;
        text-transform: uppercase;
        font-family: 'Oswald',sans-serif;
        padding: 0 4px;
        transition: color .15s;
    }
    .icf-ai-clear:hover { color: #dc3545; }

    /* welcome card */
    .icf-welcome {
        background: #fff;
        border: 2px solid #c5d9f0;
        border-radius: 12px;
        padding: 18px 16px;
        text-align: center;
    }
    .icf-welcome-icon { font-size: 32px; margin-bottom: 8px; }
    .icf-welcome-title {
        font-family: 'Oswald',sans-serif;
        font-size: 15px; color: #004080;
        font-weight: 600; letter-spacing: .5px;
        margin-bottom: 6px;
    }
    .icf-welcome-body { font-size: 12px; color: #555; line-height: 1.6; }

    @media (max-width:520px) {
        #icfAiModal { max-height: 93vh; border-radius: 14px 14px 0 0; }
    }
    `;
    document.head.appendChild(style);

    // ── inject HTML ──────────────────────────────────────────
    const html = `
    <!-- Floating trigger -->
    <button id="icfAiBtn" title="Ask the AI Agent" onclick="icfAiOpen()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/>
            <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
        </svg>
        <span id="icfAiBadge">AI</span>
    </button>

    <!-- Modal overlay -->
    <div id="icfAiOverlay" onclick="icfAiOverlayClick(event)">
      <div id="icfAiModal">

        <!-- Header -->
        <div class="icf-ai-head">
          <div class="icf-ai-head-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="icf-ai-head-info">
            <div class="icf-ai-head-title">ICF Data Agent</div>
            <div class="icf-ai-head-sub">AI assistant — ITN Distribution Survey data</div>
          </div>
          <button class="icf-ai-head-close" onclick="icfAiClose()">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            CLOSE
          </button>
        </div>

        <!-- Stat strip -->
        <div class="icf-ai-stats" id="icfAiStats"></div>

        <!-- Messages -->
        <div id="icfAiMessages">
          <div class="icf-welcome">
            <div class="icf-welcome-icon">🤖</div>
            <div class="icf-welcome-title">Hello! I'm your ICF Data Agent.</div>
            <div class="icf-welcome-body">
              I have full access to all submitted, pending and draft records in this session.<br>
              Ask me anything about the distribution data — coverage rates, school breakdowns, gender analysis, and more.
            </div>
          </div>
        </div>

        <!-- Sample questions -->
        <div class="icf-samples">
          <div class="icf-samples-label">✦ Try asking</div>
          <div class="icf-samples-row" id="icfSampleRow"></div>
        </div>

        <!-- Input row -->
        <div class="icf-ai-input-row">
          <button class="icf-ai-clear" onclick="icfAiClearChat()" title="Clear chat">↺ Clear</button>
          <textarea id="icfAiInput" rows="1"
            placeholder="Ask about the data…"
            onkeydown="icfAiKeydown(event)"
            oninput="icfAiAutoResize(this)"></textarea>
          <button id="icfAiSend" onclick="icfAiSend()" title="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    // ── sample questions pool ────────────────────────────────
    const SAMPLE_QUESTIONS = [
        'How many schools have been submitted?',
        'What is the overall ITN coverage rate?',
        'Which district has the most submissions?',
        'Show coverage breakdown by gender',
        'How many ITNs were distributed in total?',
        'List schools with coverage below 80%',
        'What is the average enrollment per school?',
        'How many schools are still pending?',
        'Compare boys vs girls ITN coverage',
        'Which schools received IG2 nets?',
        'What proportion of pupils are girls?',
        'How many ITNs remain after distribution?',
        'Show me a summary by chiefdom',
        'Which class has the highest coverage?',
        'How many drafts are saved?',
    ];

    function pickSamples(n) {
        const pool = [...SAMPLE_QUESTIONS];
        const out = [];
        while (out.length < n && pool.length) {
            const i = Math.floor(Math.random() * pool.length);
            out.push(pool.splice(i, 1)[0]);
        }
        return out;
    }

    function renderSamples() {
        const row = document.getElementById('icfSampleRow');
        if (!row) return;
        row.innerHTML = '';
        pickSamples(4).forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'icf-sq';
            btn.textContent = q;
            btn.onclick = () => icfAiAskQuestion(q);
            row.appendChild(btn);
        });
    }

    // ── stat strip ───────────────────────────────────────────
    function renderStats() {
        const el = document.getElementById('icfAiStats');
        if (!el) return;
        const data = collectData();
        const submitted = data.submitted.length;
        const pending   = data.pending.length;
        const drafts    = data.drafts.length;
        const total     = submitted + pending;

        let totalPupils = 0, totalITN = 0;
        [...data.submitted, ...data.pending].forEach(r => {
            totalPupils += parseInt(r.total_pupils || r.total_pupils_val || 0) || 0;
            totalITN    += parseInt(r.total_itn    || r.total_itn_val    || 0) || 0;
        });
        const pct = totalPupils > 0 ? Math.round((totalITN / totalPupils) * 100) : 0;

        el.innerHTML = `
          <div class="icf-ai-stat">
            <div class="icf-ai-stat-val">${submitted}</div>
            <div class="icf-ai-stat-lbl">Submitted</div>
          </div>
          <div class="icf-ai-stat-div"></div>
          <div class="icf-ai-stat">
            <div class="icf-ai-stat-val">${pending}</div>
            <div class="icf-ai-stat-lbl">Pending sync</div>
          </div>
          <div class="icf-ai-stat-div"></div>
          <div class="icf-ai-stat">
            <div class="icf-ai-stat-val">${drafts}</div>
            <div class="icf-ai-stat-lbl">Drafts</div>
          </div>
          <div class="icf-ai-stat-div"></div>
          <div class="icf-ai-stat">
            <div class="icf-ai-stat-val">${totalPupils.toLocaleString()}</div>
            <div class="icf-ai-stat-lbl">Total pupils</div>
          </div>
          <div class="icf-ai-stat-div"></div>
          <div class="icf-ai-stat">
            <div class="icf-ai-stat-val">${totalITN.toLocaleString()}</div>
            <div class="icf-ai-stat-lbl">ITNs dist.</div>
          </div>
          <div class="icf-ai-stat-div"></div>
          <div class="icf-ai-stat">
            <div class="icf-ai-stat-val" style="color:${pct>=80?'#28a745':pct>=50?'#e6a800':'#dc3545'}">${pct}%</div>
            <div class="icf-ai-stat-lbl">Coverage</div>
          </div>`;
    }

    // ── data collector ───────────────────────────────────────
    function collectData() {
        try {
            const s = window.state || {};
            // submitted schools carry their full data payload
            const submitted = (s.submittedSchools || []).map(r => r.data || r);
            const pending   = s.pendingSubmissions || [];
            const drafts    = (s.drafts || []).filter(d => d.district); // only geo-linked drafts
            return { submitted, pending, drafts };
        } catch (e) {
            return { submitted: [], pending: [], drafts: [] };
        }
    }

    function buildContext() {
        const { submitted, pending, drafts } = collectData();
        const all = [...submitted, ...pending];

        if (all.length === 0) {
            return 'No submitted or pending records found in this session. There may be saved drafts only.';
        }

        // aggregate
        let totalPupils = 0, totalITN = 0, totalBoys = 0, totalGirls = 0;
        let totalBoysITN = 0, totalGirlsITN = 0, totalReceived = 0, totalRemaining = 0;
        const byDistrict = {}, byChiefdom = {}, bySchool = [];

        all.forEach(r => {
            const tp  = parseInt(r.total_pupils)   || 0;
            const ti  = parseInt(r.total_itn)      || 0;
            const tb  = parseInt(r.total_boys)      || 0;
            const tg  = parseInt(r.total_girls)     || 0;
            const tbi = parseInt(r.total_boys_itn)  || 0;
            const tgi = parseInt(r.total_girls_itn) || 0;
            const rec = parseInt(r.itns_received)   || 0;
            const rem = parseInt(r.itns_remaining || r.itns_remaining_val) || 0;
            const cov = tp > 0 ? Math.round((ti / tp) * 100) : 0;

            totalPupils    += tp;
            totalITN       += ti;
            totalBoys      += tb;
            totalGirls     += tg;
            totalBoysITN   += tbi;
            totalGirlsITN  += tgi;
            totalReceived  += rec;
            totalRemaining += rem;

            // by district
            const dist = r.district || 'Unknown';
            if (!byDistrict[dist]) byDistrict[dist] = { schools: 0, pupils: 0, itn: 0, received: 0 };
            byDistrict[dist].schools++;
            byDistrict[dist].pupils += tp;
            byDistrict[dist].itn   += ti;
            byDistrict[dist].received += rec;

            // by chiefdom
            const chief = (r.district || '') + ' / ' + (r.chiefdom || 'Unknown');
            if (!byChiefdom[chief]) byChiefdom[chief] = { schools: 0, pupils: 0, itn: 0 };
            byChiefdom[chief].schools++;
            byChiefdom[chief].pupils += tp;
            byChiefdom[chief].itn   += ti;

            // per school
            bySchool.push({
                district:   r.district  || '—',
                chiefdom:   r.chiefdom  || '—',
                section:    r.section_loc || '—',
                community:  r.community || '—',
                school:     r.school_name || '—',
                date:       r.distribution_date || r.survey_date || '—',
                submittedBy: r.submitted_by || '—',
                pupils:     tp,
                boys:       tb,
                girls:      tg,
                itn:        ti,
                boysITN:    tbi,
                girlsITN:   tgi,
                received:   rec,
                remaining:  rem,
                coverage:   cov + '%',
                itnTypes:   [r.itn_type_pbo === 'Yes' ? 'PBO' : '', r.itn_type_ig2 === 'Yes' ? 'IG2' : ''].filter(Boolean).join(', ') || '—',
                c1_boys: parseInt(r.c1_boys)||0, c1_girls: parseInt(r.c1_girls)||0,
                c1_boys_itn: parseInt(r.c1_boys_itn)||0, c1_girls_itn: parseInt(r.c1_girls_itn)||0,
                c2_boys: parseInt(r.c2_boys)||0, c2_girls: parseInt(r.c2_girls)||0,
                c2_boys_itn: parseInt(r.c2_boys_itn)||0, c2_girls_itn: parseInt(r.c2_girls_itn)||0,
                c3_boys: parseInt(r.c3_boys)||0, c3_girls: parseInt(r.c3_girls)||0,
                c3_boys_itn: parseInt(r.c3_boys_itn)||0, c3_girls_itn: parseInt(r.c3_girls_itn)||0,
                c4_boys: parseInt(r.c4_boys)||0, c4_girls: parseInt(r.c4_girls)||0,
                c4_boys_itn: parseInt(r.c4_boys_itn)||0, c4_girls_itn: parseInt(r.c4_girls_itn)||0,
                c5_boys: parseInt(r.c5_boys)||0, c5_girls: parseInt(r.c5_girls)||0,
                c5_boys_itn: parseInt(r.c5_boys_itn)||0, c5_girls_itn: parseInt(r.c5_girls_itn)||0,
            });
        });

        const overallCov = totalPupils > 0 ? Math.round((totalITN / totalPupils) * 100) : 0;
        const boysCov    = totalBoys  > 0 ? Math.round((totalBoysITN  / totalBoys)  * 100) : 0;
        const girlsCov   = totalGirls > 0 ? Math.round((totalGirlsITN / totalGirls) * 100) : 0;

        // class-level totals
        const classData = [1,2,3,4,5].map(c => {
            let cb=0,cg=0,cbi=0,cgi=0;
            bySchool.forEach(s => {
                cb  += s['c'+c+'_boys']     || 0;
                cg  += s['c'+c+'_girls']    || 0;
                cbi += s['c'+c+'_boys_itn'] || 0;
                cgi += s['c'+c+'_girls_itn']|| 0;
            });
            const ct  = cb+cg, ci = cbi+cgi;
            return { class: c, boys:cb, girls:cg, total:ct, itn:ci, coverage: ct>0?Math.round((ci/ct)*100)+'%':'0%' };
        });

        let ctx = `=== ICF-SL SCHOOL-BASED ITN DISTRIBUTION — LIVE DATA SNAPSHOT ===

DATE: ${new Date().toLocaleDateString('en-SL',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}

OVERALL SUMMARY
- Total schools with data: ${all.length} (${submitted.length} submitted, ${pending.length} pending sync, ${drafts.length} drafts)
- Total pupils enrolled: ${totalPupils.toLocaleString()}
- Total boys: ${totalBoys.toLocaleString()} | Girls: ${totalGirls.toLocaleString()}
- ITNs received: ${totalReceived.toLocaleString()}
- ITNs distributed: ${totalITN.toLocaleString()}
- ITNs remaining: ${totalRemaining.toLocaleString()}
- Overall ITN coverage: ${overallCov}%
- Boys coverage: ${boysCov}% | Girls coverage: ${girlsCov}%

CLASS-LEVEL BREAKDOWN
${classData.map(c => `  Class ${c.class}: ${c.total} pupils (${c.boys}B/${c.girls}G) | ITN: ${c.itn} (${c.boys>0?Math.round((c['c'+c.class+'_boys_itn']||0)/c.boys*100):'?'}%B / ${c.girls>0?Math.round((c['c'+c.class+'_girls_itn']||0)/c.girls*100):'?'}%G) | Overall: ${c.coverage}`).join('\n')}

BY DISTRICT
${Object.entries(byDistrict).sort((a,b)=>b[1].schools-a[1].schools).map(([d,v])=>{
    const c = v.pupils>0?Math.round((v.itn/v.pupils)*100):0;
    return `  ${d}: ${v.schools} schools | ${v.pupils.toLocaleString()} pupils | ${v.itn.toLocaleString()} ITNs | ${c}% coverage`;
}).join('\n')}

BY CHIEFDOM
${Object.entries(byChiefdom).sort((a,b)=>b[1].schools-a[1].schools).map(([c,v])=>{
    const pct = v.pupils>0?Math.round((v.itn/v.pupils)*100):0;
    return `  ${c}: ${v.schools} schools | ${v.pupils.toLocaleString()} pupils | ${pct}% coverage`;
}).join('\n')}

INDIVIDUAL SCHOOL RECORDS
${bySchool.map((s,i) => `
[${i+1}] ${s.school} (${s.community}, ${s.chiefdom}, ${s.district})
  Date: ${s.date} | Submitted by: ${s.submittedBy}
  Enrolled: ${s.pupils} pupils (Boys: ${s.boys}, Girls: ${s.girls})
  ITNs received: ${s.received} | Distributed: ${s.itn} | Remaining: ${s.remaining}
  Coverage: ${s.coverage} (Boys: ${s.boys>0?Math.round(s.boysITN/s.boys*100)+'%':'—'}, Girls: ${s.girls>0?Math.round(s.girlsITN/s.girls*100)+'%':'—'})
  ITN types: ${s.itnTypes}
  Class breakdown:
    C1: ${s.c1_boys}B/${s.c1_girls}G enrolled | ${s.c1_boys_itn}B/${s.c1_girls_itn}G received ITN
    C2: ${s.c2_boys}B/${s.c2_girls}G enrolled | ${s.c2_boys_itn}B/${s.c2_girls_itn}G received ITN
    C3: ${s.c3_boys}B/${s.c3_girls}G enrolled | ${s.c3_boys_itn}B/${s.c3_girls_itn}G received ITN
    C4: ${s.c4_boys}B/${s.c4_girls}G enrolled | ${s.c4_boys_itn}B/${s.c4_girls_itn}G received ITN
    C5: ${s.c5_boys}B/${s.c5_girls}G enrolled | ${s.c5_boys_itn}B/${s.c5_girls_itn}G received ITN`).join('\n')}
`;
        return ctx;
    }

    // ── chat history ─────────────────────────────────────────
    let chatHistory = [];

    function appendMessage(role, text) {
        const wrap = document.getElementById('icfAiMessages');
        if (!wrap) return null;

        const isAI = role === 'ai';
        const div = document.createElement('div');
        div.className = 'icf-msg ' + role;

        div.innerHTML = `
          <div class="icf-msg-avatar">
            ${isAI
              ? `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`
              : `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
          </div>
          <div class="icf-msg-bubble"></div>`;

        wrap.appendChild(div);
        const bubble = div.querySelector('.icf-msg-bubble');
        if (text) bubble.innerHTML = renderMarkdown(text);
        wrap.scrollTop = wrap.scrollHeight;
        return bubble;
    }

    function appendTyping() {
        const wrap = document.getElementById('icfAiMessages');
        if (!wrap) return null;
        const div = document.createElement('div');
        div.className = 'icf-msg ai';
        div.id = 'icfTypingMsg';
        div.innerHTML = `
          <div class="icf-msg-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          </div>
          <div class="icf-msg-bubble">
            <div class="icf-typing"><span></span><span></span><span></span></div>
          </div>`;
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
        return div;
    }

    function removeTyping() {
        const el = document.getElementById('icfTypingMsg');
        if (el) el.remove();
    }

    // Simple markdown → HTML
    function renderMarkdown(text) {
        return text
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/\*(.+?)\*/g,'<em>$1</em>')
            .replace(/`(.+?)`/g,'<code>$1</code>')
            .replace(/^### (.+)$/gm,'<strong style="font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#004080;">$1</strong>')
            .replace(/^## (.+)$/gm,'<strong style="font-size:14px;color:#004080;">$1</strong>')
            .replace(/^- (.+)$/gm,'<span style="display:block;padding-left:14px;">• $1</span>')
            .replace(/\n\n/g,'<br><br>')
            .replace(/\n/g,'<br>');
    }

    // ── call Anthropic API ───────────────────────────────────
    async function callAI(userMessage) {
        const context = buildContext();

        const systemPrompt = `You are the ICF Data Agent, an expert AI assistant embedded inside the ICF-SL School-Based ITN Distribution PWA for Sierra Leone.

You have DIRECT ACCESS to all data collected in the current session (submitted records, pending sync records, and linked drafts). The full dataset is provided below as structured text.

Your role:
- Answer any question the user asks about the distribution data quickly and accurately
- Perform calculations on the fly (totals, averages, coverage rates, rankings, comparisons)
- Highlight key insights, anomalies, or patterns
- Be concise but thorough; use bullet points and bold text for clarity
- Respond in the same language the user writes in
- Never make up data — only use what is provided

DATA SNAPSHOT:
${context}`;

        // Build messages array with history
        const messages = [];
        chatHistory.forEach(h => messages.push({ role: h.role, content: h.content }));
        messages.push({ role: 'user', content: userMessage });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                system: systemPrompt,
                messages
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || 'API request failed (' + response.status + ')');
        }

        const data = await response.json();
        const reply = (data.content || [])
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');
        return reply || '(No response)';
    }

    // ── send flow ────────────────────────────────────────────
    window.icfAiSend = async function () {
        const input = document.getElementById('icfAiInput');
        const sendBtn = document.getElementById('icfAiSend');
        if (!input) return;
        const q = input.value.trim();
        if (!q) return;

        input.value = '';
        icfAiAutoResize(input);
        appendMessage('user', q);
        chatHistory.push({ role: 'user', content: q });

        appendTyping();
        if (sendBtn) sendBtn.disabled = true;

        try {
            const reply = await callAI(q);
            removeTyping();
            appendMessage('ai', reply);
            chatHistory.push({ role: 'assistant', content: reply });
            renderSamples(); // rotate suggested questions
        } catch (e) {
            removeTyping();
            appendMessage('ai', '⚠️ **Error:** ' + (e.message || 'Could not reach the AI service. Check your connection.'));
        } finally {
            if (sendBtn) sendBtn.disabled = false;
            input.focus();
        }
    };

    window.icfAiAskQuestion = function (q) {
        const input = document.getElementById('icfAiInput');
        if (input) { input.value = q; icfAiAutoResize(input); }
        icfAiSend();
    };

    window.icfAiKeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); icfAiSend(); }
    };

    window.icfAiAutoResize = function (el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 110) + 'px';
    };

    window.icfAiClearChat = function () {
        chatHistory = [];
        const wrap = document.getElementById('icfAiMessages');
        if (!wrap) return;
        wrap.innerHTML = `<div class="icf-welcome">
          <div class="icf-welcome-icon">🔄</div>
          <div class="icf-welcome-title">Chat cleared</div>
          <div class="icf-welcome-body">Ask me anything about your ITN distribution data.</div>
        </div>`;
        renderSamples();
    };

    // ── open / close ─────────────────────────────────────────
    window.icfAiOpen = function () {
        const overlay = document.getElementById('icfAiOverlay');
        if (overlay) overlay.classList.add('show');
        renderStats();
        renderSamples();
        setTimeout(() => {
            const input = document.getElementById('icfAiInput');
            if (input) input.focus();
        }, 200);
    };

    window.icfAiClose = function () {
        const overlay = document.getElementById('icfAiOverlay');
        if (overlay) overlay.classList.remove('show');
    };

    window.icfAiOverlayClick = function (e) {
        if (e.target.id === 'icfAiOverlay') icfAiClose();
    };

    // ── keyboard shortcut: Escape closes ─────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') icfAiClose();
    });

    // ── done ─────────────────────────────────────────────────
    console.log('[ICF AI Agent] Loaded ✓');

})();
