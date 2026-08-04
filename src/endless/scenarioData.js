/**
 * scenarioData.js
 * STEP32「Story Scenario Framework」のScenario定義データ（CASE001〜006）。
 * 新しいScenarioを追加する場合はこのファイルへのデータ追加のみで対応できる
 * （worldMutationData.js/hiddenEnvironmentData.js等と同じ「Data+参照ヘルパーのみ」構成）。
 *
 * データ形式（要求仕様セクション3どおり）:
 *   { id, title, description, difficulty, layerCount, chapters, storyEvents,
 *     environment, boss, ending, reward, unlockCondition }
 *
 * 【要求仕様に無く、こちらで設計したフィールドの補足】
 * - environment: 6種のWorldEnvironment（worldEnvironment.js）idのうち、Scenarioの
 *   世界観に近いものを1つ参照する（`flavorName`は表示専用の別名）。新規に6つの
 *   専用Environmentを追加すると「Environment System改修」の範囲が要求仕様の
 *   意図（既存改変の禁止）を超えて肥大化するため、既存Environmentの視覚テーマ
 *   （environmentThemeLayer背景）とAI Directorの世界観台詞のみをScenario専用に
 *   差し替える設計にした（Modifier効果自体はMap/Reward/Protocol Fragment等
 *   Endless専用の仕組みが対象のため、Story Modeでは意図的に適用しない）。
 * - chapters[].storyEventIds: そのChapterのPuzzle Node（hasPuzzleがtrueの場合）の
 *   前に表示するStory Event id一覧（空配列可）。
 * - chapters[].directorLine: そのChapter開始時にAI Directorの一言としてトースト表示する
 *   台詞（無指定なら表示しない）。要求仕様セクション8の3例（CASE001/005/006）を
 *   実装した（既存directorDialogue.jsと同じ「日本語の短い一言」のスタイルで統一。
 *   このセッションの既存フィードバック「プレイヤーが読むべきものは日本語に」に従う）。
 * - storyEvents[].choices: CHOICE型のみが持つ、2択の選択肢（{id, label, resultTag}）。
 *   選ばれたidはchoiceHistoryへ記録され、Endingの分岐条件（CASE004/CASE005）に使う。
 * - storyEvents[].nextEvent: 要求仕様どおりフィールドとしては用意したが、Chapterの
 *   storyEventIds配列が既に表示順を確定させるため、今回定義した全Eventでは未使用
 *   （常にnull）。将来的な「Chapter内でのStory Event分岐」拡張のために温存している。
 * - unlockCondition: `{type:'scenarioCleared', value:<前提Scenario id>}` は
 *   storyUnlockManager.jsの`hiddenEnvironmentUnlocked`と同じ「特殊比較」として
 *   scenarioManager.js側で扱う（配列包含判定）。CASE001のみnull（常に挑戦可能）。
 * - ending[].condition: nullは「他に達成可能なEndingが無い場合の唯一のEnding」を表す。
 *   `{type:'choice', eventId, value}`はCHOICE型Story Eventで選んだ選択肢idとの
 *   一致判定（CASE004/CASE005の分岐Ending用）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    // ================= CASE001: First Signal =================
    {
      id: 'case001',
      title: 'First Signal',
      description: '研究施設が起動し、最初の信号を検知する。すべてはここから始まった。',
      difficulty: 1,
      layerCount: 2,
      environment: { id: 'env_grid', flavorName: 'Research Facility' },
      chapters: [
        {
          id: 'case001_ch1', title: 'System Awakening',
          description: '研究施設の主電源が入り、AI Directorが起動する。',
          objectives: 'AI Directorを起動する',
          storyEventIds: ['case001_ch1_intro'], hasPuzzle: false,
          directorLine: '研究システムが起動した。'
        },
        {
          id: 'case001_ch2', title: 'First Research',
          description: '起動直後の解析システムで、最初のPuzzleに挑む。',
          objectives: '最初のPuzzleを解析する',
          storyEventIds: [], hasPuzzle: true
        },
        {
          id: 'case001_ch3', title: 'Signal Recovery',
          description: '未知の信号の中から、最初のProtocol断片を回収する。',
          objectives: '未知の信号を回収する',
          storyEventIds: ['case001_ch3_discovery'], hasPuzzle: true
        }
      ],
      storyEvents: [
        {
          id: 'case001_ch1_intro', type: 'DIALOGUE', condition: null,
          dialogue: '研究施設の主電源が入った。オペレーターの初期起動シーケンスを開始する。',
          reward: null, nextEvent: null
        },
        {
          id: 'case001_ch3_discovery', type: 'DISCOVERY', condition: null,
          dialogue: '未知のシグナルの中から、最初のProtocol断片を検出した。研究の第一歩だ。',
          reward: null, nextEvent: null
        }
      ],
      boss: null,
      ending: [
        {
          id: 'case001_end', title: 'SIGNAL ACQUIRED',
          description: '研究施設は正常に起動し、最初の信号が記録された。研究はまだ始まったばかりだ。',
          condition: null, result: 'complete'
        }
      ],
      reward: { researchData: 50, protocolId: null, environmentId: null },
      unlockCondition: null
    },

    // ================= CASE002: Missing Data =================
    {
      id: 'case002',
      title: 'Missing Data',
      description: '失われた研究記録を探索する。何者かがデータを意図的に消去した痕跡がある。',
      difficulty: 2,
      layerCount: 3,
      environment: { id: 'env_network', flavorName: 'Archive Network' },
      chapters: [
        {
          id: 'case002_ch1', title: 'Broken Log',
          description: '破損したLogファイルを発見する。',
          objectives: '破損したLogを解析する',
          storyEventIds: ['case002_ch1_log'], hasPuzzle: true
        },
        {
          id: 'case002_ch2', title: 'Unknown Data',
          description: '出所不明のデータブロックを復元する。',
          objectives: '未知のデータブロックを復元する',
          storyEventIds: ['case002_ch2_unknown'], hasPuzzle: true
        },
        {
          id: 'case002_ch3', title: 'Research File',
          description: '失われた研究記録の本体に到達する。',
          objectives: '失われた研究記録を回収する',
          storyEventIds: ['case002_ch3_file'], hasPuzzle: true
        }
      ],
      storyEvents: [
        {
          id: 'case002_ch1_log', type: 'DISCOVERY', condition: null,
          dialogue: '破損したLogファイルを発見した。「……このデータは削除されるべきではなかった」という一文だけが読み取れる。',
          reward: null, nextEvent: null
        },
        {
          id: 'case002_ch2_unknown', type: 'DIALOGUE', condition: null,
          dialogue: '出所不明のデータブロックを検出した。通常の研究記録とは異なる暗号化が施されている。',
          reward: null, nextEvent: null
        },
        {
          id: 'case002_ch3_file', type: 'DISCOVERY', condition: null,
          dialogue: '失われた研究記録の大部分を復元した。しかし、なぜ消去されたのかを示す記述は見つからない。',
          reward: null, nextEvent: null
        }
      ],
      boss: null,
      ending: [
        {
          id: 'case002_end', title: 'RECORD RESTORED',
          description: '失われた研究記録の大部分が復元された。しかし、なぜ消去されたのかは分からないままだ。',
          condition: null, result: 'complete'
        }
      ],
      reward: { researchData: 100, protocolId: null, environmentId: null },
      unlockCondition: { type: 'scenarioCleared', value: 'case001' }
    },

    // ================= CASE003: Color Experiment =================
    {
      id: 'case003',
      title: 'Color Experiment',
      description: 'LOGIC COLORという名の由来となった、色と論理の関係を解明する実験記録。',
      difficulty: 3,
      layerCount: 3,
      environment: { id: 'env_ocean', flavorName: 'Color Laboratory' },
      chapters: [
        {
          id: 'case003_ch1', title: 'Color Laboratory',
          description: 'Color Protocolの実験記録を確認する。',
          objectives: 'Color Protocolの記録を確認する',
          storyEventIds: ['case003_ch1_intro'], hasPuzzle: false
        },
        {
          id: 'case003_ch2', title: 'Color Research',
          description: '色理論に基づいた解析実験を行う。',
          objectives: '色理論に基づく解析を行う',
          storyEventIds: [], hasPuzzle: true
        },
        {
          id: 'case003_ch3', title: 'Puzzleとの関連',
          description: 'LOGIC COLORというゲームそのものの根幹理論に触れる。',
          objectives: 'LOGIC COLORの根幹理論を解明する',
          storyEventIds: ['case003_ch3_memory'], hasPuzzle: true
        },
        {
          id: 'case003_ch4', title: 'Protocol Synthesis',
          description: '実験の集大成として、専用ProtocolのColor Analyzerが完成する。',
          objectives: 'Color Analyzerを完成させる',
          storyEventIds: ['case003_ch4_reward'], hasPuzzle: true
        }
      ],
      storyEvents: [
        {
          id: 'case003_ch1_intro', type: 'DIALOGUE', condition: null,
          dialogue: 'Color Laboratoryへようこそ。ここでは色そのものを論理として扱う実験が行われている。',
          reward: null, nextEvent: null
        },
        {
          id: 'case003_ch3_memory', type: 'MEMORY', condition: null,
          dialogue: 'すべてのPuzzleは、色の論理関係を可視化したものに過ぎない。この施設の全ての実験はそこへ帰結する。',
          reward: null, nextEvent: null
        },
        {
          id: 'case003_ch4_reward', type: 'DISCOVERY', condition: null,
          dialogue: '色解析理論を応用した専用Protocol「Color Analyzer」が完成した。',
          reward: null, nextEvent: null
        }
      ],
      boss: null,
      ending: [
        {
          id: 'case003_end', title: 'COLOR THEORY COMPLETE',
          description: '色彩と論理の関係が解明された。この理論こそが、LOGIC COLORという名の由来だった。',
          condition: null, result: 'complete'
        }
      ],
      reward: { researchData: 150, protocolId: 'color_analyzer', environmentId: null },
      unlockCondition: { type: 'scenarioCleared', value: 'case002' }
    },

    // ================= CASE004: The Silent Facility =================
    {
      id: 'case004',
      title: 'The Silent Facility',
      description: '無人となった研究施設。失踪した研究者の痕跡と、Void Environmentの謎が待つ。',
      difficulty: 3,
      layerCount: 2,
      environment: { id: 'env_unknown', flavorName: 'Void Facility' },
      chapters: [
        {
          id: 'case004_ch1', title: '無人研究施設',
          description: '無人の研究施設に足を踏み入れる。',
          objectives: '施設内を調査する',
          storyEventIds: ['case004_ch1_intro'], hasPuzzle: false
        },
        {
          id: 'case004_ch2', title: 'Lost Researcher',
          description: '失踪した研究者の痕跡を追う。',
          objectives: '失踪した研究者の痕跡を追う',
          storyEventIds: ['case004_ch2_discovery'], hasPuzzle: true
        },
        {
          id: 'case004_ch3', title: 'Void Environment',
          description: 'Void Environmentの深部で、選択を迫られる。',
          objectives: 'Void Environmentの深部へ進む',
          storyEventIds: ['case004_ch3_choice'], hasPuzzle: true
        }
      ],
      storyEvents: [
        {
          id: 'case004_ch1_intro', type: 'CINEMATIC', condition: null,
          dialogue: '施設内に人の気配は無い。稼働音だけが静かに響いている。',
          reward: null, nextEvent: null
        },
        {
          id: 'case004_ch2_discovery', type: 'DISCOVERY', condition: null,
          dialogue: '失踪した研究者の私物を発見した。最後の記録は「Void Environmentへ向かう」という一文で途切れている。',
          reward: null, nextEvent: null
        },
        {
          id: 'case004_ch3_choice', type: 'CHOICE', condition: null,
          dialogue: 'Void Environmentの深部へ、これ以上踏み込むか。',
          choices: [
            { id: 'search', label: 'さらに深く捜索する', resultTag: 'search' },
            { id: 'leave', label: 'これ以上は踏み込まない', resultTag: 'leave' }
          ],
          reward: null, nextEvent: null
        }
      ],
      boss: null,
      ending: [
        {
          id: 'case004_end_search', title: 'THE RESEARCHER FOUND',
          description: '失踪した研究者の生存記録を発見した。彼は今もどこかで研究を続けている。',
          condition: { type: 'choice', eventId: 'case004_ch3_choice', value: 'search' }, result: 'complete'
        },
        {
          id: 'case004_end_leave', title: 'THE FACILITY REMAINS SILENT',
          description: '研究者の行方は分からないままだった。施設はこれからも静寂を保ち続ける。',
          condition: { type: 'choice', eventId: 'case004_ch3_choice', value: 'leave' }, result: 'complete'
        }
      ],
      reward: { researchData: 150, protocolId: null, environmentId: null },
      unlockCondition: { type: 'scenarioCleared', value: 'case003' }
    },

    // ================= CASE005: AI Memory =================
    {
      id: 'case005',
      title: 'AI Memory',
      description: 'AI Directorの記憶の奥深くへ。記憶を取り戻すか、消し去るかの選択が待つ。',
      difficulty: 4,
      layerCount: 2,
      environment: { id: 'env_forest', flavorName: 'Memory Archive' },
      chapters: [
        {
          id: 'case005_ch1', title: 'Memory Fragment',
          description: 'AIの記憶断片を収集する。',
          objectives: 'AIの記憶断片を収集する',
          storyEventIds: ['case005_ch1_intro'], hasPuzzle: false,
          directorLine: 'この場所を覚えている……。'
        },
        {
          id: 'case005_ch2', title: 'Personality Change',
          description: 'AI Directorの人格変化の兆候を解析する。',
          objectives: '人格変化の兆候を解析する',
          storyEventIds: ['case005_ch2_memory'], hasPuzzle: true
        },
        {
          id: 'case005_ch3', title: 'Choice Event',
          description: 'AIの記憶をどう扱うか、最終的な選択を下す。',
          objectives: 'AIの記憶をどう扱うか選択する',
          storyEventIds: ['case005_ch3_choice'], hasPuzzle: true
        }
      ],
      storyEvents: [
        {
          id: 'case005_ch1_intro', type: 'MEMORY', condition: null,
          dialogue: '断片的な記憶データが浮かび上がる。それはAI Director自身の、失われた過去の記録だった。',
          reward: null, nextEvent: null
        },
        {
          id: 'case005_ch2_memory', type: 'MEMORY', condition: null,
          dialogue: '記憶が戻るたび、AI Directorの応答パターンにわずかな変化が生じている。',
          reward: null, nextEvent: null
        },
        {
          id: 'case005_ch3_choice', type: 'CHOICE', condition: null,
          dialogue: 'すべての記憶データが揃った。AIの記憶を復元するか、それとも消去するか。',
          choices: [
            { id: 'restore', label: '記憶を復元する', resultTag: 'restore' },
            { id: 'delete', label: '記憶を消去する', resultTag: 'delete' }
          ],
          reward: null, nextEvent: null
        }
      ],
      boss: null,
      ending: [
        {
          id: 'case005_end_restore', title: 'MEMORY RESTORED',
          description: 'AIは全ての記憶を取り戻した。それが何を意味するのか、まだ誰にも分からない。',
          condition: { type: 'choice', eventId: 'case005_ch3_choice', value: 'restore' }, result: 'complete'
        },
        {
          id: 'case005_end_delete', title: 'MEMORY DELETED',
          description: 'AIは自らの記憶を消去することを選んだ。静かで、迷いのない選択だった。',
          condition: { type: 'choice', eventId: 'case005_ch3_choice', value: 'delete' }, result: 'complete'
        }
      ],
      reward: { researchData: 200, protocolId: null, environmentId: null },
      unlockCondition: { type: 'scenarioCleared', value: 'case004' }
    },

    // ================= CASE006: Genesis Protocol =================
    {
      id: 'case006',
      title: 'Genesis Protocol',
      description: '施設の起源、AIの秘密、そして初期ストーリーの結末。すべてがGenesis Coreへ収束する。',
      difficulty: 5,
      layerCount: 3,
      environment: { id: 'env_fractal', flavorName: 'Genesis Core' },
      chapters: [
        {
          id: 'case006_ch1', title: 'Facility Truth',
          description: '研究施設が本当は何のために作られたのかへ迫る。',
          objectives: '施設の真実に迫る',
          storyEventIds: ['case006_ch1_intro'], hasPuzzle: false
        },
        {
          id: 'case006_ch2', title: 'AI Secret',
          description: 'AI Director自身に隠された秘密を暴く。',
          objectives: 'AIに隠された秘密を暴く',
          storyEventIds: ['case006_ch2_memory'], hasPuzzle: true,
          directorLine: '真実は、私自身の設計によって隠されていた。'
        },
        {
          id: 'case006_ch3', title: 'Final Layer',
          description: '施設の最深部Layerへ到達する。',
          objectives: '最深部Layerへ到達する',
          storyEventIds: [], hasPuzzle: true
        },
        {
          id: 'case006_ch4', title: 'Final Boss',
          description: 'Genesis Coreそのものを突破する、この物語の結末。',
          objectives: 'Genesis Coreを突破する',
          storyEventIds: ['case006_ch4_cinematic'], hasPuzzle: true, isBossChapter: true
        }
      ],
      storyEvents: [
        {
          id: 'case006_ch1_intro', type: 'CINEMATIC', condition: null,
          dialogue: 'この研究施設は、単なる研究のためだけに作られたのではなかった。',
          reward: null, nextEvent: null
        },
        {
          id: 'case006_ch2_memory', type: 'MEMORY', condition: null,
          dialogue: 'AI Director自身の設計思想の中に、意図的に隠されたセクションが存在していた。',
          reward: null, nextEvent: null
        },
        {
          id: 'case006_ch4_cinematic', type: 'CINEMATIC', condition: null,
          dialogue: '施設の起源、AIの秘密、そして最初の物語——全てが、この一点に収束する。',
          reward: null, nextEvent: null
        }
      ],
      boss: { name: 'GENESIS CORE', flavorText: 'この物語の結末を告げる、最後のPuzzle。' },
      ending: [
        {
          id: 'case006_end', title: 'GENESIS PROTOCOL COMPLETE',
          description: '施設の起源、AIの秘密、そして最初の物語——全てが明らかになった。研究はまだ終わらない。',
          condition: null, result: 'complete'
        }
      ],
      reward: { researchData: 300, protocolId: 'genesis_protocol', environmentId: null },
      unlockCondition: { type: 'scenarioCleared', value: 'case005' }
    }
  ];

  const BY_ID = new Map(ALL.map(s => [s.id, s]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  /** @param {string} scenarioId @param {string} eventId */
  function getStoryEvent(scenarioId, eventId) {
    const scenario = getById(scenarioId);
    if (!scenario) return null;
    return scenario.storyEvents.find(e => e.id === eventId) || null;
  }

  G.ScenarioData = { ALL, getById, getStoryEvent };
})(typeof globalThis !== 'undefined' ? globalThis : this);
